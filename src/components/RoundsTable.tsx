import React, { useState } from 'react';
import { CheckCircle2, Clock, Sparkles, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { ChitFundData } from '../types/chit';

interface RoundsTableProps {
  data: ChitFundData;
  onSelectRound?: (roundNumber: number) => void;
  isAdmin: boolean;
}

export const RoundsTable: React.FC<RoundsTableProps> = ({ data, onSelectRound, isAdmin }) => {
  const [showAllRounds, setShowAllRounds] = useState(false);

  const displayedRounds = showAllRounds
    ? data.rounds
    : data.rounds.filter(
        (r) => r.status === 'completed' || r.roundNumber <= data.currentRoundNumber + 2
      );

  const handleExportCSV = () => {
    const headers = [
      'Round',
      'Column',
      'Date',
      'Monthly Pool',
      'Primary Winner',
      'Primary Amount',
      'Primary Remaining',
      'Second Winner',
      'Second Amount',
      'Final Remaining',
    ];

    const rows = data.rounds.map((r) => [
      r.roundNumber,
      r.columnLetter,
      r.date,
      r.monthlyPool,
      r.primaryWinner || '',
      r.primaryAmount || '',
      r.primaryRemaining || '',
      r.secondWinner || '',
      r.secondAmount || '',
      r.finalRemaining || '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Sankranthi_Chit_Ledger_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              20-Round Monthly Chit Ledger
            </h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              Columns C – V (Rows 23 – 29)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Full ledger synced with Google Sheet "{data.spreadsheetName}" {data.sheetName}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold border border-slate-200 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setShowAllRounds(!showAllRounds)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold border border-slate-200 transition cursor-pointer"
          >
            <span>{showAllRounds ? 'Show Active Only' : 'Show All 20 Rounds'}</span>
            {showAllRounds ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-3">Round</th>
              <th className="py-3 px-3">Date</th>
              <th className="py-3 px-3 text-right">Pool</th>
              <th className="py-3 px-3">Primary Chit Winner</th>
              <th className="py-3 px-3 text-right">Chit Value (₹)</th>
              <th className="py-3 px-3 text-right">Primary Rem (Row 26)</th>
              <th className="py-3 px-3">Second Chit Winner</th>
              <th className="py-3 px-3 text-right">2nd Value (₹)</th>
              <th className="py-3 px-3 text-right">Final Rem (Row 29)</th>
              <th className="py-3 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {displayedRounds.map((round) => {
              const isCurrent = round.status === 'current';
              const isCompleted = round.status === 'completed';

              return (
                <tr
                  key={round.roundNumber}
                  onClick={() => isAdmin && onSelectRound && onSelectRound(round.roundNumber)}
                  className={`transition group ${
                    isCurrent
                      ? 'bg-amber-50/70 hover:bg-amber-100/60'
                      : isCompleted
                      ? 'hover:bg-slate-50'
                      : 'opacity-70 hover:opacity-100 hover:bg-slate-50'
                  } ${isAdmin && onSelectRound ? 'cursor-pointer' : ''}`}
                >
                  {/* Round & Col */}
                  <td className="py-3 px-3 font-sans">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900">R{round.roundNumber}</span>
                      <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 rounded font-mono font-semibold">
                        Col {round.columnLetter}
                      </span>
                    </div>
                  </td>

                  {/* Date */}
                  <td className="py-3 px-3 text-slate-600 font-sans whitespace-nowrap font-medium">
                    {round.date}
                  </td>

                  {/* Monthly Pool */}
                  <td className="py-3 px-3 text-right text-slate-600">
                    ₹{round.monthlyPool.toLocaleString('en-IN')}
                  </td>

                  {/* Primary Winner */}
                  <td className="py-3 px-3 font-sans">
                    {round.primaryWinner ? (
                      <span className="font-bold text-slate-900">{round.primaryWinner}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Primary Amount */}
                  <td className="py-3 px-3 text-right">
                    {round.primaryAmount ? (
                      <span className="font-bold text-emerald-700">
                        ₹{round.primaryAmount.toLocaleString('en-IN')}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Primary Remaining (Row 26) */}
                  <td className="py-3 px-3 text-right">
                    {round.primaryRemaining !== null ? (
                      <span className="text-slate-700 font-medium">
                        ₹{round.primaryRemaining.toLocaleString('en-IN')}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Second Chit Winner (Row 27) */}
                  <td className="py-3 px-3 font-sans">
                    {round.secondWinner ? (
                      <span className="font-bold text-indigo-700 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-indigo-600" />
                        {round.secondWinner}
                      </span>
                    ) : round.isSecondChitEligible ? (
                      <span className="text-indigo-700 text-[10px] font-semibold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                        2nd Draw Eligible
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Second Chit Amount (Row 28) */}
                  <td className="py-3 px-3 text-right">
                    {round.secondAmount ? (
                      <span className="font-bold text-indigo-700">
                        ₹{round.secondAmount.toLocaleString('en-IN')}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Final Remaining (Row 29) */}
                  <td className="py-3 px-3 text-right">
                    {round.finalRemaining !== null ? (
                      <span className="font-bold text-emerald-700">
                        ₹{round.finalRemaining.toLocaleString('en-IN')}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-3 text-center font-sans">
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Done
                      </span>
                    ) : isCurrent ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold animate-pulse">
                        <Clock className="w-2.5 h-2.5" />
                        Next
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium">Upcoming</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
