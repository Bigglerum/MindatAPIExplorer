import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import type { Express } from 'express';
import { db } from '../db';

const PgSession = connectPgSimple(session);

/**
 * Configure session middleware with PostgreSQL store
 */
export function configureSession(app: Express) {
  const sessionStore = new PgSession({
    // Use the same database connection
    pool: db as any, // Type assertion since connect-pg-simple expects a different interface
    tableName: 'express_sessions', // This table will be created automatically
    createTableIfMissing: true,
  });

  app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      httpOnly: true, // Prevent XSS
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'strict', // CSRF protection
    },
    name: 'sessionId', // Change default session name
  }));
}