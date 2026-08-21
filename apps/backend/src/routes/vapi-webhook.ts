import { FastifyInstance } from 'fastify';
import { prisma } from '@saas-poc/shared';

export default async function vapiWebhookRoutes(fastify: FastifyInstance) {
  fastify.post('/webhook', async (request, reply) => {
    try {
      const payload = request.body as any;

      if (payload?.message?.type === 'end-of-call-report') {
        const callData = payload.message.call;
        if (!callData) return reply.send({ received: true });

        const vapiCallId = callData.id;
        const vapiCost = callData.cost || 0;
        const transcript = payload.message.transcript || callData.transcript || '';
        const summary = payload.message.summary || '';

        // Extract Twilio CallSid from SIP Headers
        const sipHeaders = callData.sipHeaders || {};
        const twilioCallSid = sipHeaders['X-Twilio-CallSid'] || sipHeaders['x-twilio-callsid'];

        if (twilioCallSid) {
          // Find the leg with this CallSid to find the parent Call
          const leg = await prisma.callLeg.findUnique({
            where: { callSid: twilioCallSid },
            include: { call: true }
          });

          if (leg && leg.callId) {
            await prisma.call.update({
              where: { id: leg.callId },
              data: {
                vapiCallId,
                vapiCost,
                vapiTranscript: transcript,
                vapiSummary: summary,
              }
            });
            request.log.info({ vapiCallId, twilioCallSid }, 'Merged Vapi call data with Twilio call');
          } else {
            request.log.warn({ twilioCallSid }, 'Received Vapi end-of-call but no matching Twilio leg found');
          }
        }
      }

      return reply.send({ received: true });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to process Vapi webhook' });
    }
  });
}

