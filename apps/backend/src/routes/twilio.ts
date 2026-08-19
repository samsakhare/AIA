import { FastifyInstance } from 'fastify';
import twilio from 'twilio';
import fs from 'fs';
import path from 'path';
import { prisma } from '@saas-poc/shared';

export default async function twilioRoutes(fastify: FastifyInstance) {
  // Middleware to check if user is super admin
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
      const decoded = request.user as any;
      if (decoded.role !== 'SUPER_ADMIN') {
        return reply
          .status(403)
          .send({ error: 'Unauthorized. Only Super Admins can access Twilio settings.' });
      }
    } catch (err) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
  });

  // Get local DB phone numbers
  fastify.get('/phone-numbers', async (request, reply) => {
    try {
      const numbers = await prisma.twilioNumber.findMany({
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
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;

      if (!accountSid || !authToken) {
        return reply.status(500).send({ error: 'Twilio credentials not configured' });
      }

      const client = twilio(accountSid, authToken);
      const incomingPhoneNumbers = await client.incomingPhoneNumbers.list({ limit: 1000 });

      const twilioSids = new Set(incomingPhoneNumbers.map((num) => num.sid));

      // 1. Upsert all numbers from Twilio to our DB
      for (const num of incomingPhoneNumbers) {
        const capabilitiesObj = num.capabilities as any;
        await prisma.twilioNumber.upsert({
          where: { sid: num.sid },
          update: {
            phoneNumber: num.phoneNumber,
            locality: (num as any).locality || null,
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

  // Assign user to phone number
  fastify.put('/phone-numbers/:id/assign', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { userId } = request.body as { userId: string | null };

      const updated = await prisma.twilioNumber.update({
        where: { id },
        data: { userId },
        include: { user: { select: { id: true, name: true, email: true, phoneNumber: true } } }
      });
      return reply.send({ success: true, phoneNumber: updated });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to assign user to phone number' });
    }
  });

  // Delete local phone number
  fastify.delete('/phone-numbers/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      await prisma.twilioNumber.delete({
        where: { id }
      });
      return reply.send({ success: true });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete phone number' });
    }
  });

  fastify.get('/quota', async (request, reply) => {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;

      if (!accountSid || !authToken) {
        return reply.status(500).send({ error: 'Twilio credentials not configured' });
      }

      const client = twilio(accountSid, authToken);

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
}
