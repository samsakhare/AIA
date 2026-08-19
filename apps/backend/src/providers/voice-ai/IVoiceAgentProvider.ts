export interface IVoiceAgentProvider {
  dispatchAgent(conferenceName: string, config: any): Promise<void>;
  triggerGreeting(callId: string): Promise<void>;
}
