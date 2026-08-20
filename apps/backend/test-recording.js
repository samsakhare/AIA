require('dotenv').config();
const twilio = require('twilio');
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const apiKey = process.env.TWILIO_API_KEY;
const apiSecret = process.env.TWILIO_API_SECRET;
const client = twilio(apiKey, apiSecret, { accountSid });
const callSid = 'CA68bce1e7a0ac4aae534a3eafbfb80e6b';
async function run() {
  const byCall = await client.recordings.list({ callSid });
  console.log('Recordings by callSid:', byCall.map(r => r.sid));
  const confs = await client.conferences.list({ friendlyName: 'conf_' + callSid });
  if (confs.length > 0) {
    const byConf = await client.recordings.list({ conferenceSid: confs[0].sid });
    console.log('Recordings by conferenceSid:', byConf.map(r => r.sid));
  }
}
run();
