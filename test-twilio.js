const twilio = require('twilio');
const client = twilio('AC8950d1f4943a479e558d9ea1d0a43301', 'cf75d1e61ef5a761637dc195aad2002d');

async function run() {
  try {
    const nums = await client.incomingPhoneNumbers.list({ limit: 1 });
    console.log(JSON.stringify(nums[0], null, 2));
  } catch (e) {
    console.error(e);
  }
}
run();
