import React from 'react';
import { Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
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
  const eligibleRounds = data.rounds.filter((r) => r.isSecondChitEligible && !r.secondWinner);
  const completedSecondChitRounds = data.rounds.filter((r) => Boolean(r.secondWinner));

  if (eligibleRounds.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span>
            <strong className="text-slate-900">Second Chit Intelligence:</strong> Running balance is evaluated each round. When balance is within ₹10,000 of monthly collection (≥ ₹40,000), a 2nd chit is triggered.
          </span>
        </div>
        {completedSecondChitRounds.length > 0 && (
          <div className="flex items-center gap-1.5 text-indigo-700 font-semibold bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
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
          className="relative overflow-hidden bg-gradient-to-r from-indigo-50 via-violet-50 to-white border-2 border-indigo-400 rounded-2xl p-5 shadow-md animate-pulse-border"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-sm shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-600 text-white">
                    Second Chit Alert
                  </span>
                  <span className="text-xs font-semibold text-indigo-700">
                    Round {round.roundNumber} ({round.date})
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  Surplus Fund Available for 2nd Chit Draw This Month!
                </h3>
                <p className="text-xs text-slate-600 mt-1 max-w-2xl">
                  Primary chit winner <strong className="text-slate-900">{round.primaryWinner}</strong> took ₹{round.primaryAmount?.toLocaleString('en-IN')}, leaving a surplus balance of{' '}
                  <strong className="text-emerald-700 font-mono">
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
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer"
                >
                  <span>Record 2nd Chit for Round {round.roundNumber}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="text-xs text-indigo-700 bg-indigo-100/70 border border-indigo-200 rounded-lg px-3 py-2 text-center font-medium">
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
