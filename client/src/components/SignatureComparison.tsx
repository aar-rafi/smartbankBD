import React from 'react';
import { SignatureData } from '../../../shared/types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PenTool, CheckCircle2, AlertTriangle, XCircle, BrainCircuit } from "lucide-react";

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
    <Card className="mt-6">
      <CardHeader className="bg-muted/50 border-b pb-3">
        <div className="flex items-center gap-2">
          <PenTool className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">Signature Verification</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {hasSignature ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Extracted Signature */}
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                  Extracted from Cheque
                </h4>
                {extractedBase64 ? (
                  <div className="bg-muted/30 rounded-lg border p-3 flex items-center justify-center h-48">
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
                  <div className="bg-muted/30 rounded-lg border p-3 flex items-center justify-center h-48 text-muted-foreground">
                    <span className="text-sm">{data.extracted ? 'Invalid signature format' : 'No signature image extracted'}</span>
                  </div>
                )}
              </div>

              {/* Reference Signature - Only show if we have it (drawer bank) */}
              {referenceBase64 ? (
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                    Reference (On File)
                  </h4>
                  <div className="bg-muted/30 rounded-lg border p-3 flex items-center justify-center h-48">
                    <img
                      src={referenceBase64}
                      alt="Reference Signature"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                    Verification Status
                  </h4>
                  <div className="bg-blue-50 rounded-lg border border-blue-200 p-3 flex flex-col items-center justify-center h-48 text-blue-700">
                    <span className="text-sm font-medium">Signature Extracted ✓</span>
                    <span className="text-xs mt-2 text-center">
                      Reference comparison will be done by the drawer bank (account holder's bank)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Match Score / Status */}
            {data.matchScore !== undefined && (
              <div className={`border rounded-lg p-4 ${data.matchScore >= 70 ? 'bg-green-50/50 border-green-200' :
                data.matchScore >= 50 ? 'bg-amber-50/50 border-amber-200' :
                  'bg-destructive/10 border-destructive/20'
                }`}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BrainCircuit className="h-5 w-5 text-primary" />
                      <span className="text-sm font-bold">AI Signature Verification</span>
                    </div>
                    <Badge variant={
                      data.matchScore >= 70 ? "outline" :
                        data.matchScore >= 50 ? "secondary" : "destructive"
                    } className={
                      data.matchScore >= 70 ? "bg-green-100 text-green-800 border-green-200" :
                        data.matchScore >= 50 ? "bg-amber-100 text-amber-800 border-amber-200" : ""
                    }>
                      {data.matchScore >= 70 ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Match Confirmed
                        </span>
                      ) : data.matchScore >= 50 ? (
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Review Needed
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <XCircle className="h-3 w-3" /> Mismatch Detected
                        </span>
                      )}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-muted-foreground">Confidence Score</span>
                      <span className={`font-bold ${data.matchScore >= 70 ? 'text-green-700' :
                          data.matchScore >= 50 ? 'text-amber-700' : 'text-destructive'
                        }`}>
                        {data.matchScore.toFixed(1)}%
                      </span>
                    </div>
                    <Progress
                      value={Math.min(100, Math.max(0, data.matchScore))}
                      className={`h-2 ${data.matchScore >= 70 ? '[&>div]:bg-green-500' :
                          data.matchScore >= 50 ? '[&>div]:bg-amber-500' : '[&>div]:bg-destructive'
                        }`}
                    />
                  </div>

                  <p className="text-xs text-muted-foreground">
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
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>No signature detected on cheque</AlertTitle>
            <AlertDescription>
              A valid handwritten signature is required for cheque processing.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default SignatureComparison;
