import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root workspace during local development
// This file is imported first to ensure env vars are loaded before other imports (like Prisma) evaluate process.env
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
