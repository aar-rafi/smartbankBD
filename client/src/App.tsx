import React, { useState, useEffect } from 'react';
import ImageUploader from './components/ImageUploader';
import ExtractedDetails from './components/ExtractedDetails';
import ValidationChecklist from './components/ValidationChecklist';
import FraudDetection from './components/FraudDetection';
import WorkflowStepper, { WorkflowStep } from './components/WorkflowStepper';
import Dashboard from './components/Dashboard';
import ManagerDashboard from './components/ManagerDashboard';
import LoginScreen from './components/LoginScreen';
import { analyzeChequeImage } from './services/geminiService';
import { AnalysisState } from '../../shared/types';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, FileText, Loader2, RefreshCw, LayoutDashboard, ScanLine, Phone, Check, X, Building2, Shield, LogOut, CheckCircle2 } from "lucide-react";
import { cn } from '@/lib/utils';
import { BANKS, Bank } from '@/lib/bankContext';
import { AuthProvider, useAuth } from '@/lib/authContext';
import { createCheque } from '@/services/api';

// Get bank config from environment
const BANK_CODE = import.meta.env.VITE_BANK_CODE || 'ibbl';
const BANK_NAME = import.meta.env.VITE_BANK_NAME || 'Islami Bank Bangladesh Limited';

const CURRENT_BANK: Bank = BANKS[BANK_CODE] || {
  code: BANK_CODE.toUpperCase(),
  name: BANK_NAME,
  routingNumber: '000000000'
};

// Helper to extract signature region
const extractSignatureRegion = (imageDataUrl: string, signatureBox: number[] | null | undefined): Promise<string | null> => {
  return new Promise((resolve) => {
    if (!signatureBox || signatureBox.length !== 4) { resolve(null); return; }
    const img = new Image();
    img.onload = () => {
      try {
        const [ymin, xmin, ymax, xmax] = signatureBox;
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        const x = (xmin / 1000) * width;
        const y = (ymin / 1000) * height;
        const boxWidth = ((xmax - xmin) / 1000) * width;
        const boxHeight = ((ymax - ymin) / 1000) * height;
        const canvas = document.createElement('canvas');
        canvas.width = boxWidth;
        canvas.height = boxHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, x, y, boxWidth, boxHeight, 0, 0, boxWidth, boxHeight);
        resolve(canvas.toDataURL('image/png').split(',')[1]);
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = imageDataUrl;
  });
};

const INITIAL_STEPS: WorkflowStep[] = [
  { id: 'data-package', label: 'Data Package', status: 'pending', description: 'Image Analysis' },
  { id: 'basic-val', label: 'Basic Validation', status: 'pending', description: 'Field Checks' },
  { id: 'signature', label: 'Signature', status: 'pending', description: 'Verify & Match' },
  { id: 'ai-check', label: 'AI Security', status: 'pending', description: 'SynthID Check' },
  { id: 'fraud', label: 'Fraud Detection', status: 'pending', description: 'Risk Analysis' },
  { id: 'update', label: 'Transaction', status: 'pending', description: 'Final Update' }
];

const AppContent: React.FC = () => {
  const { user, isManager, logout } = useAuth();
  const [mode, setMode] = useState<'scan' | 'dashboard'>('dashboard');
  const [steps, setSteps] = useState<WorkflowStep[]>(INITIAL_STEPS);
  const [manualReviewRequired, setManualReviewRequired] = useState(false);
  const [sameBankWarning, setSameBankWarning] = useState<string | null>(null);
  
  const [state, setState] = useState<AnalysisState>({
    status: 'idle',
    data: null,
    validation: null,
    fraudDetection: null,
    error: null,
    imagePreview: null,
  });

  // Show login if not authenticated
  if (!user) {
    return <LoginScreen bank={CURRENT_BANK} />;
  }

  const updateStepStatus = (id: string, status: WorkflowStep['status']) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const handleImageSelected = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = e.target?.result as string;
      setState(prev => ({ 
        ...prev, 
        status: 'analyzing', 
        imagePreview: base64Data, 
        error: null, 
        data: null, 
        validation: null,
        fraudDetection: null 
      }));
      setSteps(prev => prev.map(s => s.id === 'data-package' ? { ...s, status: 'current' } : { ...s, status: 'pending' }));

      try {
        updateStepStatus('data-package', 'current');
        const base64Content = base64Data.split(',')[1];
        let data = await analyzeChequeImage(base64Content, file.type);

        if (data.hasSignature && data.signatureBox) {
          const extractedSig = await extractSignatureRegion(base64Data, data.signatureBox);
          if (extractedSig) data = { ...data, extractedSignatureImage: extractedSig };
        }

        setState(prev => ({ ...prev, status: 'validating', data }));
        updateStepStatus('data-package', 'completed');
        updateStepStatus('basic-val', 'current');

        const resp = await fetch(`/api/validate-cheque`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chequeData: data }),
        });
        if (!resp.ok) throw new Error(`Validation failed: ${resp.status}`);

        const json = await resp.json();
        const validation = json?.validation ?? null;

        if (validation) {
          const rules = validation.rules || [];
          
          // Basic validation checks (presenting bank)
          const basicFail = rules.some((r: any) => 
            ['completeness', 'date-format', 'signature-present'].includes(r.id) && r.status === 'fail'
          );
          updateStepStatus('basic-val', basicFail ? 'error' : 'completed');

          // Signature presence check (not ML verification - that happens at drawer bank)
          updateStepStatus('signature', 'current');
          const sigPresentRule = rules.find((r: any) => r.id === 'signature-present');
          const sigStatus = sigPresentRule?.status === 'pass' ? 'completed' : 'error';
          updateStepStatus('signature', sigStatus);
          
          // Determine if validation passed
          const validationPassed = !basicFail && sigStatus === 'completed';
          
          if (!validationPassed) {
            // Still save as faulty record, but mark for manual review
            setManualReviewRequired(true);
          }

          // Image quality check (basic AI detection at presenting bank)
          updateStepStatus('ai-check', 'current');
          const imageQualityRule = rules.find((r: any) => r.id === 'image-quality');
          updateStepStatus('ai-check', imageQualityRule?.status === 'pass' ? 'completed' : 'warning');
          // Don't block on image quality warning - deep check happens at drawer bank

          // Fraud Detection (parallel - non-blocking for demo)
          updateStepStatus('fraud', 'current');
          const signatureScore = validation?.signatureData?.matchScore ?? 85;
          
          let fraudDetection = null;
          try {
            const fraudResp = await fetch(`/api/fraud-detection`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                chequeData: data,
                signatureScore 
              }),
            });
            
            if (fraudResp.ok) {
              const fraudJson = await fraudResp.json();
              fraudDetection = fraudJson?.fraudDetection ?? null;
            }
          } catch (fraudErr) {
            console.warn('Fraud detection failed (non-critical):', fraudErr);
            // Non-critical - continue without fraud detection
          }
          updateStepStatus('fraud', 'completed');
          
          updateStepStatus('update', 'current');
          
          // Always save cheque to database (even if validation failed - store as faulty record)
          let savedChequeId: number | null = null;
          try {
            // Collect failure reasons
            const failedRules = rules.filter((r: any) => r.status === 'fail');
            const failureReasons = failedRules.map((r: any) => `${r.label}: ${r.message || 'Failed'}`).join('; ');
            
            const createResult = await createCheque({
              chequeNumber: data.chequeNumber || `CHQ${Date.now()}`,
              drawerAccountNumber: data.accountNumber || '',
              payeeName: data.payeeName || 'Unknown',
              amount: data.amountDigits || 0,
              amountWords: data.amountWords || '',
              issueDate: data.date || new Date().toISOString().split('T')[0],
              micrCode: data.micrCode || '',
              presentingBankCode: CURRENT_BANK.code,
              // Image paths for drawer bank verification
              chequeImagePath: data.chequeImagePath || undefined,
              signatureImagePath: data.signatureImagePath || undefined,
              // Mark as failed if validation didn't pass
              validationFailed: !validationPassed,
              failureReasons: failureReasons || undefined,
              // Analysis results including fraud detection
              analysisResults: {
                signatureScore: validation?.signatureData?.matchScore,
                signatureMatch: validation?.signatureData?.matchScore && validation.signatureData.matchScore >= 70 ? 'match' : 
                                validation?.signatureData?.matchScore && validation.signatureData.matchScore >= 50 ? 'inconclusive' : 'no_match',
                fraudRiskScore: fraudDetection?.riskScore,
                riskLevel: fraudDetection?.riskLevel || 'low',
                aiDecision: fraudDetection?.decision || 'approve',
                aiConfidence: fraudDetection?.confidence || 85,
                aiReasoning: fraudDetection ? 
                  `Fraud risk: ${fraudDetection.riskLevel}. ${fraudDetection.reasons?.join('; ') || 'Basic validation passed at presenting bank. Awaiting deep verification.'}` :
                  'Basic validation passed at presenting bank. Awaiting deep verification.',
                behaviorFlags: fraudDetection?.flags || [],
                isAiGenerated: data.isAiGenerated || false,
                confidence: data.synthIdConfidence || 0
              }
            });
            savedChequeId = createResult.chequeId;
            
            // Check for same-bank deposit warning
            if (createResult.sameBankDeposit) {
              setSameBankWarning(createResult.warning || 'This is a same-bank deposit (internal transfer). No BACH clearing required.');
            }
            updateStepStatus('update', 'completed');
            console.log(`Cheque saved to database successfully${!validationPassed ? ' (as faulty record)' : ''}`);
            
            // After successful save, automatically switch to dashboard after showing success message
            // Only auto-redirect if not requiring manual review
            if (!manualReviewRequired) {
              setTimeout(() => {
                resetAnalysis();
                setMode('dashboard');
                if (savedChequeId) {
                  console.log(`Cheque saved with ID: ${savedChequeId} - view in dashboard`);
                }
              }, 3000); // 3 second delay to show success message before redirecting
            }
          } catch (dbError) {
            console.error('Failed to save cheque to database:', dbError);
            updateStepStatus('update', 'warning');
          }

          setState(prev => ({
            ...prev,
            status: 'success',
            validation: validation,
            fraudDetection: fraudDetection
          }));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred';
        setState(prev => ({ ...prev, status: 'error', error: message }));
        setSteps(prev => {
          const current = prev.find(s => s.status === 'current');
          return current ? prev.map(s => s.id === current.id ? { ...s, status: 'error' } : s) : prev;
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleManualOverride = (approved: boolean) => {
    setManualReviewRequired(false);
    if (approved) {
      updateStepStatus('signature', 'completed');
      updateStepStatus('ai-check', 'completed');
      updateStepStatus('fraud', 'completed');
      updateStepStatus('update', 'completed');
    } else {
      updateStepStatus('signature', 'error');
      updateStepStatus('update', 'error');
    }
  };

  const resetAnalysis = () => {
    setState({ 
      status: 'idle', 
      data: null, 
      validation: null, 
      fraudDetection: null,
      error: null, 
      imagePreview: null 
    });
    setSameBankWarning(null);
    setSteps(INITIAL_STEPS);
    setManualReviewRequired(false);
  };

  // Header color based on bank
  const headerColor = BANK_CODE === 'ibbl' ? 'bg-emerald-700 text-white' : 
                      BANK_CODE === 'sonali' ? 'bg-blue-700 text-white' : 'bg-slate-700 text-white';

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Header */}
      <header className={cn("border-b sticky top-0 z-20", headerColor)}>
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-lg bg-white/20">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">{CURRENT_BANK.name}</h1>
              <p className="text-xs opacity-80">ChequeMate AI - BACH Clearing</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Role Badge */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10">
              {isManager ? <Shield className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              <span className="text-sm">{user.name}</span>
              <span className="text-xs opacity-70">({isManager ? 'Manager' : 'Employee'})</span>
            </div>

            {/* Navigation - Only for employees */}
            {!isManager && (
              <div className="flex items-center space-x-2">
                <Button 
                  variant={mode === 'dashboard' ? 'secondary' : 'ghost'} 
                  size="sm"
                  onClick={() => setMode('dashboard')}
                  className={mode === 'dashboard' ? '' : 'text-white/80 hover:text-white hover:bg-white/10'}
                >
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
                <Button 
                  variant={mode === 'scan' ? 'secondary' : 'ghost'} 
                  size="sm"
                  onClick={() => setMode('scan')}
                  className={mode === 'scan' ? '' : 'text-white/80 hover:text-white hover:bg-white/10'}
                >
                  <ScanLine className="h-4 w-4 mr-2" />
                  Process Cheque
                </Button>
              </div>
            )}

            {/* Logout */}
            <Button variant="ghost" size="sm" onClick={logout} className="text-white/80 hover:text-white hover:bg-white/10">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {isManager ? (
          <ManagerDashboard currentBank={CURRENT_BANK} />
        ) : mode === 'dashboard' ? (
          <Dashboard currentBank={CURRENT_BANK} />
        ) : (
          <>
            <Card className="border-none shadow-none bg-transparent">
              <CardContent className="p-0">
                <WorkflowStepper steps={steps} currentStepIndex={steps.findIndex(s => s.status === 'current')} />
              </CardContent>
            </Card>

            {manualReviewRequired && (
              <Alert className="border-yellow-500 bg-yellow-50">
                <Phone className="h-5 w-5 text-yellow-600" />
                <AlertTitle className="text-yellow-800 text-lg font-semibold">Manual Review Required</AlertTitle>
                <AlertDescription className="mt-2">
                  <p className="text-yellow-700 mb-4">Signature verification inconclusive. Please verify manually.</p>
                  <div className="flex gap-4">
                    <Button onClick={() => handleManualOverride(true)} className="bg-green-600 hover:bg-green-700 text-white">
                      <Check className="mr-2 h-4 w-4" /> Approve
                    </Button>
                    <Button onClick={() => handleManualOverride(false)} variant="destructive">
                      <X className="mr-2 h-4 w-4" /> Reject
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {sameBankWarning && (
              <Alert className="border-blue-500 bg-blue-50">
                <Building2 className="h-5 w-5 text-blue-600" />
                <AlertTitle className="text-blue-800 text-lg font-semibold">Same-Bank Deposit Detected</AlertTitle>
                <AlertDescription className="mt-2">
                  <p className="text-blue-700 mb-2">{sameBankWarning}</p>
                  <p className="text-blue-600 text-sm">
                    This cheque is drawn on an account at this same bank. It will be processed as an internal transfer 
                    and does not need to go through BACH inter-bank clearing.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                    onClick={() => setSameBankWarning(null)}
                  >
                    Dismiss
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-7 space-y-6">
                <Card>
                  <CardContent className="p-4">
                    {state.imagePreview ? (
                      <div className="space-y-4">
                        <div className="relative w-full overflow-hidden rounded-lg border bg-muted">
                          <img src={state.imagePreview} alt="Cheque" className="w-full h-auto object-contain max-h-[600px]" />
                          {(state.status === 'analyzing' || state.status === 'validating') && (
                            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center">
                              <Loader2 className="h-10 w-10 animate-spin text-primary mb-2" />
                              <span className="font-medium animate-pulse">
                                {state.status === 'analyzing' ? 'Analyzing...' : 'Validating...'}
                              </span>
                            </div>
                          )}
                        </div>
                        {state.status === 'success' && !manualReviewRequired && (
                          <div className="space-y-2">
                            <Alert className="bg-green-50 border-green-200">
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                              <AlertTitle className="text-green-800">Cheque Processed Successfully</AlertTitle>
                              <AlertDescription className="text-green-700 text-sm mt-1">
                                The cheque has been saved and will appear in your dashboard. Redirecting...
                              </AlertDescription>
                            </Alert>
                            <Button variant="outline" className="w-full" onClick={() => { resetAnalysis(); setMode('dashboard'); }}>
                              <LayoutDashboard className="mr-2 h-4 w-4" /> Go to Dashboard
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <ImageUploader onImageSelected={handleImageSelected} isLoading={state.status === 'analyzing' || state.status === 'validating'} />
                    )}
                  </CardContent>
                </Card>

                {state.status === 'success' && state.data && (
                  <ExtractedDetails data={state.data} originalImage={state.imagePreview} onReset={resetAnalysis} />
                )}

                {/* Note: ML Fraud Detection is now shown on the cheque details page (drawer bank side), not here */}
              </div>

              <div className="lg:col-span-5 space-y-6">
                {state.status === 'error' && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                      <p>{state.error}</p>
                      <Button variant="outline" size="sm" onClick={resetAnalysis} className="mt-3">Try Again</Button>
                    </AlertDescription>
                  </Alert>
                )}
                {state.status === 'success' && state.validation && (
                  <ValidationChecklist result={state.validation} />
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider bankCode={BANK_CODE}>
      <AppContent />
    </AuthProvider>
  );
};

export default App;

