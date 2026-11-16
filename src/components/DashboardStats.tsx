import React from 'react';
import { Calendar, Wallet, TrendingUp, Users, CheckCircle2, Clock } from 'lucide-react';
import { ChitFundData } from '../types/chit';

interface DashboardStatsProps {
  data: ChitFundData;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ data }) => {
  const completedRounds = data.totalRounds - data.monthsLeft;
  const progressPercent = Math.round((completedRounds / data.totalRounds) * 100);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Months Left (Core Requirement) */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800/80 border border-slate-700/60 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
            Tenure Progress
          </span>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-white tracking-tight">
            {data.monthsLeft}
          </span>
          <span className="text-sm font-medium text-slate-400">
            / {data.totalRounds} Months Left
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="flex items-center gap-1 font-medium text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              {completedRounds} rounds completed
            </span>
            <span className="font-mono text-amber-400 font-semibold">{progressPercent}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700/40">
            <div
              className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Remaining Balance (Core Requirement) */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800/80 border border-slate-700/60 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Running Balance
          </span>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-3">
          <div className="text-3xl font-extrabold text-emerald-400 tracking-tight font-mono">
            ₹{data.currentRemainingBalance.toLocaleString('en-IN')}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Latest from Row 29 / Row 26 in Google Sheet</span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400">Carried to Round {data.currentRoundNumber}:</span>
          <span className="font-mono font-medium text-slate-200">
            + ₹{data.currentRemainingBalance.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* 3. Monthly Pool & Collection */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800/80 border border-slate-700/60 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">
            Monthly Pool
          </span>
          <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-3">
          <div className="text-3xl font-extrabold text-white tracking-tight font-mono">
            ₹{data.monthlyPoolPerRound.toLocaleString('en-IN')}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            20 members × ₹2,500 contribution / mo
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400">Total Collected So Far:</span>
          <span className="font-mono font-medium text-sky-300">
            ₹{data.totalCollected.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* 4. Total Disbursed & Winners Count */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800/80 border border-slate-700/60 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">
            Prize Disbursed
          </span>
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-3">
          <div className="text-3xl font-extrabold text-white tracking-tight font-mono">
            ₹{data.totalDisbursed.toLocaleString('en-IN')}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Paid across {data.pastWinners.length} chits ({data.pastWinners.filter(w => w.chitType === 'primary').length} primary, {data.pastWinners.filter(w => w.chitType === 'second').length} second)
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400">Eligible Members Left:</span>
          <span className="font-mono font-medium text-purple-300">
            {data.availableMembers.length} members
          </span>
        </div>
      </div>
    </div>
  );
};
