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
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900">Match Score</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-blue-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600"
                        style={{ width: `${Math.min(100, Math.max(0, data.matchScore))}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold text-blue-900">{data.matchScore.toFixed(1)}%</span>
                  </div>
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
