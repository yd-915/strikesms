const client = require('twilio')(
  process.env.twilioSid,
  process.env.twilioAuthToken
)

client.messages
    .create({
        from: '+16474922775',
        to: '+16475739491'
    })
    .then(message => console.log(message.sid))
    .done();
