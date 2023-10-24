const router = require('express').Router()
const User = require('../db/models/user')
module.exports = router

const MessagingResponse = require('twilio').twiml.MessagingResponse
const client = require('twilio')(
 process.env.TWILIO_ACCOUNT_SID,
 process.env.TWILIO_AUTH_TOKEN
)

const twilioPhone = '+16474922775'

const sendMessage = (phone, body) => {
  client.messages
    .create({
      body: body,
      from: twilioPhone,
      to: phone
    })
    .then(message => console.log(message.sid))
}

router.post('/login', async (req, res, next) => {
  try {
    const user = await User.findOne({
      where: {email: req.body.email.toLowerCase()}
    })
    console.log(req.body.email, 'Here is the email')
    if (!user) {
      console.log('No such user found:', req.body.email)
      res.status(401).send('Wrong username and/or password')
    } else if (!user.correctPassword(req.body.password)) {
      console.log('Incorrect password for user:', req.body.email)
      res.status(401).send('Wrong username and/or password')
    } else {
      req.login(user, err => (err ? next(err) : res.json(user)))
    }
  } catch (err) {
    next(err)
  }
})

router.post('/signup', async (req, res, next) => {
  try {
    let userInfo = {
      username: req.body.username.toLowerCase(),
      email: req.body.email,
      password: req.body.password,
      phone: req.body.phone,
      wallet: req.body.wallet
    }

    // ... (existing code)


    console.log(userInfo)
    const user = await User.create(userInfo)
    client.validationRequests
      .create({
        friendlyName: req.body.firstName,
        phoneNumber: req.body.phone,
        callDelay: 7
      })
      .then(validationRequest =>
        sendMessage(
          req.body.phone,
          `Your Twilio code is : 
          ${validationRequest.validationCode} `
        )
      )

      req.login(user, err => (err ? next(err) : res.json(user)))
  } catch (err) {
    console.error(err); // Log the error for debugging

    if (err.name === 'SequelizeUniqueConstraintError') {
      res.status(401).send('User already exists') // Enhance error message for uniqueness constraint error
    } else {
      res.status(500).send('Internal Server Error'); // Generic error message for other errors
    }
  }
})

router.post('/logout', (req, res) => {
  req.logout(() => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
      }
      res.redirect('/');
    });
  });
});

router.get('/me', (req, res) => {
  res.json(req.user)
})

router.use('/google', require('./google'))
