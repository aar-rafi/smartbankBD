import React from 'react';
import { LayoutDashboard, FileText, History, Settings, ShieldCheck, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SidebarProps {
    className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ className }) => {
    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', active: false },
        { icon: FileText, label: 'Cheque Processing', active: true },
        { icon: History, label: 'Transaction History', active: false },
        { icon: ShieldCheck, label: 'Fraud Rules', active: false },
        { icon: Settings, label: 'Settings', active: false },
    ];

    return (
        <div className={cn("pb-12 min-h-screen w-64 border-r bg-card hidden lg:block", className)}>
            <div className="space-y-4 py-4">
                <div className="px-3 py-2">
                    <div className="flex items-center gap-2 px-4 mb-8">
                        <div className="bg-primary p-1.5 rounded-lg">
                            <FileText className="text-primary-foreground h-6 w-6" />
                        </div>
                        <h2 className="text-xl font-bold tracking-tight">ChequeMate</h2>
                    </div>
                    <div className="space-y-1">
                        {navItems.map((item) => (
                            <Button
                                key={item.label}
                                variant={item.active ? "secondary" : "ghost"}
                                className={cn("w-full justify-start", item.active && "bg-secondary")}
                            >
                                <item.icon className="mr-2 h-4 w-4" />
                                {item.label}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>
            <div className="absolute bottom-4 px-4 w-64">
                <Button variant="ghost" className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                </Button>
            </div>
        </div>
    );
};

export default Sidebar;
