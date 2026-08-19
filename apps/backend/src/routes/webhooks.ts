import { FastifyInstance } from 'fastify';
import { ProviderFactory } from '../providers/ProviderFactory';
import { callQueue } from '../workers/callProcessor';
import { prisma } from '@saas-poc/shared';

export default async function webhookRoutes(fastify: FastifyInstance) {
  fastify.post('/twilio/incoming', async (request, reply) => {
    const { From, To, CallSid, ToCity, ToState } = request.body as any;

    // Lazily update Locality if it comes in via the webhook
    if (ToCity || ToState) {
      const localityStr = [ToCity, ToState].filter(Boolean).join(', ');
      try {
        await prisma.twilioNumber.updateMany({
          where: { phoneNumber: To, locality: null },
          data: { locality: localityStr }
        });
      } catch (err) {
        request.log.error({ err }, 'Failed to update twilio number locality');
      }
    }

    const telephony = ProviderFactory.getTelephonyProvider();
    const voiceAi = ProviderFactory.getVoiceAgentProvider();

    const conferenceName = 'conf_' + CallSid;
    const tenantId = 'mock-tenant-id';
    const ownerNumber = '+1234567890'; // In real app, query from DB

    // Dial the owner
    await telephony.createConferenceAndDialOwner(
      tenantId,
      ownerNumber,
      From,
      conferenceName,
      'https://ngrok.url'
    );

    // Dial VAPI via SIP if configured in env
    const sipUri = process.env.VAPI_ASSISTANT_SIP;
    if (sipUri) {
      await telephony.dialSipIntoConference(conferenceName, sipUri, To);
    } else {
      await voiceAi.dispatchAgent(conferenceName, {});
    }

    // Return TwiML to drop the caller into the conference
    reply
      .type('text/xml')
      .send(`<Response><Dial><Conference>${conferenceName}</Conference></Dial></Response>`);
  });

  fastify.post('/twilio/status', async (request, reply) => {
    const { StatusCallbackEvent, ParticipantCallSid, CallSid } = request.body as any;

    if (StatusCallbackEvent === 'participant-leave') {
      const isOwner = true;
      if (isOwner) {
        const voiceAi = ProviderFactory.getVoiceAgentProvider();
        await voiceAi.triggerGreeting(CallSid);
      }
    }
    reply.send({ received: true });
  });

  fastify.post('/vapi/report', async (request, reply) => {
    const payload = request.body;
    await callQueue.add('processCall', payload);
    reply.send({ success: true });
  });
}
