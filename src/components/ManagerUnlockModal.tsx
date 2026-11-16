import React, { useState } from 'react';
import { KeyRound, Lock, ShieldCheck, X, AlertTriangle, Unlock } from 'lucide-react';
import { MANAGER_PROFILES } from '../services/auth';

interface ManagerUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlock: (profileId: string, passcode: string) => void;
}

export const ManagerUnlockModal: React.FC<ManagerUnlockModalProps> = ({
  isOpen,
  onClose,
  onUnlock,
}) => {
  const [selectedProfile, setSelectedProfile] = useState(MANAGER_PROFILES[0].id);
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      onUnlock(selectedProfile, passcode);
      setPasscode('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to unlock Manager Mode.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Unlock Manager Mode</h3>
            <p className="text-xs text-slate-500">
              Select your manager profile & enter passcode (works locally via file://)
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Authorized Manager Profile
            </label>
            <select
              value={selectedProfile}
              onChange={(e) => setSelectedProfile(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium"
            >
              {MANAGER_PROFILES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Manager Passcode
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter manager passcode..."
                autoFocus
                className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-mono"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Unlock Manager Mode</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
