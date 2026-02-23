import dotenv from 'dotenv';
dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret-change-me',
  NODE_ENV: process.env.NODE_ENV || 'development',
  // Fallback to localhost:5173 preserves local "npm run dev" behavior unchanged.
  // In Docker, set CORS_ORIGIN=http://localhost:8000
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  // PostgreSQL connection string
  // e.g. postgres://user:password@host:5432/dbname
  DATABASE_URL: process.env.DATABASE_URL || 'postgres://crm:crm@localhost:5432/crmdb',
};
