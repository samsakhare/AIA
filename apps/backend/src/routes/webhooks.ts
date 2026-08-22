import { FastifyInstance } from 'fastify';
import { ProviderFactory } from '../providers/ProviderFactory';
import { callQueue } from '../workers/callProcessor';
import { prisma } from '@saas-poc/shared';

// In-memory store to track which incoming calls have been "hijacked" into a conference
const hijackedCalls = new Set<string>();

export default async function webhookRoutes(fastify: FastifyInstance) {
  fastify.post('/twilio/incoming', async (request, reply) => {
    const { From, To, CallSid, ToCity, ToState } = request.body as any;

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
      include: { user: true, activeAgent: true }
    });

    const ownerNumber = twilioRecord?.user?.phoneNumber;

    if (!ownerNumber) {
      request.log.info({ To }, 'Incoming call to unassigned Twilio number');
      return reply
        .type('text/xml')
        .send(`<Response><Say>This number is currently unassigned.</Say></Response>`);
    }

    const protocol = request.headers['x-forwarded-proto'] || 'https';
    const host = request.headers.host || 'aia-api.srv1575169.hstgr.cloud';
    const baseUrl = `${protocol}://${host}/webhooks`;

    const conferenceName = 'conf_' + CallSid;

    // CREATE MASTER CALL RECORD AND FIRST LEG
    try {
      await prisma.call.create({
        data: {
          twilioNumberId: twilioRecord.id,
          userId: twilioRecord.userId,
          from: From,
          to: To,
          status: 'IN_PROGRESS',
          legs: {
            create: {
              callSid: CallSid,
              direction: 'Inbound',
              from: From,
              to: To,
              status: 'IN_PROGRESS'
            }
          }
        }
      });
    } catch (dbErr) {
      request.log.error({ dbErr }, 'Failed to create Call record');
    }

    const vapiAgentId = twilioRecord?.activeAgent?.vapiAgentId;
    const isHijack = !!vapiAgentId;
    let statusCallbackUrl = `${baseUrl}/twilio/owner-answered?conferenceName=${encodeURIComponent(conferenceName)}&amp;customerNumber=${encodeURIComponent(From)}&amp;parentCallSid=${CallSid}`;
    if (isHijack) {
      statusCallbackUrl += `&amp;hijack=true&amp;vapiAgentId=${encodeURIComponent(vapiAgentId)}`;
    }
    
    // We add statusCallback for the generic /status to capture leg completion for the dial leg
    // Wait, <Number> statusCallback only triggers on the events we specify.
    // If we specify "completed", it will hit /status. But we also need "answered" to go to /owner-answered!
    // Twilio only allows one statusCallback URL per <Number>.
    // So we will just use a query param `&amp;trackCompleted=true` and route inside /owner-answered if needed?
    // No, Twilio's Dial <Number> creates a child call. The child call's completion can be captured via a generic status callback IF created via API.
    // Since it's created via TwiML, we will just pass both events to the same URL or use the parent's action URL to detect completion.
    // Let's just track the parent call for now, and the API-generated legs.

    reply
      .type('text/xml')
      .send(`
        <Response>
          <Dial callerId="${To}" answerOnBridge="true" action="${baseUrl}/twilio/dial-action">
            <Number statusCallback="${statusCallbackUrl}" statusCallbackEvent="initiated ringing answered completed">
              ${ownerNumber}
            </Number>
          </Dial>
        </Response>
      `);
  });

  // Handles both the "answered" trigger for hijacking, and standard status updates for the owner leg
  fastify.post('/twilio/owner-answered', async (request, reply) => {
    const { CallSid: childCallSid, CallStatus, Duration } = request.body as any;
    const q = request.query as any;
    const parentCallSid = q.parentCallSid || q['amp;parentCallSid'];
    const conferenceName = q.conferenceName || q['amp;conferenceName'];
    const customerNumber = q.customerNumber || q['amp;customerNumber'];
    const hijack = (q.hijack || q['amp;hijack']) === 'true';
    const vapiAgentId = q.vapiAgentId || q['amp;vapiAgentId'];
    
    // Log the leg status
    if (parentCallSid && childCallSid) {
      try {
        const parentLeg = await prisma.callLeg.findUnique({ where: { callSid: parentCallSid } });
        if (parentLeg) {
          await prisma.callLeg.upsert({
            where: { callSid: childCallSid },
            update: {
              status: CallStatus,
              duration: Duration ? parseInt(Duration) : undefined,
            },
            create: {
              callId: parentLeg.callId,
              callSid: childCallSid,
              direction: 'Outbound',
              from: (request.body as any).From,
              to: (request.body as any).To,
              status: CallStatus
            }
          });
        }
      } catch (err) {
        request.log.error('Failed to log owner leg status');
      }
    }

    // Only hijack on 'answered' if hijack is true
    if (CallStatus === 'in-progress' && parentCallSid && conferenceName && hijack && !hijackedCalls.has(parentCallSid)) {
      hijackedCalls.add(parentCallSid);

      const protocol = request.headers['x-forwarded-proto'] || 'https';
      const host = request.headers.host || 'aia-api.srv1575169.hstgr.cloud';
      const baseUrl = `${protocol}://${host}/webhooks`;

      const telephony = ProviderFactory.getTelephonyProvider();
      
      // Update the owner to be in the conference, AND start recording the conference!
      const recordingCallbackUrl = `${baseUrl}/twilio/recording-ready?parentCallSid=${parentCallSid}`;
      const ownerConferenceTwiML = `<Response><Dial><Conference startConferenceOnEnter="true" endConferenceOnExit="false" record="record-from-start" recordingStatusCallback="${recordingCallbackUrl}" recordingStatusCallbackEvent="completed">${conferenceName}</Conference></Dial></Response>`;
      await telephony.redirectCall(childCallSid, ownerConferenceTwiML);

      const voiceAi = ProviderFactory.getVoiceAgentProvider();
      
      if (vapiAgentId) {
        const sipUri = `sip:${vapiAgentId}@sip.vapi.ai?X-Twilio-CallSid=${parentCallSid}`;
        await telephony.dialSipIntoConference(conferenceName, sipUri, customerNumber || '+1234567890', baseUrl, parentCallSid);
      } else {
        const fallbackSipUri = process.env.VAPI_ASSISTANT_SIP;
        if (fallbackSipUri) {
          await telephony.dialSipIntoConference(conferenceName, fallbackSipUri, customerNumber || '+1234567890', baseUrl, parentCallSid);
        } else {
          await voiceAi.dispatchAgent(conferenceName, {});
        }
      }
    }

    reply.send({ received: true });
  });

  fastify.post('/twilio/dial-action', async (request, reply) => {
    const { CallSid, DialCallStatus, DialCallDuration, CallStatus, CallDuration } = request.body as any;
    
    const protocol = request.headers['x-forwarded-proto'] || 'https';
    const host = request.headers.host || 'aia-api.srv1575169.hstgr.cloud';
    const baseUrl = `${protocol}://${host}/webhooks`;

    if (hijackedCalls.has(CallSid)) {
      hijackedCalls.delete(CallSid);
      const conferenceName = 'conf_' + CallSid;
      
      return reply
        .type('text/xml')
        .send(`
          <Response>
            <Dial action="${baseUrl}/twilio/master-conference-end">
              <Conference startConferenceOnEnter="true" endConferenceOnExit="true">${conferenceName}</Conference>
            </Dial>
          </Response>
        `);
    }

    // Call ended without hijack (rejected, missed, or normal hangup)
    // Send final status update to the parent leg
    try {
      const finalStatus = CallStatus === 'completed' ? 'completed' : (DialCallStatus || CallStatus);
      const duration = CallDuration ? parseInt(CallDuration) : (DialCallDuration ? parseInt(DialCallDuration) : undefined);
      await prisma.callLeg.update({
        where: { callSid: CallSid },
        data: { status: finalStatus, duration }
      });
      const leg = await prisma.callLeg.findUnique({ where: { callSid: CallSid } });
      if (leg) {
        await prisma.call.update({
          where: { id: leg.callId },
          data: { status: finalStatus, totalDuration: duration }
        });
      }
    } catch (e) {}

    return reply.type('text/xml').send(`<Response><Hangup/></Response>`);
  });

  fastify.post('/twilio/master-conference-end', async (request, reply) => {
    const { CallSid, CallStatus, CallDuration } = request.body as any;
    
    try {
      const duration = CallDuration ? parseInt(CallDuration) : undefined;
      await prisma.callLeg.update({
        where: { callSid: CallSid },
        data: { status: CallStatus || 'completed', duration }
      });
      const leg = await prisma.callLeg.findUnique({ where: { callSid: CallSid } });
      if (leg) {
        await prisma.call.update({
          where: { id: leg.callId },
          data: { status: CallStatus || 'completed', totalDuration: duration }
        });
      }
    } catch (e) {}

    return reply.type('text/xml').send(`<Response><Hangup/></Response>`);
  });

  // Generic status callback for API-initiated legs (like the AI SIP dial)
  fastify.post('/twilio/status', async (request, reply) => {
    const { CallSid, ParentCallSid, CallStatus, CallDuration, From, To, Direction } = request.body as any;
    const resolvedParentCallSid = ParentCallSid || (request.query as any).parentCallSid;

    try {
      let leg = await prisma.callLeg.findUnique({ where: { callSid: CallSid } });
      
      if (!leg && resolvedParentCallSid) {
        const parentLeg = await prisma.callLeg.findUnique({ where: { callSid: resolvedParentCallSid } });
        if (parentLeg) {
          leg = await prisma.callLeg.create({
            data: {
              callId: parentLeg.callId,
              callSid: CallSid,
              direction: Direction,
              from: From,
              to: To,
              status: CallStatus
            }
          });
        }
      }

      if (leg) {
        await prisma.callLeg.update({
          where: { id: leg.id },
          data: { 
            status: CallStatus, 
            duration: CallDuration ? parseInt(CallDuration) : undefined 
          }
        });
        
        // If it's the master inbound leg, update the master call too
        if (!ParentCallSid || leg.direction === 'Inbound') {
          await prisma.call.update({
            where: { id: leg.callId },
            data: { 
              status: CallStatus, 
              totalDuration: CallDuration ? parseInt(CallDuration) : undefined 
            }
          });
        }
      }
    } catch (e) {
      request.log.error('Failed to log generic call status');
    }

    reply.send({ received: true });
  });

  // Triggered when Twilio finishes processing the conference audio
  fastify.post('/twilio/recording-ready', async (request, reply) => {
    const { CallSid, RecordingUrl, ConferenceSid } = request.body as any;
    const parentCallSid = (request.query as any).parentCallSid;
    
    const minio = ProviderFactory.getStorageProvider();
    
    try {
      const idToUse = CallSid || ConferenceSid || parentCallSid || 'recording';
      const uploadedUrl = await minio.uploadTwilioRecording(RecordingUrl, idToUse);

      if (parentCallSid) {
        const leg = await prisma.callLeg.findUnique({ where: { callSid: parentCallSid } });
        if (leg) {
          await prisma.call.update({
            where: { id: leg.callId },
            data: { recordingUrl: uploadedUrl }
          });
        }
      }
    } catch (err) {
      request.log.error({ err }, 'Failed to process Twilio recording');
    }

    reply.send({ received: true });
  });

  fastify.post('/vapi/report', async (request, reply) => {
    const payload = request.body;
    await callQueue.add('processCall', payload);
    reply.send({ success: true });
  });
}
