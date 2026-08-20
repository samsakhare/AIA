import { ITelephonyProvider } from './ITelephonyProvider';
import twilio from 'twilio';

export class TwilioProvider implements ITelephonyProvider {
  private client: twilio.Twilio;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID as string;
    const apiKey = process.env.TWILIO_API_KEY;
    const apiSecret = process.env.TWILIO_API_SECRET;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (apiKey && apiSecret) {
      this.client = twilio(apiKey, apiSecret, { accountSid });
    } else {
      this.client = twilio(accountSid, authToken as string);
    }
  }

  async createConferenceAndDialOwner(
    tenantId: string,
    ownerNumber: string,
    customerNumber: string,
    conferenceName: string,
    webhookUrl: string
  ): Promise<void> {
    await this.client.calls.create({
      to: ownerNumber,
      from: customerNumber,
      twiml: `<Response><Dial><Conference>${conferenceName}</Conference></Dial></Response>`
    });
  }

  async dialVoiceAgentIntoConference(
    conferenceName: string,
    aiAgentPhoneNumber: string
  ): Promise<void> {}

  async dialSipIntoConference(
    conferenceName: string,
    sipUri: string,
    fromNumber: string
  ): Promise<void> {
    await this.client.calls.create({
      to: sipUri,
      from: fromNumber,
      twiml: `<Response><Dial><Conference>${conferenceName}</Conference></Dial></Response>`
    });
  }
}
