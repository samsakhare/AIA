import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { prisma } from '@saas-poc/shared';

export default async function userRoutes(fastify: FastifyInstance) {
  // Middleware to enforce Auth on all routes
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // Get current user profile
  fastify.get('/me', async (request, reply) => {
    const user = request.user as any;
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { tenant: true }
    });
    if (!dbUser) return reply.status(404).send({ error: 'User not found' });
    const { password: _, ...safeUser } = dbUser;
    return reply.send(safeUser);
  });

  // Update current user profile
  fastify.put('/me', async (request, reply) => {
    const user = request.user as any;
    const { name, phoneNumber } = request.body as any;
    try {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { name, phoneNumber }
      });
      const { password: _, ...safeUser } = updated;
      return reply.send(safeUser);
    } catch (err) {
      return reply.status(400).send({ error: 'Failed to update profile' });
    }
  });

  // Change password for current user
  fastify.put('/me/password', async (request, reply) => {
    const user = request.user as any;
    const { currentPassword, newPassword } = request.body as any;
    if (!currentPassword || !newPassword) {
      return reply.status(400).send({ error: 'Missing current or new password' });
    }
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) return reply.status(404).send({ error: 'User not found' });

    const isValid = await bcrypt.compare(currentPassword, dbUser.password);
    if (!isValid) return reply.status(400).send({ error: 'Incorrect current password' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });
    return reply.send({ success: true });
  });

  // Get all users
  fastify.get('/', async (request, reply) => {
    const userPayload = request.user as any;
    if (userPayload.role !== 'SUPER_ADMIN') return reply.status(403).send({ error: 'Forbidden' });

    const users = await prisma.user.findMany({
      include: { tenant: true },
      orderBy: { email: 'asc' }
    });
    return reply.send(users.map((u) => {
      const { password, ...safeUser } = u;
      return safeUser;
    }));
  });

  // Create a new user
  fastify.post('/', async (request, reply) => {
    const userPayload = request.user as any;
    if (userPayload.role !== 'SUPER_ADMIN') return reply.status(403).send({ error: 'Forbidden' });

    const { name, email, password, tenantName, role, phoneNumber } = request.body as any;

    if (!email || !password || !tenantName || !phoneNumber) {
      return reply.status(400).send({ error: 'Email, password, company name, and phone number are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return reply.status(400).send({ error: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name: name || null,
        email,
        password: hashedPassword,
        phoneNumber,
        role: role || 'USER',
        tenant: { create: { name: tenantName } }
      },
      include: { tenant: true }
    });

    const { password: _, ...safeUser } = user;
    return reply.send(safeUser);
  });

  // Update a user (Super Admin)
  fastify.put('/:id', async (request, reply) => {
    const userPayload = request.user as any;
    if (userPayload.role !== 'SUPER_ADMIN') return reply.status(403).send({ error: 'Forbidden' });

    const { id } = request.params as { id: string };
    const { name, email, role, password, phoneNumber } = request.body as any;

    try {
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
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

  // Delete a user
  fastify.delete('/:id', async (request, reply) => {
    const userPayload = request.user as any;
    if (userPayload.role !== 'SUPER_ADMIN') return reply.status(403).send({ error: 'Forbidden' });

    const { id } = request.params as { id: string };
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) return reply.status(404).send({ error: 'User not found' });
      if (user.role === 'SUPER_ADMIN') return reply.status(403).send({ error: 'Super Admin cannot be deleted' });

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
