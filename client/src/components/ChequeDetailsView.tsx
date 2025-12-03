import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
    ArrowLeft, 
    CheckCircle2, 
    XCircle, 
    AlertCircle, 
    Clock, 
    Building2, 
    User, 
    CreditCard,
    Calendar,
    Hash,
    Flag,
    Shield,
    Fingerprint,
    Brain,
    TrendingUp,
    AlertTriangle,
    Loader2,
    Trash2,
    Wallet,
    BanknoteIcon
} from "lucide-react";
import { ChequeDetails, fetchChequeDetails, updateChequeDecision, runDeepVerification, deleteCheque } from '@/services/api';
import BACHPackage from './BACHPackage';
import FraudDetection from './FraudDetection';
import { FraudDetectionResult, RiskFactor, FeatureContribution } from '../../../shared/types';

interface ChequeDetailsViewProps {
    chequeId: number;
    currentBankCode: string;
    onBack: () => void;
}

interface VerificationResult {
    isValid: boolean;
    rules: Array<{
        id: string;
        label: string;
        status: 'pass' | 'fail' | 'warning' | 'pending';
        message?: string;
        details?: Record<string, any>;
    }>;
    signatureData?: {
        extracted: string | null;
        reference: string | null;
        matchScore?: number;
    };
    riskScore?: number;
    riskLevel?: string;
}

const ChequeDetailsView: React.FC<ChequeDetailsViewProps> = ({ chequeId, currentBankCode, onBack }) => {
    const [details, setDetails] = useState<ChequeDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);

    useEffect(() => {
        loadDetails();
    }, [chequeId]);

    const loadDetails = async () => {
        try {
            const data = await fetchChequeDetails(chequeId);
            setDetails(data);
            
            // If this is drawer bank and cheque is at_drawer_bank, auto-run verification
            const isDrawerBank = data.cheque.drawer_bank_code?.toLowerCase() === currentBankCode.toLowerCase();
            if (isDrawerBank && data.cheque.status === 'at_drawer_bank' && !data.verification) {
                runVerification();
            }
        } catch (error) {
            console.error('Error loading cheque details:', error);
        } finally {
            setLoading(false);
        }
    };

    const runVerification = async () => {
        setVerifying(true);
        try {
            const result = await runDeepVerification(chequeId);
            setVerificationResult(result);
            // Reload details to get updated verification data
            const data = await fetchChequeDetails(chequeId);
            setDetails(data);
        } catch (error) {
            console.error('Error running verification:', error);
        } finally {
            setVerifying(false);
        }
    };

    const formatCurrency = (amount: string | number) => {
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(num);
    };

    const getStatusInfo = (status: string) => {
        const map: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
            'received': { label: 'Received', color: 'bg-gray-100 text-gray-800', icon: <Clock className="h-4 w-4" /> },
            'validated': { label: 'Validated', color: 'bg-blue-100 text-blue-800', icon: <CheckCircle2 className="h-4 w-4" /> },
            'validation_failed': { label: 'Validation Failed', color: 'bg-red-100 text-red-800', icon: <XCircle className="h-4 w-4" /> },
            'clearing': { label: 'In Transit (BACH)', color: 'bg-purple-100 text-purple-800', icon: <Clock className="h-4 w-4" /> },
            'at_drawer_bank': { label: 'Awaiting Verification', color: 'bg-indigo-100 text-indigo-800', icon: <AlertCircle className="h-4 w-4" /> },
            'approved': { label: 'Approved', color: 'bg-green-100 text-green-800', icon: <CheckCircle2 className="h-4 w-4" /> },
            'rejected': { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: <XCircle className="h-4 w-4" /> },
            'flagged': { label: 'Flagged for Review', color: 'bg-orange-100 text-orange-800', icon: <Flag className="h-4 w-4" /> },
        };
        return map[status] || { label: status, color: 'bg-gray-100', icon: <Clock className="h-4 w-4" /> };
    };

    const handleDecision = async (decision: 'approved' | 'rejected' | 'flagged') => {
        setActionLoading(true);
        try {
            await updateChequeDecision(chequeId, decision, decision === 'flagged' ? 'Requires manual review' : undefined);
            await loadDetails();
        } catch (error) {
            console.error('Error updating decision:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Delete this cheque? This cannot be undone.')) return;
        try {
            await deleteCheque(chequeId);
            onBack();
        } catch (error) {
            console.error('Error deleting cheque:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!details) {
        return (
            <div className="text-center py-20">
                <p className="text-muted-foreground">Cheque not found</p>
                <Button variant="outline" onClick={onBack} className="mt-4">Go Back</Button>
            </div>
        );
    }

    const { cheque, validation, verification, flags, clearing } = details;
    const statusInfo = getStatusInfo(cheque.status);
    const isDrawerBank = cheque.drawer_bank_code?.toLowerCase() === currentBankCode.toLowerCase();
    const canMakeDecision = isDrawerBank && cheque.status === 'at_drawer_bank';

    // Convert verification data to FraudDetectionResult format
    const convertToFraudDetectionResult = (verification: any): FraudDetectionResult | null => {
        if (!verification) return null;

        const riskFactors: RiskFactor[] = [];
        const featureContributions: FeatureContribution[] = [];

        // Convert behavior flags to risk factors
        if (verification.behavior_flags && Array.isArray(verification.behavior_flags)) {
            verification.behavior_flags.forEach((flag: string) => {
                const flagMap: Record<string, { severity: 'low' | 'medium' | 'high', description: string }> = {
                    'unusual_amount': { severity: 'high', description: 'Amount significantly different from usual transactions' },
                    'new_payee': { severity: 'medium', description: 'Payment to a new/unknown payee' },
                    'unusual_time': { severity: 'medium', description: 'Transaction processed at unusual hour' },
                    'unusual_day': { severity: 'low', description: 'Transaction on unusual day' },
                    'high_velocity': { severity: 'high', description: 'Too many cheques in short period' },
                    'dormant_account': { severity: 'medium', description: 'Account was inactive for extended period' }
                };

                const flagInfo = flagMap[flag] || { severity: 'low' as const, description: flag.replace(/_/g, ' ') };
                riskFactors.push({
                    factor: flagInfo.description,
                    severity: flagInfo.severity,
                    description: flagInfo.description,
                    value: true
                });
            });
        }

        // Add feature contributions
        if (verification.signature_score !== null && verification.signature_score !== undefined) {
            featureContributions.push({
                name: 'Signature Score',
                value: `${verification.signature_score}%`,
                impact: verification.signature_score >= 70 ? 'normal' : verification.signature_score >= 50 ? 'medium' : 'high'
            });
        }

        if (verification.fraud_risk_score !== null && verification.fraud_risk_score !== undefined) {
            featureContributions.push({
                name: 'Amount Analysis',
                value: verification.amount_deviation || 0,
                impact: Math.abs(verification.amount_deviation || 0) > 2 ? 'high' : 'normal'
            });
        }

        featureContributions.push({
            name: 'Payee History',
            value: riskFactors.some(f => f.factor.includes('new/unknown')) ? 'New' : 'Known',
            impact: riskFactors.some(f => f.factor.includes('new/unknown')) ? 'medium' : 'normal'
        });

        featureContributions.push({
            name: 'Transaction Velocity',
            value: verification.velocity_24h || 0,
            impact: (verification.velocity_24h || 0) > 5 ? 'high' : 'normal'
        });

        featureContributions.push({
            name: 'Account Health',
            value: verification.is_dormant_account ? 'Dormant' : 'Active',
            impact: verification.is_dormant_account ? 'medium' : 'normal'
        });

        const riskLevel = (verification.risk_level || 'low') as 'low' | 'medium' | 'high' | 'critical';
        const fraudScore = verification.fraud_risk_score || 0;

        let recommendation = '';
        if (riskLevel === 'critical' || fraudScore >= 80) {
            recommendation = 'REJECT - Critical fraud risk detected. Do not process this cheque.';
        } else if (riskLevel === 'high' || fraudScore >= 60) {
            recommendation = 'REVIEW - High fraud risk detected. Manual review required.';
        } else if (riskLevel === 'medium' || fraudScore >= 40) {
            recommendation = 'REVIEW - Moderate risk factors detected. Verify details carefully.';
        } else {
            recommendation = 'APPROVE - Low risk detected. Proceed with normal processing.';
        }

        return {
            modelAvailable: true,
            dataAvailable: true,
            profileFound: true,
            fraudScore: fraudScore,
            riskLevel: riskLevel,
            decision: verification.ai_decision === 'reject' ? 'reject' : verification.ai_decision === 'flag_for_review' ? 'review' : 'approve',
            confidence: verification.ai_confidence || 85,
            riskFactors: riskFactors,
            featureContributions: featureContributions,
            recommendation: recommendation
        };
    };

    const fraudDetectionResult = convertToFraudDetectionResult(verification);

    // Timeline
    const timeline = [
        { step: 'Received', done: true, time: cheque.created_at },
        { step: 'Validated', done: validation !== null, time: validation?.validated_at },
        { step: 'Sent to BACH', done: clearing !== null },
        { step: 'At Drawer Bank', done: ['at_drawer_bank', 'approved', 'rejected', 'flagged'].includes(cheque.status), time: clearing?.forwarded_at },
        { step: 'Final Decision', done: ['approved', 'rejected'].includes(cheque.status), result: cheque.status === 'approved' ? 'Approved' : cheque.status === 'rejected' ? 'Rejected' : null },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
                <div className="flex-1">
                    <h2 className="text-2xl font-bold">Cheque #{cheque.cheque_number}</h2>
                    <p className="text-muted-foreground">Transaction Details & Analysis</p>
                </div>
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDelete}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                </Button>
                <Badge className={statusInfo.color}>
                    {statusInfo.icon}
                    <span className="ml-1">{statusInfo.label}</span>
                </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Amount Card */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <p className="text-sm text-muted-foreground">Amount</p>
                                <p className="text-4xl font-bold text-primary">{formatCurrency(cheque.amount)}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Details Grid */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Cheque Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Hash className="h-3 w-3" /> Cheque Number
                                    </p>
                                    <p className="font-mono font-medium">{cheque.cheque_number}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <User className="h-3 w-3" /> Payee
                                    </p>
                                    <p className="font-medium">{cheque.payee_name}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Building2 className="h-3 w-3" /> Drawer Bank
                                    </p>
                                    <p className="font-medium">{cheque.drawer_bank_name}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <CreditCard className="h-3 w-3" /> Drawer Account
                                    </p>
                                    <p className="font-mono">{cheque.drawer_account}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Building2 className="h-3 w-3" /> Presenting Bank
                                    </p>
                                    <p className="font-medium">{cheque.presenting_bank_name || 'N/A'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Calendar className="h-3 w-3" /> Issue Date
                                    </p>
                                    <p className="font-medium">{cheque.issue_date ? new Date(cheque.issue_date).toLocaleDateString() : 'N/A'}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Account & Funds Section - Only visible to drawer bank */}
                    {isDrawerBank && (
                        <Card className={`border-2 ${
                            cheque.account_balance !== undefined && parseFloat(cheque.amount) > parseFloat(cheque.account_balance)
                                ? 'border-red-300 bg-red-50/50'
                                : 'border-green-300 bg-green-50/50'
                        }`}>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2">
                                    <Wallet className="h-5 w-5" />
                                    Account & Funds Verification
                                </CardTitle>
                                <CardDescription>
                                    Drawer account details and balance check
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground">Account Holder</p>
                                        <p className="font-medium">{cheque.drawer_name || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground">Account Type</p>
                                        <p className="font-medium capitalize">{cheque.account_type || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground">Account Status</p>
                                        <Badge variant={cheque.account_status === 'active' ? 'default' : 'destructive'}>
                                            {cheque.account_status?.toUpperCase() || 'UNKNOWN'}
                                        </Badge>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground">Account Age</p>
                                        <p className="font-medium">
                                            {cheque.account_opened_at 
                                                ? `${Math.floor((Date.now() - new Date(cheque.account_opened_at).getTime()) / (1000 * 60 * 60 * 24))} days`
                                                : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                                
                                {/* Balance vs Amount Comparison */}
                                <div className="mt-4 pt-4 border-t">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 rounded-lg bg-white border">
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Wallet className="h-3 w-3" /> Available Balance
                                            </p>
                                            <p className="text-xl font-bold text-blue-600">
                                                {cheque.account_balance !== undefined 
                                                    ? formatCurrency(parseFloat(cheque.account_balance))
                                                    : 'N/A'}
                                            </p>
                                        </div>
                                        <div className="p-3 rounded-lg bg-white border">
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                <BanknoteIcon className="h-3 w-3" /> Cheque Amount
                                            </p>
                                            <p className="text-xl font-bold">
                                                {formatCurrency(cheque.amount)}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {/* Funds Check Result */}
                                    {cheque.account_balance !== undefined && (
                                        <div className={`mt-3 p-3 rounded-lg flex items-center gap-2 ${
                                            parseFloat(cheque.amount) > parseFloat(cheque.account_balance)
                                                ? 'bg-red-100 text-red-800'
                                                : 'bg-green-100 text-green-800'
                                        }`}>
                                            {parseFloat(cheque.amount) > parseFloat(cheque.account_balance) ? (
                                                <>
                                                    <XCircle className="h-5 w-5" />
                                                    <div>
                                                        <p className="font-semibold">INSUFFICIENT FUNDS</p>
                                                        <p className="text-sm">
                                                            Shortfall: {formatCurrency(parseFloat(cheque.amount) - parseFloat(cheque.account_balance))}
                                                        </p>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle2 className="h-5 w-5" />
                                                    <div>
                                                        <p className="font-semibold">SUFFICIENT FUNDS</p>
                                                        <p className="text-sm">
                                                            Remaining after transaction: {formatCurrency(parseFloat(cheque.account_balance) - parseFloat(cheque.amount))}
                                                        </p>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Run Verification Button - for drawer bank - MOVED TO TOP */}
                    {isDrawerBank && (cheque.status === 'at_drawer_bank' || cheque.status === 'clearing') && (
                        <Card className="border-indigo-200 bg-indigo-50/50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Brain className="h-5 w-5 text-indigo-500" />
                                    Deep Verification Required
                                </CardTitle>
                                <CardDescription>
                                    As the drawer bank, you need to run AI verification before making a decision
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button 
                                    onClick={runVerification} 
                                    className="w-full"
                                    disabled={verifying}
                                    size="lg"
                                >
                                    {verifying ? (
                                        <>
                                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                            Running AI Verification...
                                        </>
                                    ) : (
                                        <>
                                            <Shield className="h-5 w-5 mr-2" />
                                            Run Deep Verification
                                        </>
                                    )}
                                </Button>
                                <p className="text-xs text-muted-foreground mt-3 text-center">
                                    This will verify: Account status, Funds, Signature match, AI detection, Fraud analysis
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Initial Validation Results */}
                    {validation && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-blue-500" />
                                    Initial Validation (Presenting Bank)
                                </CardTitle>
                                <CardDescription>Automated checks performed at deposit</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="p-3 rounded-lg border bg-muted/50">
                                        <div className="flex items-center gap-2 mb-1">
                                            {validation.all_fields_present ? (
                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-red-500" />
                                            )}
                                            <span className="text-xs font-medium">Fields Present</span>
                                        </div>
                                        <p className="text-sm">{validation.all_fields_present ? 'All fields detected' : 'Missing fields'}</p>
                                    </div>
                                    <div className="p-3 rounded-lg border bg-muted/50">
                                        <div className="flex items-center gap-2 mb-1">
                                            {validation.date_valid ? (
                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-red-500" />
                                            )}
                                            <span className="text-xs font-medium">Date Valid</span>
                                        </div>
                                        <p className="text-sm">{validation.date_valid ? 'Within validity' : 'Invalid date'}</p>
                                    </div>
                                    <div className="p-3 rounded-lg border bg-muted/50">
                                        <div className="flex items-center gap-2 mb-1">
                                            {validation.micr_readable ? (
                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-red-500" />
                                            )}
                                            <span className="text-xs font-medium">MICR Code</span>
                                        </div>
                                        <p className="text-sm">{validation.micr_readable ? 'Readable' : 'Not readable'}</p>
                                    </div>
                                    <div className="p-3 rounded-lg border bg-muted/50">
                                        <div className="flex items-center gap-2 mb-1">
                                            {validation.amount_match ? (
                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-red-500" />
                                            )}
                                            <span className="text-xs font-medium">Amount Match</span>
                                        </div>
                                        <p className="text-sm">OCR: {formatCurrency(validation.ocr_amount)}</p>
                                    </div>
                                </div>
                                {validation.ocr_confidence && (
                                    <div className="mt-4">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span>OCR Confidence</span>
                                            <span>{validation.ocr_confidence}%</span>
                                        </div>
                                        <Progress value={validation.ocr_confidence} className="h-2" />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* ML Fraud Detection - Drawer Bank Only */}
                    {isDrawerBank && fraudDetectionResult && (
                        <FraudDetection 
                            result={fraudDetectionResult} 
                            isLoading={false}
                        />
                    )}

                    {/* AI Verification Results */}
                    {verification && (
                        <Card className="border-purple-200">
                            <CardHeader className="bg-purple-50/50">
                                <CardTitle className="flex items-center gap-2">
                                    <Brain className="h-5 w-5 text-purple-500" />
                                    AI Deep Verification (Drawer Bank)
                                </CardTitle>
                                <CardDescription>Machine learning analysis results</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-6">
                                {/* Signature Analysis */}
                                <div>
                                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                                        <Fingerprint className="h-4 w-4" />
                                        Signature Verification
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-lg border bg-gradient-to-br from-white to-purple-50">
                                            <p className="text-xs text-muted-foreground mb-1">Match Score</p>
                                            <div className="flex items-end gap-2">
                                                <span className="text-3xl font-bold">{verification.signature_score || 0}</span>
                                                <span className="text-muted-foreground mb-1">/ 100</span>
                                            </div>
                                            <Progress value={verification.signature_score || 0} className="h-2 mt-2" />
                                        </div>
                                        <div className="p-4 rounded-lg border">
                                            <p className="text-xs text-muted-foreground mb-1">Result</p>
                                            <Badge className={
                                                verification.signature_match === 'match' ? 'bg-green-100 text-green-800' :
                                                verification.signature_match === 'no_match' ? 'bg-red-100 text-red-800' :
                                                'bg-yellow-100 text-yellow-800'
                                            }>
                                                {verification.signature_match === 'match' ? 'Signature Matched' :
                                                 verification.signature_match === 'no_match' ? 'Signature Mismatch' :
                                                 'Inconclusive'}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                {/* Fraud Risk Analysis */}
                                <div>
                                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                                        <TrendingUp className="h-4 w-4" />
                                        Fraud Risk Analysis
                                    </h4>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="p-4 rounded-lg border">
                                            <p className="text-xs text-muted-foreground mb-1">Risk Score</p>
                                            <div className="flex items-end gap-2">
                                                <span className={`text-3xl font-bold ${
                                                    (verification.fraud_risk_score || 0) > 70 ? 'text-red-600' :
                                                    (verification.fraud_risk_score || 0) > 40 ? 'text-yellow-600' :
                                                    'text-green-600'
                                                }`}>{verification.fraud_risk_score || 0}</span>
                                                <span className="text-muted-foreground mb-1">/ 100</span>
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-lg border">
                                            <p className="text-xs text-muted-foreground mb-1">Risk Level</p>
                                            <Badge className={
                                                verification.risk_level === 'critical' ? 'bg-red-600 text-white' :
                                                verification.risk_level === 'high' ? 'bg-red-100 text-red-800' :
                                                verification.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-green-100 text-green-800'
                                            }>
                                                {verification.risk_level?.toUpperCase() || 'LOW'}
                                            </Badge>
                                        </div>
                                        <div className="p-4 rounded-lg border">
                                            <p className="text-xs text-muted-foreground mb-1">AI Confidence</p>
                                            <span className="text-2xl font-bold">{verification.ai_confidence || 0}%</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Behavior Flags */}
                                {verification.behavior_flags && verification.behavior_flags.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                                            Behavior Anomalies Detected
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {verification.behavior_flags.map((flag, idx) => (
                                                <Badge key={idx} variant="outline" className="bg-orange-50 border-orange-200">
                                                    {flag.replace(/_/g, ' ')}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* AI Reasoning */}
                                {verification.ai_reasoning && (
                                    <div className="p-4 rounded-lg bg-muted/50 border">
                                        <h4 className="text-sm font-semibold mb-2">AI Analysis Summary</h4>
                                        <p className="text-sm text-muted-foreground">{verification.ai_reasoning}</p>
                                    </div>
                                )}

                                {/* AI Decision */}
                                <div className="p-4 rounded-lg border-2 border-dashed">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-muted-foreground">AI Recommendation</p>
                                            <p className="text-lg font-semibold capitalize">{verification.ai_decision || 'Pending'}</p>
                                        </div>
                                        <Badge className={
                                            verification.ai_decision === 'approve' ? 'bg-green-600 text-white' :
                                            verification.ai_decision === 'reject' ? 'bg-red-600 text-white' :
                                            'bg-yellow-600 text-white'
                                        }>
                                            {verification.ai_decision?.toUpperCase() || 'PENDING'}
                                        </Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Fraud Flags */}
                    {flags.length > 0 && (
                        <Card className="border-orange-200 bg-orange-50/50">
                            <CardHeader>
                                <CardTitle className="text-orange-800 flex items-center gap-2">
                                    <Flag className="h-5 w-5" />
                                    Fraud Flags ({flags.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {flags.map((flag) => (
                                        <div key={flag.flag_id} className="p-3 rounded-lg bg-white border border-orange-200">
                                            <div className="flex items-center justify-between mb-1">
                                                <Badge variant="outline" className={
                                                    flag.priority === 'urgent' ? 'border-red-500 text-red-700' :
                                                    flag.priority === 'high' ? 'border-orange-500 text-orange-700' :
                                                    'border-yellow-500 text-yellow-700'
                                                }>
                                                    {flag.priority.toUpperCase()}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(flag.created_at).toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="text-sm">{flag.reason}</p>
                                            {flag.review_notes && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Review: {flag.review_notes}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Live Verification Results (from button click) */}
                    {verificationResult && (
                        <Card className="border-purple-200">
                            <CardHeader className="bg-purple-50/50">
                                <CardTitle className="flex items-center gap-2">
                                    <Brain className="h-5 w-5 text-purple-500" />
                                    Deep Verification Results
                                </CardTitle>
                                <CardDescription>
                                    {verificationResult.isValid ? (
                                        <span className="text-green-600 font-medium">✓ All checks passed - Ready for approval</span>
                                    ) : (
                                        <span className="text-red-600 font-medium">✗ Some checks failed - Review required</span>
                                    )}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-6">
                                {/* Signature Comparison - THE MAIN FEATURE */}
                                {verificationResult.signatureData && (
                                    <div className="border-2 border-purple-300 rounded-lg p-4 bg-gradient-to-br from-purple-50 to-white">
                                        <h4 className="text-sm font-bold flex items-center gap-2 mb-4">
                                            <Fingerprint className="h-5 w-5 text-purple-600" />
                                            AI Signature Verification (Siamese Transformer Model)
                                        </h4>
                                        
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            {/* Extracted Signature */}
                                            <div className="space-y-2">
                                                <p className="text-xs font-semibold text-muted-foreground uppercase">
                                                    Extracted from Cheque
                                                </p>
                                                <div className="bg-white rounded-lg border-2 border-gray-200 p-2 h-32 flex items-center justify-center">
                                                    {verificationResult.signatureData.extracted ? (
                                                        <img 
                                                            src={`data:image/png;base64,${verificationResult.signatureData.extracted}`}
                                                            alt="Extracted Signature"
                                                            className="max-h-full max-w-full object-contain"
                                                        />
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">No signature extracted</span>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* Reference Signature */}
                                            <div className="space-y-2">
                                                <p className="text-xs font-semibold text-muted-foreground uppercase">
                                                    Reference (On File)
                                                </p>
                                                <div className="bg-white rounded-lg border-2 border-gray-200 p-2 h-32 flex items-center justify-center">
                                                    {verificationResult.signatureData.reference ? (
                                                        <img 
                                                            src={`data:image/png;base64,${verificationResult.signatureData.reference}`}
                                                            alt="Reference Signature"
                                                            className="max-h-full max-w-full object-contain"
                                                        />
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">No reference on file</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Match Score */}
                                        {verificationResult.signatureData.matchScore !== undefined && (
                                            <div className={`p-4 rounded-lg ${
                                                verificationResult.signatureData.matchScore >= 70 
                                                    ? 'bg-green-100 border-2 border-green-400' 
                                                    : verificationResult.signatureData.matchScore >= 50 
                                                    ? 'bg-yellow-100 border-2 border-yellow-400'
                                                    : 'bg-red-100 border-2 border-red-400'
                                            }`}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        {verificationResult.signatureData.matchScore >= 70 ? (
                                                            <CheckCircle2 className="h-6 w-6 text-green-600" />
                                                        ) : verificationResult.signatureData.matchScore >= 50 ? (
                                                            <AlertCircle className="h-6 w-6 text-yellow-600" />
                                                        ) : (
                                                            <XCircle className="h-6 w-6 text-red-600" />
                                                        )}
                                                        <span className="font-bold">
                                                            {verificationResult.signatureData.matchScore >= 70 
                                                                ? 'SIGNATURE MATCH' 
                                                                : verificationResult.signatureData.matchScore >= 50 
                                                                ? 'INCONCLUSIVE - Manual Review'
                                                                : 'SIGNATURE MISMATCH'}
                                                        </span>
                                                    </div>
                                                    <span className="text-3xl font-bold">
                                                        {verificationResult.signatureData.matchScore.toFixed(1)}%
                                                    </span>
                                                </div>
                                                <Progress 
                                                    value={verificationResult.signatureData.matchScore} 
                                                    className={`h-3 ${
                                                        verificationResult.signatureData.matchScore >= 70 
                                                            ? '[&>div]:bg-green-500' 
                                                            : verificationResult.signatureData.matchScore >= 50 
                                                            ? '[&>div]:bg-yellow-500'
                                                            : '[&>div]:bg-red-500'
                                                    }`}
                                                />
                                                <p className="text-xs mt-2 text-muted-foreground">
                                                    Verified using Siamese Transformer Neural Network with EfficientNet backbone
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Other Verification Rules */}
                                <div className="space-y-2">
                                    <h4 className="text-sm font-semibold">Other Checks</h4>
                                    {verificationResult.rules.map((rule, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2 rounded border bg-white">
                                            <div className="flex items-center gap-2">
                                                {rule.status === 'pass' ? (
                                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                ) : rule.status === 'fail' ? (
                                                    <XCircle className="h-4 w-4 text-red-500" />
                                                ) : (
                                                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                                                )}
                                                <span className="text-sm font-medium">{rule.label}</span>
                                            </div>
                                            <span className={`text-xs ${
                                                rule.status === 'pass' ? 'text-green-600' :
                                                rule.status === 'fail' ? 'text-red-600' :
                                                'text-yellow-600'
                                            }`}>
                                                {rule.message}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Actions for Drawer Bank */}
                    {canMakeDecision && (verification || verificationResult) && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Make Decision</CardTitle>
                                <CardDescription>Based on verification results, make a final decision</CardDescription>
                            </CardHeader>
                            <CardContent className="flex gap-4">
                                <Button 
                                    onClick={() => handleDecision('approved')} 
                                    className="flex-1"
                                    disabled={actionLoading}
                                >
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Approve
                                </Button>
                                <Button 
                                    onClick={() => handleDecision('flagged')} 
                                    variant="outline" 
                                    className="flex-1"
                                    disabled={actionLoading}
                                >
                                    <Flag className="h-4 w-4 mr-2" />
                                    Flag for Review
                                </Button>
                                <Button 
                                    onClick={() => handleDecision('rejected')} 
                                    variant="destructive" 
                                    className="flex-1"
                                    disabled={actionLoading}
                                >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Reject
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Timeline */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Processing Timeline</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {timeline.map((item, idx) => (
                                    <div key={idx} className="flex items-start gap-3">
                                        <div className={`mt-0.5 p-1 rounded-full ${item.done ? 'bg-green-100' : 'bg-gray-100'}`}>
                                            {item.done ? (
                                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                            ) : (
                                                <Clock className="h-4 w-4 text-gray-400" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className={`font-medium flex items-center gap-2 ${item.done ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                <span>{item.step}</span>
                                                {item.result && (
                                                    <Badge variant={item.result === 'Approved' ? 'default' : 'destructive'}>
                                                        {item.result}
                                                    </Badge>
                                                )}
                                            </div>
                                            {item.time && item.done && (
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(item.time).toLocaleString()}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* BACH Package */}
                    {clearing && (
                        <BACHPackage 
                            chequeNumber={cheque.cheque_number}
                            bankCode="037"
                            date={new Date(cheque.created_at).toISOString().split('T')[0]}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChequeDetailsView;

