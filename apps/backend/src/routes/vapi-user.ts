import { FastifyInstance } from 'fastify';
import { prisma } from '@saas-poc/shared';
import { cloneAgent, updateAgentPrompt, deleteAgent, getAgent } from '../services/vapi';

export default async function vapiUserRoutes(fastify: FastifyInstance) {
  // Require Auth
  fastify.addHook('preHandler', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // GET /vapi/templates (list available templates for users)
  fastify.get('/templates', async (request, reply) => {
    try {
      // Users can only see names and descriptions
      const templates = await prisma.agentTemplate.findMany({
        select: {
          id: true,
          name: true,
          description: true,
        },
        orderBy: { createdAt: 'desc' }
      });
      return reply.send({ templates });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch templates' });
    }
  });

  // GET /vapi/agents (list user's cloned agents)
  fastify.get('/agents', async (request, reply) => {
    try {
      const decoded = request.user as any;
      const whereClause = decoded.role === 'SUPER_ADMIN' ? {} : { userId: decoded.id };

      const agents = await prisma.userAgent.findMany({
        where: whereClause,
        include: {
          template: { select: { name: true } },
          user: { 
            select: { 
              email: true, 
              name: true, 
              role: true, 
              tenant: { select: { name: true } } 
            } 
          },
          twilioNumbers: { select: { phoneNumber: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
      return reply.send({ agents });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch agents' });
    }
  });

  // POST /vapi/agents (create a new agent from template)
  fastify.post('/agents', async (request, reply) => {
    try {
      const decoded = request.user as any;
      const { templateId, name, userBusinessPrompt, targetUserId } = request.body as any;

      if (!templateId || !name) {
        return reply.status(400).send({ error: 'templateId and name are required' });
      }

      const template = await prisma.agentTemplate.findUnique({ where: { id: templateId } });
      if (!template) {
        return reply.status(404).send({ error: 'Template not found' });
      }

      const mergedPrompt = `${template.masterPrompt || ''}\n\n${userBusinessPrompt || ''}`.trim();

      // Clone in Vapi
      const newVapiAgent = await cloneAgent(template.vapiTemplateId, mergedPrompt, name);

      // Determine the owner of the agent
      const ownerId = (decoded.role === 'SUPER_ADMIN' && targetUserId) ? targetUserId : decoded.id;

      // Save to DB
      const userAgent = await prisma.userAgent.create({
        data: {
          vapiAgentId: newVapiAgent.id,
          name,
          userBusinessPrompt,
          userId: ownerId,
          templateId
        }
      });

      return reply.send({ success: true, agent: userAgent });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to create agent', details: error.message });
    }
  });

  // PUT /vapi/agents/:id (update business prompt)
  fastify.put('/agents/:id', async (request, reply) => {
    try {
      const decoded = request.user as any;
      const { id } = request.params as any;
      const { name, userBusinessPrompt } = request.body as any;

      const userAgent = await prisma.userAgent.findUnique({
        where: { id },
        include: { template: true }
      });

      if (!userAgent) return reply.status(404).send({ error: 'Agent not found' });
      if (decoded.role !== 'SUPER_ADMIN' && userAgent.userId !== decoded.id) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const mergedPrompt = `${userAgent.template.masterPrompt || ''}\n\n${userBusinessPrompt || ''}`.trim();

      // Update in Vapi
      await updateAgentPrompt(userAgent.vapiAgentId, mergedPrompt, name);

      // Update DB
      const updated = await prisma.userAgent.update({
        where: { id },
        data: {
          name: name || userAgent.name,
          userBusinessPrompt: userBusinessPrompt ?? userAgent.userBusinessPrompt
        }
      });

      return reply.send({ success: true, agent: updated });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to update agent', details: error.message });
    }
  });

  // GET /vapi/agents/:id/sync (JIT sync from Vapi)
  fastify.get('/agents/:id/sync', async (request, reply) => {
    try {
      const decoded = request.user as any;
      const { id } = request.params as any;

      const userAgent = await prisma.userAgent.findUnique({
        where: { id },
        include: { template: true }
      });

      if (!userAgent) return reply.status(404).send({ error: 'Agent not found' });
      if (decoded.role !== 'SUPER_ADMIN' && userAgent.userId !== decoded.id) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      // Fetch latest from Vapi
      const vapiConfig = await getAgent(userAgent.vapiAgentId);
      
      const vapiName = vapiConfig.name || userAgent.name;
      
      // Extract business prompt from Vapi
      const messages = vapiConfig.model?.messages || [];
      const systemMessage = messages.find((m: any) => m.role === 'system')?.content || '';
      const masterPrompt = userAgent.template.masterPrompt || '';
      
      // We assume userBusinessPrompt is whatever comes after masterPrompt
      // Or if masterPrompt is not found at the start, just take the whole system message
      let extractedUserPrompt = systemMessage;
      if (masterPrompt && systemMessage.startsWith(masterPrompt)) {
        extractedUserPrompt = systemMessage.substring(masterPrompt.length).trim();
      }

      // Only update if changed to avoid unnecessary DB writes
      if (vapiName !== userAgent.name || extractedUserPrompt !== userAgent.userBusinessPrompt) {
        const updated = await prisma.userAgent.update({
          where: { id },
          data: { 
            name: vapiName,
            userBusinessPrompt: extractedUserPrompt 
          }
        });
        return reply.send({ success: true, agent: updated });
      }

      return reply.send({ success: true, agent: userAgent });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to sync agent', details: error.message });
    }
  });

  // DELETE /vapi/agents/:id
  fastify.delete('/agents/:id', async (request, reply) => {
    try {
      const decoded = request.user as any;
      const { id } = request.params as any;

      const userAgent = await prisma.userAgent.findUnique({ where: { id } });
      if (!userAgent) return reply.status(404).send({ error: 'Agent not found' });
      
      if (decoded.role !== 'SUPER_ADMIN' && userAgent.userId !== decoded.id) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      // Delete from Vapi
      try {
        await deleteAgent(userAgent.vapiAgentId);
      } catch (err: any) {
        request.log.warn({ err }, 'Failed to delete agent from Vapi or it was already deleted');
      }

      // Delete from DB
      await prisma.userAgent.delete({ where: { id } });

      return reply.send({ success: true });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete agent', details: error.message });
    }
  });
}
