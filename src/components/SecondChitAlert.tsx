import React from 'react';
import { Sparkles, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { ChitFundData } from '../types/chit';

interface SecondChitAlertProps {
  data: ChitFundData;
  isAdmin: boolean;
  onSelectSecondChitRound: (roundNumber: number) => void;
}

export const SecondChitAlert: React.FC<SecondChitAlertProps> = ({
  data,
  isAdmin,
  onSelectSecondChitRound,
}) => {
  // Find rounds eligible for a second chit that don't have a second chit winner yet
  const eligibleRounds = data.rounds.filter((r) => r.isSecondChitEligible && !r.secondWinner);

  // Also check if any round had a second chit successfully taken (like Round 6)
  const completedSecondChitRounds = data.rounds.filter((r) => Boolean(r.secondWinner));

  if (eligibleRounds.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>
            <strong className="text-slate-300">Second Chit Intelligence:</strong> Running balance is evaluated each round. When balance is within ₹10,000 of monthly collection (≥ ₹40,000), a 2nd chit is triggered.
          </span>
        </div>
        {completedSecondChitRounds.length > 0 && (
          <div className="flex items-center gap-1.5 text-purple-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>
              {completedSecondChitRounds
                .map((r) => `Round ${r.roundNumber} 2nd chit (${r.secondWinner})`)
                .join(' • ')}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {eligibleRounds.map((round) => (
        <div
          key={round.roundNumber}
          className="relative overflow-hidden bg-gradient-to-r from-purple-950/80 via-indigo-950/70 to-slate-900 border-2 border-purple-500/50 rounded-2xl p-5 shadow-xl shadow-purple-950/30 animate-pulse-border"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-400/30 shrink-0">
                <Sparkles className="w-6 h-6 animate-spin-slow" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500 text-slate-950">
                    Second Chit Alert
                  </span>
                  <span className="text-xs font-medium text-purple-300">
                    Round {round.roundNumber} ({round.date})
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-1">
                  Surplus Fund Available for 2nd Chit Draw This Month!
                </h3>
                <p className="text-xs text-purple-200/80 mt-1 max-w-2xl">
                  Primary chit winner <strong>{round.primaryWinner}</strong> took ₹{round.primaryAmount?.toLocaleString('en-IN')}, leaving a surplus balance of{' '}
                  <strong className="text-emerald-400 font-mono">
                    ₹{round.primaryRemaining?.toLocaleString('en-IN')}
                  </strong>{' '}
                  (within ₹10,000 threshold of monthly total). A 2nd member can take a chit in this round!
                </p>
              </div>
            </div>

            <div className="shrink-0 w-full sm:w-auto">
              {isAdmin ? (
                <button
                  onClick={() => onSelectSecondChitRound(round.roundNumber)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs shadow-lg shadow-purple-500/25 transition active:scale-95 cursor-pointer"
                >
                  <span>Record 2nd Chit for Round {round.roundNumber}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="text-xs text-purple-300/80 bg-purple-900/40 border border-purple-700/40 rounded-lg px-3 py-2 text-center">
                  Manager sign-in required to record second draw
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
