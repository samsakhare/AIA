import { ITelephonyProvider } from './telephony/ITelephonyProvider';
import { TwilioProvider } from './telephony/TwilioProvider';
import { IVoiceAgentProvider } from './voice-ai/IVoiceAgentProvider';
import { VapiProvider } from './voice-ai/VapiProvider';

export class ProviderFactory {
  static getTelephonyProvider(type: 'twilio' | 'plivo' = 'twilio'): ITelephonyProvider {
    switch (type) {
      case 'twilio':
        return new TwilioProvider();
      default:
        throw new Error('Unsupported telephony provider');
    }
  }

  static getVoiceAgentProvider(type: 'vapi' | 'bolna' = 'vapi'): IVoiceAgentProvider {
    switch (type) {
      case 'vapi':
        return new VapiProvider();
      default:
        throw new Error('Unsupported voice agent provider');
    }
  }
}
