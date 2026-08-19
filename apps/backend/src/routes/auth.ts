import { FastifyInstance } from 'fastify';

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/login', async (request, reply) => {
    // mock login
    const token = fastify.jwt.sign({ role: 'SUPER_ADMIN' });
    reply.send({ token });
  });
}
