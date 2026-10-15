const express = require('express');
const cors = require('cors');
const path = require('node:path');
const fs = require('node:fs');
const config = require('./config');
const connectToDatabase = require('./models/db');
const authRoutes = require('./routes/authRoutes');
const secondChanceItemsRoutes = require('./routes/secondChanceItemsRoutes');
const searchRoutes = require('./routes/searchRoutes');
const { app: sentiment } = require('../sentiment');
const app = express();
app.disable('x-powered-by');
// Set TRUST_PROXY=1 only when deployed behind exactly one trusted reverse proxy.
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY));
if (config.corsOrigin) app.use(cors({ origin: config.corsOrigin }));
app.use((_req, res, next) => { res.set('X-Content-Type-Options', 'nosniff'); next(); });
app.use(express.json({ limit: '32kb' }));
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));
app.use('/uploads', express.static(config.uploadDir));
app.use('/api/auth', authRoutes);
app.use('/api/secondchance/items', secondChanceItemsRoutes);
app.use('/api/secondchance/search', searchRoutes);
app.use('/api', sentiment);
app.get('/health', async (_req, res) => {
  try { const db = await connectToDatabase(); await db.command({ ping: 1 }); res.json({ status: 'ok' }); }
  catch (_error) { res.status(503).json({ status: 'database-unavailable' }); }
});
app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }));
const front = path.join(__dirname, '..', 'secondChance-frontend', 'dist');
const publicFront = path.join(__dirname, '..', 'secondChance-frontend', 'public');
app.get('/', (_req, res) => res.sendFile(path.join(fs.existsSync(front) ? front : publicFront, 'home.html')));
app.use(express.static(fs.existsSync(front) ? front : publicFront));
app.get(['/app', '/app/*'], (_req, res) => {
  if (!fs.existsSync(path.join(front, 'index.html'))) return res.status(503).send('Run npm run build first.');
  res.sendFile(path.join(front, 'index.html'));
});
app.use((_req, res) => res.status(404).json({ error: 'Page not found.' }));
app.use((error, _req, res, _next) => {
  if (error.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Image must be smaller than 5 MB.' });
  if (error.name === 'MulterError') return res.status(400).json({ error: 'Invalid file upload.' });
  if (error.code === 11000) return res.status(409).json({ error: 'This record already exists.' });
  const status = error.status && error.status >= 400 && error.status < 500 ? error.status : 500;
  if (status === 500) console.error(error.name + ': ' + error.message);
  res.status(status).json({ error: status === 500 ? 'An internal error occurred.' : error.message });
});
async function start() {
  await connectToDatabase();
  const server = app.listen(config.port, '0.0.0.0', () => console.log('SecondChance ready at http://localhost:' + config.port));
  async function stop() { server.close(); await connectToDatabase.closeDatabase(); process.exit(0); }
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}
if (require.main === module) start().catch(error => { console.error(error.message); process.exit(1); });
module.exports = app;
