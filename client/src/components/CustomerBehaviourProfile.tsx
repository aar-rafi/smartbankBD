import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  User, TrendingUp, Clock, AlertTriangle, CheckCircle2, 
  XCircle, DollarSign, Calendar, Users, Activity
} from "lucide-react";
import { BehaviourAnalysisResult, BehaviourAnomaly } from '../../../shared/types';

interface CustomerBehaviourProfileProps {
  analysis: BehaviourAnalysisResult | null;
  isLoading?: boolean;
}

const SeverityBadge: React.FC<{ severity: BehaviourAnomaly['severity'] }> = ({ severity }) => {
  const config = {
    high: { className: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
    medium: { className: 'bg-amber-100 text-amber-800 border-amber-200', icon: AlertTriangle },
    low: { className: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: AlertTriangle }
  };
  const { className, icon: Icon } = config[severity];
  return (
    <Badge variant="outline" className={`${className} text-xs`}>
      <Icon className="h-3 w-3 mr-1" />
      {severity.toUpperCase()}
    </Badge>
  );
};

const CustomerBehaviourProfile: React.FC<CustomerBehaviourProfileProps> = ({ analysis, isLoading }) => {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Activity className="h-6 w-6 animate-pulse text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Analyzing behaviour...</span>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) return null;

  const { profileFound, profile, anomalies, behaviourScore, riskLevel, recommendation } = analysis;

  const formatCurrency = (val: number) => `৳${val.toLocaleString('en-BD')}`;

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-red-500 bg-red-50 border-red-200';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3 border-b bg-slate-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-slate-600" />
            <CardTitle className="text-base">Customer Behaviour Profile</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getRiskColor(riskLevel)}>
              Score: {behaviourScore}/100
            </Badge>
            <Badge variant="outline" className={getRiskColor(riskLevel)}>
              {riskLevel.toUpperCase()} RISK
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Profile Stats */}
        {profileFound && profile && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <DollarSign className="h-3 w-3" /> Avg Transaction
              </div>
              <p className="text-sm font-semibold">{formatCurrency(profile.avgTransactionAmt)}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <TrendingUp className="h-3 w-3" /> Max Transaction
              </div>
              <p className="text-sm font-semibold">{formatCurrency(profile.maxTransactionAmt)}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <Activity className="h-3 w-3" /> Total Txns
              </div>
              <p className="text-sm font-semibold">{profile.totalTransactionCount}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <Users className="h-3 w-3" /> Unique Payees
              </div>
              <p className="text-sm font-semibold">{profile.uniquePayeeCount}</p>
            </div>
          </div>
        )}

        {/* Anomalies */}
        {anomalies.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase">Detected Anomalies</h4>
            {anomalies.map((anomaly, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2 bg-slate-50 rounded-md">
                <SeverityBadge severity={anomaly.severity} />
                <span className="text-sm text-slate-700">{anomaly.description}</span>
              </div>
            ))}
          </div>
        )}

        {/* No anomalies */}
        {anomalies.length === 0 && profileFound && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700 text-sm">
              Transaction matches customer's normal behaviour pattern.
            </AlertDescription>
          </Alert>
        )}

        {/* New Customer */}
        {!profileFound && (
          <Alert className="bg-blue-50 border-blue-200">
            <User className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700 text-sm">
              New customer - building behaviour profile from this transaction.
            </AlertDescription>
          </Alert>
        )}

        {/* Recommendation */}
        {recommendation && (
          <div className={`p-3 rounded-md text-sm ${getRiskColor(riskLevel)}`}>
            <strong>Recommendation:</strong> {recommendation}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CustomerBehaviourProfile;
