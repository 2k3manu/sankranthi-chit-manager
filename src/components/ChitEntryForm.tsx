import React, { useState, useEffect } from 'react';
import {
  Send,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowRight,
  Info,
  Calendar,
  UserCheck,
  IndianRupee,
  Layers,
} from 'lucide-react';
import { ChitFundData, DrawSubmission } from '../types/chit';

interface ChitEntryFormProps {
  data: ChitFundData;
  isAdmin: boolean;
  onLogin: () => void;
  onSubmit: (submission: DrawSubmission) => Promise<void>;
  isSubmitting: boolean;
  preselectedRound?: number | null;
  onClearPreselectedRound?: () => void;
}

export const ChitEntryForm: React.FC<ChitEntryFormProps> = ({
  data,
  isAdmin,
  onLogin,
  onSubmit,
  isSubmitting,
  preselectedRound,
  onClearPreselectedRound,
}) => {
  // Default to the first upcoming round (e.g., Round 10)
  const defaultRoundNumber = data.currentRoundNumber || 10;

  const [selectedRound, setSelectedRound] = useState<number>(defaultRoundNumber);
  const [chitType, setChitType] = useState<'primary' | 'second'>('primary');
  const [selectedWinner, setSelectedWinner] = useState<string>('');
  const [amountReceived, setAmountReceived] = useState<string>('42000');
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Handle preselection from 2nd chit alert
  useEffect(() => {
    if (preselectedRound) {
      setSelectedRound(preselectedRound);
      setChitType('second');
      if (onClearPreselectedRound) {
        onClearPreselectedRound();
      }
    }
  }, [preselectedRound, onClearPreselectedRound]);

  // Keep selectedRound synced to latest open round when sheet data updates
  useEffect(() => {
    if (!preselectedRound && data.currentRoundNumber) {
      setSelectedRound((prev) => {
        const prevRound = data.rounds.find((r) => r.roundNumber === prev);
        if (!prevRound || (prevRound.status === 'completed' && chitType === 'primary')) {
          return data.currentRoundNumber;
        }
        return prev;
      });
    }
  }, [data.currentRoundNumber, data.rounds, preselectedRound, chitType]);

  // Set default winner from available members
  useEffect(() => {
    if (data.availableMembers.length > 0 && (!selectedWinner || !data.availableMembers.includes(selectedWinner))) {
      setSelectedWinner(data.availableMembers[0]);
    }
  }, [data.availableMembers, selectedWinner]);

  // Current target round metadata
  const currentRoundData = data.rounds.find((r) => r.roundNumber === selectedRound);
  const colLetter = currentRoundData?.columnLetter || String.fromCharCode(65 + 1 + selectedRound);
  const roundDate = currentRoundData?.date || `Round ${selectedRound}`;

  // Previous remaining balance for calculation
  const prevRoundIndex = selectedRound - 2;
  const prevFinalRemaining =
    selectedRound === 1
      ? 0
      : data.rounds[prevRoundIndex]?.finalRemaining ??
        data.rounds[prevRoundIndex]?.primaryRemaining ??
        0;

  const parsedAmount = Number(amountReceived.replace(/,/g, '')) || 0;

  // Real-time balance calculations
  let projectedPrimaryRemaining = 0;
  let projectedFinalRemaining = 0;

  if (chitType === 'primary') {
    projectedPrimaryRemaining = prevFinalRemaining + 50000 - parsedAmount;
    projectedFinalRemaining = projectedPrimaryRemaining;
  } else {
    // Second chit for round: starts from existing primary remaining in this round
    const existingPrimaryRem =
      currentRoundData?.primaryRemaining ?? prevFinalRemaining + 50000 - (currentRoundData?.primaryAmount || 0);
    projectedPrimaryRemaining = existingPrimaryRem;
    projectedFinalRemaining = existingPrimaryRem - parsedAmount;
  }

  // Second chit intelligence check
  const isSecondChitTriggered =
    chitType === 'primary' && projectedPrimaryRemaining >= 40000;

  // Form submission handler
  const handleValidateAndPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedWinner) {
      setFormError('Please select a chit winner.');
      return;
    }

    if (!parsedAmount || parsedAmount <= 0) {
      setFormError('Please enter a valid amount received.');
      return;
    }

    if (parsedAmount > 50000) {
      setFormError('Chit value cannot exceed monthly total of ₹50,000.');
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    try {
      setShowConfirmModal(false);
      await onSubmit({
        roundNumber: selectedRound,
        chitType,
        winnerName: selectedWinner,
        amountReceived: parsedAmount,
      });
      // Advance to next round if primary chit was entered
      if (chitType === 'primary' && selectedRound < 20) {
        setSelectedRound(selectedRound + 1);
      }
      setSelectedWinner('');
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit chit draw.');
    }
  };

  // If user is Viewer (not Admin): show locked state card
  if (!isAdmin) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-5">
          <Lock className="w-32 h-32 text-amber-400" />
        </div>
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-3">
            <Lock className="w-3.5 h-3.5" />
            <span>Role-Based Access Control</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Record New Chit Draw (Manager Only)
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            You are currently viewing in <strong>Public Viewer Mode</strong>. Chit Fund members can
            search their chit status, view running balances, and inspect the 20-month ledger. Only
            authorized managers can submit new chit draws to update the Google Sheet.
          </p>
          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={onLogin}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold shadow-md transition active:scale-95"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>Manager Sign In</span>
            </button>
            <span className="text-xs text-slate-500">
              Authorized managers: 2k3manu@gmail.com, ningaraj1905@gmail.com, mantyamora@gmail.com
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white tracking-tight">
              Record Chit Draw
            </h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Manager Entry
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Writes directly to Google Sheet "Sankranthi Chit" Column {colLetter} (Round {selectedRound})
          </p>
        </div>

        {/* Chit Type Switcher */}
        <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
          <button
            type="button"
            onClick={() => setChitType('primary')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              chitType === 'primary'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Primary Chit (Row 24-25)
          </button>
          <button
            type="button"
            onClick={() => setChitType('second')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              chitType === 'second'
                ? 'bg-purple-500 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Second Chit Draw (Row 27-28)
          </button>
        </div>
      </div>

      {formError && (
        <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleValidateAndPrompt} className="mt-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Date / Month Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Round & Month (Column)
            </label>
            <div className="relative">
              <select
                value={selectedRound}
                onChange={(e) => setSelectedRound(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 font-medium"
              >
                {data.rounds.map((round) => (
                  <option key={round.roundNumber} value={round.roundNumber}>
                    Round {round.roundNumber} (Col {round.columnLetter}) - {round.date}{' '}
                    {round.primaryWinner ? `[Won by ${round.primaryWinner}]` : '[Open]'}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Date: <strong className="text-slate-300">{roundDate}</strong> • Column{' '}
              <strong className="text-amber-400">{colLetter}</strong>
            </p>
          </div>

          {/* 2. Dynamic Chit Winner Dropdown (ONLY members from B9:B22 without chits) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Chit Winner
              </label>
              <span className="text-[11px] text-amber-400 font-medium">
                {data.availableMembers.length} eligible left
              </span>
            </div>
            <select
              value={selectedWinner}
              onChange={(e) => setSelectedWinner(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 font-medium"
            >
              <option value="" disabled>
                -- Select eligible member --
              </option>
              {data.availableMembers.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
              <option value="Agent">Agent (Round 3 Chit)</option>
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Dynamically excludes past winners from Rows 24 & 27
            </p>
          </div>

          {/* 3. Amount Received Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Amount Received (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">₹</span>
              <input
                type="number"
                min="1000"
                max="50000"
                step="100"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                placeholder="e.g. 42000"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-mono font-semibold"
              />
            </div>
            {/* Fast Presets */}
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {['38500', '40500', '42000', '43500', '44500'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmountReceived(preset)}
                  className="px-2 py-0.5 text-[10px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono transition"
                >
                  ₹{Number(preset).toLocaleString('en-IN')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Intelligence Alert Preview */}
        {isSecondChitTriggered && (
          <div className="bg-purple-950/40 border border-purple-500/40 rounded-xl p-3.5 text-xs text-purple-200 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-purple-300">Second Chit Intelligence Trigger:</strong>
              <p className="mt-0.5">
                With a prize value of ₹{parsedAmount.toLocaleString('en-IN')}, the running balance will be{' '}
                <strong className="text-emerald-400 font-mono">
                  ₹{projectedPrimaryRemaining.toLocaleString('en-IN')}
                </strong>
                . Because this meets the ₹10,000 threshold requirement, a{' '}
                <strong>Second Chit Draw</strong> can also be conducted for this month!
              </p>
            </div>
          </div>
        )}

        {/* Live Calculation Preview Banner */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Previous Rem:</span>
              <span className="font-mono font-semibold text-slate-300">
                ₹{prevFinalRemaining.toLocaleString('en-IN')}
              </span>
            </div>
            <span className="text-slate-600">+</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Monthly Pool:</span>
              <span className="font-mono font-semibold text-sky-400">₹50,000</span>
            </div>
            <span className="text-slate-600">-</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Prize Payout:</span>
              <span className="font-mono font-semibold text-rose-400">
                ₹{parsedAmount.toLocaleString('en-IN')}
              </span>
            </div>
            <span className="text-slate-600">=</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium">New Remaining:</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                ₹{projectedFinalRemaining.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg transition active:scale-95 cursor-pointer disabled:opacity-50 ${
              chitType === 'primary'
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                : 'bg-purple-500 hover:bg-purple-400 text-white shadow-purple-500/20'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>
              {isSubmitting
                ? 'Submitting...'
                : `Record ${chitType === 'primary' ? 'Primary Chit' : 'Second Chit Draw'}`}
            </span>
          </button>
        </div>
      </form>

      {/* Confirmation Modal (MANDATORY User Confirmation for Mutating Operations) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-amber-400 pb-3 border-b border-slate-800">
              <AlertTriangle className="w-6 h-6" />
              <div>
                <h3 className="text-base font-bold text-white">
                  Confirm Chit Draw Entry
                </h3>
                <p className="text-xs text-slate-400">
                  Confirm update to Google Sheet "Sankranthi Chit"
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Round & Month:</span>
                  <span className="font-semibold text-white">
                    Round {selectedRound} ({roundDate})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Google Sheet Target:</span>
                  <span className="font-mono text-amber-400">
                    Sheet1!{colLetter}
                    {chitType === 'primary' ? '24:26' : '27:29'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Chit Type:</span>
                  <span
                    className={`font-bold ${
                      chitType === 'primary' ? 'text-amber-400' : 'text-purple-400'
                    }`}
                  >
                    {chitType === 'primary' ? 'Primary Chit (Row 24)' : 'Second Chit (Row 27)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Winner:</span>
                  <span className="font-bold text-white text-sm">{selectedWinner}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Amount Received:</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    ₹{parsedAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-800/80">
                  <span className="text-slate-400">Resulting Remaining Balance:</span>
                  <span className="font-mono font-bold text-emerald-300">
                    ₹{projectedFinalRemaining.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 italic">
                Writing this entry will update the Google Sheet row values and immediately refresh all
                dashboard metrics and remove <strong>{selectedWinner}</strong> from the available member list.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Update Sheet</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
