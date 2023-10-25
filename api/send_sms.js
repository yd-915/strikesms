const client = require('twilio')(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

client.messages
  .create({
    body: '',
    from: '+16474922775',
    to: '6475739491'
  })
  .then(message => console.log(message.sid))
  .done();
