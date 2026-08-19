import { FastifyInstance } from 'fastify';
import { prisma } from '@saas-poc/shared';

export default async function userRoutes(fastify: FastifyInstance) {
  
  // Middleware to enforce SUPER_ADMIN role
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
      const user = request.user as any;
      if (user.role !== 'SUPER_ADMIN') {
        return reply.status(403).send({ error: 'Forbidden: Super Admin only' });
      }
    } catch (err) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // Get all users
  fastify.get('/', async (request, reply) => {
    const users = await prisma.user.findMany({
      include: {
        tenant: true
      },
      orderBy: {
        email: 'asc'
      }
    });
    
    // Omit passwords
    const safeUsers = users.map(u => {
      const { password, ...safeUser } = u;
      return safeUser;
    });

    return reply.send(safeUsers);
  });

  // Update a user
  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { name, email, role } = request.body as any;

    try {
      const updatedUser = await prisma.user.update({
        where: { id },
        data: { name, email, role },
        include: { tenant: true }
      });
      const { password, ...safeUser } = updatedUser;
      return reply.send(safeUser);
    } catch (err) {
      return reply.status(400).send({ error: 'Failed to update user' });
    }
  });

  // Delete a user (and their tenant due to Cascade or manual deletion)
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      // Find the user first to get their tenantId
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      // If user has a tenant, deleting the tenant cascades to the user
      // Alternatively, we can manually delete both. Because we set onDelete: Cascade,
      // deleting the Tenant will delete the User.
      if (user.tenantId) {
        await prisma.tenant.delete({ where: { id: user.tenantId } });
      } else {
        await prisma.user.delete({ where: { id } });
      }

      return reply.send({ success: true });
    } catch (err) {
      return reply.status(400).send({ error: 'Failed to delete user' });
    }
  });
}
