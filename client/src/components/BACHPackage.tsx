import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileArchive, FileText, Image, Lock } from "lucide-react";

interface BACHPackageProps {
    chequeNumber: string;
    bankCode: string;
    date: string;
    batchNumber?: string;
}

/**
 * Visual representation of a BACH package structure
 * OUTWARD_2025-12-02_037_01.ENC
 * - batch_header.dat
 * - items.dat (MICR + metadata)
 * - images/
 *   - IMG00001_FG.TIF (Front Grayscale)
 *   - IMG00001_FB.TIF (Front Binary)
 *   - IMG00001_BB.TIF (Back Binary)
 */
const BACHPackage: React.FC<BACHPackageProps> = ({ chequeNumber, bankCode, date, batchNumber = '01' }) => {
    const formattedDate = date.replace(/-/g, '-');
    const packageName = `OUTWARD_${formattedDate}_${bankCode}_${batchNumber}.ENC`;
    const itemId = chequeNumber.replace(/\D/g, '').slice(-5).padStart(5, '0');

    return (
        <Card className="bg-slate-900 text-slate-100 font-mono text-sm">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Lock className="h-4 w-4 text-green-400" />
                        BACH Package
                    </CardTitle>
                    <Badge variant="outline" className="bg-green-900/50 text-green-400 border-green-700">
                        Encrypted
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-amber-400">
                    <FileArchive className="h-4 w-4" />
                    <span>{packageName}</span>
                </div>
                <div className="pl-4 border-l border-slate-700 space-y-1">
                    <div className="flex items-center gap-2 text-slate-400">
                        <FileText className="h-3 w-3" />
                        <span>batch_header.dat</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                        <FileText className="h-3 w-3" />
                        <span>items.dat</span>
                        <span className="text-slate-600 text-xs">(MICR + metadata)</span>
                    </div>
                    <div className="text-slate-500">images/</div>
                    <div className="pl-4 border-l border-slate-800 space-y-1">
                        <div className="flex items-center gap-2 text-slate-500">
                            <Image className="h-3 w-3" />
                            <span>IMG{itemId}_FG.TIF</span>
                            <span className="text-slate-700 text-xs">(Front Gray)</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500">
                            <Image className="h-3 w-3" />
                            <span>IMG{itemId}_FB.TIF</span>
                            <span className="text-slate-700 text-xs">(Front Binary)</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500">
                            <Image className="h-3 w-3" />
                            <span>IMG{itemId}_BB.TIF</span>
                            <span className="text-slate-700 text-xs">(Back Binary)</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default BACHPackage;

