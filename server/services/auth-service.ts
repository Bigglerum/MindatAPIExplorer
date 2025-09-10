import argon2 from 'argon2';
import { z } from 'zod';
import { eq, and, lt } from 'drizzle-orm';
import { db } from '../db';
import { users, sessions, auditLogs, type User, type Session, loginSchema, registerSchema } from '@shared/schema';
import { v4 as uuidv4 } from 'uuid';

const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

export class AuthService {
  /**
   * Hash password using Argon2id
   */
  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64MB
      timeCost: 3,
      parallelism: 1,
    });
  }

  /**
   * Verify password against hash (supports legacy migration)
   */
  async verifyPassword(hash: string | null, password: string, legacyPassword?: string | null): Promise<{ isValid: boolean; needsMigration: boolean }> {
    try {
      // If we have a modern hash, verify against it
      if (hash) {
        const isValid = await argon2.verify(hash, password);
        return { isValid, needsMigration: false };
      }
      
      // If no hash but we have legacy password, check against it
      if (legacyPassword) {
        // Legacy passwords might be plaintext (security risk) or basic hash
        // For now, assume plaintext comparison (should be migrated ASAP)
        const isValid = password === legacyPassword;
        return { isValid, needsMigration: isValid };
      }
      
      return { isValid: false, needsMigration: false };
    } catch (error) {
      console.error('Password verification error:', error);
      return { isValid: false, needsMigration: false };
    }
  }

  /**
   * Check if user account is locked
   */
  private isAccountLocked(user: User): boolean {
    if (!user.lockedUntil) return false;
    return new Date() < user.lockedUntil;
  }

  /**
   * Register a new user
   */
  async register(data: z.infer<typeof registerSchema>, ipAddress?: string, userAgent?: string): Promise<{ user: User; session: Session }> {
    const validated = registerSchema.parse(data);
    
    // Check if username already exists
    const existingUser = await db.select().from(users).where(eq(users.username, validated.username)).limit(1);
    if (existingUser.length > 0) {
      throw new Error('Username already exists');
    }

    // Check if email already exists (if provided)
    if (validated.email) {
      const existingEmail = await db.select().from(users).where(eq(users.email, validated.email)).limit(1);
      if (existingEmail.length > 0) {
        throw new Error('Email already exists');
      }
    }

    // Hash password
    const passwordHash = await this.hashPassword(validated.password);

    // Create user
    const [newUser] = await db.insert(users).values({
      username: validated.username,
      email: validated.email,
      passwordHash,
      role: 'user', // Default role
    }).returning();

    // Create initial session
    const session = await this.createSession(newUser.id, ipAddress, userAgent);

    // Log registration
    await this.logAuditEvent({
      userId: newUser.id,
      sessionId: session.id,
      action: 'user_register',
      resource: 'users',
      resourceId: newUser.id.toString(),
      ipAddress,
      userAgent,
    });

    return { user: newUser, session };
  }

  /**
   * Authenticate user login
   */
  async login(data: z.infer<typeof loginSchema>, ipAddress?: string, userAgent?: string): Promise<{ user: User; session: Session }> {
    const validated = loginSchema.parse(data);

    // Find user
    const [user] = await db.select().from(users).where(
      and(
        eq(users.username, validated.username),
        eq(users.isActive, true)
      )
    ).limit(1);

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if account is locked
    if (this.isAccountLocked(user)) {
      const timeRemaining = Math.ceil((user.lockedUntil!.getTime() - Date.now()) / 1000 / 60);
      throw new Error(`Account locked. Try again in ${timeRemaining} minutes.`);
    }

    // Verify password (with legacy migration support)
    const passwordResult = await this.verifyPassword(user.passwordHash, validated.password, user.password);

    if (!passwordResult.isValid) {
      // Increment failed attempts
      const newFailedAttempts = user.failedLoginAttempts + 1;
      const updateData: any = { failedLoginAttempts: newFailedAttempts };

      // Lock account if max attempts reached
      if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION);
      }

      await db.update(users).set(updateData).where(eq(users.id, user.id));

      // Log failed login attempt
      await this.logAuditEvent({
        userId: user.id,
        action: 'login_failed',
        resource: 'users',
        resourceId: user.id.toString(),
        details: { reason: 'invalid_password', attempts: newFailedAttempts },
        ipAddress,
        userAgent,
      });

      throw new Error('Invalid credentials');
    }

    // Migrate legacy password if needed
    if (passwordResult.needsMigration) {
      const newPasswordHash = await this.hashPassword(validated.password);
      await db.update(users).set({
        passwordHash: newPasswordHash,
        password: null, // Clear legacy password for security
        updatedAt: new Date(),
      }).where(eq(users.id, user.id));

      // Log password migration
      await this.logAuditEvent({
        userId: user.id,
        action: 'password_migrated',
        resource: 'users',
        resourceId: user.id.toString(),
        details: { reason: 'legacy_to_argon2id' },
        ipAddress,
        userAgent,
      });
    }

    // Reset failed attempts on successful login
    await db.update(users).set({
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    }).where(eq(users.id, user.id));

    // Create session
    const session = await this.createSession(user.id, ipAddress, userAgent);

    // Log successful login
    await this.logAuditEvent({
      userId: user.id,
      sessionId: session.id,
      action: 'login_success',
      resource: 'users',
      resourceId: user.id.toString(),
      ipAddress,
      userAgent,
    });

    return { user, session };
  }

  /**
   * Create a new session
   */
  async createSession(userId: number, ipAddress?: string, userAgent?: string): Promise<Session> {
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + SESSION_DURATION);

    const [session] = await db.insert(sessions).values({
      id: sessionId,
      userId,
      expiresAt,
      ipAddress,
      userAgent,
    }).returning();

    return session;
  }

  /**
   * Validate session and get user
   */
  async validateSession(sessionId: string): Promise<{ user: User; session: Session } | null> {
    const [sessionData] = await db.select().from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(
        and(
          eq(sessions.id, sessionId),
          eq(sessions.isActive, true),
          eq(users.isActive, true)
        )
      ).limit(1);

    if (!sessionData) {
      return null;
    }

    const { sessions: session, users: user } = sessionData;

    // Check if session is expired
    if (new Date() > session.expiresAt) {
      await this.invalidateSession(sessionId);
      return null;
    }

    // Update last access time
    await db.update(sessions).set({
      lastAccessAt: new Date(),
    }).where(eq(sessions.id, sessionId));

    return { user, session };
  }

  /**
   * Invalidate a session (logout)
   */
  async invalidateSession(sessionId: string, userId?: number): Promise<void> {
    await db.update(sessions).set({
      isActive: false,
    }).where(eq(sessions.id, sessionId));

    // Log logout
    if (userId) {
      await this.logAuditEvent({
        userId,
        sessionId,
        action: 'logout',
        resource: 'sessions',
        resourceId: sessionId,
      });
    }
  }

  /**
   * Invalidate all sessions for a user (logout from all devices)
   */
  async invalidateAllUserSessions(userId: number): Promise<number> {
    const result = await db.update(sessions).set({
      isActive: false,
    }).where(
      and(
        eq(sessions.userId, userId),
        eq(sessions.isActive, true)
      )
    );

    // Log logout all
    await this.logAuditEvent({
      userId,
      action: 'logout_all',
      resource: 'sessions',
      details: { sessionCount: result.rowCount || 0 },
    });

    return result.rowCount || 0;
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await db.update(sessions).set({
      isActive: false,
    }).where(lt(sessions.expiresAt, new Date()));

    return result.rowCount || 0;
  }

  /**
   * Check if user has required role
   */
  hasRole(user: User, requiredRole: string): boolean {
    const roleHierarchy = ['readonly', 'user', 'admin'];
    const userRoleIndex = roleHierarchy.indexOf(user.role);
    const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);
    
    return userRoleIndex >= requiredRoleIndex;
  }

  /**
   * Log audit event
   */
  private async logAuditEvent(data: {
    userId?: number;
    sessionId?: string;
    action: string;
    resource?: string;
    resourceId?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        userId: data.userId,
        sessionId: data.sessionId,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        details: data.details || {},
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      });
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Don't throw - audit logging failure shouldn't break the flow
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<void> {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify old password (with legacy support)
    const passwordResult = await this.verifyPassword(user.passwordHash, oldPassword, user.password);
    if (!passwordResult.isValid) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password
    if (newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters');
    }

    // Hash new password
    const newPasswordHash = await this.hashPassword(newPassword);

    // Update password and clear legacy field for security
    await db.update(users).set({
      passwordHash: newPasswordHash,
      password: null, // Clear legacy password for security
      updatedAt: new Date(),
    }).where(eq(users.id, userId));

    // Invalidate all active sessions for security (prevent account takeover)
    await this.invalidateAllUserSessions(userId);

    // Log password change with session invalidation
    await this.logAuditEvent({
      userId,
      action: 'password_change',
      resource: 'users',
      resourceId: userId.toString(),
      details: { 
        security_action: 'all_sessions_invalidated',
        reason: 'password_changed'
      },
    });
  }
}

export const authService = new AuthService();