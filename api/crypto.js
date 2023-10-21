/* eslint-disable handle-callback-err */

var fs = require('fs')
const request = require('request')
const axios = require('axios')
const {User} = require('../db/models')

const basePort = 'https://127.0.0.1:8081'
// const basePort = 'https://192.168.1.1:8080'
const walletPassword = 'hello'

const CronJob = require('cron').CronJob
const macaroon = fs.readFileSync('api/admin.macaroon').toString('hex')

const checkRefill = async address => {
  try {
    const {data} = await axios.get(
      `https://api.blockcypher.com/v1/btc/main/addrs/${address}/balance`
    )
    return data
  } catch (err) {
    console.log(
      'The address provided is not yet recognized by BlockCypher. We will try again in 10 minutes.'
    )
  }
}

const refill = async (user, amount) => {
  let refillBalance = user.balance + amount

  let refilledUser = await User.update(
    {balance: refillBalance},
    {where: {id: user.id}}
  )
  console.log('REFILLED USER: ', refilledUser)
}

const startCron = (address, sender) => {
  console.log('Before job instantiation')
  const job = new CronJob('0 */10 * * * *', async function() {
    const d = new Date()
    console.log('Every Ten Minute:', d)
    let refillData = await checkRefill(address)
    console.log('REFILL DATA FROM BLOCKCYPHER: ', refillData.balance)
    console.log('ADDRESS INFORMATION IS: ', refillData)
    if (refillData.balance > 0) {
      refill(sender, refillData.balance)
      job.stop()
    }
  })
  console.log('After job instantiation')
  job.start()
}

const genSeed = () => {
  let options = {
    url: 'https://127.16.19.16:8080/v1/genseed',
    // Work-around for self-signed certificates.
    rejectUnauthorized: false,
    json: true
  }

  return request.get(options, function(error, response, body) {
    console.log(body)
    console.error(error)
  })
}

const initWallet = async password => {
  const seed = await genSeed()
  let requestBody = {
    wallet_password: password,
    cipher_seed_mnemonic: seed
  }

  let options = {
    url: 'https://127.16.19.16:8080/v1/initwallet',
    // Work-around for self-signed certificates.
    rejectUnauthorized: false,
    json: true,
    form: JSON.stringify(requestBody)
  }

  request.get(options, function(error, response, body) {
    console.log(body)
    console.error(error)
  })
}

const unlockwallet = (password, cb) => {
  let requestBody = {
    wallet_password: Buffer.from(password).toString('base64')
  }
  let options = {
    url: `${basePort}/v1/unlockwallet`,
    // Work-around for self-signed certificates.
    rejectUnauthorized: false,
    json: true,
    form: JSON.stringify(requestBody)
  }
  request.post(options, function(error, response, body) {
    console.log(body)
    setTimeout(() => {
      cb()
    }, 3000)
  })
}

const getinfo = () => {
  let options = {
    url: `${basePort}/v1/getinfo`,
    // Work-around for self-signed certificates.
    rejectUnauthorized: false,
    json: true,
    headers: {
      'Grpc-Metadata-macaroon': macaroon
    }
  }

  request.get(options, function(error, response, body) {
    console.log(body)
    console.error(error)
  })
}

// newAddress() returns the a new Bitcoin address for refills
const newAddress = async () => {
  let refillAddress = ''
  let options = {
    url: `${basePort}/v1/newaddress`,
    // Work-around for self-signed certificates.
    rejectUnauthorized: false,
    json: true,
    headers: {
      'Grpc-Metadata-macaroon': macaroon
    },
    type: 'np2wkh'
  }
  let x = new Promise((resolve, reject) => {
    request.get(options, function(error, response, body) {
      if (error) reject(error)
      resolve(body.address)
    })
  })
  return x
}

// balance() returns the wallet balance
const balance = () => {
  let options = {
    url: `${basePort}/v1/balance/blockchain`,
    // Work-around for self-signed certificates.
    rejectUnauthorized: false,
    json: true,
    headers: {
      'Grpc-Metadata-macaroon': macaroon
    }
  }
  request.get(options, function(error, response, body) {
    console.log(body)
  })
}

// getPeers() lists all currently active peers
const getPeers = () => {
  let options = {
    url: `${basePort}/v1/peers`,
    // Work-around for self-signed certificates.
    rejectUnauthorized: false,
    json: true,
    headers: {
      'Grpc-Metadata-macaroon': macaroon
    }
  }
  request.get(options, function(error, response, body) {
    console.log(body)
  })
}

/*
CONNECT NEEDS EDITING TO URL PATH

*/
// connect() establishes a connection to remote peers
const connect = addr => {
  let requestBody = {
    addr: addr,
    perm: true
  }
  let options = {
    url: `${basePort}/v1/newaddress`,
    // Work-around for self-signed certificates.
    rejectUnauthorized: false,
    json: true,
    headers: {
      'Grpc-Metadata-macaroon': macaroon
    },
    form: JSON.stringify(requestBody)
  }
  request.post(options, function(error, response, body) {
    console.log(body)
  })
}

// disconnect() destorys a connection to a specified remote peer
const disconnect = addr => {
  let options = {
    url: `${basePort}/v1/peers/${addr}`,
    // Work-around for self-signed certificates.
    rejectUnauthorized: false,
    json: true,
    headers: {
      'Grpc-Metadata-macaroon': macaroon
    }
  }
  request.delete(options, function(error, response, body) {
    console.log(body)
  })
}

// listChannels() returns currently open channels with the node
const listChannels = () => {
  let options = {
    url: `${basePort}/v1/channels`,
    // Work-around for self-signed certificates.
    rejectUnauthorized: false,
    json: true,
    headers: {
      'Grpc-Metadata-macaroon': macaroon
    }
  }
  request.get(options, function(error, response, body) {
    console.log(body)
  })
}

// openChannel() opens a channel with the specified node
const openChannel = (addr, amount) => {
  let requestBody = {
    node_pubkey: addr,
    local_funding_amount: amount
  }
  let options = {
    url: `${basePort}/v1/channels`,
    // Work-around for self-signed certificates.
    rejectUnauthorized: false,
    json: true,
    headers: {
      'Grpc-Metadata-macaroon': macaroon
    },
    form: JSON.stringify(requestBody)
  }
  request.post(options, function(error, response, body) {
    console.log(body)
  })
}

// getInvoice() returns an invoice based on a payment hash - payRequest must be exactly 32 bytes
const getInvoice = payRequest => {
  let options = {
    url: `${basePort}/v1/invoices/${payRequest}`,
    // requires payment hash in URL above
    // Work-around for self-signed certificates.
    rejectUnauthorized: false,
    json: true,
    headers: {
      'Grpc-Metadata-macaroon': macaroon
    }
  }
  request.post(options, function(error, response, body) {
    console.log(body)
  })
}

const addInvoice = amount => {
  let requestBody = {
    value: amount
  }

  let options = {
    url: `${basePort}/v1/invoices`,
    // Work-around for self-signed certificates.
    rejectUnauthorized: false,
    json: true,
    headers: {
      'Grpc-Metadata-macaroon': macaroon
    },
    form: JSON.stringify(requestBody)
  }
  request.post(options, function(error, response, body) {
    console.log(body)
  })
}

// sendPayment() uses the invoice payment request to send a payment
const sendPayment = async invoice => {
  let requestBody = {
    payment_request: invoice
  }

  let options = {
    url: `${basePort}/v1/channels/transactions`,
    // Work-around for self-signed certificates.
    rejectUnauthorized: false,
    json: true,
    headers: {
      'Grpc-Metadata-macaroon': macaroon
    },
    form: JSON.stringify(requestBody)
  }
  let x = new Promise((resolve, reject) => {
    request.post(options, function(error, response, body) {
      if (error) reject(error)
      console.log('SENDPAYMENT BODY: ', body)
      resolve(body)
    })
  })
  return x
}

module.exports = {
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
  getInvoice,
  addInvoice,
  sendPayment,
  startCron
}
