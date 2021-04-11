import dotenv from 'dotenv';
import path from 'path';

// Set the NODE_ENV to 'development' by default
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const envFile = `./env/${process.env.NODE_ENV}.env`;
const envFound = dotenv.config({ path: path.resolve(__dirname, envFile) });

if (envFound.error) {
  // This error should crash whole process

  throw new Error("⚠️  Couldn't find .env file  ⚠️");
}
