import './loadenv.ts'; 

console.log('Loaded environment variables:', {
  SERVER_PORT: process.env.SERVER_PORT,
  FRONTEND_URL: process.env.FRONTEND_URL,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_SSL: process.env.DB_SSL,
}); 

import express from 'express';
import cors from 'cors';


import { validateChequeData } from './services/validationService.ts';
import { testConnection } from './services/db.ts';

const app = express();
const PORT = Number(process.env.SERVER_PORT || 3001);

// Allow all origins in development so the frontend can run on any localhost port (Vite may pick 5000/5001).
const corsOrigin: any = process.env.NODE_ENV === 'development' ? true : (process.env.FRONTEND_URL || 'http://localhost:3000');
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '50mb' }));

app.get('/api/health', async (req, res) => {
  try {
    const dbConnected = await testConnection();
    res.json({ status: 'ok', database: dbConnected ? 'connected' : 'disconnected', timestamp: new Date().toISOString() });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Health check failed:', error);
    res.status(500).json({ status: 'error', error: { message: msg }, message: msg });
  }
});

app.post('/api/validate-cheque', async (req, res) => {
  try {
    const { chequeData } = req.body;
    if (!chequeData) return res.status(400).json({ error: { message: 'Missing chequeData in request body' } });

    const result = await validateChequeData(chequeData);
    res.json({ success: true, validation: result, timestamp: new Date().toISOString() });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Validation failed';
    console.error('Validation error:', error);
    res.status(500).json({ success: false, error: { message: msg }, message: msg });
  }
});

app.post('/api/account-details', async (req, res) => {
  try {
    const { accountNumber } = req.body;
    if (!accountNumber) return res.status(400).json({ error: { message: 'Missing accountNumber in request body' } });

    const { getAccountDetails } = await import('./services/dbQueries.ts');
    const account = await getAccountDetails(accountNumber);
    if (!account) return res.status(404).json({ error: { message: 'Account not found' } });
    res.json({ success: true, account });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch account details';
    console.error('Account lookup error:', error);
    res.status(500).json({ success: false, error: { message: msg }, message: msg });
  }
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  const msg = process.env.NODE_ENV === 'development' ? err?.message ?? 'Internal server error' : 'Internal server error';
  res.status(500).json({ success: false, error: { message: msg }, message: msg });
});

app.use((req, res) => res.status(404).json({ error: 'Endpoint not found', path: req.path }));

app.listen(PORT, () => {
  console.log(`✓ ChequeMate Backend listening on http://localhost:${PORT}`);
  console.log(`✓ CORS enabled for ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});

// Log unhandled rejections and uncaught exceptions so errors surface in logs
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection at:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
