const path = require('node:path');
const { randomBytes } = require('node:crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('Set a random JWT_SECRET of at least 32 characters.');
  if (!process.env.MONGO_URL) throw new Error('Set MONGO_URL for deployment.');
}
module.exports = {
  mongoUrl: process.env.MONGO_URL || 'mongodb://127.0.0.1:27027',
  dbName: process.env.MONGO_DB || 'secondChance',
  port: Number(process.env.PORT || 3060),
  jwtSecret: process.env.JWT_SECRET || randomBytes(48).toString('hex'),
  uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, 'public', 'uploads'),
  corsOrigin: process.env.CORS_ORIGIN || false
};
