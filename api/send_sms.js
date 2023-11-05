const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN';
const client = require('twilio')(accountSid, authToken);

client.messages
    .create({
        to: '+16475739491'
    })
    .then(message => console.log(message.sid))
    .done();
