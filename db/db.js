const Sequelize = require('sequelize')
const pkg = require('../package.json')

const databaseName = pkg.name + (process.env.NODE_ENV === 'test' ? '-test' : '')

const db = new Sequelize(
  process.env.DATABASE_URL ||
    `postgres://postgres:AdgGc1cG1c3fDEd5-bd-c1*fE1b-GeC*@roundhouse.proxy.rlwy.net:21921/railway`, 
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
