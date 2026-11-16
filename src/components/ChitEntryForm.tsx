import React, { useState, useEffect } from 'react';
import { Send, Sparkles, AlertTriangle, CheckCircle2, Lock, KeyRound, Unlock } from 'lucide-react';
import { ChitFundData, DrawSubmission } from '../types/chit';
import { MANAGER_PROFILES } from '../services/auth';

interface ChitEntryFormProps {
  data: ChitFundData;
  isAdmin: boolean;
  onUnlock: (profileId: string, passcode: string) => void;
  onSubmit: (submission: DrawSubmission) => Promise<void>;
  isSubmitting: boolean;
  preselectedRound?: number | null;
  onClearPreselectedRound?: () => void;
}

export const ChitEntryForm: React.FC<ChitEntryFormProps> = ({
  data,
  isAdmin,
  onUnlock,
  onSubmit,
  isSubmitting,
  preselectedRound,
  onClearPreselectedRound,
}) => {
  const defaultRoundNumber = data.currentRoundNumber || 12;

  const [selectedRound, setSelectedRound] = useState<number>(defaultRoundNumber);
  const [chitType, setChitType] = useState<'primary' | 'second'>('primary');
  const [selectedWinner, setSelectedWinner] = useState<string>('');
  const [amountReceived, setAmountReceived] = useState<string>('43000');
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Inline Manager Unlock state
  const [unlockProfileId, setUnlockProfileId] = useState<string>(MANAGER_PROFILES[0].id);
  const [unlockPasscode, setUnlockPasscode] = useState<string>('');
  const [unlockError, setUnlockError] = useState<string | null>(null);

  useEffect(() => {
    if (preselectedRound) {
      setSelectedRound(preselectedRound);
      setChitType('second');
      if (onClearPreselectedRound) {
        onClearPreselectedRound();
      }
    }
  }, [preselectedRound, onClearPreselectedRound]);

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

  useEffect(() => {
    if (
      data.availableMembers.length > 0 &&
      (!selectedWinner || !data.availableMembers.includes(selectedWinner))
    ) {
      setSelectedWinner(data.availableMembers[0]);
    }
  }, [data.availableMembers, selectedWinner]);

  const currentRoundData = data.rounds.find((r) => r.roundNumber === selectedRound);
  const colLetter = currentRoundData?.columnLetter || String.fromCharCode(65 + 1 + selectedRound);
  const roundDate = currentRoundData?.date || `Round ${selectedRound}`;

  const prevRoundIndex = selectedRound - 2;
  const prevFinalRemaining =
    selectedRound === 1
      ? 0
      : data.rounds[prevRoundIndex]?.finalRemaining ??
        data.rounds[prevRoundIndex]?.primaryRemaining ??
        0;

  const parsedAmount = Number(amountReceived.replace(/,/g, '')) || 0;

  let projectedPrimaryRemaining = 0;
  let projectedFinalRemaining = 0;

  if (chitType === 'primary') {
    projectedPrimaryRemaining = prevFinalRemaining + 50000 - parsedAmount;
    projectedFinalRemaining = projectedPrimaryRemaining;
  } else {
    const existingPrimaryRem =
      currentRoundData?.primaryRemaining ??
      prevFinalRemaining + 50000 - (currentRoundData?.primaryAmount || 0);
    projectedPrimaryRemaining = existingPrimaryRem;
    projectedFinalRemaining = existingPrimaryRem - parsedAmount;
  }

  const isSecondChitTriggered =
    chitType === 'primary' && projectedPrimaryRemaining >= 40000;

  const handleInlineUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError(null);
    try {
      onUnlock(unlockProfileId, unlockPasscode);
      setUnlockPasscode('');
    } catch (err: any) {
      setUnlockError(err.message || 'Invalid passcode.');
    }
  };

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
      if (chitType === 'primary' && selectedRound < 20) {
        setSelectedRound(selectedRound + 1);
      }
      setSelectedWinner('');
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit chit draw.');
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
          <Lock className="w-32 h-32 text-indigo-600" />
        </div>
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-3">
            <Lock className="w-3.5 h-3.5" />
            <span>Manager Unlock Required (Works via file://)</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Record New Chit Draw (Manager Only)
          </h2>
          <p className="text-sm text-slate-600 mt-1.5">
            Currently in <strong className="text-slate-900">Public Viewer Mode</strong>. Select your manager profile and enter the Manager Passcode to record draws directly to the Google Sheet via the Apps Script bridge.
          </p>

          {unlockError && (
            <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{unlockError}</span>
            </div>
          )}

          <form onSubmit={handleInlineUnlock} className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Manager Profile
              </label>
              <select
                value={unlockProfileId}
                onChange={(e) => setUnlockProfileId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium"
              >
                {MANAGER_PROFILES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Manager Passcode
              </label>
              <div className="relative">
                <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={unlockPasscode}
                  onChange={(e) => setUnlockPasscode(e.target.value)}
                  placeholder="Enter passcode..."
                  className="w-full bg-white border border-slate-300 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-mono"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Unlock Manager Mode</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Record Chit Draw
            </h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              Manager Entry
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Writes directly to Google Sheet "{data.spreadsheetName}" Column {colLetter} (Round {selectedRound}) via Apps Script Bridge
          </p>
        </div>

        {/* Chit Type Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setChitType('primary')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              chitType === 'primary'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Primary Chit (Row 24-25)
          </button>
          <button
            type="button"
            onClick={() => setChitType('second')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              chitType === 'second'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Second Chit Draw (Row 27-28)
          </button>
        </div>
      </div>

      {formError && (
        <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleValidateAndPrompt} className="mt-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Date / Month Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Round & Month (Column)
            </label>
            <select
              value={selectedRound}
              onChange={(e) => setSelectedRound(Number(e.target.value))}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium"
            >
              {data.rounds.map((round) => (
                <option key={round.roundNumber} value={round.roundNumber}>
                  Round {round.roundNumber} (Col {round.columnLetter}) - {round.date}{' '}
                  {round.primaryWinner ? `[Won by ${round.primaryWinner}]` : '[Open]'}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Date: <strong className="text-slate-800">{roundDate}</strong> • Column{' '}
              <strong className="text-indigo-700">{colLetter}</strong>
            </p>
          </div>

          {/* 2. Dynamic Chit Winner Dropdown */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">Chit Winner</label>
              <span className="text-[11px] text-indigo-700 font-semibold">
                {data.availableMembers.length} eligible left
              </span>
            </div>
            <select
              value={selectedWinner}
              onChange={(e) => setSelectedWinner(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium"
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
            <p className="text-[11px] text-slate-500 mt-1">
              Dynamically excludes past winners from Rows 24 & 27
            </p>
          </div>

          {/* 3. Amount Received Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Amount Received (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-500 font-bold">₹</span>
              <input
                type="number"
                min="1000"
                max="50000"
                step="100"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                placeholder="e.g. 43000"
                className="w-full bg-white border border-slate-300 rounded-xl pl-8 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-mono font-semibold"
              />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {['40500', '42000', '43500', '44500', '45000'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmountReceived(preset)}
                  className="px-2 py-0.5 text-[10px] rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-mono font-medium transition cursor-pointer"
                >
                  ₹{Number(preset).toLocaleString('en-IN')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Intelligence Alert Preview */}
        {isSecondChitTriggered && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 text-xs text-slate-700 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-indigo-800">Second Chit Intelligence Trigger:</strong>
              <p className="mt-0.5">
                With a prize value of ₹{parsedAmount.toLocaleString('en-IN')}, the running balance will be{' '}
                <strong className="text-emerald-700 font-mono">
                  ₹{projectedPrimaryRemaining.toLocaleString('en-IN')}
                </strong>
                . Because this meets the ₹10,000 threshold requirement, a{' '}
                <strong>Second Chit Draw</strong> can also be conducted for this month!
              </p>
            </div>
          </div>
        )}

        {/* Live Calculation Preview Banner */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Previous Rem:</span>
              <span className="font-mono font-semibold text-slate-900">
                ₹{prevFinalRemaining.toLocaleString('en-IN')}
              </span>
            </div>
            <span className="text-slate-400">+</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Monthly Pool:</span>
              <span className="font-mono font-semibold text-sky-700">₹50,000</span>
            </div>
            <span className="text-slate-400">-</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Prize Payout:</span>
              <span className="font-mono font-semibold text-rose-600">
                ₹{parsedAmount.toLocaleString('en-IN')}
              </span>
            </div>
            <span className="text-slate-400">=</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-600 font-medium">New Remaining:</span>
              <span className="font-mono font-bold text-emerald-700 text-sm">
                ₹{projectedFinalRemaining.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-50 ${
              chitType === 'primary'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>
              {isSubmitting
                ? 'Saving to Google Sheet...'
                : `Record ${chitType === 'primary' ? 'Primary Chit' : 'Second Chit Draw'}`}
            </span>
          </button>
        </div>
      </form>

      {/* Mandatory User Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-amber-600 pb-3 border-b border-slate-100">
              <AlertTriangle className="w-6 h-6" />
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Confirm Chit Draw Entry
                </h3>
                <p className="text-xs text-slate-500">
                  Confirm update to Google Sheet "{data.spreadsheetName}" via Apps Script
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Round & Month:</span>
                  <span className="font-semibold text-slate-900">
                    Round {selectedRound} ({roundDate})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Google Sheet Target:</span>
                  <span className="font-mono text-indigo-700 font-semibold">
                    {data.sheetName}!{colLetter}
                    {chitType === 'primary' ? '24:26' : '27:29'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Chit Type:</span>
                  <span
                    className={`font-bold ${
                      chitType === 'primary' ? 'text-emerald-700' : 'text-indigo-700'
                    }`}
                  >
                    {chitType === 'primary' ? 'Primary Chit (Row 24)' : 'Second Chit (Row 27)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Winner:</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedWinner}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount Received:</span>
                  <span className="font-mono font-bold text-emerald-700 text-sm">
                    ₹{parsedAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200">
                  <span className="text-slate-600">Resulting Remaining Balance:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    ₹{projectedFinalRemaining.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 italic">
                Submitting will update the Google Sheet via the Apps Script bridge and immediately re-sync all dashboard metrics and remove <strong className="text-slate-700">{selectedWinner}</strong> from the available member list.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
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
