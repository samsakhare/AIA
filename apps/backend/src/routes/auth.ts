import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { prisma } from '@saas-poc/shared';

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/register', async (request, reply) => {
    const { email, password, tenantName, phoneNumber } = request.body as any;

    if (!email || !password || !tenantName || !phoneNumber) {
      return reply
        .status(400)
        .send({ error: 'Email, password, tenantName, and phoneNumber are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return reply.status(400).send({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create Tenant and User in a transaction
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        phoneNumber,
        role: 'USER',
        tenant: {
          create: {
            name: tenantName
          }
        }
      }
    });

    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId
    });

    reply.send({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  });

  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body as any;

    if (!email || !password) {
      return reply.status(400).send({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId
    });

    reply.send({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  });
}
