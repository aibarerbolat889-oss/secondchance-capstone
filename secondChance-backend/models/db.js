const { MongoClient } = require('mongodb');
const config = require('../config');
let client;
let connection;
// Cache the connection promise so simultaneous requests share one client.
async function connectToDatabase() {
  if (!connection) {
    client = new MongoClient(config.mongoUrl, { serverSelectionTimeoutMS: 5000 });
    connection = (async () => {
      await client.connect();
      const db = client.db(config.dbName);
      await db.collection('users').createIndex({ email: 1 }, { unique: true });
      await db.collection('secondChanceItems').createIndex({ id: 1 }, { unique: true });
      await db.collection('secondChanceItems').createIndex({ category: 1 });
      return db;
    })().catch(async error => {
      await client.close();
      connection = null;
      throw error;
    });
  }
  return connection;
}
async function closeDatabase() {
  if (connection) await connection.catch(() => {});
  if (client) await client.close();
  connection = null;
}
module.exports = connectToDatabase;
module.exports.closeDatabase = closeDatabase;
