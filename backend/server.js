import fs from 'node:fs';
import express from 'express';
import pg from 'pg';
const { Pool } = pg;
import { initDb } from './db_init_service.js';

const app = express();
// To parse JSON bodies
app.use(express.json());

// Configure Admin pool for initialization
const adminPool = new Pool({
  user: process.env.POSTGRES_USER || 'aloeuser',
  host: process.env.POSTGRES_HOST || 'postgres',
  database: process.env.POSTGRES_DB || 'aloe2',
  password: process.env.POSTGRES_PASSWORD_FILE ? fs.readFileSync(process.env.POSTGRES_PASSWORD_FILE, 'utf8').trim() : (process.env.POSTGRES_PASSWORD || 'sdlfjsl;aj23r@Fasd'),
  port: process.env.POSTGRES_PORT || 5432,
});

// Configure restricted App pool for active connections
const websiteUser = process.env.WEBSITE_POSTGRES_USER || 'aloe_website';
// For security in prod, consider providing this via secret file or env var
const websitePassword = process.env.WEBSITE_POSTGRES_PASSWORD || 'aloe_website_secure_123!';

const appPool = new Pool({
  user: websiteUser,
  host: process.env.POSTGRES_HOST || 'postgres',
  database: process.env.POSTGRES_DB || 'aloe2',
  password: websitePassword,
  port: process.env.POSTGRES_PORT || 5432,
});

// Initialize database
let dbInitialized = false;
let activePool = appPool; // default to restricted pool

initDb(adminPool, websiteUser, websitePassword).then((restrictedRoleActive) => {
  dbInitialized = true;
  if (!restrictedRoleActive) {
     activePool = adminPool; // fallback to admin if restricted setup failed
     console.log('Database initialized. Application is using the admin connection fallback.');
  } else {
     console.log('Database initialized successfully with restricted runtime user.');
     adminPool.end(); // close admin connections
  }
}).catch(err => {
  console.error('Error initializing database:', err);
});

app.post('/api/waitlist', async (req, res) => {
  if (!dbInitialized) {
    return res.status(503).json({ error: 'Database not initialized yet.' });
  }

  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Invalid email provided.' });
  }

  try {
    const client = await activePool.connect();
    try {
      await client.query(
        'INSERT INTO website.waitlist_emails (email) VALUES ($1) ON CONFLICT (email) DO NOTHING',
        [email.trim().toLowerCase()]
      );
      res.status(200).json({ success: true, message: 'Email saved to waitlist.' });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error saving waitlist email:', err);
    res.status(500).json({ error: 'Failed to save waitlist email.' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', db: dbInitialized });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Website backend running on port ${PORT}`);
});
