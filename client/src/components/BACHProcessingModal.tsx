import React from 'react';
import { Lock, Shield, FileArchive, CheckCircle2, Send, Server, Loader2, File } from 'lucide-react';
import { BankCheque } from '@/services/api';
import { Button } from '@/components/ui/button';

interface BACHProcessingModalProps {
    isOpen: boolean;
    currentStep: number;
    cheque: BankCheque | null;
    packageFiles: string[];
    onClose: () => void;
}

const steps = [
    { icon: FileArchive, label: 'Packaging Data', description: 'Creating BACH-compliant data package...' },
    { icon: Lock, label: 'Encrypting', description: 'Applying AES-256 encryption...' },
    { icon: Shield, label: 'Digital Signature', description: 'Signing with bank certificate...' },
    { icon: Send, label: 'Transmitting', description: 'Sending to BACH network...' },
    { icon: CheckCircle2, label: 'Complete', description: 'Successfully transmitted to drawer bank!' },
];

const BACHProcessingModal: React.FC<BACHProcessingModalProps> = ({ isOpen, currentStep, cheque, packageFiles, onClose }) => {
    if (!isOpen) return null;

    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat('en-BD', { 
            style: 'currency', 
            currency: 'BDT',
            minimumFractionDigits: 0 
        }).format(amount);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            
            {/* Modal - Wider for two columns */}
            <div className="relative bg-white rounded-xl shadow-lg border border-gray-200 p-8 w-full max-w-4xl mx-4 overflow-hidden">
                {/* Content */}
                <div className="relative z-10">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-4">
                            <Server className="h-8 w-8 text-blue-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">BACH Secure Transmission</h2>
                        <p className="text-gray-600 text-sm">Processing cheque for inter-bank clearing</p>
                    </div>

                    {/* Cheque Info */}
                    {cheque && (
                        <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider">Cheque Number</p>
                                    <p className="text-gray-900 font-mono font-semibold">{cheque.cheque_number}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider">Amount</p>
                                    <p className="text-blue-600 font-bold text-lg">{formatAmount(cheque.amount)}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Two Column Layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Column - Processing Steps */}
                        <div className="space-y-3">
                            {steps.map((step, index) => {
                                const Icon = step.icon;
                                const isActive = index === currentStep;
                                const isComplete = index < currentStep;

                                return (
                                    <div 
                                        key={index}
                                        className={`flex items-center gap-4 p-3 rounded-lg transition-all duration-500 border ${
                                            isActive 
                                                ? 'bg-blue-50 border-blue-200 shadow-sm' 
                                                : isComplete 
                                                    ? 'bg-green-50 border-green-200' 
                                                    : 'bg-gray-50 border-gray-200 opacity-60'
                                        }`}
                                    >
                                        {/* Icon */}
                                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                                            isActive 
                                                ? 'bg-blue-600 text-white' 
                                                : isComplete 
                                                    ? 'bg-green-500 text-white' 
                                                    : 'bg-gray-200 text-gray-500'
                                        }`}>
                                            {isActive ? (
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                            ) : isComplete ? (
                                                <CheckCircle2 className="h-5 w-5" />
                                            ) : (
                                                <Icon className="h-5 w-5" />
                                            )}
                                        </div>

                                        {/* Text */}
                                        <div className="flex-1">
                                            <p className={`font-medium ${
                                                isActive ? 'text-gray-900' : isComplete ? 'text-green-700' : 'text-gray-500'
                                            }`}>
                                                {step.label}
                                            </p>
                                            {(isActive || isComplete) && (
                                                <p className={`text-xs ${isComplete ? 'text-green-600' : 'text-gray-600'}`}>
                                                    {isComplete ? 'Completed' : step.description}
                                                </p>
                                            )}
                                        </div>

                                        {/* Status indicator */}
                                        {isActive && (
                                            <div className="flex gap-1">
                                                <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Right Column - Encrypted Files */}
                        <div className="space-y-4">
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <div className="flex items-center gap-2 mb-3">
                                    <Lock className="h-5 w-5 text-blue-600" />
                                    <h3 className="text-gray-900 font-semibold">Encrypted Package Files</h3>
                                </div>
                                {packageFiles.length > 0 ? (
                                    <div className="space-y-2">
                                        {packageFiles.map((file, idx) => (
                                            <div 
                                                key={idx}
                                                className="flex items-center gap-2 rounded bg-white hover:bg-gray-50 transition-colors border border-gray-200 p-2"
                                            >
                                                <File className="h-4 w-4 text-gray-500" />
                                                <span className="text-sm text-gray-900 font-mono">{file}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-gray-500 text-sm py-4">Files will appear after encryption...</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-6">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-blue-600 transition-all duration-700 ease-out"
                                style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                            />
                        </div>
                        <p className="text-center text-gray-600 text-xs mt-2">
                            {currentStep < 5 ? `Step ${currentStep + 1} of ${steps.length}` : 'Transmission Complete'}
                        </p>
                    </div>

                    {/* Success message and OK button */}
                    {currentStep >= 5 && (
                        <div className="mt-6 space-y-4">
                            <div className="text-center animate-in fade-in zoom-in duration-500">
                                <div className="inline-flex items-center gap-2 bg-green-50 text-green-800 px-4 py-2 rounded-full border border-green-200">
                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                    <span className="font-medium">Routed to Drawer Bank</span>
                                </div>
                            </div>
                            <div className="flex justify-center">
                                <Button 
                                    onClick={onClose}
                                    className="px-8"
                                >
                                    OK
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes scan {
                    0% { top: -4px; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: calc(100% + 4px); opacity: 0; }
                }
                .animate-scan {
                    animation: scan 2s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default BACHProcessingModal;
