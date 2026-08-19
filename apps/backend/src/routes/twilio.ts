import { FastifyInstance } from 'fastify';
import twilio from 'twilio';
export default async function twilioRoutes(fastify: FastifyInstance) {
  // Middleware to check if user is super admin
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
      const decoded = request.user as any;
      if (decoded.role !== 'SUPER_ADMIN') {
        return reply.status(403).send({ error: 'Unauthorized. Only Super Admins can access Twilio settings.' });
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
        return reply.status(500).send({ 
          error: 'Twilio credentials not configured in environment variables.' 
        });
      }

      const client = twilio(accountSid, authToken);

      // Fetch all incoming phone numbers
      const incomingPhoneNumbers = await client.incomingPhoneNumbers.list({ limit: 50 });
      
      const mappedNumbers = incomingPhoneNumbers.map(num => ({
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
      return reply.status(500).send({ error: 'Failed to fetch Twilio phone numbers', details: error.message });
    }
  });
}
