import React from 'react';
import { SignatureData } from '../../shared/types';

interface SignatureComparisonProps {
  data: SignatureData;
  hasSignature: boolean;
}

const SignatureComparison: React.FC<SignatureComparisonProps> = ({ data, hasSignature }) => {
  const bufferToBase64 = (buffer: any): string => {
    if (!buffer) return '';
    // If already a base64 string, return as-is
    if (typeof buffer === 'string') {
      const str = buffer.trim();
      // Validate it looks like base64 (alphanumeric, +, /, =)
      if (/^[A-Za-z0-9+/=]+$/.test(str)) {
        return str;
      }
      // If it's malformed, log warning and return empty
      console.warn('Invalid base64 string detected:', str.substring(0, 50));
      return '';
    }
    // If it's a Buffer or Uint8Array, convert to base64
    if (buffer instanceof Buffer || buffer instanceof Uint8Array) {
      return Buffer.from(buffer).toString('base64');
    }
    return '';
  };

  const extractedBase64 = data.extracted ? (() => {
    const b64 = bufferToBase64(data.extracted);
    return b64 ? `data:image/png;base64,${b64}` : null;
  })() : null;

  const referenceBase64 = data.reference ? (() => {
    const b64 = bufferToBase64(data.reference);
    return b64 ? `data:image/png;base64,${b64}` : null;
  })() : null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-4">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <span className="material-symbols-outlined text-gray-500">signature</span>
          Signature Verification
        </h3>
      </div>

      <div className="p-6">
        {hasSignature ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Extracted Signature */}
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                  Extracted from Cheque
                </h4>
                {extractedBase64 ? (
                  <div className="bg-gray-100 rounded-lg border border-gray-300 p-3 flex items-center justify-center h-48">
                    <img
                      src={extractedBase64}
                      alt="Extracted Signature"
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        console.error('Failed to load extracted signature:', extractedBase64?.substring(0, 50));
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className="bg-gray-100 rounded-lg border border-gray-300 p-3 flex items-center justify-center h-48 text-gray-400">
                    <span className="text-sm">{data.extracted ? 'Invalid signature format' : 'No signature image extracted'}</span>
                  </div>
                )}
              </div>

              {/* Reference Signature */}
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                  Reference (On File)
                </h4>
                {referenceBase64 ? (
                  <div className="bg-gray-100 rounded-lg border border-gray-300 p-3 flex items-center justify-center h-48">
                    <img
                      src={referenceBase64}
                      alt="Reference Signature"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="bg-yellow-50 rounded-lg border border-yellow-300 p-3 flex items-center justify-center h-48 text-yellow-600">
                    <span className="text-sm">No reference signature on file for this account</span>
                  </div>
                )}
              </div>
            </div>

            {/* Match Score / Status */}
            {data.matchScore !== undefined && (
              <div className={`border rounded-lg p-4 ${
                data.matchScore >= 70 ? 'bg-green-50 border-green-200' : 
                data.matchScore >= 50 ? 'bg-yellow-50 border-yellow-200' : 
                'bg-red-50 border-red-200'
              }`}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-indigo-600">
                        psychology
                      </span>
                      <span className="text-sm font-bold text-gray-800">AI Signature Verification</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {data.matchScore >= 70 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                          Match Confirmed
                        </span>
                      ) : data.matchScore >= 50 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                          <span className="material-symbols-outlined text-sm">warning</span>
                          Review Needed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                          <span className="material-symbols-outlined text-sm">cancel</span>
                          Mismatch Detected
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Confidence Score</span>
                    <div className="flex items-center gap-3">
                      <div className="w-48 h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            data.matchScore >= 70 ? 'bg-green-500' : 
                            data.matchScore >= 50 ? 'bg-yellow-500' : 
                            'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, data.matchScore))}%` }}
                        ></div>
                      </div>
                      <span className={`text-lg font-bold ${
                        data.matchScore >= 70 ? 'text-green-700' : 
                        data.matchScore >= 50 ? 'text-yellow-700' : 
                        'text-red-700'
                      }`}>
                        {data.matchScore.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-600 mt-2">
                    {data.matchScore >= 70 ? (
                      '✓ Signatures match within acceptable threshold. Transaction can proceed.'
                    ) : data.matchScore >= 50 ? (
                      '⚠ Moderate similarity detected. Manual verification recommended.'
                    ) : (
                      '✗ Low similarity score. Potential signature fraud detected. Reject transaction.'
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <span className="material-symbols-outlined text-red-500 text-3xl block mb-2">
              highlight_off
            </span>
            <p className="text-sm font-medium text-red-700">
              No signature detected on cheque
            </p>
            <p className="text-xs text-red-600 mt-1">
              A valid handwritten signature is required for cheque processing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignatureComparison;
