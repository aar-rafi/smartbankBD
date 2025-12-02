import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertCircle, RefreshCcw, ArrowUpRight, ArrowDownLeft, Send, FileCheck, Flag, ChevronRight, Loader2, Trash2 } from "lucide-react";
import { Bank } from '@/lib/bankContext';
import { 
    BankCheque, 
    fetchInwardCheques, 
    fetchOutwardCheques, 
    sendToBACH as apiSendToBACH,
    receiveAtDrawerBank,
    deleteCheque as apiDeleteCheque,
    deleteAllCheques as apiDeleteAllCheques
} from '@/services/api';
import ChequeDetailsView from './ChequeDetailsView';

interface DashboardProps {
    currentBank: Bank | null;
}

const Dashboard: React.FC<DashboardProps> = ({ currentBank }) => {
    const [activeTab, setActiveTab] = useState<'inward' | 'outward'>('inward');
    const [inwardCheques, setInwardCheques] = useState<BankCheque[]>([]);
    const [outwardCheques, setOutwardCheques] = useState<BankCheque[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedChequeId, setSelectedChequeId] = useState<number | null>(null);
    const [sendingToBACH, setSendingToBACH] = useState<number | null>(null);

    const loadCheques = async () => {
        if (!currentBank) return;
        setLoading(true);
        try {
            const [inward, outward] = await Promise.all([
                fetchInwardCheques(currentBank.code),
                fetchOutwardCheques(currentBank.code)
            ]);
            setInwardCheques(inward);
            setOutwardCheques(outward);
        } catch (error) {
            console.error('Error loading cheques:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCheques();
        // Poll for updates every 5 seconds
        const interval = setInterval(loadCheques, 5000);
        return () => clearInterval(interval);
    }, [currentBank]);

    const formatCurrency = (amount: string | number) => {
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(num);
    };

    const getStatusBadge = (status: string) => {
        const map: Record<string, { label: string; className: string }> = {
            'received': { label: 'Received', className: 'bg-gray-100 text-gray-800' },
            'validated': { label: 'Validated', className: 'bg-blue-100 text-blue-800' },
            'clearing': { label: 'In Transit (BACH)', className: 'bg-purple-100 text-purple-800' },
            'at_drawer_bank': { label: 'Awaiting Verification', className: 'bg-indigo-100 text-indigo-800' },
            'approved': { label: 'Approved', className: 'bg-green-100 text-green-800' },
            'rejected': { label: 'Rejected', className: 'bg-red-100 text-red-800' },
            'flagged': { label: 'Flagged', className: 'bg-orange-100 text-orange-800' },
        };
        const { label, className } = map[status] || { label: status, className: 'bg-gray-100' };
        return <Badge className={className} variant="outline">{label}</Badge>;
    };

    if (!currentBank) return null;

    // If a cheque is selected, show details view
    if (selectedChequeId) {
        return (
            <ChequeDetailsView 
                chequeId={selectedChequeId}
                currentBankCode={currentBank.code}
                onBack={() => { setSelectedChequeId(null); loadCheques(); }}
            />
        );
    }

    const filteredCheques = activeTab === 'inward' ? inwardCheques : outwardCheques;

    const stats = {
        inward: inwardCheques.length,
        outward: outwardCheques.length,
        approved: [...inwardCheques, ...outwardCheques].filter(c => c.status === 'approved').length,
        flagged: [...inwardCheques, ...outwardCheques].filter(c => c.status === 'flagged').length,
    };

    const handleSendToBACH = async (e: React.MouseEvent, cheque: BankCheque) => {
        e.stopPropagation();
        setSendingToBACH(cheque.cheque_id);
        try {
            await apiSendToBACH(cheque.cheque_id);
            
            // Simulate BACH routing delay (2 seconds) then auto-forward to drawer bank
            setTimeout(async () => {
                try {
                    await receiveAtDrawerBank(cheque.cheque_id);
                } catch (err) {
                    console.error('Error forwarding to drawer bank:', err);
                }
                loadCheques();
                setSendingToBACH(null);
            }, 2000);
        } catch (error) {
            console.error('Error sending to BACH:', error);
            setSendingToBACH(null);
        }
    };

    const handleDeleteCheque = async (e: React.MouseEvent, chequeId: number) => {
        e.stopPropagation();
        if (!confirm('Delete this cheque? This cannot be undone.')) return;
        try {
            await apiDeleteCheque(chequeId);
            loadCheques();
        } catch (error) {
            console.error('Error deleting cheque:', error);
        }
    };

    const handleDeleteAll = async () => {
        if (!confirm('Delete ALL cheques? This will clear all data and cannot be undone.')) return;
        try {
            const count = await apiDeleteAllCheques();
            alert(`Deleted ${count} cheques`);
            loadCheques();
        } catch (error) {
            console.error('Error deleting all cheques:', error);
        }
    };

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Inward (Receiving)</CardTitle>
                        <ArrowDownLeft className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{stats.inward}</div>
                        <p className="text-xs text-muted-foreground">Cheques deposited here</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Outward (Drawer)</CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-600">{stats.outward}</div>
                        <p className="text-xs text-muted-foreground">Our cheques to verify</p>
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
                        <CardTitle className="text-sm font-medium">Flagged</CardTitle>
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{stats.flagged}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <div className="flex items-center space-x-2 border-b pb-2">
                <Button 
                    variant={activeTab === 'inward' ? 'default' : 'ghost'}
                    onClick={() => setActiveTab('inward')}
                >
                    <ArrowDownLeft className="mr-2 h-4 w-4" />
                    Inward Clearing
                    <Badge variant="secondary" className="ml-2">{stats.inward}</Badge>
                </Button>
                <Button 
                    variant={activeTab === 'outward' ? 'default' : 'ghost'}
                    onClick={() => setActiveTab('outward')}
                >
                    <ArrowUpRight className="mr-2 h-4 w-4" />
                    Outward Clearing
                    <Badge variant="secondary" className="ml-2">{stats.outward}</Badge>
                </Button>
                <div className="flex-1" />
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDeleteAll}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear All
                </Button>
                <Button variant="outline" size="sm" onClick={loadCheques} disabled={loading}>
                    <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Explanation */}
            <Card className="bg-muted/50 border-dashed">
                <CardContent className="pt-4 text-sm text-muted-foreground">
                    {activeTab === 'inward' ? (
                        <p><strong>Inward Clearing:</strong> Cheques deposited by customers at {currentBank.name}, drawn on OTHER banks. We validate and send to BACH.</p>
                    ) : (
                        <p><strong>Outward Clearing:</strong> Cheques drawn on {currentBank.name} accounts, received from BACH. We verify signature, funds, and approve/reject.</p>
                    )}
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardHeader>
                    <CardTitle>{activeTab === 'inward' ? 'Inward' : 'Outward'} Cheques</CardTitle>
                    <CardDescription>
                        Click on a row to view full details and analysis
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading && filteredCheques.length === 0 ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="relative w-full overflow-auto">
                            <table className="w-full caption-bottom text-sm">
                                <thead className="[&_tr]:border-b">
                                    <tr className="border-b">
                                        <th className="h-12 px-4 text-left font-medium text-muted-foreground">Cheque #</th>
                                        <th className="h-12 px-4 text-left font-medium text-muted-foreground">Payee / Amount</th>
                                        <th className="h-12 px-4 text-left font-medium text-muted-foreground">
                                            {activeTab === 'inward' ? 'Drawer Bank' : 'Presenting Bank'}
                                        </th>
                                        <th className="h-12 px-4 text-left font-medium text-muted-foreground">Status</th>
                                        <th className="h-12 px-4 text-right font-medium text-muted-foreground">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="[&_tr:last-child]:border-0">
                                    {filteredCheques.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                                <FileCheck className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                                No cheques in {activeTab} clearing.
                                                {activeTab === 'inward' && <p className="text-xs mt-1">Process a cheque to see it here.</p>}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredCheques.map((cheque) => (
                                            <tr 
                                                key={cheque.cheque_id} 
                                                className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                                                onClick={() => setSelectedChequeId(cheque.cheque_id)}
                                            >
                                                <td className="p-4 font-mono font-medium">{cheque.cheque_number}</td>
                                                <td className="p-4">
                                                    <div className="font-medium">{cheque.payee_name}</div>
                                                    <div className="text-xs text-muted-foreground">{formatCurrency(cheque.amount)}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div>{activeTab === 'inward' ? cheque.drawer_bank_name : cheque.presenting_bank_name}</div>
                                                    <div className="text-xs text-muted-foreground">{cheque.drawer_account}</div>
                                                </td>
                                                <td className="p-4">{getStatusBadge(cheque.status)}</td>
                                                <td className="p-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {activeTab === 'inward' && cheque.status === 'validated' && (
                                                            <Button 
                                                                size="sm" 
                                                                onClick={(e) => handleSendToBACH(e, cheque)}
                                                                disabled={sendingToBACH === cheque.cheque_id}
                                                            >
                                                                {sendingToBACH === cheque.cheque_id ? (
                                                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                                                ) : (
                                                                    <Send className="h-4 w-4 mr-1" />
                                                                )}
                                                                Send to BACH
                                                            </Button>
                                                        )}
                                                        <Button 
                                                            size="sm" 
                                                            variant="ghost"
                                                            onClick={(e) => handleDeleteCheque(e, cheque.cheque_id)}
                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default Dashboard;
