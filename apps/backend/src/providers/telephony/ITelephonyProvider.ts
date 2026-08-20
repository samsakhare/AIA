export interface ITelephonyProvider {
  createConferenceAndDialOwner(
    tenantId: string,
    ownerNumber: string,
    customerNumber: string,
    conferenceName: string,
    webhookUrl: string
  ): Promise<void>;
  dialVoiceAgentIntoConference(conferenceName: string, aiAgentPhoneNumber: string): Promise<void>;
  dialSipIntoConference(conferenceName: string, sipUri: string, fromNumber: string): Promise<void>;
  redirectCall(callSid: string, twiml: string): Promise<void>;
}
