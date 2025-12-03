import React from 'react';
import { FraudDetectionResult, RiskFactor, FeatureContribution, SafeFactor, CustomerStatistics, ComputedFeatures } from '../../../shared/types';
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
  Brain,
  BarChart3,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  User,
  Clock,
  DollarSign
} from "lucide-react";

// ============================================================
// HELPER COMPONENTS
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _RiskMeter: React.FC<{ score: number; riskLevel: string }> = ({ score, riskLevel }) => {
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _FeatureItem: React.FC<{ feature: FeatureContribution }> = ({ feature }) => {
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

// Safe factor item (positive indicator)
const SafeFactorItem: React.FC<{ factor: SafeFactor }> = ({ factor }) => {
  return (
    <div className="flex items-start gap-3 p-3 bg-green-50/50 rounded-lg hover:bg-green-50 transition-colors">
      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium text-green-800">{factor.description}</p>
        {factor.value !== undefined && (
          <span className="text-xs text-green-600">
            Value: {typeof factor.value === 'boolean' ? (factor.value ? 'Yes' : 'No') : factor.value}
          </span>
        )}
      </div>
    </div>
  );
};

// Statistics display component
const StatisticsPanel: React.FC<{ 
  statistics: CustomerStatistics; 
  features: ComputedFeatures;
  chequeAmount?: number;
}> = ({ statistics, features, chequeAmount }) => {
  const formatCurrency = (val: number) => `৳${val.toLocaleString('en-BD', { minimumFractionDigits: 2 })}`;
  
  return (
    <div className="space-y-4">
      {/* Customer Profile Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <DollarSign className="h-3 w-3" />
            Average Transaction
          </div>
          <p className="text-sm font-semibold">{formatCurrency(statistics.avgTransactionAmt)}</p>
        </div>
        
        <div className="bg-slate-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <TrendingUp className="h-3 w-3" />
            Max Transaction
          </div>
          <p className="text-sm font-semibold">{formatCurrency(statistics.maxTransactionAmt)}</p>
        </div>
        
        <div className="bg-slate-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Database className="h-3 w-3" />
            Account Balance
          </div>
          <p className="text-sm font-semibold">{formatCurrency(statistics.accountBalance)}</p>
        </div>
        
        <div className="bg-slate-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Clock className="h-3 w-3" />
            Account Age
          </div>
          <p className="text-sm font-semibold">{statistics.accountAgeDays} days</p>
        </div>
        
        <div className="bg-slate-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Activity className="h-3 w-3" />
            Total Transactions
          </div>
          <p className="text-sm font-semibold">{statistics.totalTransactionCount}</p>
        </div>
        
        <div className="bg-slate-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <User className="h-3 w-3" />
            Unique Payees
          </div>
          <p className="text-sm font-semibold">{statistics.uniquePayeeCount}</p>
        </div>
      </div>
      
      {/* Comparison Metrics */}
      {chequeAmount && (
        <div className="border-t pt-4 space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Current Transaction Analysis</h4>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Amount vs Average</span>
              <span className={`text-sm font-medium ${features.amountZscore > 2 ? 'text-red-600' : features.amountZscore > 1 ? 'text-amber-600' : 'text-green-600'}`}>
                {features.amountZscore > 0 ? '+' : ''}{features.amountZscore.toFixed(1)} std dev
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Amount vs Max</span>
              <span className={`text-sm font-medium ${features.amountToMaxRatio > 1 ? 'text-red-600' : features.amountToMaxRatio > 0.8 ? 'text-amber-600' : 'text-green-600'}`}>
                {(features.amountToMaxRatio * 100).toFixed(0)}% of max
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Amount vs Balance</span>
              <span className={`text-sm font-medium ${features.amountToBalanceRatio > 1 ? 'text-red-600' : features.amountToBalanceRatio > 0.5 ? 'text-amber-600' : 'text-green-600'}`}>
                {(features.amountToBalanceRatio * 100).toFixed(0)}% of balance
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Signature Match</span>
              <span className={`text-sm font-medium ${features.signatureScore >= 70 ? 'text-green-600' : features.signatureScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                {features.signatureScore.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* Additional Info */}
      <div className="border-t pt-4">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Additional Information</h4>
        <div className="flex flex-wrap gap-2">
          {features.isNewPayee && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              <Info className="h-3 w-3 mr-1" />
              No transaction history to verify payee
            </Badge>
          )}
          {features.isWeekend && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              <Info className="h-3 w-3 mr-1" />
              Transaction on weekend
            </Badge>
          )}
          {features.isDormant && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              <AlertCircle className="h-3 w-3 mr-1" />
              Dormant account ({features.daysSinceLastTxn} days inactive)
            </Badge>
          )}
          {features.txnCount24h > 0 && (
            <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
              <Activity className="h-3 w-3 mr-1" />
              {features.txnCount24h} txn in 24h
            </Badge>
          )}
        </div>
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
  const [showDetails, setShowDetails] = React.useState(false);
  
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
    riskLevel, 
    riskFactors, 
    safeFactors,
    customerStatistics,
    computedFeatures,
    recommendation,
    modelAvailable,
    profileFound,
    confidence
  } = result;
  
  // Ensure fraudScore is a number
  const fraudScore = typeof result.fraudScore === 'number' 
    ? result.fraudScore 
    : parseFloat(String(result.fraudScore)) || 0;
  
  const riskCount = riskFactors?.length || 0;
  const safeCount = safeFactors?.length || 0;

  return (
    <div className="space-y-4">
      {/* Main Risk Card */}
      <Card className={`border-2 ${
        riskLevel === 'critical' || riskLevel === 'high' ? 'border-red-200 bg-red-50/30' :
        riskLevel === 'medium' ? 'border-amber-200 bg-amber-50/30' :
        'border-green-200 bg-green-50/30'
      }`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {riskLevel === 'critical' || riskLevel === 'high' ? (
                <ShieldAlert className="h-6 w-6 text-red-600" />
              ) : riskLevel === 'medium' ? (
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              ) : (
                <ShieldCheck className="h-6 w-6 text-green-600" />
              )}
              <CardTitle className="text-lg">Fraud Risk Analysis</CardTitle>
            </div>
            {riskLevel && <RiskBadge level={riskLevel} />}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Risk Score Display */}
          <div className="flex items-center gap-6">
            {/* Circular Score Display */}
            <div className="relative">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center border-4 ${
                (fraudScore || 0) >= 70 ? 'border-red-500 bg-red-50' :
                (fraudScore || 0) >= 50 ? 'border-amber-500 bg-amber-50' :
                (fraudScore || 0) >= 30 ? 'border-yellow-500 bg-yellow-50' :
                'border-green-500 bg-green-50'
              }`}>
                <div className="text-center">
                  <span className={`text-2xl font-bold ${
                    (fraudScore || 0) >= 70 ? 'text-red-600' :
                    (fraudScore || 0) >= 50 ? 'text-amber-600' :
                    (fraudScore || 0) >= 30 ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {Math.round(100 - (fraudScore || 0))}%
                  </span>
                  <p className="text-xs text-muted-foreground">Safe</p>
                </div>
              </div>
              <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${
                (fraudScore || 0) >= 70 ? 'bg-red-500' :
                (fraudScore || 0) >= 50 ? 'bg-amber-500' :
                (fraudScore || 0) >= 30 ? 'bg-yellow-500' :
                'bg-green-500'
              }`} />
            </div>

            {/* Score Details */}
            <div className="flex-1 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Risk Score</span>
                <span className="font-semibold">{fraudScore.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    (fraudScore || 0) >= 70 ? 'bg-red-500' :
                    (fraudScore || 0) >= 50 ? 'bg-amber-500' :
                    (fraudScore || 0) >= 30 ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${fraudScore || 0}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Low Risk</span>
                <span>High Risk</span>
              </div>
              {confidence !== undefined && (
                <p className="text-xs text-muted-foreground">
                  <Info className="h-3 w-3 inline mr-1" />
                  Model confidence: {(confidence * 100).toFixed(1)}%
                </p>
              )}
            </div>
          </div>

          {/* Quick Stats Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={`${riskCount > 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-50'}`}>
              <AlertTriangle className="h-3 w-3 mr-1" />
              {riskCount} Risk Factors
            </Badge>
            <Badge variant="outline" className={`${safeCount > 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50'}`}>
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {safeCount} Safe Factors
            </Badge>
            <Badge variant="outline" className={modelAvailable ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}>
              <Brain className="h-3 w-3 mr-1" />
              {modelAvailable ? 'Model Active' : 'Demo Mode'}
            </Badge>
            <Badge variant="outline" className={profileFound ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-700 border-slate-200'}>
              <Database className="h-3 w-3 mr-1" />
              {profileFound ? 'Profile Found' : 'No Profile'}
            </Badge>
          </div>

          {/* Toggle Details Button */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors border-t"
          >
            {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showDetails ? 'Hide Details' : 'Show Details'}
            {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {/* Expandable Details Section */}
          {showDetails && (
            <div className="space-y-4 pt-2 border-t">
              {/* Risk Factors */}
              {riskFactors && riskFactors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-red-700">
                    <XCircle className="h-4 w-4" />
                    Risk Factors
                  </h4>
                  <div className="space-y-2">
                    {riskFactors.map((factor, idx) => (
                      <RiskFactorItem key={idx} factor={factor} />
                    ))}
                  </div>
                </div>
              )}

              {/* Safe Factors */}
              {safeFactors && safeFactors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Safe Factors
                  </h4>
                  <div className="space-y-2">
                    {safeFactors.map((factor, idx) => (
                      <SafeFactorItem key={idx} factor={factor} />
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Info from computed features */}
              {computedFeatures && (
                <div className="space-y-2">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                    <Info className="h-4 w-4" />
                    Additional Information
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {computedFeatures.isNewPayee && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        <Info className="h-3 w-3 mr-1" />
                        No transaction history to verify payee
                      </Badge>
                    )}
                    {computedFeatures.isWeekend && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        <Info className="h-3 w-3 mr-1" />
                        Transaction on weekend
                      </Badge>
                    )}
                    {computedFeatures.isNightTransaction && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Night transaction detected
                      </Badge>
                    )}
                    {computedFeatures.isDormant && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Dormant account ({computedFeatures.daysSinceLastTxn} days)
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Statistics Card - Only show if profile found */}
      {profileFound && customerStatistics && computedFeatures && (
        <Card>
          <CardHeader className="bg-muted/50 border-b pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Customer Profile Statistics</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <StatisticsPanel 
              statistics={customerStatistics} 
              features={computedFeatures}
            />
          </CardContent>
        </Card>
      )}

      {/* Recommendation */}
      {recommendation && (
        <Alert className={
          riskLevel === 'critical' || riskLevel === 'high' ? 'bg-red-50 border-red-200' :
          riskLevel === 'medium' ? 'bg-amber-50 border-amber-200' :
          riskLevel === 'low' ? 'bg-yellow-50 border-yellow-200' :
          'bg-green-50 border-green-200'
        }>
          {riskLevel === 'critical' || riskLevel === 'high' ? (
            <ShieldAlert className="h-4 w-4 text-red-600" />
          ) : riskLevel === 'medium' ? (
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          ) : (
            <ShieldCheck className="h-4 w-4 text-green-600" />
          )}
          <AlertTitle className={
            riskLevel === 'critical' || riskLevel === 'high' ? 'text-red-800' :
            riskLevel === 'medium' ? 'text-amber-800' :
            riskLevel === 'low' ? 'text-yellow-800' :
            'text-green-800'
          }>
            Recommendation
          </AlertTitle>
          <AlertDescription className={
            riskLevel === 'critical' || riskLevel === 'high' ? 'text-red-700' :
            riskLevel === 'medium' ? 'text-amber-700' :
            riskLevel === 'low' ? 'text-yellow-700' :
            'text-green-700'
          }>
            {recommendation}
          </AlertDescription>
        </Alert>
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
