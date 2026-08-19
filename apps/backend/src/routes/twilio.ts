import { FastifyInstance } from 'fastify';
import twilio from 'twilio';
import fs from 'fs';
import path from 'path';

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

  fastify.get('/phone-numbers', async (request, reply) => {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;

      if (!accountSid || !authToken) {
        return reply.status(500).send({ error: 'Twilio credentials not configured' });
      }

      const client = twilio(accountSid, authToken);
      const incomingPhoneNumbers = await client.incomingPhoneNumbers.list({ limit: 50 });

      const mappedNumbers = incomingPhoneNumbers.map((num) => ({
        sid: num.sid,
        friendlyName: num.friendlyName,
        phoneNumber: num.phoneNumber,
        locality: (num as any).locality,
        region: (num as any).region,
        status: num.status,
        capabilities: num.capabilities,
        voiceUrl: num.voiceUrl,
        smsUrl: num.smsUrl,
        dateCreated: num.dateCreated
      }));

      return reply.send({ phoneNumbers: mappedNumbers });
    } catch (error: any) {
      request.log.error(error);
      return reply
        .status(500)
        .send({ error: 'Failed to fetch Twilio phone numbers', details: error.message });
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

      // Fetch Account Balance and Type
      const balanceData = await client.api.v2010.accounts(accountSid).balance.fetch();
      const accountData = await client.api.v2010.accounts(accountSid).fetch();

      // Fetch ALL usage records for this month
      const allUsage = await client.usage.records.thisMonth.list();

      // Filter usage records that have actual usage > 0 (or are in our known tracking config)
      const activeUsage = allUsage.filter(
        (u: any) => parseFloat(u.usage) > 0 || parseFloat(u.price) > 0
      );

      // Read dynamic limits configuration from JSON file so it's not hardcoded
      const configPath = path.join(__dirname, '../twilio-limits.json');
      let configuredLimits: any = {};
      try {
        if (fs.existsSync(configPath)) {
          configuredLimits = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
      } catch (e) {
        request.log.error('Failed to read twilio-limits.json', e);
      }

      // Dynamically build the limits array for the frontend
      const limitsResponse = activeUsage.map((record: any) => {
        const config = configuredLimits[record.category] || {};
        const consumed = parseFloat(record.usage) || 0;
        // If a limit is configured, use it. Otherwise, set it to 0 (meaning unlimited or untracked limit)
        const freeUnits = config.limit !== undefined ? config.limit : 0;

        return {
          product: config.product || record.description || record.category,
          channel: config.channel || 'Other',
          freeUnits: freeUnits,
          consumed: consumed,
          unit: config.unit || record.usageUnit || 'units',
          // If freeUnits is 0, we treat it as Pay-as-you-go / unlimited free units
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
