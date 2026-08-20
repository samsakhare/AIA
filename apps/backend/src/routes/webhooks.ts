import { FastifyInstance } from 'fastify';
import { ProviderFactory } from '../providers/ProviderFactory';
import { callQueue } from '../workers/callProcessor';
import { prisma } from '@saas-poc/shared';

// In-memory store to track which incoming calls have been "hijacked" into a conference
// For a multi-node production setup, this would be moved to Redis or Postgres.
const hijackedCalls = new Set<string>();

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

    const twilioRecord = await prisma.twilioNumber.findUnique({
      where: { phoneNumber: To },
      include: { user: true }
    });

    const ownerNumber = twilioRecord?.user?.phoneNumber;

    if (!ownerNumber) {
      request.log.info({ To }, 'Incoming call to unassigned Twilio number');
      return reply
        .type('text/xml')
        .send(`<Response><Say>This number is currently unassigned.</Say></Response>`);
    }

    // Get the base URL for the webhook callbacks
    const protocol = request.headers['x-forwarded-proto'] || 'https';
    const host = request.headers.host || 'aia-api.srv1575169.hstgr.cloud';
    const baseUrl = `${protocol}://${host}/webhooks`;

    const conferenceName = 'conf_' + CallSid;

    // The Holy Grail routing: 
    // We do NOT use <Conference> here. We use <Dial><Number> so the call is NOT answered 
    // until the owner physically picks up. No premature billing.
    // We attach an action URL to the Dial to intercept the flow later, 
    // and a statusCallback to the Number to know exactly when the owner answers.
    const statusCallbackUrl = `${baseUrl}/twilio/owner-answered?conferenceName=${encodeURIComponent(conferenceName)}&amp;customerNumber=${encodeURIComponent(From)}`;
    
    reply
      .type('text/xml')
      .send(`
        <Response>
          <Dial action="${baseUrl}/twilio/dial-action">
            <Number statusCallback="${statusCallbackUrl}" statusCallbackEvent="answered">
              ${ownerNumber}
            </Number>
          </Dial>
        </Response>
      `);
  });

  // Fired the exact millisecond the Owner presses "Accept" on their cell phone
  fastify.post('/twilio/owner-answered', async (request, reply) => {
    // ParentCallSid is the original Customer's call (incoming)
    // CallSid is the newly created outbound call to the Owner (child)
    const { CallSid: childCallSid, ParentCallSid: parentCallSid } = request.body as any;
    const conferenceName = (request.query as any).conferenceName;
    const customerNumber = (request.query as any).customerNumber;
    
    if (parentCallSid && childCallSid && conferenceName) {
      // 1. Mark this parent call as successfully "hijacked"
      hijackedCalls.add(parentCallSid);

      // 2. Redirect the Owner (child call) into the Conference via REST API
      const telephony = ProviderFactory.getTelephonyProvider();
      const ownerConferenceTwiML = `<Response><Dial><Conference startConferenceOnEnter="true" endConferenceOnExit="false">${conferenceName}</Conference></Dial></Response>`;
      await telephony.redirectCall(childCallSid, ownerConferenceTwiML);

      // 3. Simultaneously dial the AI agent into that same Conference
      const voiceAi = ProviderFactory.getVoiceAgentProvider();
      const sipUri = process.env.VAPI_ASSISTANT_SIP;
      if (sipUri) {
        await telephony.dialSipIntoConference(conferenceName, sipUri, customerNumber || '+1234567890');
      } else {
        await voiceAi.dispatchAgent(conferenceName, {});
      }
    }

    reply.send({ received: true });
  });

  // Fired when the <Dial> verb ends on the Customer's incoming call
  fastify.post('/twilio/dial-action', async (request, reply) => {
    const { CallSid } = request.body as any;
    
    // Check if we intentionally ended the <Dial> by redirecting the child call (hijack)
    if (hijackedCalls.has(CallSid)) {
      // The call was hijacked. The owner is already waiting in the conference.
      // Clean up memory
      hijackedCalls.delete(CallSid);
      
      const conferenceName = 'conf_' + CallSid;
      
      // Drop the caller into the same conference
      return reply
        .type('text/xml')
        .send(`
          <Response>
            <Dial>
              <Conference startConferenceOnEnter="true" endConferenceOnExit="true">${conferenceName}</Conference>
            </Dial>
          </Response>
        `);
    }

    // If we didn't hijack it, it means the owner rejected the call, didn't answer, or they talked normally and hung up.
    // In this case, simply hang up the customer call (or send to voicemail).
    return reply.type('text/xml').send(`<Response><Hangup/></Response>`);
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
