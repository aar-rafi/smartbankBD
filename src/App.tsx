import React, { useState } from 'react';
import ImageUploader from './components/ImageUploader';
import AnalysisResults from './components/AnalysisResults';
import { analyzeChequeImage } from './services/geminiService';
import { AnalysisState, ChequeData } from '../shared/types';

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
        validation: null
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

        setState(prev => ({
          ...prev,
          status: 'success',
          validation: validation
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
  };  const resetAnalysis = () => {
    setState({
      status: 'idle',
      data: null,
      validation: null,
      error: null,
      imagePreview: null
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-600 text-3xl">document_scanner</span>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">ChequeMate AI</h1>
          </div>
          <div className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            Powered by Gemini 2.5 Flash
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Intro / Context */}
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-extrabold text-gray-900">Bank Cheque Processing</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Instantly extract details like bank name, amounts, and account numbers from cheque images.
          </p>
        </div>

        {/* Main Interaction Area */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
          
          {/* Left / Top: Image Preview or Upload */}
          <div className="md:col-span-2 space-y-4">
            {state.imagePreview ? (
              <div className="bg-white p-3 rounded-2xl shadow-md border border-gray-100">
                <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-gray-100">
                  <img 
                    src={state.imagePreview} 
                    alt="Cheque Preview" 
                    className="w-full h-full object-contain"
                  />
                  {(state.status === 'analyzing' || state.status === 'validating') && (
                     <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] flex flex-col items-center justify-center text-white">
                        <span className="material-symbols-outlined animate-spin text-4xl mb-2">progress_activity</span>
                        <span className="font-medium animate-pulse">
                            {state.status === 'analyzing' ? 'Analyzing Image...' : 'Validating Data...'}
                        </span>
                     </div>
                  )}
                </div>
                {state.status === 'success' && (
                  <button 
                    onClick={resetAnalysis}
                    className="mt-3 w-full py-2 text-sm text-gray-600 hover:text-indigo-600 font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Upload Different Image
                  </button>
                )}
              </div>
            ) : (
              <ImageUploader onImageSelected={handleImageSelected} isLoading={state.status === 'analyzing' || state.status === 'validating'} />
            )}
            
            {/* Guidelines */}
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <h4 className="text-sm font-bold text-blue-800 flex items-center gap-1 mb-2">
                <span className="material-symbols-outlined text-sm">info</span>
                For Best Results
              </h4>
              <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                <li>Ensure the image is well-lit and clear.</li>
                <li>Capture the entire cheque within the frame.</li>
                <li>Avoid shadows over printed text.</li>
              </ul>
            </div>
          </div>

          {/* Right / Bottom: Results or Empty State */}
          <div className="md:col-span-3">
             {state.status === 'error' && (
               <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
                 <span className="material-symbols-outlined mt-0.5">error</span>
                 <div>
                   <h3 className="font-bold">Analysis Failed</h3>
                   <p className="text-sm mt-1">{state.error}</p>
                   <button 
                      onClick={resetAnalysis}
                      className="mt-3 text-sm font-semibold hover:underline"
                   >
                     Try Again
                   </button>
                 </div>
               </div>
             )}

             {state.status === 'success' && state.data && (
                <AnalysisResults 
                  data={state.data} 
                  validation={state.validation} 
                  originalImage={state.imagePreview}
                  onReset={resetAnalysis} 
                />
             )}

             {state.status === 'idle' && (
               <div className="h-full flex flex-col items-center justify-center text-gray-400 min-h-[300px] border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                 <span className="material-symbols-outlined text-5xl mb-3 text-gray-300">dataset</span>
                 <p className="text-sm">Upload a cheque to see extracted data here</p>
               </div>
             )}

             {(state.status === 'analyzing' || state.status === 'validating') && (
                <div className="h-full flex flex-col items-center justify-center min-h-[300px] bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                    <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {state.status === 'analyzing' ? 'Extracting Data' : 'Running Validation'}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
                      {state.status === 'analyzing' 
                        ? 'Gemini is identifying text, handwritten amounts, and validating signatures...'
                        : 'Checking database records, account status, and date validity...'}
                    </p>
                  </div>
                </div>
             )}
          </div>
        </div>

      </main>
    </div>
  );
};

export default App;