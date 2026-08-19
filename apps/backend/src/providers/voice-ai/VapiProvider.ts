import { IVoiceAgentProvider } from './IVoiceAgentProvider';

export class VapiProvider implements IVoiceAgentProvider {
  async dispatchAgent(conferenceName: string, config: any): Promise<void> {
    console.log('Dispatching Vapi agent to conference: ' + conferenceName);
    // await fetch('https://api.vapi.ai/call', { ... })
  }

  async triggerGreeting(callId: string): Promise<void> {
    console.log('Triggering Vapi greeting via control message for call: ' + callId);
    // await fetch(https://api.vapi.ai/call//control, { method: 'POST', body: JSON.stringify({ type: 'say', text: 'Hello, I am ready to help.' }) })
  }
}
