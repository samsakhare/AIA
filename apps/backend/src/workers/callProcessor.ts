import { Queue, Worker } from 'bullmq';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379
};

export const callQueue = new Queue('callProcessor', { connection });

export const worker = new Worker(
  'callProcessor',
  async (job) => {
    console.log('Processing call data:', job.data);
    // Here we would use Prisma to save the transcript and extracted JSON data to PostgreSQL

    // const { PrismaClient } = require('@saas-poc/shared');
    // const prisma = new PrismaClient();
    // await prisma.call.create({ data: ... })
  },
  { connection }
);

worker.on('completed', (job) => {
  console.log('Job completed:', job.id);
});
worker.on('failed', (job, err) => {
  console.log('Job failed:', job?.id, err);
});
