import React from 'react';
import { FraudDetectionResult, RiskFactor, FeatureContribution } from '../../../shared/types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  TrendingUp,
  Activity,
  Info,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Database,
  Brain
} from "lucide-react";

// ============================================================
// HELPER COMPONENTS
// ============================================================

const RiskMeter: React.FC<{ score: number; riskLevel: string }> = ({ score, riskLevel }) => {
  const getColor = () => {
    switch (riskLevel) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-amber-500';
      case 'low': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  const getGradient = () => {
    if (score >= 70) return 'from-red-500 to-red-600';
    if (score >= 50) return 'from-amber-500 to-amber-600';
    if (score >= 30) return 'from-yellow-500 to-yellow-600';
    return 'from-green-500 to-green-600';
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-muted-foreground">Fraud Risk Score</span>
        <span className={`text-2xl font-bold ${
          score >= 70 ? 'text-red-600' : 
          score >= 50 ? 'text-amber-600' : 
          score >= 30 ? 'text-yellow-600' : 'text-green-600'
        }`}>
          {score}%
        </span>
      </div>
      
      {/* Risk meter bar */}
      <div className="relative h-4 bg-muted rounded-full overflow-hidden">
        {/* Background gradient showing risk zones */}
        <div className="absolute inset-0 flex">
          <div className="w-[30%] bg-gradient-to-r from-green-200 to-green-300" />
          <div className="w-[20%] bg-gradient-to-r from-yellow-200 to-yellow-300" />
          <div className="w-[20%] bg-gradient-to-r from-amber-200 to-amber-300" />
          <div className="w-[30%] bg-gradient-to-r from-red-200 to-red-300" />
        </div>
        
        {/* Indicator line */}
        <div 
          className={`absolute top-0 bottom-0 w-1 bg-gradient-to-b ${getGradient()} rounded-full shadow-lg transition-all duration-500`}
          style={{ left: `calc(${Math.min(score, 100)}% - 2px)` }}
        />
        
        {/* Fill bar */}
        <div 
          className={`absolute top-0 bottom-0 left-0 ${getColor()} opacity-60 transition-all duration-500`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
      
      {/* Risk zone labels */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Normal</span>
        <span>Low</span>
        <span>Medium</span>
        <span>High</span>
      </div>
    </div>
  );
};

const RiskBadge: React.FC<{ level: string }> = ({ level }) => {
  const config = {
    critical: { 
      variant: 'destructive' as const, 
      icon: ShieldAlert, 
      label: 'CRITICAL - REJECT',
      className: 'bg-red-200 text-red-900 border-red-300 hover:bg-red-300'
    },
    high: { 
      variant: 'destructive' as const, 
      icon: ShieldAlert, 
      label: 'HIGH RISK',
      className: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200'
    },
    medium: { 
      variant: 'secondary' as const, 
      icon: AlertTriangle, 
      label: 'MEDIUM RISK',
      className: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200'
    },
    low: { 
      variant: 'outline' as const, 
      icon: ShieldCheck, 
      label: 'LOW RISK',
      className: 'bg-green-50 text-green-800 border-green-200 hover:bg-green-100'
    },
    normal: { 
      variant: 'outline' as const, 
      icon: ShieldCheck, 
      label: 'NORMAL',
      className: 'bg-green-50 text-green-800 border-green-200 hover:bg-green-100'
    }
  };

  const { icon: Icon, label, className } = config[level as keyof typeof config] || config.low;

  return (
    <Badge variant="outline" className={`${className} px-3 py-1 gap-1.5`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Badge>
  );
};

const SeverityIcon: React.FC<{ severity: RiskFactor['severity'] }> = ({ severity }) => {
  switch (severity) {
    case 'high':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'medium':
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case 'low':
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    default:
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  }
};

const RiskFactorItem: React.FC<{ factor: RiskFactor }> = ({ factor }) => {
  return (
    <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
      <SeverityIcon severity={factor.severity} />
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium">{factor.description}</p>
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={`text-xs ${
              factor.severity === 'high' ? 'bg-red-50 text-red-700 border-red-200' :
              factor.severity === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
              'bg-yellow-50 text-yellow-700 border-yellow-200'
            }`}
          >
            {factor.severity.toUpperCase()}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {typeof factor.value === 'boolean' 
              ? (factor.value ? 'Yes' : 'No') 
              : factor.value}
          </span>
        </div>
      </div>
    </div>
  );
};

const FeatureItem: React.FC<{ feature: FeatureContribution }> = ({ feature }) => {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/30 transition-colors">
      <span className="text-sm text-muted-foreground">{feature.name}</span>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium ${
          feature.impact === 'high' ? 'text-red-600' :
          feature.impact === 'medium' ? 'text-amber-600' :
          'text-foreground'
        }`}>
          {feature.value}
        </span>
        {feature.impact !== 'normal' && (
          <div className={`h-2 w-2 rounded-full ${
            feature.impact === 'high' ? 'bg-red-500' : 'bg-amber-500'
          }`} />
        )}
      </div>
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

interface FraudDetectionProps {
  result: FraudDetectionResult | null;
  isLoading?: boolean;
}

const FraudDetection: React.FC<FraudDetectionProps> = ({ result, isLoading }) => {
  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center min-h-[300px] space-y-4 py-8">
          <div className="relative">
            <Brain className="h-12 w-12 text-primary animate-pulse" />
            <Loader2 className="h-6 w-6 text-primary animate-spin absolute -right-1 -bottom-1" />
          </div>
          <div className="text-center space-y-2">
            <p className="font-medium">Analyzing Transaction Patterns...</p>
            <p className="text-sm text-muted-foreground">Running ML fraud detection model</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No result / idle state
  if (!result) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center min-h-[250px] text-muted-foreground py-8">
          <Shield className="h-16 w-16 mb-4 opacity-20" />
          <p className="text-sm">Fraud detection results will appear here</p>
        </CardContent>
      </Card>
    );
  }

  // Error state when model not available
  if (!result.modelAvailable && result.error && !result.fraudScore) {
    return (
      <Card>
        <CardHeader className="bg-muted/50 border-b pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Fraud Detection</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">Model Not Available</AlertTitle>
            <AlertDescription className="text-amber-700 space-y-2">
              <p>{result.error}</p>
              <p className="text-xs mt-2">
                To enable fraud detection, train the model by running:
                <code className="block mt-1 p-2 bg-amber-100 rounded text-xs">
                  python server/ml/train_fraud_model.py
                </code>
              </p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Main result display
  const { 
    fraudScore, 
    riskLevel, 
    riskFactors, 
    featureContributions, 
    recommendation,
    modelAvailable,
    profileFound
  } = result;

  return (
    <div className="space-y-4">
      {/* Main Risk Card */}
      <Card>
        <CardHeader className="bg-muted/50 border-b pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">ML Fraud Detection</CardTitle>
            </div>
            {riskLevel && <RiskBadge level={riskLevel} />}
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Data availability indicators */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={modelAvailable ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}>
              <Brain className="h-3 w-3 mr-1" />
              {modelAvailable ? 'Model Active' : 'Demo Mode'}
            </Badge>
            <Badge variant="outline" className={profileFound ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-700 border-slate-200'}>
              <Database className="h-3 w-3 mr-1" />
              {profileFound ? 'Profile Found' : 'No Profile'}
            </Badge>
          </div>

          {/* Risk Score Meter */}
          {fraudScore !== null && riskLevel && (
            <RiskMeter score={fraudScore} riskLevel={riskLevel} />
          )}

          {/* Recommendation Alert */}
          {recommendation && (
            <Alert className={
              riskLevel === 'high' ? 'bg-red-50 border-red-200' :
              riskLevel === 'medium' ? 'bg-amber-50 border-amber-200' :
              riskLevel === 'low' ? 'bg-yellow-50 border-yellow-200' :
              'bg-green-50 border-green-200'
            }>
              {riskLevel === 'high' ? (
                <ShieldAlert className="h-4 w-4 text-red-600" />
              ) : riskLevel === 'medium' ? (
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              ) : (
                <ShieldCheck className="h-4 w-4 text-green-600" />
              )}
              <AlertTitle className={
                riskLevel === 'high' ? 'text-red-800' :
                riskLevel === 'medium' ? 'text-amber-800' :
                riskLevel === 'low' ? 'text-yellow-800' :
                'text-green-800'
              }>
                Recommendation
              </AlertTitle>
              <AlertDescription className={
                riskLevel === 'high' ? 'text-red-700' :
                riskLevel === 'medium' ? 'text-amber-700' :
                riskLevel === 'low' ? 'text-yellow-700' :
                'text-green-700'
              }>
                {recommendation}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Risk Factors Card */}
      {riskFactors && riskFactors.length > 0 && (
        <Card>
          <CardHeader className="bg-muted/50 border-b pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Risk Factors Detected</CardTitle>
              <Badge variant="secondary" className="ml-auto">
                {riskFactors.length} {riskFactors.length === 1 ? 'factor' : 'factors'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {riskFactors.map((factor, idx) => (
              <RiskFactorItem key={idx} factor={factor} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* No Risk Factors */}
      {(!riskFactors || riskFactors.length === 0) && riskLevel === 'normal' && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-green-700">
              <CheckCircle2 className="h-6 w-6" />
              <div>
                <p className="font-medium">No Risk Factors Detected</p>
                <p className="text-sm text-green-600">Transaction appears to follow normal patterns</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feature Analysis Card */}
      {featureContributions && featureContributions.length > 0 && (
        <Card>
          <CardHeader className="bg-muted/50 border-b pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Analysis Details</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-2">
            <div className="divide-y">
              {featureContributions.map((feature, idx) => (
                <FeatureItem key={idx} feature={feature} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Demo Mode Warning */}
      {!modelAvailable && (
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">Demo Mode</AlertTitle>
          <AlertDescription className="text-blue-700 text-xs">
            Showing simulated results. Train the ML model for real fraud detection analysis.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default FraudDetection;
