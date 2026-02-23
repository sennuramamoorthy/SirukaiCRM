import { runMigrations } from './config/database';
import app from './app';
import { env } from './config/env';

async function start() {
  console.log('[Server] Running database migrations...');
  await runMigrations();
  console.log('[Server] Migrations complete.');

  app.listen(env.PORT, () => {
    console.log(`[Server] Running on http://localhost:${env.PORT}`);
    console.log(`[Server] Environment: ${env.NODE_ENV}`);
  });
}

start().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
