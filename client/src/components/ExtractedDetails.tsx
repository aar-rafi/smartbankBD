import React, { useEffect, useRef, useState } from 'react';
import { ChequeData } from '../../../shared/types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, XCircle, RefreshCw, FileText, PenTool } from "lucide-react";

interface ExtractedDetailsProps {
  data: ChequeData;
  originalImage: string | null;
  onReset: () => void;
}

const ResultRow: React.FC<{ label: string; value: string | number | null; }> = ({ label, value }) => (
  <div className="flex flex-col sm:flex-row sm:justify-between py-3">
    <span className="text-sm font-medium text-muted-foreground">{label}</span>
    <span className="text-sm font-semibold mt-1 sm:mt-0 text-foreground min-h-[1.5rem] text-right">
      {value === null || value === '' ? <span className="text-muted-foreground italic">Not detected</span> : value}
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
    <div className="mt-2 border rounded-md overflow-hidden bg-white inline-block">
      <canvas ref={canvasRef} className="max-h-24 w-auto block" />
    </div>
  );
};

const SignatureIndicator: React.FC<{ hasSignature: boolean; signatureBox: number[] | null; originalImage: string | null }> = ({ hasSignature, signatureBox, originalImage }) => (
  <div className={`p-4 rounded-lg border ${hasSignature ? 'bg-green-50/50 border-green-200' : 'bg-destructive/10 border-destructive/20'}`}>
    <div className="flex items-center gap-3 mb-2">
      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${hasSignature ? 'bg-green-100 text-green-700' : 'bg-destructive/20 text-destructive'}`}>
        {hasSignature ? <PenTool className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
      </div>
      <div className="flex-1">
        <p className={`text-xs font-bold uppercase tracking-wide ${hasSignature ? 'text-green-800' : 'text-destructive'}`}>Signature Check</p>
        <p className={`font-semibold text-sm ${hasSignature ? 'text-green-700' : 'text-destructive'}`}>
          {hasSignature ? 'Handwritten Signature Detected' : 'No Signature Detected'}
        </p>
      </div>
      {hasSignature && <CheckCircle2 className="h-5 w-5 text-green-600" />}
    </div>

    {hasSignature && signatureBox && originalImage && (
      <div>
        <p className="text-xs text-green-700 mb-1 font-medium">Extracted Signature:</p>
        <SignatureCropper imageUrl={originalImage} box={signatureBox} />
      </div>
    )}
  </div>
);

const ExtractedDetails: React.FC<ExtractedDetailsProps> = ({ data, originalImage, onReset }) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Main Extracted Data Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-muted/50 border-b">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Extracted Details</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={onReset} className="text-muted-foreground hover:text-primary">
            <RefreshCw className="mr-2 h-4 w-4" />
            Scan Another
          </Button>
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Bank Details Section */}
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Bank Information</h3>
              <ResultRow label="Bank Name" value={data.bankName} />
              <Separator />
              <ResultRow label="Branch Name" value={data.branchName} />
              <Separator />
              <ResultRow label="Routing Number" value={data.routingNumber} />
              <Separator />
              <ResultRow label="MICR Code" value={data.micrCode} />
            </div>

            {/* Payment Details Section */}
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Payment Details</h3>
              <ResultRow label="Cheque Number" value={data.chequeNumber} />
              <Separator />
              <ResultRow label="Date" value={data.date} />
              <Separator />
              <ResultRow label="Amount (Digits)" value={data.amountDigits} />
              <Separator />
              <ResultRow label="Amount (Words)" value={data.amountWords} />
            </div>

            {/* Account Details Section */}
            <div className="space-y-1 lg:col-span-2">
              <Separator className="my-4 lg:hidden" />
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Parties Involved</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="space-y-1">
                  <ResultRow label="Payee Name" value={data.payeeName} />
                  <Separator />
                  <ResultRow label="Account Holder" value={data.accountHolderName} />
                  <Separator />
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
        </CardContent>
      </Card>
    </div>
  );
};

export default ExtractedDetails;