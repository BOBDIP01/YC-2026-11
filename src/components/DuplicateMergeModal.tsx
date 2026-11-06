import React, { useState } from 'react';
import { CRMContact, DuplicatePair } from '../types';
import { mergeContacts } from '../utils/deduplication';
import { GitMerge, X, Check, AlertTriangle, ArrowRight } from 'lucide-react';

interface DuplicateMergeModalProps {
  pair: DuplicatePair | null;
  onClose: () => void;
  onConfirmMerge: (merged: CRMContact, deletedId: string) => void;
  onDismiss: () => void;
}

export const DuplicateMergeModal: React.FC<DuplicateMergeModalProps> = ({
  pair,
  onClose,
  onConfirmMerge,
  onDismiss,
}) => {
  if (!pair) return null;

  const { contactA, contactB, similarityScore, matchedFields } = pair;

  // Selected values for each field
  const [selectedFields, setSelectedFields] = useState<Partial<Record<keyof CRMContact, any>>>({
    name: contactA.name || contactB.name,
    role: contactA.role || contactB.role,
    company: contactA.company || contactB.company,
    email: contactA.email || contactB.email,
    phone: contactA.phone || contactB.phone,
    website: contactA.website || contactB.website,
    location: contactA.location || contactB.location,
    status: contactA.status || contactB.status,
  });

  const handleSelectField = (field: keyof CRMContact, value: any) => {
    setSelectedFields((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleExecuteMerge = () => {
    const merged = mergeContacts(contactA, contactB, selectedFields);
    onConfirmMerge(merged, contactB.id);
  };

  const fieldsToCompare: { key: keyof CRMContact; label: string }[] = [
    { key: 'name', label: 'Full Name' },
    { key: 'role', label: 'Role / Title' },
    { key: 'company', label: 'Company' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'website', label: 'Website' },
    { key: 'location', label: 'Location' },
    { key: 'status', label: 'Status Stage' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <GitMerge className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Intelligent Duplicate Resolution</h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/60 text-amber-300 font-semibold">
                  {similarityScore}% Match
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Matched on:{' '}
                <span className="text-slate-300 font-medium">
                  {matchedFields.join(', ')}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Comparison Table */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-3 pr-1">
          <div className="grid grid-cols-12 gap-3 pb-2 text-xs font-semibold text-slate-400 border-b border-slate-800">
            <div className="col-span-3">Field</div>
            <div className="col-span-4 text-indigo-400">Record A (Primary)</div>
            <div className="col-span-4 text-cyan-400">Record B (Duplicate)</div>
            <div className="col-span-1 text-right">Pick</div>
          </div>

          {fieldsToCompare.map(({ key, label }) => {
            const valA = (contactA[key] as string) || '';
            const valB = (contactB[key] as string) || '';
            const isChosenA = selectedFields[key] === valA;
            const isDifferent = valA !== valB;

            return (
              <div
                key={key}
                className={`grid grid-cols-12 gap-3 py-2.5 px-2 rounded-lg text-xs items-center transition ${
                  isDifferent ? 'bg-slate-950/60 border border-slate-800/80' : 'bg-transparent'
                }`}
              >
                <div className="col-span-3 font-medium text-slate-300">{label}</div>

                {/* Value A */}
                <div
                  onClick={() => handleSelectField(key, valA)}
                  className={`col-span-4 p-2 rounded cursor-pointer truncate transition ${
                    isChosenA && valA
                      ? 'bg-indigo-950/60 border border-indigo-500/60 text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={valA}
                >
                  {valA || <span className="italic text-slate-400 font-normal">(empty)</span>}
                </div>

                {/* Value B */}
                <div
                  onClick={() => handleSelectField(key, valB)}
                  className={`col-span-4 p-2 rounded cursor-pointer truncate transition ${
                    !isChosenA && valB
                      ? 'bg-cyan-950/60 border border-cyan-500/60 text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={valB}
                >
                  {valB || <span className="italic text-slate-400 font-normal">(empty)</span>}
                </div>

                {/* Radio selection toggle */}
                <div className="col-span-1 flex justify-end">
                  <button
                    onClick={() => handleSelectField(key, isChosenA ? valB : valA)}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer actions */}
        <div className="mt-5 flex items-center justify-between pt-4 border-t border-slate-800">
          <button
            onClick={onDismiss}
            className="text-xs text-slate-400 hover:text-slate-200 transition"
          >
            Dismiss (Not a Duplicate)
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 text-xs rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleExecuteMerge}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition shadow-sm"
            >
              <GitMerge className="h-3.5 w-3.5" />
              <span>Merge & Deduplicate Records</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
