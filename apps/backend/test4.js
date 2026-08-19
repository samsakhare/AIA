const twilio = require('twilio');
const client = twilio('AC8950d1f4943a479e558d9ea1d0a43301', 'cf75d1e61ef5a761637dc195aad2002d');

async function run() {
  try {
    const num = '+18126098135';
    // try to get area code
    const areaCode = num.substring(2, 5);
    const available = await client.availablePhoneNumbers('US').local.list({ areaCode, limit: 1 });
    console.log(available[0].locality, available[0].region);
  } catch (e) {
    console.error(e);
  }
}
run();
