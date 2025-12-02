/**
 * ChequeMate AI - Backend Server
 * 
 * This Express server provides API endpoints for cheque validation
 * with real database connectivity. 
 * 
 * To run:
 * 1. npm install express cors dotenv
 * 2. node server.js
 * 
 * Server runs on http://localhost:3001
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { validateChequeData } from './services/validationService.js';
import { testConnection } from './services/db.js';

// Load environment variables
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5000',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbConnected = await testConnection();
    res.json({
      status: 'ok',
      database: dbConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Validate cheque endpoint
app.post('/api/validate-cheque', async (req, res) => {
  try {
    const { chequeData } = req.body;

    if (!chequeData) {
      return res.status(400).json({
        error: 'Missing chequeData in request body'
      });
    }

    // Run validation with real database checks
    const result = await validateChequeData(chequeData);

    res.json({
      success: true,
      validation: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Validation failed'
    });
  }
});

// Query account details endpoint
app.post('/api/account-details', async (req, res) => {
  try {
    const { accountNumber } = req.body;

    if (!accountNumber) {
      return res.status(400).json({
        error: 'Missing accountNumber in request body'
      });
    }

    const { getAccountDetails } = await import('./services/dbQueries.js');
    const account = await getAccountDetails(accountNumber);

    if (!account) {
      return res.status(404).json({
        error: 'Account not found'
      });
    }

    res.json({
      success: true,
      account
    });
  } catch (error) {
    console.error('Account lookup error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch account details'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✓ ChequeMate Backend listening on http://localhost:${PORT}`);
  console.log(`✓ CORS enabled for ${process.env.FRONTEND_URL || 'http://localhost:5000'}`);
});
