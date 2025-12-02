import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Shield, Building2 } from "lucide-react";
import { useAuth, User as UserType } from '@/lib/authContext';
import { Bank } from '@/lib/bankContext';

interface LoginScreenProps {
    bank: Bank;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ bank }) => {
    const { login, availableUsers } = useAuth();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-white/95 backdrop-blur">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit">
                        <Building2 className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">{bank.name}</CardTitle>
                    <CardDescription>ChequeMate AI - BACH Clearing System</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground text-center">
                        Select your account to continue
                    </p>
                    
                    <div className="space-y-2">
                        {availableUsers.map((user) => (
                            <button
                                key={user.id}
                                onClick={() => login(user.id)}
                                className="w-full p-4 rounded-lg border-2 border-transparent hover:border-primary hover:bg-primary/5 transition-all flex items-center gap-4 text-left"
                            >
                                <div className={`p-2 rounded-full ${user.role === 'manager' ? 'bg-amber-100' : 'bg-blue-100'}`}>
                                    {user.role === 'manager' ? (
                                        <Shield className="h-5 w-5 text-amber-600" />
                                    ) : (
                                        <User className="h-5 w-5 text-blue-600" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium">{user.name}</p>
                                    <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                                </div>
                                <Badge variant={user.role === 'manager' ? 'default' : 'secondary'}>
                                    {user.role === 'manager' ? 'Manager' : 'Employee'}
                                </Badge>
                            </button>
                        ))}
                    </div>
                    
                    <p className="text-xs text-center text-muted-foreground pt-4">
                        Demo Mode - Click any account to login
                    </p>
                </CardContent>
            </Card>
        </div>
    );
};

export default LoginScreen;

