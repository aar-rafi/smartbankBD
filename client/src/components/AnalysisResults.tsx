import React, { useEffect, useRef, useState } from 'react';
import { ChequeData, ValidationResult } from '../../../shared/types';
import ValidationChecklist from './ValidationChecklist';

interface AnalysisResultsProps {
  data: ChequeData;
  validation: ValidationResult | null;
  originalImage: string | null;
  onReset: () => void;
}

const ResultRow: React.FC<{ label: string; value: string | number | null; }> = ({ label, value }) => (
  <div className="flex flex-col sm:flex-row sm:justify-between py-3 border-b border-gray-100 last:border-0">
    <span className="text-sm font-medium text-gray-500">{label}</span>
    <span className="text-base font-semibold mt-1 sm:mt-0 text-gray-900 min-h-[1.5rem] text-right">
      {value === null || value === '' ? '' : value}
    </span>
  </div>
);

const SignatureCropper: React.FC<{ imageUrl: string | null; box: number[] | null }> = ({ imageUrl, box }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasImage, setHasImage] = useState(false);

  useEffect(() => {
    if (!imageUrl || !box || box.length !== 4 || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      // Box is [ymin, xmin, ymax, xmax] normalized to 1000
      const [ymin, xmin, ymax, xmax] = box;

      const imgWidth = img.width;
      const imgHeight = img.height;

      // Calculate pixel coordinates
      const x = (xmin / 1000) * imgWidth;
      const y = (ymin / 1000) * imgHeight;
      const w = ((xmax - xmin) / 1000) * imgWidth;
      const h = ((ymax - ymin) / 1000) * imgHeight;

      // Add a small padding if possible (5% padding)
      const paddingX = w * 0.05;
      const paddingY = h * 0.05;

      const drawX = Math.max(0, x - paddingX);
      const drawY = Math.max(0, y - paddingY);
      const drawW = Math.min(imgWidth - drawX, w + (paddingX * 2));
      const drawH = Math.min(imgHeight - drawY, h + (paddingY * 2));

      canvas.width = drawW;
      canvas.height = drawH;

      ctx.drawImage(img, drawX, drawY, drawW, drawH, 0, 0, drawW, drawH);
      setHasImage(true);
    };
  }, [imageUrl, box]);

  if (!box || box.length !== 4) return null;

  return (
    <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden bg-white inline-block">
      <canvas ref={canvasRef} className="max-h-24 w-auto block" />
    </div>
  );
};

const SignatureIndicator: React.FC<{ hasSignature: boolean; signatureBox: number[] | null; originalImage: string | null }> = ({ hasSignature, signatureBox, originalImage }) => (
  <div className={`p-3 rounded-lg border ${hasSignature ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
    }`}>
    <div className="flex items-center gap-2 mb-2">
      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${hasSignature ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
        <span className="material-symbols-outlined text-lg">
          {hasSignature ? 'ink_pen' : 'history_edu'}
        </span>
      </div>
      <div className="flex-1">
        <p className={`text-xs font-bold uppercase tracking-wide ${hasSignature ? 'text-green-800' : 'text-red-800'}`}>Signature Check</p>
        <p className={`font-semibold text-sm ${hasSignature ? 'text-green-700' : 'text-red-700'}`}>
          {hasSignature ? 'Handwritten Signature Detected' : 'No Signature Detected'}
        </p>
      </div>
      {hasSignature && <span className="material-symbols-outlined text-green-600">check_circle</span>}
      {!hasSignature && <span className="material-symbols-outlined text-red-500">cancel</span>}
    </div>

    {hasSignature && signatureBox && originalImage && (
      <div>
        <p className="text-xs text-green-700 mb-1 font-medium">Extracted Signature:</p>
        <SignatureCropper imageUrl={originalImage} box={signatureBox} />
      </div>
    )}
  </div>
);

const AnalysisResults: React.FC<AnalysisResultsProps> = ({ data, validation, originalImage, onReset }) => {
  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Main Extracted Data Card */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center">
          <h2 className="text-white text-xl font-bold flex items-center gap-2">
            <span className="material-symbols-outlined">document_scanner</span>
            Extracted Details
          </h2>
          <button
            onClick={onReset}
            className="text-indigo-100 hover:text-white text-sm font-medium hover:underline flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Scan Another
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Bank Details Section */}
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3">Bank Information</h3>
              <ResultRow label="Bank Name" value={data.bankName} />
              <ResultRow label="Branch Name" value={data.branchName} />
              <ResultRow label="Routing Number" value={data.routingNumber} />
              <ResultRow label="MICR Code" value={data.micrCode} />
            </div>

            {/* Payment Details Section */}
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3">Payment Details</h3>
              <ResultRow label="Cheque Number" value={data.chequeNumber} />
              <ResultRow label="Date" value={data.date} />
              <ResultRow label="Amount (Digits)" value={data.amountDigits} />
              <ResultRow label="Amount (Words)" value={data.amountWords} />
            </div>

            {/* Account Details Section */}
            <div className="space-y-1 lg:col-span-2">
              <div className="h-px bg-gray-100 my-4 lg:hidden"></div>
              <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3">Parties Involved</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="space-y-1">
                  <ResultRow label="Payee Name" value={data.payeeName} />
                  <ResultRow label="Account Holder" value={data.accountHolderName} />
                  <ResultRow label="Account Number" value={data.accountNumber} />
                </div>
                <div>
                  {/* Visual indication for signature */}
                  <div className="mt-2">
                    <SignatureIndicator
                      hasSignature={data.hasSignature}
                      signatureBox={data.signatureBox}
                      originalImage={originalImage}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Results Card */}
      {validation && <ValidationChecklist result={validation} />}
    </div>
  );
};

export default AnalysisResults;