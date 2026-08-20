import { FastifyInstance } from 'fastify';
import twilio from 'twilio';
import fs from 'fs';
import path from 'path';
import { prisma } from '@saas-poc/shared';
import { ProviderFactory } from '../providers/ProviderFactory';

export default async function twilioRoutes(fastify: FastifyInstance) {
  // Middleware to check if user is authenticated
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
  });

  // Get local DB phone numbers
  fastify.get('/phone-numbers', async (request, reply) => {
    try {
      const decoded = request.user as any;
      const whereClause = decoded.role === 'SUPER_ADMIN' ? {} : { userId: decoded.id };
      
      const numbers = await prisma.twilioNumber.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true, phoneNumber: true } } }
      });
      return reply.send({ phoneNumbers: numbers });
    } catch (error: any) {
      request.log.error(error);
      return reply
        .status(500)
        .send({ error: 'Failed to fetch local Twilio phone numbers', details: error.message });
    }
  });

  // Sync phone numbers from Twilio API
  fastify.post('/phone-numbers/sync', async (request, reply) => {
    const decoded = request.user as any;
    if (decoded.role !== 'SUPER_ADMIN') return reply.status(403).send({ error: 'Forbidden' });
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const apiKey = process.env.TWILIO_API_KEY;
      const apiSecret = process.env.TWILIO_API_SECRET;
      const authToken = process.env.TWILIO_AUTH_TOKEN;

      if (!accountSid) {
        return reply.status(500).send({ error: 'Twilio Account SID not configured' });
      }

      let client;
      if (apiKey && apiSecret) {
        client = twilio(apiKey, apiSecret, { accountSid });
      } else if (authToken) {
        client = twilio(accountSid, authToken);
      } else {
        return reply.status(500).send({ error: 'Twilio credentials (API Key or Auth Token) not configured' });
      }
      const incomingPhoneNumbers = await client.incomingPhoneNumbers.list({ limit: 1000 });

      const twilioSids = new Set(incomingPhoneNumbers.map((num) => num.sid));

      // 1. Upsert all numbers from Twilio to our DB
      for (const num of incomingPhoneNumbers) {
        const capabilitiesObj = num.capabilities as any;
        await prisma.twilioNumber.upsert({
          where: { sid: num.sid },
          update: {
            phoneNumber: num.phoneNumber,
            capabilities: capabilitiesObj,
            status: 'ACTIVE',
            twilioData: num as any
          },
          create: {
            sid: num.sid,
            phoneNumber: num.phoneNumber,
            locality: (num as any).locality || null,
            capabilities: capabilitiesObj,
            status: 'ACTIVE',
            twilioData: num as any
          }
        });
      }

      // 2. Mark local numbers that are missing in Twilio as RELEASED
      const allLocalNumbers = await prisma.twilioNumber.findMany();
      for (const localNum of allLocalNumbers) {
        if (!twilioSids.has(localNum.sid) && localNum.status !== 'RELEASED') {
          await prisma.twilioNumber.update({
            where: { id: localNum.id },
            data: { status: 'RELEASED' }
          });
        }
      }

      return reply.send({ success: true, message: 'Sync complete' });
    } catch (error: any) {
      request.log.error(error);
      return reply
        .status(500)
        .send({ error: 'Failed to sync Twilio phone numbers', details: error.message });
    }
  });

  // Assign a user to a Twilio number
  fastify.put('/phone-numbers/:id/assign', async (request, reply) => {
    const decoded = request.user as any;
    if (decoded.role !== 'SUPER_ADMIN') return reply.status(403).send({ error: 'Forbidden' });
    try {
      const { id } = request.params as { id: string };
      const { userId } = request.body as { userId: string | null };

      const updated = await prisma.twilioNumber.update({
        where: { id },
        data: { userId },
        include: { user: { select: { id: true, name: true, email: true, phoneNumber: true } } }
      });

      return reply.send({ success: true, phone: updated });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to assign user', details: error.message });
    }
  });

  // Delete a Twilio number (only locally)
  fastify.delete('/phone-numbers/:id', async (request, reply) => {
    const decoded = request.user as any;
    if (decoded.role !== 'SUPER_ADMIN') return reply.status(403).send({ error: 'Forbidden' });
    try {
      const { id } = request.params as { id: string };

      await prisma.twilioNumber.delete({ where: { id } });

      return reply.send({ success: true });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete phone number', details: error.message });
    }
  });

  // Get usage quota from Twilio API
  fastify.get('/quota', async (request, reply) => {
    const decoded = request.user as any;
    if (decoded.role !== 'SUPER_ADMIN') return reply.status(403).send({ error: 'Forbidden' });
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const apiKey = process.env.TWILIO_API_KEY;
      const apiSecret = process.env.TWILIO_API_SECRET;
      const authToken = process.env.TWILIO_AUTH_TOKEN;

      if (!accountSid) {
        return reply.status(500).send({ error: 'Twilio Account SID not configured' });
      }

      let client;
      if (apiKey && apiSecret) {
        client = twilio(apiKey, apiSecret, { accountSid });
      } else if (authToken) {
        client = twilio(accountSid, authToken);
      } else {
        return reply.status(500).send({ error: 'Twilio credentials (API Key or Auth Token) not configured' });
      }

      const balanceData = await client.api.v2010.accounts(accountSid).balance.fetch();
      const accountData = await client.api.v2010.accounts(accountSid).fetch();

      const allUsage = await client.usage.records.thisMonth.list();
      const activeUsage = allUsage.filter(
        (u: any) => parseFloat(u.usage) > 0 || parseFloat(u.price) > 0
      );

      const configPath = path.join(__dirname, '../twilio-limits.json');
      let configuredLimits: any = {};
      try {
        if (fs.existsSync(configPath)) {
          configuredLimits = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
      } catch (e: any) {
        request.log.error({ err: e }, 'Failed to read twilio-limits.json');
      }

      const limitsResponse = activeUsage.map((record: any) => {
        const config = configuredLimits[record.category] || {};
        const consumed = parseFloat(record.usage) || 0;
        const freeUnits = config.limit !== undefined ? config.limit : 0;

        return {
          product: config.product || record.description || record.category,
          channel: config.channel || 'Other',
          freeUnits: freeUnits,
          consumed: consumed,
          unit: config.unit || record.usageUnit || 'units',
          remaining:
            freeUnits > 0 ? Math.max(0, freeUnits - consumed) : 'Unlimited (Pay-as-you-go)',
          hasLimit: freeUnits > 0
        };
      });

      return reply.send({
        balance: balanceData.balance,
        currency: balanceData.currency,
        plan: accountData.type === 'Full' ? 'Pay-as-you-go / Full' : 'Trial',
        limits: limitsResponse
      });
    } catch (error: any) {
      request.log.error(error);
      return reply
        .status(500)
        .send({ error: 'Failed to fetch Twilio quota', details: error.message });
    }
  });

  // Get logs for a specific Twilio number
  fastify.get('/phone-numbers/:id/logs', async (request, reply) => {
    try {
      const decoded = request.user as any;
      const { id } = request.params as { id: string };

      const twilioNum = await prisma.twilioNumber.findUnique({ where: { id } });
      if (!twilioNum) {
        return reply.status(404).send({ error: 'Twilio number not found' });
      }

      const whereClause: any = { twilioNumberId: id };
      
      if (decoded.role !== 'SUPER_ADMIN') {
        whereClause.userId = decoded.id;
      }

      const calls = await prisma.call.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        include: {
          legs: {
            orderBy: { createdAt: 'asc' }
          },
          user: { select: { name: true, email: true, phoneNumber: true } }
        }
      });

      // Auto-sync missing costs/durations for completed calls from Twilio
      try {
        const telephony = ProviderFactory.getTelephonyProvider() as any;
        if (telephony.client) {
          for (const c of calls) {
            const isRecent = (new Date().getTime() - c.createdAt.getTime()) < 15 * 60 * 1000;
            if ((c.status === 'completed' || c.status === 'COMPLETED') && (c.totalCost === null || c.totalDuration === null || isRecent)) {
              const masterLeg = c.legs.find((l: any) => l.direction === 'Inbound' || !l.callId /* fallback */) || c.legs[0];
              if (masterLeg) {
                const twilioCall = await telephony.client.calls(masterLeg.callSid).fetch();
                const twilioLegs = await telephony.client.calls.list({ parentCallSid: masterLeg.callSid });
                
                let totalCost = twilioCall.price ? Math.abs(parseFloat(twilioCall.price)) : null;
                
                // Sync child legs
                for (const l of c.legs) {
                  let twCall = l.callSid === masterLeg.callSid ? twilioCall : twilioLegs.find((t: any) => t.sid === l.callSid);
                  if (!twCall && l.callSid !== masterLeg.callSid) {
                    try {
                      twCall = await telephony.client.calls(l.callSid).fetch();
                    } catch (e) {
                      // Skip if invalid callSid
                    }
                  }
                  
                  if (twCall) {
                    const legCost = twCall.price ? Math.abs(parseFloat(twCall.price)) : null;
                    const legDuration = twCall.duration ? parseInt(twCall.duration) : null;
                    
                    await prisma.callLeg.update({
                      where: { id: l.id },
                      data: {
                        status: twCall.status === 'completed' ? 'completed' : l.status,
                        duration: legDuration ?? l.duration,
                        cost: legCost ?? l.cost
                      }
                    });
                    l.duration = legDuration ?? l.duration;
                    l.cost = legCost ?? l.cost;
                    
                    if (legCost !== null && l.callSid !== masterLeg.callSid) {
                      totalCost = (totalCost || 0) + legCost;
                    }
                  }
                }

                // Recover missing legs
                for (const twCall of twilioLegs) {
                  if (!c.legs.find((l: any) => l.callSid === twCall.sid)) {
                    const newLeg = await prisma.callLeg.create({
                      data: {
                        callId: c.id,
                        callSid: twCall.sid,
                        direction: twCall.direction,
                        from: twCall.from,
                        to: twCall.to,
                        status: twCall.status === 'completed' ? 'completed' : twCall.status,
                        duration: twCall.duration ? parseInt(twCall.duration) : undefined,
                        cost: twCall.price ? Math.abs(parseFloat(twCall.price)) : undefined
                      }
                    });
                    c.legs.push(newLeg);
                    c.legs.sort((a: any, b: any) => a.createdAt.getTime() - b.createdAt.getTime());
                    if (twCall.price) {
                      totalCost = (totalCost || 0) + Math.abs(parseFloat(twCall.price));
                    }
                  }
                }

                if (totalCost !== null) {
                  totalCost = parseFloat(totalCost.toFixed(4));
                }

                const finalDuration = twilioCall.duration ? parseInt(twilioCall.duration) : c.totalDuration;
                await prisma.call.update({
                  where: { id: c.id },
                  data: {
                    totalDuration: finalDuration,
                    totalCost: totalCost
                  }
                });
                c.totalDuration = finalDuration;
                c.totalCost = totalCost;

                // Recover recording if missing
                if (!c.recordingUrl) {
                  try {
                    let recordings = await telephony.client.recordings.list({ callSid: masterLeg.callSid });
                    if (!recordings || recordings.length === 0) {
                      const confs = await telephony.client.conferences.list({ friendlyName: 'conf_' + masterLeg.callSid });
                      if (confs && confs.length > 0) {
                        recordings = await telephony.client.recordings.list({ conferenceSid: confs[0].sid });
                      }
                    }
                    if (recordings && recordings.length > 0) {
                      const rec = recordings[0];
                      const minio = ProviderFactory.getStorageProvider();
                      // Twilio provides a media url, we remove .json to get the base uri
                      const baseUri = `https://api.twilio.com${rec.uri.replace('.json', '')}`;
                      const uploadedUrl = await minio.uploadTwilioRecording(baseUri, masterLeg.callSid);
                      await prisma.call.update({ where: { id: c.id }, data: { recordingUrl: uploadedUrl } });
                      c.recordingUrl = uploadedUrl;
                    }
                  } catch (recErr) {
                    console.error(`Failed to recover recording for call ${c.id}:`, recErr);
                  }
                }
              }
            }
          }
        }
      } catch (syncErr) {
        request.log.error({ syncErr }, 'Failed to sync call costs');
      }

      return reply.send({ logs: calls });
    } catch (error: any) {
      request.log.error(error);
      return reply
        .status(500)
        .send({ error: 'Failed to fetch logs', details: error.message });
    }
  });
}
