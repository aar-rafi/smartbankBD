import React, { useState } from 'react';
import ImageUploader from './components/ImageUploader';
import ExtractedDetails from './components/ExtractedDetails';
import ValidationChecklist from './components/ValidationChecklist';
import FraudDetection from './components/FraudDetection';
import { analyzeChequeImage } from './services/geminiService';
import { AnalysisState } from '../../shared/types';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, FileText, Loader2, RefreshCw, Shield } from "lucide-react";

// Helper to extract signature region from image using Canvas API
const extractSignatureRegion = (imageDataUrl: string, signatureBox: number[] | null | undefined): Promise<string | null> => {
  return new Promise((resolve) => {
    if (!signatureBox || signatureBox.length !== 4) {
      resolve(null);
      return;
    }

    const img = new Image();
    img.onload = () => {
      try {
        // signatureBox is [ymin, xmin, ymax, xmax] normalized to 0-1000
        const [ymin, xmin, ymax, xmax] = signatureBox;

        // Scale coordinates to actual image dimensions
        const width = img.naturalWidth;
        const height = img.naturalHeight;

        const x = (xmin / 1000) * width;
        const y = (ymin / 1000) * height;
        const boxWidth = ((xmax - xmin) / 1000) * width;
        const boxHeight = ((ymax - ymin) / 1000) * height;

        // Create canvas for extracted signature
        const canvas = document.createElement('canvas');
        canvas.width = boxWidth;
        canvas.height = boxHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        // Draw the signature region
        ctx.drawImage(img, x, y, boxWidth, boxHeight, 0, 0, boxWidth, boxHeight);

        // Convert to base64 PNG
        const signatureBase64 = canvas.toDataURL('image/png').split(',')[1];
        resolve(signatureBase64);
      } catch (error) {
        console.error('Failed to extract signature:', error);
        resolve(null);
      }
    };
    img.onerror = () => {
      console.error('Failed to load image for signature extraction');
      resolve(null);
    };
    img.src = imageDataUrl;
  });
};

const App: React.FC = () => {
  const [state, setState] = useState<AnalysisState>({
    status: 'idle',
    data: null,
    validation: null,
    fraudDetection: null,
    error: null,
    imagePreview: null,
  });

  const handleImageSelected = async (file: File) => {
    // Create preview
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

      try {
        // 1. Analyze with Gemini
        // Strip the data URL prefix to get just the base64 string
        const base64Content = base64Data.split(',')[1];
        const mimeType = file.type;

        let data = await analyzeChequeImage(base64Content, mimeType);

        // 2. Extract signature region from the original image if signature detected
        if (data.hasSignature && data.signatureBox) {
          const extractedSigBase64 = await extractSignatureRegion(base64Data, data.signatureBox);
          if (extractedSigBase64) {
            data = { ...data, extractedSignatureImage: extractedSigBase64 };
          }
        }

        setState(prev => ({
          ...prev,
          status: 'validating', // Move to validating state
          data: data
        }));

        // 3. Run Validation Logic via backend API (server-side validation)
        // Use relative URL; Vite dev proxy forwards /api to backend (see vite.config.ts)
        const resp = await fetch(`/api/validate-cheque`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chequeData: data }),
        });

        if (!resp.ok) {
          // Try to extract a structured JSON error if the backend provided one
          let errMessage = `Validation API failed: ${resp.status}`;
          const contentType = resp.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            try {
              const errJson = await resp.json();
              errMessage = errJson?.error?.message || errJson?.message || JSON.stringify(errJson);
            } catch (e) {
              const errText = await resp.text();
              errMessage = `${resp.status} ${errText}`;
            }
          } else {
            const errText = await resp.text();
            errMessage = `${resp.status} ${errText}`;
          }
          throw new Error(errMessage);
        }

        const json = await resp.json();
        const validation = json?.validation ?? null;

        // 4. Run Fraud Detection in parallel (non-blocking)
        // Get signature score from validation if available
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

        setState(prev => ({
          ...prev,
          status: 'success',
          validation: validation,
          fraudDetection: fraudDetection
        }));

      } catch (err) {
        let message = 'An unexpected error occurred processing the image.';
        if (err instanceof Error) {
          message = err.message;
          // Friendly guidance for common network/backend errors
          if (message.toLowerCase().includes('failed to fetch') || message.toLowerCase().includes('network')) {
            message = 'Network error: could not reach validation service. Is the backend running at http://localhost:3001?';
          }
        }

        setState(prev => ({
          ...prev,
          status: 'error',
          error: message
        }));
      }
    };
    reader.readAsDataURL(file);
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
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              <FileText className="text-primary h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">ChequeMate AI</h1>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Intro / Context */}
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-extrabold tracking-tight">Bank Cheque Processing</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Instantly extract details like bank name, amounts, and account numbers from cheque images.
          </p>
        </div>

        {/* Main Interaction Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Left Column: Image + Extracted Details (Larger) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Image Preview / Upload */}
            <Card>
              <CardContent className="p-4">
                {state.imagePreview ? (
                  <div className="space-y-4">
                    <div className="relative w-full overflow-hidden rounded-lg border bg-muted">
                      <img
                        src={state.imagePreview}
                        alt="Cheque Preview"
                        className="w-full h-auto object-contain max-h-[600px]"
                      />
                      {(state.status === 'analyzing' || state.status === 'validating') && (
                        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center">
                          <Loader2 className="h-10 w-10 animate-spin text-primary mb-2" />
                          <span className="font-medium animate-pulse">
                            {state.status === 'analyzing' ? 'Analyzing Image...' : 'Validating Data...'}
                          </span>
                        </div>
                      )}
                    </div>
                    {state.status === 'success' && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={resetAnalysis}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Upload Different Image
                      </Button>
                    )}
                  </div>
                ) : (
                  <ImageUploader onImageSelected={handleImageSelected} isLoading={state.status === 'analyzing' || state.status === 'validating'} />
                )}
              </CardContent>
            </Card>

            {/* Extracted Details (Below Image) */}
            {state.status === 'success' && state.data && (
              <ExtractedDetails
                data={state.data}
                originalImage={state.imagePreview}
                onReset={resetAnalysis}
              />
            )}

            {/* Loading State for Details */}
            {(state.status === 'analyzing' || state.status === 'validating') && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center min-h-[200px] space-y-4 py-8">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                    <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <p className="text-sm text-muted-foreground">Extracting details...</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Validation + Guidelines (Sidebar) */}
          <div className="lg:col-span-5 space-y-6">

            {/* Error State */}
            {state.status === 'error' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Analysis Failed</AlertTitle>
                <AlertDescription className="mt-2">
                  <p>{state.error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetAnalysis}
                    className="mt-3 bg-background/20 hover:bg-background/30 border-none text-destructive-foreground"
                  >
                    Try Again
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Validation Results */}
            {state.status === 'success' && state.validation && (
              <ValidationChecklist result={state.validation} />
            )}

            {/* Fraud Detection Results */}
            {state.status === 'success' && (
              <FraudDetection 
                result={state.fraudDetection} 
                isLoading={false}
              />
            )}

            {/* Idle State for Right Column */}
            {state.status === 'idle' && (
              <Card className="h-full border-dashed">
                <CardContent className="h-full flex flex-col items-center justify-center min-h-[300px] text-muted-foreground">
                  <div className="flex gap-4 mb-4">
                    <FileText className="h-12 w-12 opacity-20" />
                    <Shield className="h-12 w-12 opacity-20" />
                  </div>
                  <p className="text-sm text-center">Upload a cheque to see extracted data,<br />validation and fraud detection here</p>
                </CardContent>
              </Card>
            )}

            {/* Guidelines (Always visible or only when idle/loading?) - Keeping it always visible for reference */}
            <Alert className="bg-blue-50/50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800">For Best Results</AlertTitle>
              <AlertDescription className="text-blue-700 text-xs mt-2">
                <ul className="list-disc list-inside space-y-1">
                  <li>Ensure the image is well-lit and clear.</li>
                  <li>Capture the entire cheque within the frame.</li>
                  <li>Avoid shadows over printed text.</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        </div>

      </main>
    </div>
  );
};

export default App;