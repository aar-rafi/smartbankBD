import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
    AlertCircle, 
    CheckCircle2, 
    XCircle, 
    Users, 
    Flag, 
    Clock,
    RefreshCcw,
    ChevronRight,
    Loader2
} from "lucide-react";
import { Bank } from '@/lib/bankContext';
import { 
    BankCheque, 
    fetchInwardCheques, 
    fetchOutwardCheques,
    updateChequeDecision 
} from '@/services/api';
import ChequeDetailsView from './ChequeDetailsView';

// Reviewers for this bank
const REVIEWERS = [
    { id: 'r1', name: 'Karim Ahmed' },
    { id: 'r2', name: 'Fatima Rahman' },
    { id: 'r3', name: 'Hassan Ali' },
    { id: 'r4', name: 'Nusrat Jahan' },
];

interface ManagerDashboardProps {
    currentBank: Bank;
}

const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ currentBank }) => {
    const [cheques, setCheques] = useState<BankCheque[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedChequeId, setSelectedChequeId] = useState<number | null>(null);
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const [inward, outward] = await Promise.all([
                fetchInwardCheques(currentBank.code),
                fetchOutwardCheques(currentBank.code)
            ]);
            // Combine and deduplicate
            const all = [...inward, ...outward];
            const unique = all.filter((c, idx) => all.findIndex(x => x.cheque_id === c.cheque_id) === idx);
            setCheques(unique);
        } catch (error) {
            console.error('Error loading cheques:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 5000);
        return () => clearInterval(interval);
    }, [currentBank]);

    const formatCurrency = (amount: string | number) => {
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(num);
    };

    const handleApprove = async (e: React.MouseEvent, chequeId: number) => {
        e.stopPropagation();
        setActionLoading(chequeId);
        try {
            await updateChequeDecision(chequeId, 'approved');
            await loadData();
        } catch (error) {
            console.error('Error approving:', error);
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (e: React.MouseEvent, chequeId: number) => {
        e.stopPropagation();
        setActionLoading(chequeId);
        try {
            await updateChequeDecision(chequeId, 'rejected');
            await loadData();
        } catch (error) {
            console.error('Error rejecting:', error);
        } finally {
            setActionLoading(null);
        }
    };

    // If a cheque is selected, show details
    if (selectedChequeId) {
        return (
            <ChequeDetailsView 
                chequeId={selectedChequeId}
                currentBankCode={currentBank.code}
                onBack={() => { setSelectedChequeId(null); loadData(); }}
            />
        );
    }

    const bankCode = currentBank.code.toLowerCase();
    const flaggedCheques = cheques.filter(c => 
        c.status === 'flagged' && c.drawer_bank_code?.toLowerCase() === bankCode
    );
    const awaitingVerification = cheques.filter(c => 
        c.status === 'at_drawer_bank' && c.drawer_bank_code?.toLowerCase() === bankCode
    );

    const stats = {
        total: cheques.length,
        flagged: flaggedCheques.length,
        awaiting: awaitingVerification.length,
        approved: cheques.filter(c => c.status === 'approved').length,
        rejected: cheques.filter(c => c.status === 'rejected').length,
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Fraud Review Center</h2>
                    <p className="text-muted-foreground">Monitor and review cheques for {currentBank.name}</p>
                </div>
                <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
                    <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-5">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Cheques</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                    </CardContent>
                </Card>
                <Card className="border-indigo-200 bg-indigo-50/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Awaiting Verification</CardTitle>
                        <AlertCircle className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-indigo-600">{stats.awaiting}</div>
                    </CardContent>
                </Card>
                <Card className="border-orange-200 bg-orange-50/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Flagged</CardTitle>
                        <Flag className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{stats.flagged}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Approved</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                        <XCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Awaiting Verification Queue */}
            {awaitingVerification.length > 0 && (
                <Card className="border-indigo-200">
                    <CardHeader className="bg-indigo-50/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5 text-indigo-500" />
                                    Awaiting Verification - Action Required
                                </CardTitle>
                                <CardDescription>
                                    These cheques are drawn on your bank and need verification
                                </CardDescription>
                            </div>
                            <Badge variant="outline" className="bg-indigo-100 text-indigo-800">
                                {stats.awaiting} pending
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="space-y-3">
                            {awaitingVerification.map(cheque => (
                                <div 
                                    key={cheque.cheque_id} 
                                    className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                                    onClick={() => setSelectedChequeId(cheque.cheque_id)}
                                >
                                    <div className="flex-1 grid grid-cols-4 gap-4">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Cheque #</p>
                                            <p className="font-mono font-medium">{cheque.cheque_number}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Amount</p>
                                            <p className="font-medium">{formatCurrency(cheque.amount)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Presenting Bank</p>
                                            <p className="text-sm">{cheque.presenting_bank_name}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Payee</p>
                                            <p className="text-sm">{cheque.payee_name}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                        <Button 
                                            size="sm" 
                                            variant="default" 
                                            onClick={(e) => handleApprove(e, cheque.cheque_id)}
                                            disabled={actionLoading === cheque.cheque_id}
                                        >
                                            {actionLoading === cheque.cheque_id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <CheckCircle2 className="h-4 w-4" />
                                            )}
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="destructive" 
                                            onClick={(e) => handleReject(e, cheque.cheque_id)}
                                            disabled={actionLoading === cheque.cheque_id}
                                        >
                                            <XCircle className="h-4 w-4" />
                                        </Button>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Flagged Cheques Queue */}
            {flaggedCheques.length > 0 && (
                <Card className="border-orange-200">
                    <CardHeader className="bg-orange-50/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Flag className="h-5 w-5 text-orange-500" />
                                    Flagged Cheques - Review Queue
                                </CardTitle>
                                <CardDescription>
                                    These cheques were flagged for manual review
                                </CardDescription>
                            </div>
                            <Badge variant="outline" className="bg-orange-100 text-orange-800">
                                {stats.flagged} flagged
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="space-y-3">
                            {flaggedCheques.map(cheque => (
                                <div 
                                    key={cheque.cheque_id} 
                                    className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                                    onClick={() => setSelectedChequeId(cheque.cheque_id)}
                                >
                                    <div className="flex-1 grid grid-cols-4 gap-4">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Cheque #</p>
                                            <p className="font-mono font-medium">{cheque.cheque_number}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Amount</p>
                                            <p className="font-medium">{formatCurrency(cheque.amount)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Presenting Bank</p>
                                            <p className="text-sm">{cheque.presenting_bank_name}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Drawer Account</p>
                                            <p className="text-sm font-mono">{cheque.drawer_account}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                        <select 
                                            className="text-sm border rounded px-2 py-1"
                                            defaultValue=""
                                        >
                                            <option value="" disabled>Assign...</option>
                                            {REVIEWERS.map(r => (
                                                <option key={r.id} value={r.name}>{r.name}</option>
                                            ))}
                                        </select>
                                        
                                        <Button 
                                            size="sm" 
                                            variant="default" 
                                            onClick={(e) => handleApprove(e, cheque.cheque_id)}
                                            disabled={actionLoading === cheque.cheque_id}
                                        >
                                            {actionLoading === cheque.cheque_id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <CheckCircle2 className="h-4 w-4" />
                                            )}
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="destructive" 
                                            onClick={(e) => handleReject(e, cheque.cheque_id)}
                                            disabled={actionLoading === cheque.cheque_id}
                                        >
                                            <XCircle className="h-4 w-4" />
                                        </Button>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* All Cheques Overview */}
            <Card>
                <CardHeader>
                    <CardTitle>All Bank Cheques</CardTitle>
                    <CardDescription>Complete overview of cheque activity for {currentBank.name}</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : cheques.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Clock className="h-12 w-12 mx-auto mb-2 opacity-20" />
                            <p>No cheques found for this bank</p>
                        </div>
                    ) : (
                        <div className="relative w-full overflow-auto">
                            <table className="w-full caption-bottom text-sm">
                                <thead className="[&_tr]:border-b">
                                    <tr className="border-b">
                                        <th className="h-12 px-4 text-left font-medium text-muted-foreground">Cheque #</th>
                                        <th className="h-12 px-4 text-left font-medium text-muted-foreground">Amount</th>
                                        <th className="h-12 px-4 text-left font-medium text-muted-foreground">Direction</th>
                                        <th className="h-12 px-4 text-left font-medium text-muted-foreground">Status</th>
                                        <th className="h-12 px-4 text-right font-medium text-muted-foreground"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cheques.slice(0, 10).map(cheque => (
                                        <tr 
                                            key={cheque.cheque_id} 
                                            className="border-b hover:bg-muted/50 cursor-pointer"
                                            onClick={() => setSelectedChequeId(cheque.cheque_id)}
                                        >
                                            <td className="p-4 font-mono">{cheque.cheque_number}</td>
                                            <td className="p-4">{formatCurrency(cheque.amount)}</td>
                                            <td className="p-4">
                                                <Badge variant="outline">
                                                    {cheque.drawer_bank_code?.toLowerCase() === bankCode ? 'Outward' : 'Inward'}
                                                </Badge>
                                            </td>
                                            <td className="p-4">
                                                <Badge className={
                                                    cheque.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                    cheque.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                    cheque.status === 'flagged' ? 'bg-orange-100 text-orange-800' :
                                                    cheque.status === 'at_drawer_bank' ? 'bg-indigo-100 text-indigo-800' :
                                                    'bg-gray-100 text-gray-800'
                                                } variant="outline">
                                                    {cheque.status.replace(/_/g, ' ')}
                                                </Badge>
                                            </td>
                                            <td className="p-4 text-right">
                                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default ManagerDashboard;
