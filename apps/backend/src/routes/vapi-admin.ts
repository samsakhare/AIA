import { FastifyInstance } from 'fastify';
import { prisma } from '@saas-poc/shared';
import { fetchRawAgents } from '../services/vapi';

export default async function vapiAdminRoutes(fastify: FastifyInstance) {
  // Check SUPER_ADMIN middleware
  fastify.addHook('preHandler', async (request, reply) => {
    try {
      await request.jwtVerify();
      const decoded = request.user as any;
      if (decoded.role !== 'SUPER_ADMIN') {
        return reply.status(403).send({ error: 'Forbidden. Super Admin only.' });
      }
    } catch (err) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // GET /vapi/admin/raw-agents
  fastify.get('/raw-agents', async (request, reply) => {
    try {
      const rawAgents = await fetchRawAgents();
      return reply.send({ agents: rawAgents });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch raw agents from Vapi' });
    }
  });

  // GET /vapi/admin/templates
  fastify.get('/templates', async (request, reply) => {
    try {
      const templates = await prisma.agentTemplate.findMany({
        orderBy: { createdAt: 'desc' }
      });
      return reply.send({ templates });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch templates' });
    }
  });

  // POST /vapi/admin/templates
  fastify.post('/templates', async (request, reply) => {
    try {
      const { vapiTemplateId, name, description, masterPrompt } = request.body as any;
      if (!vapiTemplateId || !name) {
        return reply.status(400).send({ error: 'vapiTemplateId and name are required' });
      }

      const template = await prisma.agentTemplate.create({
        data: {
          vapiTemplateId,
          name,
          description,
          masterPrompt
        }
      });
      return reply.send({ success: true, template });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to create template', details: error.message });
    }
  });

  // PUT /vapi/admin/templates/:id
  fastify.put('/templates/:id', async (request, reply) => {
    try {
      const { id } = request.params as any;
      const { name, description, masterPrompt } = request.body as any;

      const template = await prisma.agentTemplate.update({
        where: { id },
        data: {
          name,
          description,
          masterPrompt
        }
      });
      return reply.send({ success: true, template });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to update template', details: error.message });
    }
  });

  // DELETE /vapi/admin/templates/:id
  fastify.delete('/templates/:id', async (request, reply) => {
    try {
      const { id } = request.params as any;
      await prisma.agentTemplate.delete({ where: { id } });
      return reply.send({ success: true });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete template', details: error.message });
    }
  });

  // GET /vapi/admin/user-agents
  fastify.get('/user-agents', async (request, reply) => {
    try {
      const agents = await prisma.userAgent.findMany({
        orderBy: { createdAt: 'desc' },
        include: { user: true, template: true }
      });
      return reply.send({ agents });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch user agents' });
    }
  });
}

