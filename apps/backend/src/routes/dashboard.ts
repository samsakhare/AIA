import { FastifyInstance } from 'fastify';
import { prisma } from '@saas-poc/shared';

export default async function dashboardRoutes(fastify: FastifyInstance) {
  // Middleware to enforce Auth on all routes
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  fastify.get('/metrics', async (request, reply) => {
    try {
      const user = request.user as any;
      const { startDate, endDate } = request.query as { startDate?: string; endDate?: string };

      if (!startDate || !endDate) {
        return reply.status(400).send({ error: 'startDate and endDate are required' });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Ensure endDate covers the entire day
      end.setHours(23, 59, 59, 999);

      const result = await prisma.call.aggregate({
        where: {
          userId: user.id,
          createdAt: {
            gte: start,
            lte: end,
          },
        },
        _sum: {
          totalCost: true,
          totalDuration: true,
        },
        _count: {
          id: true,
        },
      });

      return reply.send({
        totalCalls: result._count.id || 0,
        totalCost: result._sum.totalCost || 0,
        totalDuration: result._sum.totalDuration || 0,
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch metrics', details: error.message });
    }
  });
}
