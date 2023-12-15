const client = require('twilio')(
  "ACcb1b9e5e59f2e932b1c02a9cecd7d2b8",
  process.env.twilioAuthToken
)

client.messages
    .create({
        from: '+16474922775',
        to: '+16475739491'
    })
    .then(message => console.log(message.sid))

