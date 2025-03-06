import dotenv from 'dotenv';
import path from 'path';

// Load the appropriate .env file based on the environment
const isTest = process.env.NODE_ENV === 'test';

if (isTest) {
  console.log('Loading test environment configuration');
  dotenv.config({ path: '.env.test' });
} else {
  dotenv.config();
}

export const config = {
  isTest,
  socketPort: Number(process.env.SOCKET_PORT) || (isTest ? 3002 : 3000),
  expressPort: Number(process.env.EXPRESS_PORT) || (isTest ? 3003 : 3001),
  corsOrigin: process.env.CORS_ORIGIN || (isTest ? `http://localhost:${Number(process.env.EXPRESS_PORT) || 3001}` : '*'),
  cookieSecret: process.env.COOKIE_SECRET || 'super-secret-key',
  publicDir: path.join(process.cwd(), 'public')
};

console.log(`Environment: ${isTest ? 'test' : 'production'}`);
console.log(`Socket port: ${config.socketPort}, Express port: ${config.expressPort}`);
console.log(`CORS origin: ${config.corsOrigin}`);
