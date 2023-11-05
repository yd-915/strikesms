const client = require('twilio')(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

client.messages
    .create({
                to: '+16475739491'
    })
    .then(message => console.log(message.sid))
    .done();
