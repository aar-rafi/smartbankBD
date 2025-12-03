import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { 
    Users, 
    Search,
    RefreshCw,
    AlertTriangle,
    TrendingUp,
    ArrowUpDown,
    Eye,
    Loader2,
    Building2
} from "lucide-react";
import CustomerProfileTable from './CustomerProfileTable';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface CustomerSummary {
    accountId: number;
    accountNumber: string;
    holderName: string;
    bankName: string;
    bankCode: string;
    accountType: string;
    accountStatus: string;
    balance: number;
    accountAgeDays: number;
    totalTransactions: number;
    avgTransactionAmount: number;
    bounceRate: number;
    riskScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface CustomerAnalysisDashboardProps {
    currentBankCode: string;
    onBack?: () => void;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', { 
        style: 'currency', 
        currency: 'BDT',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

const CustomerAnalysisDashboard: React.FC<CustomerAnalysisDashboardProps> = ({ currentBankCode, onBack }) => {
    const [customers, setCustomers] = useState<CustomerSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState<keyof CustomerSummary>('riskScore');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/api/customers?bankCode=${currentBankCode}`);
            if (!res.ok) throw new Error('Failed to fetch customers');
            const data = await res.json();
            setCustomers(data.customers || []);
        } catch (err) {
            console.error('Error fetching customers:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, [currentBankCode]);

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'critical': return 'bg-red-600 text-white';
            case 'high': return 'bg-orange-500 text-white';
            case 'medium': return 'bg-yellow-500 text-black';
            default: return 'bg-green-500 text-white';
        }
    };

    const handleSort = (field: keyof CustomerSummary) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const filteredCustomers = customers
        .filter(c => 
            c.holderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.accountNumber.includes(searchTerm)
        )
        .sort((a, b) => {
            const aVal = a[sortField];
            const bVal = b[sortField];
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
            }
            return sortDirection === 'asc' 
                ? String(aVal).localeCompare(String(bVal))
                : String(bVal).localeCompare(String(aVal));
        });

    // Stats
    const totalCustomers = customers.length;
    const highRiskCount = customers.filter(c => c.riskLevel === 'high' || c.riskLevel === 'critical').length;
    const avgRiskScore = customers.length > 0 
        ? customers.reduce((sum, c) => sum + c.riskScore, 0) / customers.length 
        : 0;
    const totalBalance = customers.reduce((sum, c) => sum + c.balance, 0);

    if (selectedCustomer) {
        return (
            <div className="space-y-4">
                <Button variant="outline" onClick={() => setSelectedCustomer(null)}>
                    Back to Customer List
                </Button>
                <CustomerProfileTable accountNumber={selectedCustomer} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Users className="h-6 w-6" />
                        Customer Behaviour Analysis
                    </h2>
                    <p className="text-muted-foreground">
                        Monitor customer profiles and risk assessments
                    </p>
                </div>
                <Button onClick={fetchCustomers} variant="outline" disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Customers</p>
                                <p className="text-3xl font-bold">{totalCustomers}</p>
                            </div>
                            <Users className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-red-200 bg-red-50/50">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">High Risk</p>
                                <p className="text-3xl font-bold text-red-600">{highRiskCount}</p>
                            </div>
                            <AlertTriangle className="h-8 w-8 text-red-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Avg Risk Score</p>
                                <p className="text-3xl font-bold">{avgRiskScore.toFixed(1)}</p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-amber-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Balance</p>
                                <p className="text-2xl font-bold">{formatCurrency(totalBalance)}</p>
                            </div>
                            <Building2 className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search and Filters */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle>Customer Profiles</CardTitle>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name or account..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 w-64"
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            <span className="ml-2 text-muted-foreground">Loading customers...</span>
                        </div>
                    ) : filteredCustomers.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            No customers found
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead 
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => handleSort('holderName')}
                                        >
                                            <div className="flex items-center gap-1">
                                                Customer Name
                                                <ArrowUpDown className="h-3 w-3" />
                                            </div>
                                        </TableHead>
                                        <TableHead>Account #</TableHead>
                                        <TableHead 
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => handleSort('accountType')}
                                        >
                                            <div className="flex items-center gap-1">
                                                Type
                                                <ArrowUpDown className="h-3 w-3" />
                                            </div>
                                        </TableHead>
                                        <TableHead 
                                            className="text-right cursor-pointer hover:bg-muted/50"
                                            onClick={() => handleSort('balance')}
                                        >
                                            <div className="flex items-center justify-end gap-1">
                                                Balance
                                                <ArrowUpDown className="h-3 w-3" />
                                            </div>
                                        </TableHead>
                                        <TableHead 
                                            className="text-right cursor-pointer hover:bg-muted/50"
                                            onClick={() => handleSort('totalTransactions')}
                                        >
                                            <div className="flex items-center justify-end gap-1">
                                                Transactions
                                                <ArrowUpDown className="h-3 w-3" />
                                            </div>
                                        </TableHead>
                                        <TableHead 
                                            className="text-right cursor-pointer hover:bg-muted/50"
                                            onClick={() => handleSort('avgTransactionAmount')}
                                        >
                                            <div className="flex items-center justify-end gap-1">
                                                Avg Amount
                                                <ArrowUpDown className="h-3 w-3" />
                                            </div>
                                        </TableHead>
                                        <TableHead 
                                            className="text-right cursor-pointer hover:bg-muted/50"
                                            onClick={() => handleSort('bounceRate')}
                                        >
                                            <div className="flex items-center justify-end gap-1">
                                                Bounce %
                                                <ArrowUpDown className="h-3 w-3" />
                                            </div>
                                        </TableHead>
                                        <TableHead 
                                            className="text-right cursor-pointer hover:bg-muted/50"
                                            onClick={() => handleSort('accountAgeDays')}
                                        >
                                            <div className="flex items-center justify-end gap-1">
                                                Age (days)
                                                <ArrowUpDown className="h-3 w-3" />
                                            </div>
                                        </TableHead>
                                        <TableHead 
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => handleSort('riskScore')}
                                        >
                                            <div className="flex items-center gap-1">
                                                Risk
                                                <ArrowUpDown className="h-3 w-3" />
                                            </div>
                                        </TableHead>
                                        <TableHead className="text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredCustomers.map((customer) => (
                                        <TableRow 
                                            key={customer.accountId}
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => setSelectedCustomer(customer.accountNumber)}
                                        >
                                            <TableCell className="font-medium">{customer.holderName}</TableCell>
                                            <TableCell className="font-mono text-sm">{customer.accountNumber}</TableCell>
                                            <TableCell className="capitalize">{customer.accountType}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(customer.balance)}</TableCell>
                                            <TableCell className="text-right">{customer.totalTransactions}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(customer.avgTransactionAmount)}</TableCell>
                                            <TableCell className="text-right">
                                                <span className={customer.bounceRate > 10 ? 'text-red-600 font-semibold' : customer.bounceRate > 5 ? 'text-amber-600' : ''}>
                                                    {customer.bounceRate.toFixed(1)}%
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">{customer.accountAgeDays}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Badge className={getRiskColor(customer.riskLevel)}>
                                                        {customer.riskLevel.toUpperCase()}
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground">{customer.riskScore}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedCustomer(customer.accountNumber);
                                                    }}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default CustomerAnalysisDashboard;

