import React, { useState, useMemo } from 'react';
import { Search, UserCheck, Clock, CheckCircle2, Award, Calendar, DollarSign, X } from 'lucide-react';
import { ChitFundData, Member } from '../types/chit';

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
    <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-5">
      {/* Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white tracking-tight">
              Member Chit Status Directory
            </h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
              20 Members (B3:B22)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
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
            className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-9 pr-9 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 font-medium transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
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
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeFilter === 'all'
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          All Members ({data.members.length})
        </button>

        <button
          onClick={() => setActiveFilter('eligible')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
            activeFilter === 'eligible'
              ? 'bg-sky-500 text-slate-950 shadow'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-3 h-3" />
          <span>Eligible / Awaiting Draw ({eligibleCount})</span>
        </button>

        <button
          onClick={() => setActiveFilter('winners')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
            activeFilter === 'winners'
              ? 'bg-emerald-500 text-slate-950 shadow'
              : 'bg-slate-800 text-slate-400 hover:text-white'
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
                ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 border-emerald-500/30 hover:border-emerald-500/60 shadow-sm'
                : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 shadow-sm'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    member.hasTakenChit
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {member.slNo}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white leading-tight">
                    {member.name}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ₹2,500/mo contribution
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              {member.hasTakenChit ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold shrink-0">
                  <CheckCircle2 className="w-3 h-3" />
                  Taken
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30 text-[10px] font-bold shrink-0">
                  <Clock className="w-3 h-3" />
                  Eligible
                </span>
              )}
            </div>

            {/* Member Details */}
            <div className="mt-3 pt-3 border-t border-slate-800/80 text-xs space-y-1.5">
              {member.hasTakenChit ? (
                <>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      Round {member.chitRound}:
                    </span>
                    <span className="font-semibold text-white text-[11px]">
                      {member.chitDate}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400 text-[11px]">Chit Type:</span>
                    <span
                      className={`font-semibold text-[10px] uppercase px-1.5 py-0.2 rounded ${
                        member.chitType === 'second'
                          ? 'bg-purple-500/20 text-purple-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {member.chitType === 'second' ? 'Second Chit' : 'Primary Chit'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Prize Amount:</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      ₹{member.prizeAmount?.toLocaleString('en-IN')}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400 text-[11px]">Paid to Date:</span>
                    <span className="font-mono font-medium text-slate-200 text-[11px]">
                      ₹{member.totalPaid.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400 text-[11px]">Eligible Rounds:</span>
                    <span className="font-semibold text-sky-400 text-[11px]">
                      Rounds {data.currentRoundNumber} – 20
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 italic pt-0.5">
                    Available for upcoming draw
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredMembers.length === 0 && (
        <div className="text-center py-8 text-slate-400 text-xs">
          No members found matching "{searchQuery}". Try searching for another name.
        </div>
      )}
    </div>
  );
};
