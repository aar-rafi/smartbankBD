import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    FileText,
    Flag
} from "lucide-react";
import { ChequeItem, ChequeStatus, updateChequeStatus } from '@/lib/chequeStore';
import BACHPackage from './BACHPackage';

interface ChequeDetailsProps {
    cheque: ChequeItem;
    onBack: () => void;
    canApprove?: boolean; // Only drawer bank can approve
}

const ChequeDetails: React.FC<ChequeDetailsProps> = ({ cheque, onBack, canApprove }) => {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(amount);
    };

    const getStatusInfo = (status: ChequeStatus) => {
        const map: Record<ChequeStatus, { label: string; color: string; icon: React.ReactNode }> = {
            'pending_validation': { label: 'Pending Validation', color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-4 w-4" /> },
            'validated': { label: 'Validated', color: 'bg-blue-100 text-blue-800', icon: <CheckCircle2 className="h-4 w-4" /> },
            'sent_to_bach': { label: 'In Transit (BACH)', color: 'bg-purple-100 text-purple-800', icon: <Clock className="h-4 w-4" /> },
            'at_drawer_bank': { label: 'Awaiting Verification', color: 'bg-indigo-100 text-indigo-800', icon: <AlertCircle className="h-4 w-4" /> },
            'approved': { label: 'Approved', color: 'bg-green-100 text-green-800', icon: <CheckCircle2 className="h-4 w-4" /> },
            'rejected': { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: <XCircle className="h-4 w-4" /> },
            'flagged': { label: 'Flagged for Review', color: 'bg-orange-100 text-orange-800', icon: <Flag className="h-4 w-4" /> },
        };
        return map[status];
    };

    const statusInfo = getStatusInfo(cheque.status);

    const handleApprove = () => {
        updateChequeStatus(cheque.id, 'approved');
        onBack();
    };

    const handleReject = () => {
        updateChequeStatus(cheque.id, 'rejected');
        onBack();
    };

    const handleFlag = () => {
        updateChequeStatus(cheque.id, 'flagged', { flagReason: 'Requires manual review' });
        onBack();
    };

    // Timeline of cheque journey
    const timeline = [
        { step: 'Received', done: true, time: cheque.timestamp },
        { step: 'Validated', done: ['validated', 'sent_to_bach', 'at_drawer_bank', 'approved', 'rejected', 'flagged'].includes(cheque.status) },
        { step: 'Sent to BACH', done: ['sent_to_bach', 'at_drawer_bank', 'approved', 'rejected', 'flagged'].includes(cheque.status) },
        { step: 'At Drawer Bank', done: ['at_drawer_bank', 'approved', 'rejected', 'flagged'].includes(cheque.status) },
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
                    <h2 className="text-2xl font-bold">Cheque #{cheque.chequeNumber}</h2>
                    <p className="text-muted-foreground">Transaction Details</p>
                </div>
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
                                    <p className="font-mono font-medium">{cheque.chequeNumber}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <User className="h-3 w-3" /> Payee
                                    </p>
                                    <p className="font-medium">{cheque.payeeName}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Building2 className="h-3 w-3" /> Drawer Bank
                                    </p>
                                    <p className="font-medium">{cheque.drawerBankName}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <CreditCard className="h-3 w-3" /> Drawer Account
                                    </p>
                                    <p className="font-mono">{cheque.drawerAccount}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Building2 className="h-3 w-3" /> Presenting Bank
                                    </p>
                                    <p className="font-medium">{cheque.presentingBankName}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Calendar className="h-3 w-3" /> Received At
                                    </p>
                                    <p className="font-medium">{new Date(cheque.timestamp).toLocaleString()}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Flag Reason */}
                    {cheque.flagReason && (
                        <Card className="border-orange-200 bg-orange-50">
                            <CardHeader>
                                <CardTitle className="text-orange-800 flex items-center gap-2">
                                    <Flag className="h-5 w-5" />
                                    Flag Reason
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-orange-700">{cheque.flagReason}</p>
                                {cheque.assignedTo && (
                                    <p className="text-sm text-orange-600 mt-2">
                                        Assigned to: <strong>{cheque.assignedTo}</strong>
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Actions */}
                    {canApprove && cheque.status === 'at_drawer_bank' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Actions</CardTitle>
                                <CardDescription>As the drawer bank, verify and make a decision</CardDescription>
                            </CardHeader>
                            <CardContent className="flex gap-4">
                                <Button onClick={handleApprove} className="flex-1">
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Approve
                                </Button>
                                <Button onClick={handleFlag} variant="outline" className="flex-1">
                                    <Flag className="h-4 w-4 mr-2" />
                                    Flag for Review
                                </Button>
                                <Button onClick={handleReject} variant="destructive" className="flex-1">
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Reject
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Timeline */}
                <div className="space-y-6">
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
                                            <p className={`font-medium ${item.done ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                {item.step}
                                                {item.result && (
                                                    <Badge className="ml-2" variant={item.result === 'Approved' ? 'default' : 'destructive'}>
                                                        {item.result}
                                                    </Badge>
                                                )}
                                            </p>
                                            {item.time && item.done && idx === 0 && (
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
                    {['sent_to_bach', 'at_drawer_bank', 'approved', 'rejected'].includes(cheque.status) && (
                        <BACHPackage 
                            chequeNumber={cheque.chequeNumber}
                            bankCode="037"
                            date={new Date(cheque.timestamp).toISOString().split('T')[0]}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChequeDetails;

