import React from 'react';
import { CheckCircle2, XCircle, Circle, AlertCircle, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StepStatus = 'pending' | 'current' | 'completed' | 'error' | 'warning';

export interface WorkflowStep {
    id: string;
    label: string;
    status: StepStatus;
    description?: string;
}

interface WorkflowStepperProps {
    steps: WorkflowStep[];
    currentStepIndex: number;
}

const WorkflowStepper: React.FC<WorkflowStepperProps> = ({ steps, currentStepIndex }) => {
    return (
        <div className="w-full py-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative">
                {/* Progress Bar Background (Desktop) */}
                <div className="hidden md:block absolute top-5 left-0 w-full h-1 bg-gray-200 -z-10" />

                {steps.map((step, index) => {
                    const isCompleted = index < currentStepIndex || step.status === 'completed';
                    const isCurrent = index === currentStepIndex || step.status === 'current';
                    const isError = step.status === 'error';
                    const isWarning = step.status === 'warning';

                    let Icon = Circle;
                    let colorClass = "bg-gray-100 text-gray-400 border-gray-300";

                    if (isCompleted) {
                        Icon = CheckCircle2;
                        colorClass = "bg-green-100 text-green-600 border-green-600";
                    } else if (isError) {
                        Icon = XCircle;
                        colorClass = "bg-red-100 text-red-600 border-red-600";
                    } else if (isWarning) {
                        Icon = AlertCircle;
                        colorClass = "bg-yellow-100 text-yellow-600 border-yellow-600";
                    } else if (isCurrent) {
                        Icon = Circle; // Or a spinner if we had one
                        colorClass = "bg-blue-100 text-blue-600 border-blue-600 ring-4 ring-blue-50";
                    }

                    return (
                        <div key={step.id} className="flex flex-row md:flex-col items-center gap-4 md:gap-2 w-full md:w-auto mb-4 md:mb-0 bg-white md:bg-transparent p-2 md:p-0 rounded-lg shadow-sm md:shadow-none border md:border-none">
                            <div className={cn("flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 z-10 bg-white", colorClass)}>
                                <Icon className="w-6 h-6" />
                            </div>
                            <div className="flex flex-col md:items-center">
                                <span className={cn("text-sm font-semibold", isCurrent ? "text-blue-700" : "text-gray-700")}>
                                    {step.label}
                                </span>
                                {step.description && (
                                    <span className="text-xs text-gray-500 hidden md:block max-w-[120px] text-center">
                                        {step.description}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default WorkflowStepper;
