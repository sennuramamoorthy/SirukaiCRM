import './config/database'; // Initialize DB and run migrations
import app from './app';
import { env } from './config/env';

app.listen(env.PORT, () => {
  console.log(`[Server] Running on http://localhost:${env.PORT}`);
  console.log(`[Server] Environment: ${env.NODE_ENV}`);
});
