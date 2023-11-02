/* eslint-disable */

const router = require('express').Router()
const axios = require('axios')
const MessagingResponse = require('twilio').twiml.MessagingResponse
const client = require('twilio')(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

const {User} = require('../db/models')
const {
  checkRefill,
  genSeed,
  initWallet,
  unlockwallet,
  getinfo,
  newAddress,
  balance,
  getPeers,
  connect,
  disconnect,
  openChannel,
  listChannels,
  addInvoice,
  sendPayment,
  startCron
} = require('./crypto')
const {Transactions} = require('../db/models')

const twilioPhone = "+16474922775"

module.exports = router

const sendMessage = (phone, body) => {
  client.messages
    .create({
      body: body,
      from: twilioPhone,
      to: phone
    })
    .then(message => console.log('TWILIO MSG ID: ', message.sid))
}

const findUserByPhone = async phone => {
  try {
    const findUser = await User.findOne({
      where: {phone: phone}
    })

    return null || findUser
  } catch (err) {
    throw new Error(err)
  }
}

const findUserByUsername = async (userName) => {
  try {
    const findUser = await User.findOne({
      where: {username: userName}
    })

    if (!findUser) return null
    else {
      return {
        userName: findUser.dataValues.username,
        number: findUser.dataValues.phone,
        userId: findUser.dataValues['id'],
        balance: findUser.dataValues.balance
      }
    }
  } catch (error) {
    throw new Error(error)
  }
}



const getBalance = async phone => {
  try {
    const findUser = await User.findOne({
      where: {phone: phone}
    })
    if (!findUser) console.log('This user does not exist: ', findUser)
    return findUser.dataValues.balance
  } catch (err) {
    throw new Error(err)
  }
}

const getCurrencies = async () => {
  try {
    return await axios.get('https://api.coindesk.com/v1/bpi/currentprice.json')
  } catch (error) {
    console.error(error)
  }
}

const getBody = message => {
  let msg = message.split(' ')
  return msg.filter(word => {
    return word !== ' ' && word.length > 0
  })
}

const updatBalances = async (sender, receiver, amount) => {
  //console.log('sender: ', sender.id, ' receiver: ', receiver)

  let senderBal = Number(sender.balance) - Number(amount)
  let receiverBal = Number(receiver.balance) + Number(amount)

  //subtract from user
  let senderUpdated = await User.update(
    {balance: senderBal},
    {where: {id: sender.id}}
  )

  //add to reciever
  let receiverUpdated = User.update(
    {balance: receiverBal},
    {where: {id: receiver.userId}}
  )
}

const subtract = async (user, amount) => {
  let refillBalance = user.balance - amount

  let refilledUser = await User.update(
    {balance: refillBalance},
    {where: {id: user.id}}
  )
}

router.post('/', async (req, res, next) => {
  let body,
    action,
    amount,
    receiverPhone,
    senderPhone,
    webUserName,
    messageFromWeb,
    toastMessage

  senderPhone = req.user ? req.user.phone : ''
  if (req.body.messages) {
    messageFromWeb = await findUserByUsername(
      getBody(req.body.messages.toLowerCase())[2]
    )
    body = getBody(req.body.messages.toLowerCase())
    action = body[0].toLowerCase()
    amount = body[1]
    if (body.length !== 1) {
      if (!messageFromWeb) {
        toastMessage =
          'The user you are trying to pay is not registered with us. Please try another user.'
        res.send(toastMessage)
      } else {
        receiverPhone = messageFromWeb.number
        webUserName = messageFromWeb.userName
      }
    }
  } else {
    body = getBody(req.body.Body.toLowerCase())
    action = body[0].toLowerCase()
    amount = body[1]
    receiverPhone = body[2]
    senderPhone = req.body.From
  }

  try {
    const twiml = new MessagingResponse()
    twiml.message(req.body.message)

    let ourReceiver = await findUserByUsername(receiverPhone)

    if (ourReceiver === null) {
      ourReceiver = {username: false}
    }

    const sender = (await findUserByPhone(senderPhone)) || 'undefined'

    const receiver =
      (await findUserByPhone(receiverPhone)) ||
      (await ourReceiver.userName) ||
      'undefined'

    const balance = await getBalance(senderPhone)
    const hasSufficientFunds = balance >= amount
    const converterUSD = await getCurrencies()
    const usdRate = converterUSD.data.bpi.USD.rate_float
    const balanceBTC = balance / 100000000
    const balanceUSD = balance * usdRate / 100000000
    let paymentHash = 'unavailable'

    const messages = {
      helpme: `'BALANCE': checks your balance. \n 'SEND': sends a transaction with  'Amt in satoshis' 'Recipient phone number or username' \n Examples:\n 'SEND 300 +11234567890' \n or 'SEND 300 Maurice' \n 'REFILL': generates a BTC address to refill to \n 'PAYINVOICE': pay any LN invoice with 'PAYINVOICE lnbcXXX...'`,
      balance: `Your lightning balance is ${balance} satoshis ($${balanceUSD.toFixed(
        2
      )} USD, ${balanceBTC} BTC).`,
      signup:
        'You are not registered with Strikesms. Please go to Strikesms to signup.',
      receiver:
        'The user you are trying to pay is not registered with us. Please try another user.',
      insufficientBalance:
        'You have insufficient funds. Please enter REFILL to up your funding.',
      sent: `Boom. You made a lightning fast payment to ${ourReceiver.userName ||
        webUserName} for ${amount} satoshis`,
      received: `Boom. You received a lightning fast payment for ${amount} satoshis from ${
        sender.username
      }`,
      refill:
        "Lightning Network is in beta, please don't send more than $20 to the following address:",
      negativeAmount: 'You can only send positive amounts',
      notANumber:
        'You need to enter a valid amount in order to make payments. Example SEND 300 +11234567890',
      fractionAmount: `You can't send fractional satoshis. please send a valid amount`,
      payinvoice: `Boom. You have successfully paid. Your payment hopped `
    }

    if (!sender) {
      toastMessage = messages.signup
      sendMessage(senderPhone, messages.signup)
    } else {
      switch (action) {
        case 'refill':
          let address = await newAddress()
          startCron(address, sender)
          setTimeout(() => {
            toastMessage = address
            return sendMessage(senderPhone, address)
          }, 400)
          toastMessage = messages.refill
          sendMessage(senderPhone, messages.refill)
          break
        case 'balance': {
          toastMessage = messages.balance
          sendMessage(senderPhone, messages.balance)
          break
        }
        case 'helpme':
          toastMessage = messages.helpme
          sendMessage(senderPhone, messages.helpme)
          break
        case 'payinvoice':
          toastMessage = messages.payinvoice
          let payConfirmation = await sendPayment(amount)
          await subtract(sender, payConfirmation.payment_route.total_amt)
          let newBalance = await getBalance(senderPhone)
          paymentHash = payConfirmation.payment_preimage
          let totalFees = payConfirmation.payment_route.total_fees || 0
          let hops = payConfirmation.payment_route.hops.length
          sendMessage(
            senderPhone,
            messages.payinvoice +
              hops +
              ' times for a fee of ' +
              totalFees +
              ' satoshis.' +
              ' Your payment hash is: ' +
              paymentHash
          )
          break
        case 'send':
          if (receiver === 'undefined') {
            console.log(receiver, 'this is')
            toastMessage = messages.receiver
            sendMessage(senderPhone, messages.receiver)
            break
          }
          if (isNaN(amount)) {
            toastMessage = messages.notANumber
            sendMessage(senderPhone, messages.notANumber)
            break
          }
          if (!hasSufficientFunds) {
            toastMessage = messages.insufficientBalance
            sendMessage(senderPhone, messages.insufficientBalance)
            break
          }
          if (amount <= 0) {
            toastMessage = messages.negativeAmount
            sendMessage(senderPhone, messages.negativeAmount)
            break
          }
          if (!(amount % 1 === 0)) {
            sendMessage(senderPhone, messages.fractionAmount)
            break
          }
          //update the balances
          updatBalances(sender, ourReceiver, amount)

          toastMessage = messages.sent
          // CRYPTO.sendPayment(invoice) .then(sendMessage()) - need to update the message object to reflect an invoice number
          sendMessage(senderPhone, messages.sent)

          sendMessage(ourReceiver.number || receiverPhone, messages.received)
          Transactions.create({
            amount: amount,
            receiverId: ourReceiver.userId || messageFromWeb.userId,
            senderId: sender['id']
          })
          break
        // NEED a new case payinvoice that checks the same parameters as SEND except calls the sendPayment() function and returns the paymenthash for confirmation
        default:
          sendMessage(senderPhone, messages.helpme)
      }
    }
    res.send(toastMessage)
    toastMessage = 'default'
    // res.writeHead(200, {'Content-Type': 'text/xml'})
    res.end(twiml.toString())
  } catch (err) {
    console.error(err)
    next(err)
  }
})
