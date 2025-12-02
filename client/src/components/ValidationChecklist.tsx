import React from 'react';
import { ValidationResult, ValidationRule } from '../../../shared/types';
import SignatureComparison from './SignatureComparison';

const StatusIcon: React.FC<{ status: ValidationRule['status'] }> = ({ status }) => {
  switch (status) {
    case 'pass':
      return <span className="material-symbols-outlined text-green-500">check_circle</span>;
    case 'fail':
      return <span className="material-symbols-outlined text-red-500">cancel</span>;
    case 'warning':
      return <span className="material-symbols-outlined text-amber-500">warning</span>;
    default:
      return <span className="material-symbols-outlined text-gray-300">pending</span>;
  }
};

const ValidationChecklist: React.FC<{ result: ValidationResult }> = ({ result }) => {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-gray-500">fact_check</span>
            Automated Validation Checks
          </h3>
        </div>
        <div className="divide-y divide-gray-100">
          {result.rules.map((rule) => (
            <div key={rule.id} className="p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors">
              <div className="mt-0.5 shrink-0">
                <StatusIcon status={rule.status} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <p className={`text-sm font-medium ${rule.status === 'pass' ? 'text-gray-900' :
                    rule.status === 'fail' ? 'text-red-700' : 'text-amber-700'
                    }`}>
                    {rule.label}
                  </p>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${rule.status === 'pass' ? 'bg-green-100 text-green-700' :
                    rule.status === 'fail' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                    {rule.status}
                  </span>
                </div>
                {rule.message && (
                  <p className="text-xs text-gray-500 mt-1">{rule.message}</p>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
          <div className={`flex items-center justify-center gap-2 font-bold p-2 rounded-lg text-sm ${result.isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
            {result.isValid ? (
              <>
                <span className="material-symbols-outlined">verified</span>
                Cheque Validated Successfully
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">report_problem</span>
                Validation Failed - Review Issues
              </>
            )}
          </div>
        </div>
      </div>

      {/* Signature Comparison Component */}
      {result.signatureData && (
        <SignatureComparison
          data={result.signatureData}
          hasSignature={result.rules.find(r => r.id === 'signature')?.status === 'pass'}
        />
      )}
    </div>
  );
};

export default ValidationChecklist;