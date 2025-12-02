import React from 'react';
import { ValidationResult, ValidationRule } from '../../../shared/types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, XCircle, AlertTriangle, ClipboardCheck, ShieldCheck, ShieldAlert } from "lucide-react";

const StatusIcon: React.FC<{ status: ValidationRule['status'] }> = ({ status }) => {
  switch (status) {
    case 'pass':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case 'fail':
      return <XCircle className="h-5 w-5 text-destructive text-red-500" />;
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    default:
      return <div className="h-5 w-5 rounded-full border-2 border-muted" />;
  }
};

const ValidationChecklist: React.FC<{ result: ValidationResult }> = ({ result }) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="bg-muted/50 border-b pb-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Automated Validation Checks</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {result.rules.map((rule) => (
              <div key={rule.id} className="p-4 flex items-start gap-3 hover:bg-muted/30 transition-colors">
                <div className="mt-0.5 shrink-0">
                  <StatusIcon status={rule.status} />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-start">
                    <p className={`text-sm font-medium ${rule.status === 'pass' ? 'text-foreground' :
                      rule.status === 'fail' ? 'text-destructive' : 'text-amber-600'
                      }`}>
                      {rule.label}
                    </p>
                    <Badge variant={
                      rule.status === 'pass' ? 'outline' :
                        rule.status === 'fail' ? 'destructive' : 'secondary'
                    } className={
                      rule.status === 'pass' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' :
                        rule.status === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' : ''
                    }>
                      {rule.status}
                    </Badge>
                  </div>
                  {rule.message && (
                    <p className="text-xs text-muted-foreground">{rule.message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t bg-muted/20">
            <Alert variant={result.isValid ? "default" : "destructive"} className={result.isValid ? "bg-green-50 border-green-200 text-green-800" : ""}>
              {result.isValid ? <ShieldCheck className="h-4 w-4 text-green-600" /> : <ShieldAlert className="h-4 w-4" />}
              <AlertTitle className={result.isValid ? "text-green-800" : ""}>
                {result.isValid ? "Cheque Validated Successfully" : "Validation Failed"}
              </AlertTitle>
              <AlertDescription className={result.isValid ? "text-green-700" : ""}>
                {result.isValid
                  ? "All critical checks passed. The cheque appears to be valid."
                  : "Please review the failed checks above before processing."}
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* NOTE: Signature comparison is NOT shown here (presenting bank).
          It's shown in ChequeDetailsView when drawer bank runs deep verification. */}
    </div>
  );
};

export default ValidationChecklist;