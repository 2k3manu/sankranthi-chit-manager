import React, { useState, useMemo } from 'react';
import { Search, Clock, CheckCircle2, Award, Calendar, X } from 'lucide-react';
import { ChitFundData } from '../types/chit';

interface MemberStatusSearchProps {
  data: ChitFundData;
  searchRef?: React.RefObject<HTMLInputElement | null>;
}

export const MemberStatusSearch: React.FC<MemberStatusSearchProps> = ({ data, searchRef }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'eligible' | 'winners'>('all');

  const filteredMembers = useMemo(() => {
    return data.members.filter((member) => {
      const matchesQuery =
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.slNo.toString().includes(searchQuery);

      if (!matchesQuery) return false;

      if (activeFilter === 'eligible') {
        return !member.hasTakenChit;
      }
      if (activeFilter === 'winners') {
        return member.hasTakenChit;
      }
      return true;
    });
  }, [data.members, searchQuery, activeFilter]);

  const winnersCount = data.members.filter((m) => m.hasTakenChit).length;
  const eligibleCount = data.members.filter((m) => !m.hasTakenChit).length;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
      {/* Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Member Chit Status Directory
            </h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              20 Members (B3:B22)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Search your name to check if you have taken your chit, prize amount, and remaining eligibility.
          </p>
        </div>

        {/* Search Input Box */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by member name (e.g. Harish, Manu)..."
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-9 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeFilter === 'all'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
          }`}
        >
          All Members ({data.members.length})
        </button>

        <button
          onClick={() => setActiveFilter('eligible')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
            activeFilter === 'eligible'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
          }`}
        >
          <Clock className="w-3 h-3" />
          <span>Eligible / Awaiting Draw ({eligibleCount})</span>
        </button>

        <button
          onClick={() => setActiveFilter('winners')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
            activeFilter === 'winners'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
          }`}
        >
          <Award className="w-3 h-3" />
          <span>Chit Taken ({winnersCount})</span>
        </button>
      </div>

      {/* Members Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {filteredMembers.map((member) => (
          <div
            key={member.slNo}
            className={`relative rounded-xl p-4 border transition-all duration-200 ${
              member.hasTakenChit
                ? 'bg-gradient-to-br from-white via-white to-emerald-50/70 border-emerald-200 hover:border-emerald-300 shadow-xs'
                : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-white shadow-xs'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    member.hasTakenChit
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  {member.slNo}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 leading-tight">
                    {member.name}
                  </h3>
                  <span className="text-[10px] text-slate-500 font-mono">
                    ₹2,500/mo contribution
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              {member.hasTakenChit ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold shrink-0">
                  <CheckCircle2 className="w-3 h-3" />
                  Taken
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold shrink-0">
                  <Clock className="w-3 h-3" />
                  Eligible
                </span>
              )}
            </div>

            {/* Member Details */}
            <div className="mt-3 pt-3 border-t border-slate-200/80 text-xs space-y-1.5">
              {member.hasTakenChit ? (
                <>
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="text-slate-500 flex items-center gap-1 text-[11px]">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      Round {member.chitRound}:
                    </span>
                    <span className="font-semibold text-slate-900 text-[11px]">
                      {member.chitDate}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="text-slate-500 text-[11px]">Chit Type:</span>
                    <span
                      className={`font-semibold text-[10px] uppercase px-1.5 py-0.5 rounded ${
                        member.chitType === 'second'
                          ? 'bg-violet-100 text-violet-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {member.chitType === 'second' ? 'Second Chit' : 'Primary Chit'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-[11px]">Prize Amount:</span>
                    <span className="font-mono font-bold text-emerald-700 text-sm">
                      ₹{member.prizeAmount?.toLocaleString('en-IN')}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="text-slate-500 text-[11px]">Paid to Date:</span>
                    <span className="font-mono font-semibold text-slate-800 text-[11px]">
                      ₹{member.totalPaid.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="text-slate-500 text-[11px]">Eligible Rounds:</span>
                    <span className="font-semibold text-indigo-600 text-[11px]">
                      Rounds {data.currentRoundNumber} – 20
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 italic pt-0.5">
                    Available for upcoming draw
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredMembers.length === 0 && (
        <div className="text-center py-8 text-slate-500 text-xs">
          No members found matching "{searchQuery}". Try searching for another name.
        </div>
      )}
    </div>
  );
};
