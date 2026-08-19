import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
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
    const safeUsers = users.map((u) => {
      const { password, ...safeUser } = u;
      return safeUser;
    });

    return reply.send(safeUsers);
  });

  // Create a new user (admin onboarding)
  fastify.post('/', async (request, reply) => {
    const { name, email, password, tenantName, role } = request.body as any;

    if (!email || !password || !tenantName) {
      return reply.status(400).send({ error: 'Email, password, and company name are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return reply.status(400).send({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: name || null,
        email,
        password: hashedPassword,
        role: role || 'USER',
        tenant: {
          create: {
            name: tenantName
          }
        }
      },
      include: { tenant: true }
    });

    const { password: _, ...safeUser } = user;
    return reply.send(safeUser);
  });

  // Update a user (with optional password reset)
  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { name, email, role, password } = request.body as any;

    try {
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (role !== undefined) updateData.role = role;
      if (password && password.trim() !== '') {
        updateData.password = await bcrypt.hash(password, 10);
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData,
        include: { tenant: true }
      });
      const { password: _, ...safeUser } = updatedUser;
      return reply.send(safeUser);
    } catch (err) {
      return reply.status(400).send({ error: 'Failed to update user' });
    }
  });

  // Delete a user (SUPER_ADMIN cannot be deleted)
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      if (user.role === 'SUPER_ADMIN') {
        return reply.status(403).send({ error: 'Super Admin cannot be deleted' });
      }

      // Deleting the tenant cascades to the user
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
