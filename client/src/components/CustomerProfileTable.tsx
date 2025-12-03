import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { 
    User, 
    CreditCard, 
    TrendingUp,
    Clock,
    Calendar,
    AlertTriangle,
    Activity,
    BarChart3,
    Users,
    Shield,
    Loader2
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface CustomerProfile {
    accountId: number;
    accountNumber: string;
    holderName: string;
    bankName: string;
    accountType: string;
    accountStatus: string;
    balance: number;
    accountAgeDays: number;
    
    totalTransactions: number;
    totalAmount: number;
    avgTransactionAmount: number;
    maxTransactionAmount: number;
    minTransactionAmount: number;
    stdDevAmount: number;
    
    totalCheques: number;
    approvedCheques: number;
    rejectedCheques: number;
    bouncedCheques: number;
    bounceRate: number;
    
    uniquePayees: number;
    topPayees: Array<{ name: string; count: number; totalAmount: number }>;
    
    preferredDays: Array<{ day: string; count: number }>;
    preferredHours: Array<{ hour: number; count: number }>;
    weekendTransactions: number;
    nightTransactions: number;
    
    transactionsLast24h: number;
    transactionsLast7d: number;
    transactionsLast30d: number;
    amountLast24h: number;
    amountLast7d: number;
    amountLast30d: number;
    daysSinceLastTransaction: number;
    
    riskScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    riskFactors: string[];
}

interface CustomerProfileTableProps {
    accountNumber: string;
    compact?: boolean;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', { 
        style: 'currency', 
        currency: 'BDT',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-BD').format(num);
};

const CustomerProfileTable: React.FC<CustomerProfileTableProps> = ({ accountNumber, compact = false }) => {
    const [profile, setProfile] = useState<CustomerProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setLoading(true);
                const res = await fetch(`${API_URL}/api/customer-profile/${accountNumber}`);
                if (!res.ok) {
                    throw new Error('Failed to fetch profile');
                }
                const data = await res.json();
                setProfile(data.profile);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        };

        if (accountNumber) {
            fetchProfile();
        }
    }, [accountNumber]);

    if (loading) {
        return (
            <Card>
                <CardContent className="py-8 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Loading customer profile...</span>
                </CardContent>
            </Card>
        );
    }

    if (error || !profile) {
        return (
            <Card className="border-amber-200 bg-amber-50/50">
                <CardContent className="py-6">
                    <div className="flex items-center gap-2 text-amber-700">
                        <AlertTriangle className="h-5 w-5" />
                        <span>No customer profile available</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'critical': return 'bg-red-600 text-white';
            case 'high': return 'bg-orange-500 text-white';
            case 'medium': return 'bg-yellow-500 text-black';
            default: return 'bg-green-500 text-white';
        }
    };

    const getRiskBorderColor = (level: string) => {
        switch (level) {
            case 'critical': return 'border-red-300 bg-red-50/50';
            case 'high': return 'border-orange-300 bg-orange-50/50';
            case 'medium': return 'border-yellow-300 bg-yellow-50/50';
            default: return 'border-green-300 bg-green-50/50';
        }
    };

    if (compact) {
        return (
            <Card className={`border-2 ${getRiskBorderColor(profile.riskLevel)}`}>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Customer Profile
                        </CardTitle>
                        <Badge className={getRiskColor(profile.riskLevel)}>
                            {profile.riskLevel.toUpperCase()} RISK
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="pt-2">
                    <Table>
                        <TableBody>
                            <TableRow>
                                <TableCell className="text-muted-foreground py-1">Transactions</TableCell>
                                <TableCell className="font-semibold py-1 text-right">{profile.totalTransactions}</TableCell>
                                <TableCell className="text-muted-foreground py-1">Avg Amount</TableCell>
                                <TableCell className="font-semibold py-1 text-right">{formatCurrency(profile.avgTransactionAmount)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="text-muted-foreground py-1">Bounce Rate</TableCell>
                                <TableCell className="font-semibold py-1 text-right">{profile.bounceRate.toFixed(1)}%</TableCell>
                                <TableCell className="text-muted-foreground py-1">Account Age</TableCell>
                                <TableCell className="font-semibold py-1 text-right">{profile.accountAgeDays} days</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={`border-2 ${getRiskBorderColor(profile.riskLevel)}`}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Customer Behaviour Profile
                        </CardTitle>
                        <CardDescription>
                            Transaction history and risk analysis for {profile.holderName}
                        </CardDescription>
                    </div>
                    <div className="text-right">
                        <Badge className={`${getRiskColor(profile.riskLevel)} text-lg px-3 py-1`}>
                            {profile.riskLevel.toUpperCase()} RISK
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">Score: {profile.riskScore}/100</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Account Information */}
                <div>
                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-3 text-muted-foreground">
                        <CreditCard className="h-4 w-4" />
                        ACCOUNT INFORMATION
                    </h4>
                    <div className="rounded-md border">
                        <Table>
                            <TableBody>
                                <TableRow>
                                    <TableCell className="text-muted-foreground w-1/3">Account Holder</TableCell>
                                    <TableCell className="font-medium">{profile.holderName}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="text-muted-foreground">Account Number</TableCell>
                                    <TableCell className="font-mono">{profile.accountNumber}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="text-muted-foreground">Bank</TableCell>
                                    <TableCell>{profile.bankName}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="text-muted-foreground">Account Type</TableCell>
                                    <TableCell className="capitalize">{profile.accountType}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="text-muted-foreground">Status</TableCell>
                                    <TableCell>
                                        <Badge variant={profile.accountStatus === 'active' ? 'default' : 'destructive'}>
                                            {profile.accountStatus.toUpperCase()}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="text-muted-foreground">Current Balance</TableCell>
                                    <TableCell className="font-semibold text-blue-600">{formatCurrency(profile.balance)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="text-muted-foreground">Account Age</TableCell>
                                    <TableCell>{profile.accountAgeDays} days</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {/* Transaction Statistics */}
                <div>
                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-3 text-muted-foreground">
                        <BarChart3 className="h-4 w-4" />
                        TRANSACTION STATISTICS
                    </h4>
                    <div className="rounded-md border">
                        <Table>
                            <TableBody>
                                <TableRow>
                                    <TableCell className="text-muted-foreground w-1/3">Total Transactions</TableCell>
                                    <TableCell className="font-medium">{formatNumber(profile.totalTransactions)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="text-muted-foreground">Total Amount</TableCell>
                                    <TableCell>{formatCurrency(profile.totalAmount)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="text-muted-foreground">Average Amount</TableCell>
                                    <TableCell className="font-semibold">{formatCurrency(profile.avgTransactionAmount)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="text-muted-foreground">Maximum Amount</TableCell>
                                    <TableCell>{formatCurrency(profile.maxTransactionAmount)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="text-muted-foreground">Minimum Amount</TableCell>
                                    <TableCell>{formatCurrency(profile.minTransactionAmount)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="text-muted-foreground">Std Deviation</TableCell>
                                    <TableCell>{formatCurrency(profile.stdDevAmount)}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {/* Cheque Performance */}
                <div>
                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-3 text-muted-foreground">
                        <Activity className="h-4 w-4" />
                        CHEQUE PERFORMANCE
                    </h4>
                    <div className="grid grid-cols-4 gap-3 mb-3">
                        <div className="bg-white rounded-lg border p-3 text-center">
                            <p className="text-2xl font-bold">{profile.totalCheques}</p>
                            <p className="text-xs text-muted-foreground">Total</p>
                        </div>
                        <div className="bg-green-50 rounded-lg border border-green-200 p-3 text-center">
                            <p className="text-2xl font-bold text-green-600">{profile.approvedCheques}</p>
                            <p className="text-xs text-green-600">Approved</p>
                        </div>
                        <div className="bg-red-50 rounded-lg border border-red-200 p-3 text-center">
                            <p className="text-2xl font-bold text-red-600">{profile.rejectedCheques}</p>
                            <p className="text-xs text-red-600">Rejected</p>
                        </div>
                        <div className="bg-amber-50 rounded-lg border border-amber-200 p-3 text-center">
                            <p className="text-2xl font-bold text-amber-600">{profile.bouncedCheques}</p>
                            <p className="text-xs text-amber-600">Bounced</p>
                        </div>
                    </div>
                    <div className="rounded-md border p-3">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">Bounce Rate</span>
                            <span className={`font-semibold ${profile.bounceRate > 10 ? 'text-red-600' : profile.bounceRate > 5 ? 'text-amber-600' : 'text-green-600'}`}>
                                {profile.bounceRate.toFixed(1)}%
                            </span>
                        </div>
                        <Progress 
                            value={profile.bounceRate} 
                            className={`h-2 ${profile.bounceRate > 10 ? '[&>div]:bg-red-500' : profile.bounceRate > 5 ? '[&>div]:bg-amber-500' : '[&>div]:bg-green-500'}`}
                        />
                    </div>
                </div>

                {/* Velocity Metrics */}
                <div>
                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-3 text-muted-foreground">
                        <TrendingUp className="h-4 w-4" />
                        VELOCITY METRICS
                    </h4>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Period</TableHead>
                                    <TableHead className="text-right">Transactions</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell>Last 24 Hours</TableCell>
                                    <TableCell className="text-right font-medium">{profile.transactionsLast24h}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(profile.amountLast24h)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Last 7 Days</TableCell>
                                    <TableCell className="text-right font-medium">{profile.transactionsLast7d}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(profile.amountLast7d)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Last 30 Days</TableCell>
                                    <TableCell className="text-right font-medium">{profile.transactionsLast30d}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(profile.amountLast30d)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="text-muted-foreground">Days Since Last Transaction</TableCell>
                                    <TableCell className="text-right font-medium" colSpan={2}>
                                        {profile.daysSinceLastTransaction} days
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {/* Payee Patterns */}
                {profile.topPayees.length > 0 && (
                    <div>
                        <h4 className="text-sm font-semibold flex items-center gap-2 mb-3 text-muted-foreground">
                            <Users className="h-4 w-4" />
                            TOP PAYEES ({profile.uniquePayees} unique)
                        </h4>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Payee Name</TableHead>
                                        <TableHead className="text-right">Count</TableHead>
                                        <TableHead className="text-right">Total Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {profile.topPayees.map((payee, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell>{payee.name}</TableCell>
                                            <TableCell className="text-right">{payee.count}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(payee.totalAmount)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}

                {/* Time Patterns */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <h4 className="text-sm font-semibold flex items-center gap-2 mb-3 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            DAY PATTERNS
                        </h4>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Day</TableHead>
                                        <TableHead className="text-right">Count</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {profile.preferredDays.map((day, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell>{day.day}</TableCell>
                                            <TableCell className="text-right font-medium">{day.count}</TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow>
                                        <TableCell className="text-muted-foreground">Weekend Total</TableCell>
                                        <TableCell className="text-right">{profile.weekendTransactions}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold flex items-center gap-2 mb-3 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            HOUR PATTERNS
                        </h4>
                        <div className="rounded-md border max-h-48 overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Time</TableHead>
                                        <TableHead className="text-right">Count</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {profile.preferredHours.map((hour, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell>{hour.hour}:00 - {hour.hour + 1}:00</TableCell>
                                            <TableCell className="text-right font-medium">{hour.count}</TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow>
                                        <TableCell className="text-muted-foreground">Night Total</TableCell>
                                        <TableCell className="text-right">{profile.nightTransactions}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>

                {/* Risk Factors */}
                {profile.riskFactors.length > 0 && (
                    <div>
                        <h4 className="text-sm font-semibold flex items-center gap-2 mb-3 text-muted-foreground">
                            <Shield className="h-4 w-4" />
                            RISK FACTORS
                        </h4>
                        <div className="rounded-md border">
                            <Table>
                                <TableBody>
                                    {profile.riskFactors.map((factor, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="w-8">
                                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                            </TableCell>
                                            <TableCell>{factor}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default CustomerProfileTable;
