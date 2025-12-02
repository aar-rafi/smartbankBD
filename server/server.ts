import './loadenv.js';

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';

import { validateChequeData } from './services/validationService.js';
import { analyzeCheque } from './services/analysisService.js';
import { testConnection } from './services/db.js';
import { logBypassStatus } from './config/bypass.js';

// Log bypass configuration on startup
logBypassStatus();

const app = express();
const PORT = Number(process.env.SERVER_PORT || 3001);

// Allow all origins in development so the frontend can run on any localhost port (Vite may pick 5000/5001).
const corsOrigin: any = process.env.NODE_ENV === 'development' ? true : (process.env.FRONTEND_URL || 'http://localhost:3000');
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '50mb' }));

app.get('/api/health', async (req: Request, res: Response) => {
  try {
    const dbConnected = await testConnection();
    res.json({ status: 'ok', database: dbConnected ? 'connected' : 'disconnected', timestamp: new Date().toISOString() });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Health check failed:', error);
    res.status(500).json({ status: 'error', error: { message: msg }, message: msg });
  }
});

// Basic validation - done at PRESENTING bank (where cheque is deposited)
app.post('/api/validate-cheque', async (req: Request, res: Response) => {
  try {
    const { chequeData } = req.body;
    if (!chequeData) return res.status(400).json({ error: { message: 'Missing chequeData in request body' } });

    const { validateChequeBasic } = await import('./services/validationService.js');
    const result = await validateChequeBasic(chequeData);
    res.json({ success: true, validation: result, timestamp: new Date().toISOString() });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Validation failed';
    console.error('Validation error:', error);
    res.status(500).json({ success: false, error: { message: msg }, message: msg });
  }
});

// Deep verification - done at DRAWER bank (where account is held)
app.post('/api/verify-cheque', async (req: Request, res: Response) => {
  try {
    const { chequeData } = req.body;
    if (!chequeData) return res.status(400).json({ error: { message: 'Missing chequeData in request body' } });

    const { verifyChequeFull } = await import('./services/validationService.js');
    const result = await verifyChequeFull(chequeData);
    res.json({ success: true, verification: result, timestamp: new Date().toISOString() });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Verification failed';
    console.error('Verification error:', error);
    res.status(500).json({ success: false, error: { message: msg }, message: msg });
  }
});

// Run deep verification on a cheque by ID (for drawer bank dashboard)
app.post('/api/cheques/:id/verify', async (req: Request, res: Response) => {
  try {
    const { getChequeDetails, storeDeepVerification } = await import('./services/dbQueries.js');
    const { verifyChequeFull } = await import('./services/validationService.js');
    const fs = await import('fs/promises');
    
    const chequeId = Number(req.params.id);
    const details = await getChequeDetails(chequeId);
    
    if (!details) {
      return res.status(404).json({ success: false, error: 'Cheque not found' });
    }

    // Read extracted signature from stored path
    let extractedSignatureBase64: string | null = null;
    if (details.cheque.signature_image_path) {
      try {
        const sigBuffer = await fs.readFile(details.cheque.signature_image_path);
        extractedSignatureBase64 = sigBuffer.toString('base64');
        console.log('Loaded extracted signature from:', details.cheque.signature_image_path);
      } catch (e) {
        console.warn('Could not read signature from path:', details.cheque.signature_image_path);
      }
    }

    // Build cheque data from stored info
    const chequeData = {
      bankName: details.cheque.drawer_bank_name,
      branchName: null,
      routingNumber: null,
      chequeNumber: details.cheque.cheque_number,
      date: details.cheque.issue_date,
      payeeName: details.cheque.payee_name,
      amountWords: details.cheque.amount_in_words,
      amountDigits: parseFloat(details.cheque.amount),
      accountHolderName: details.cheque.drawer_name,
      accountNumber: details.cheque.drawer_account,
      hasSignature: true, // Assume signature was present (validated at presenting bank)
      signatureBox: null,
      micrCode: details.cheque.micr_code,
      extractedSignatureImage: extractedSignatureBase64,
      synthIdConfidence: null,
      isAiGenerated: false
    };

    // Run deep verification
    const result = await verifyChequeFull(chequeData);

    // Store verification results
    await storeDeepVerification(chequeId, {
      signatureScore: result.signatureData?.matchScore,
      signatureMatch: result.signatureData?.matchScore && result.signatureData.matchScore >= 70 ? 'match' : 
                      result.signatureData?.matchScore && result.signatureData.matchScore >= 50 ? 'inconclusive' : 'no_match',
      fraudRiskScore: result.riskScore,
      riskLevel: result.riskLevel,
      aiDecision: result.isValid ? 'approve' : 'flag_for_review',
      aiConfidence: result.signatureData?.matchScore || 0,
      aiReasoning: result.rules.map(r => `${r.label}: ${r.message}`).join('; '),
      behaviorFlags: result.rules.filter(r => r.status === 'fail').map(r => r.id)
    });

    res.json({ success: true, verification: result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Verification failed';
    console.error('Verification error:', error);
    res.status(500).json({ success: false, error: msg });
  }
});

app.post('/api/account-details', async (req: Request, res: Response) => {
  try {
    const { accountNumber } = req.body;
    if (!accountNumber) return res.status(400).json({ error: { message: 'Missing accountNumber in request body' } });

    const { getAccountDetails } = await import('./services/dbQueries.js');
    const account = await getAccountDetails(accountNumber);
    if (!account) return res.status(404).json({ error: { message: 'Account not found' } });
    res.json({ success: true, account });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch account details';
    console.error('Account lookup error:', error);
    res.status(500).json({ success: false, error: { message: msg }, message: msg });
  }
});

app.post('/api/analyze', async (req: Request, res: Response) => {
  try {
    const { image, mimeType } = req.body;
    if (!image || !mimeType) {
      return res.status(400).json({ error: { message: 'Missing image or mimeType' } });
    }

    const result = await analyzeCheque(image, mimeType);
    res.json({ success: true, data: result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Analysis failed';
    console.error('Analysis error:', error);
    res.status(500).json({ success: false, error: { message: msg }, message: msg });
  }
});

// Dashboard Endpoints
app.get('/api/dashboard/stats', async (req: Request, res: Response) => {
  try {
    const { getDashboardStats } = await import('./services/dbQueries.js');
    const stats = await getDashboardStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

app.get('/api/dashboard/cheques', async (req: Request, res: Response) => {
  try {
    const { getDashboardCheques } = await import('./services/dbQueries.js');
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const cheques = await getDashboardCheques(limit);
    res.json({ success: true, cheques });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch cheques' });
  }
});

app.get('/api/cheques/:id', async (req: Request, res: Response) => {
  try {
    const { getChequeDetails } = await import('./services/dbQueries.js');
    const details = await getChequeDetails(Number(req.params.id));
    if (!details) return res.status(404).json({ success: false, error: 'Cheque not found' });
    res.json({ success: true, details });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch cheque details' });
  }
});

// Bank-specific cheque endpoints
app.get('/api/bank/:bankCode/cheques/inward', async (req: Request, res: Response) => {
  try {
    const { getInwardCheques } = await import('./services/dbQueries.js');
    const cheques = await getInwardCheques(req.params.bankCode);
    res.json({ success: true, cheques });
  } catch (error) {
    console.error('Error fetching inward cheques:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch inward cheques' });
  }
});

app.get('/api/bank/:bankCode/cheques/outward', async (req: Request, res: Response) => {
  try {
    const { getOutwardCheques } = await import('./services/dbQueries.js');
    const cheques = await getOutwardCheques(req.params.bankCode);
    res.json({ success: true, cheques });
  } catch (error) {
    console.error('Error fetching outward cheques:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch outward cheques' });
  }
});

// Create cheque (when deposited at presenting bank)
app.post('/api/cheques', async (req: Request, res: Response) => {
  try {
    const { createCheque, storeDeepVerification } = await import('./services/dbQueries.js');
    const chequeId = await createCheque(req.body);
    
    // If analysis results include AI verification data, store it
    if (req.body.analysisResults) {
      const ar = req.body.analysisResults;
      await storeDeepVerification(chequeId, {
        signatureScore: ar.signatureScore,
        signatureMatch: ar.signatureMatch,
        fraudRiskScore: ar.fraudRiskScore,
        riskLevel: ar.riskLevel || 'low',
        aiDecision: ar.aiDecision || 'approve',
        aiConfidence: ar.aiConfidence || 85,
        aiReasoning: ar.aiReasoning,
        behaviorFlags: ar.behaviorFlags || []
      });
    }
    
    res.json({ success: true, chequeId });
  } catch (error) {
    console.error('Error creating cheque:', error);
    const msg = error instanceof Error ? error.message : 'Failed to create cheque';
    res.status(500).json({ success: false, error: msg });
  }
});

// Send cheque to BACH
app.post('/api/cheques/:id/send-to-bach', async (req: Request, res: Response) => {
  try {
    const { sendToBACH } = await import('./services/dbQueries.js');
    const result = await sendToBACH(Number(req.params.id));
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error sending to BACH:', error);
    res.status(500).json({ success: false, error: 'Failed to send to BACH' });
  }
});

// Simulate BACH forwarding to drawer bank (in real world, this would be automatic)
app.post('/api/cheques/:id/receive-at-drawer', async (req: Request, res: Response) => {
  try {
    const { receiveAtDrawerBank } = await import('./services/dbQueries.js');
    await receiveAtDrawerBank(Number(req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error receiving at drawer bank:', error);
    res.status(500).json({ success: false, error: 'Failed to receive at drawer bank' });
  }
});

// Update cheque decision (approve/reject/flag)
app.post('/api/cheques/:id/decision', async (req: Request, res: Response) => {
  try {
    const { updateChequeDecision } = await import('./services/dbQueries.js');
    const { decision, reason } = req.body;
    if (!['approved', 'rejected', 'flagged'].includes(decision)) {
      return res.status(400).json({ success: false, error: 'Invalid decision' });
    }
    await updateChequeDecision(Number(req.params.id), decision, reason);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating decision:', error);
    res.status(500).json({ success: false, error: 'Failed to update decision' });
  }
});

// Delete a single cheque
app.delete('/api/cheques/:id', async (req: Request, res: Response) => {
  try {
    const { deleteCheque } = await import('./services/dbQueries.js');
    const deleted = await deleteCheque(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Cheque not found' });
    }
    res.json({ success: true, message: 'Cheque deleted' });
  } catch (error) {
    console.error('Error deleting cheque:', error);
    res.status(500).json({ success: false, error: 'Failed to delete cheque' });
  }
});

// Delete all cheques (for demo reset)
app.delete('/api/cheques', async (req: Request, res: Response) => {
  try {
    const { deleteAllCheques } = await import('./services/dbQueries.js');
    const count = await deleteAllCheques();
    res.json({ success: true, message: `Deleted ${count} cheques` });
  } catch (error) {
    console.error('Error deleting all cheques:', error);
    res.status(500).json({ success: false, error: 'Failed to delete cheques' });
  }
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', err);
  const msg = process.env.NODE_ENV === 'development' ? err?.message ?? 'Internal server error' : 'Internal server error';
  res.status(500).json({ success: false, error: { message: msg }, message: msg });
});

app.use((req: Request, res: Response) => res.status(404).json({ error: 'Endpoint not found', path: req.path }));

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
