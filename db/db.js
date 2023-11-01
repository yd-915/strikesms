const Sequelize = require('sequelize')
const pkg = require('../package.json')

const databaseName = pkg.name + (process.env.NODE_ENV === 'test' ? '-test' : '')

const db = new Sequelize(
  process.env.DATABASE_URL ||
    `postgres://postgres:11-DGEb24gd4g4f2BabgcCDCF35B21-a@viaduct.proxy.rlwy.net:12955/railway`, 
  {
    logging: false
  }
)
module.exports = db

// This is a global Mocha hook used for resource cleanup.
// Otherwise, Mocha v4+ does not exit after tests.
if (process.env.NODE_ENV === 'test') {
  after('close database connection', () => db.close())
}
