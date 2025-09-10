import type { Express, Request, Response } from 'express';
import { authService } from '../services/auth-service';
import { authRateLimit } from '../middleware/security';
import { extractClientInfo, requireAuth } from '../middleware/auth';
import { loginSchema, registerSchema } from '@shared/schema';
import { ZodError } from 'zod';

export function registerAuthRoutes(app: Express) {
  // Apply client info extraction to all auth routes
  app.use('/api/auth', extractClientInfo);

  // Register endpoint
  app.post('/api/auth/register', authRateLimit, async (req: Request, res: Response) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      
      const { user, session } = await authService.register(
        validatedData,
        req.clientIp,
        req.clientUserAgent
      );

      // Regenerate session to prevent fixation attacks
      req.session.regenerate((err) => {
        if (err) {
          console.error('Session regeneration error:', err);
          return res.status(500).json({
            success: false,
            message: 'Session creation failed',
            error: 'INTERNAL_ERROR'
          });
        }
        
        // Set session cookie after regeneration
        if (req.session) {
          req.session.sessionId = session.id;
          req.session.userId = user.id;
        }

        // Return user without sensitive data
        const safeUser = {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        };

        res.status(201).json({
          success: true,
          user: safeUser,
          message: 'Registration successful'
        });
      });

    } catch (error: any) {
      console.error('Registration error:', {
        requestId: req.id,
        error: error.message,
        ip: req.clientIp
      });

      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }

      if (error.message.includes('already exists')) {
        return res.status(409).json({ error: error.message });
      }

      res.status(500).json({ error: 'Registration failed' });
    }
  });

  // Login endpoint
  app.post('/api/auth/login', authRateLimit, async (req: Request, res: Response) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      const { user, session } = await authService.login(
        validatedData,
        req.clientIp,
        req.clientUserAgent
      );

      // Regenerate session to prevent fixation attacks
      req.session.regenerate((err) => {
        if (err) {
          console.error('Session regeneration error:', err);
          return res.status(500).json({
            success: false,
            message: 'Session creation failed',
            error: 'INTERNAL_ERROR'
          });
        }
        
        // Set session cookie after regeneration
        if (req.session) {
          req.session.sessionId = session.id;
          req.session.userId = user.id;
        }

        // Return user without sensitive data
        const safeUser = {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          lastLoginAt: user.lastLoginAt,
        };

        res.json({
          success: true,
          user: safeUser,
          message: 'Login successful'
        });
      });

    } catch (error: any) {
      console.error('Login error:', {
        requestId: req.id,
        error: error.message,
        ip: req.clientIp,
        username: req.body?.username
      });

      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }

      if (error.message.includes('locked') || error.message.includes('Invalid credentials')) {
        return res.status(401).json({ error: error.message });
      }

      res.status(500).json({ error: 'Login failed' });
    }
  });

  // Logout endpoint
  app.post('/api/auth/logout', requireAuth, async (req: Request, res: Response) => {
    try {
      if (req.sessionId) {
        await authService.invalidateSession(req.sessionId, req.user?.id);
      }
      
      // Destroy session completely
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction error:', err);
        }
      });
      
      res.json({
        success: true,
        message: 'Logout successful'
      });

    } catch (error: any) {
      console.error('Logout error:', {
        requestId: req.id,
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({ error: 'Logout failed' });
    }
  });

  // Get current user endpoint
  app.get('/api/auth/me', requireAuth, (req: Request, res: Response) => {
    const safeUser = {
      id: req.user!.id,
      username: req.user!.username,
      email: req.user!.email,
      role: req.user!.role,
      lastLoginAt: req.user!.lastLoginAt,
      createdAt: req.user!.createdAt,
    };

    res.json({
      success: true,
      user: safeUser
    });
  });

  // Change password endpoint
  app.post('/api/auth/change-password', requireAuth, async (req: Request, res: Response) => {
    try {
      const { oldPassword, newPassword } = req.body;

      if (!oldPassword || !newPassword) {
        return res.status(400).json({ error: 'Old password and new password are required' });
      }

      await authService.changePassword(req.user!.id, oldPassword, newPassword);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error: any) {
      console.error('Change password error:', {
        requestId: req.id,
        error: error.message,
        userId: req.user?.id
      });

      if (error.message.includes('incorrect') || error.message.includes('8 characters')) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: 'Password change failed' });
    }
  });

  // Logout all sessions for current user
  app.post('/api/auth/logout-all', requireAuth, async (req: Request, res: Response) => {
    try {
      const sessionCount = await authService.invalidateAllUserSessions(req.user!.id);
      
      // Destroy current session completely
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction error:', err);
        }
      });
      
      res.json({
        success: true,
        message: `Logged out from ${sessionCount} sessions`
      });

    } catch (error: any) {
      console.error('Logout all error:', {
        requestId: req.id,
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({ error: 'Logout all failed' });
    }
  });

  // Session cleanup endpoint (admin only)
  app.post('/api/auth/cleanup-sessions', requireAuth, async (req: Request, res: Response) => {
    try {
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const cleanedCount = await authService.cleanupExpiredSessions();

      res.json({
        success: true,
        message: `Cleaned up ${cleanedCount} expired sessions`
      });

    } catch (error: any) {
      console.error('Session cleanup error:', {
        requestId: req.id,
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({ error: 'Session cleanup failed' });
    }
  });
}