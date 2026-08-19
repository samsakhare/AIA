import { ITelephonyProvider } from './ITelephonyProvider';
import twilio from 'twilio';

export class TwilioProvider implements ITelephonyProvider {
  private client: twilio.Twilio;

  constructor() {
    this.client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }

  async createConferenceAndDialOwner(tenantId: string, ownerNumber: string, customerNumber: string, conferenceName: string, webhookUrl: string): Promise<void> {
    await this.client.calls.create({
      to: ownerNumber,
      from: customerNumber,
      twiml: `<Response><Dial><Conference>${conferenceName}</Conference></Dial></Response>`
    });
  }

  async dialVoiceAgentIntoConference(conferenceName: string, aiAgentPhoneNumber: string): Promise<void> {}

  async dialSipIntoConference(conferenceName: string, sipUri: string, fromNumber: string): Promise<void> {
    await this.client.calls.create({
      to: sipUri,
      from: fromNumber,
      twiml: `<Response><Dial><Conference>${conferenceName}</Conference></Dial></Response>`
    });
  }
}
