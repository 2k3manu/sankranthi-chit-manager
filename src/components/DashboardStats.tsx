import React from 'react';
import { Calendar, Wallet, TrendingUp, Users, CheckCircle2 } from 'lucide-react';
import { ChitFundData } from '../types/chit';

interface DashboardStatsProps {
  data: ChitFundData;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ data }) => {
  const completedRounds = data.totalRounds - data.monthsLeft;
  const progressPercent = Math.round((completedRounds / data.totalRounds) * 100);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Months Left */}
      <div className="relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            Tenure Progress
          </span>
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {data.monthsLeft}
          </span>
          <span className="text-sm font-medium text-slate-500">
            / {data.totalRounds} Months Left
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span className="flex items-center gap-1 font-semibold text-slate-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              {completedRounds} rounds completed
            </span>
            <span className="font-mono text-indigo-600 font-bold">{progressPercent}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
            <div
              className="bg-gradient-to-r from-indigo-600 to-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Remaining Balance */}
      <div className="relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Running Balance
          </span>
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-3">
          <div className="text-3xl font-extrabold text-emerald-600 tracking-tight font-mono">
            ₹{data.currentRemainingBalance.toLocaleString('en-IN')}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Latest from Row 29 / Row 26 in Google Sheet</span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500">Carried to Round {data.currentRoundNumber}:</span>
          <span className="font-mono font-bold text-slate-800">
            + ₹{data.currentRemainingBalance.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* 3. Monthly Pool & Collection */}
      <div className="relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-sky-700">
            Monthly Pool
          </span>
          <div className="p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-3">
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
            ₹{data.monthlyPoolPerRound.toLocaleString('en-IN')}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            20 members × ₹2,500 contribution / mo
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500">Total Collected So Far:</span>
          <span className="font-mono font-bold text-sky-700">
            ₹{data.totalCollected.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* 4. Total Disbursed & Winners Count */}
      <div className="relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-violet-700">
            Prize Disbursed
          </span>
          <div className="p-2 rounded-xl bg-violet-50 text-violet-600 border border-violet-100">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-3">
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
            ₹{data.totalDisbursed.toLocaleString('en-IN')}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Paid across {data.pastWinners.length} chits ({data.pastWinners.filter((w) => w.chitType === 'primary').length} primary, {data.pastWinners.filter((w) => w.chitType === 'second').length} second)
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500">Eligible Members Left:</span>
          <span className="font-mono font-bold text-violet-700">
            {data.availableMembers.length} members
          </span>
        </div>
      </div>
    </div>
  );
};
