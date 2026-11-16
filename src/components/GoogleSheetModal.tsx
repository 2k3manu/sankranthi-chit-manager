import React, { useState } from 'react';
import {
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  Link as LinkIcon,
} from 'lucide-react';
import { ChitFundData } from '../types/chit';

interface GoogleSheetModalProps {
  data: ChitFundData;
  isOpen: boolean;
  onClose: () => void;
  onSync: () => void;
  isSyncing: boolean;
  isAdmin: boolean;
  onLinkSpreadsheet?: (id: string) => Promise<void>;
}

export const GoogleSheetModal: React.FC<GoogleSheetModalProps> = ({
  data,
  isOpen,
  onClose,
  onSync,
  isSyncing,
  isAdmin,
  onLinkSpreadsheet,
}) => {
  const [customId, setCustomId] = useState(data.spreadsheetId || '');
  const [isLinking, setIsLinking] = useState(false);
  const [linkMsg, setLinkMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  React.useEffect(() => {
    if (data.spreadsheetId) {
      setCustomId(data.spreadsheetId);
    }
  }, [data.spreadsheetId]);

  if (!isOpen) return null;

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customId.trim() || !onLinkSpreadsheet) return;

    try {
      setIsLinking(true);
      await onLinkSpreadsheet(customId.trim());
      setLinkMsg({ type: 'success', text: 'Spreadsheet linked & synced successfully!' });
      setTimeout(() => setLinkMsg(null), 4000);
    } catch (err: any) {
      setLinkMsg({ type: 'error', text: err.message || 'Failed to link spreadsheet' });
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Google Sheet Integration Details
            </h3>
            <p className="text-xs text-slate-400">
              Connection to "{data.spreadsheetName}" ({data.sheetName})
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4 text-xs">
          {/* Status Details */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Spreadsheet Name:</span>
              <span className="font-semibold text-white">{data.spreadsheetName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Worksheet Tab:</span>
              <span className="font-semibold text-emerald-400">{data.sheetName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Sync Status:</span>
              {data.isLiveSynced ? (
                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Live Tracked ({data.totalRounds - data.monthsLeft} completed rounds)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-semibold text-amber-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Cached / Not Yet Synced from Google Sheet
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Monthly Auto-Sync Mode:</span>
              {data.publicAutoSyncAvailable ? (
                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  24/7 Automatic (No Login Required)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-semibold text-amber-300">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Manager Sign-In Only (Private Sheet)
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Rounds Range:</span>
              <span className="font-mono text-amber-400">Columns C to V (20 Rounds)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Primary Chit Rows:</span>
              <span className="font-mono text-slate-300">
                Row 24 (Winner) • Row 25 (Amount) • Row 26 (Balance)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Second Chit Rows:</span>
              <span className="font-mono text-slate-300">
                Row 27 (Winner) • Row 28 (Amount) • Row 29 (Final Rem)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Last Synced:</span>
              <span className="text-slate-300">
                {new Date(data.lastSyncedAt).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {data.spreadsheetId && !data.publicAutoSyncAvailable && (
            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-700/40 text-amber-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                To make the app sync <strong>automatically every month without needing sign-in</strong>, open your Google Sheet → click <strong>Share</strong> → change General access to <strong>"Anyone with the link" (Viewer)</strong>.
              </span>
            </div>
          )}

          {/* Direct Link */}
          {data.spreadsheetUrl ? (
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-300">
              <span className="font-medium">Spreadsheet linked ({data.spreadsheetId?.slice(0, 12)}...)</span>
              <a
                href={data.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition text-[11px]"
              >
                <span>Open in Google Sheets</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-700/40 text-amber-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                No Spreadsheet ID linked yet. Click <strong>Sync Now</strong> (or paste your Google Sheet URL below) to pull live entries from Google Sheets.
              </span>
            </div>
          )}

          {/* Admin Spreadsheet Link Input */}
          {isAdmin && (
            <form onSubmit={handleLink} className="pt-2 border-t border-slate-800 space-y-2">
              <label className="block text-slate-300 font-semibold">
                Google Sheet URL or ID (Manager Setting):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customId}
                  onChange={(e) => setCustomId(e.target.value)}
                  placeholder="Paste https://docs.google.com/spreadsheets/d/... URL or ID"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                />
                <button
                  type="submit"
                  disabled={isLinking}
                  className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition disabled:opacity-50"
                >
                  {isLinking ? 'Syncing...' : 'Link & Sync'}
                </button>
              </div>
              {linkMsg && (
                <p className={`font-semibold ${linkMsg.type === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {linkMsg.text}
                </p>
              )}
            </form>
          )}

          {/* Manual Re-sync button */}
          <div className="pt-2 flex items-center justify-between">
            <span className="text-slate-400 text-[11px]">
              Auto-syncs every 30s when connected to Google Sheets.
            </span>
            <button
              onClick={onSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
              <span>{isSyncing ? 'Synchronizing...' : 'Sync Now'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
