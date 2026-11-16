import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { ChitFundData } from '../types/chit';
import {
  DEFAULT_APPS_SCRIPT_URL,
  getSavedAppsScriptUrl,
  saveAppsScriptUrl,
} from '../services/chitFundService';

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
  const [appsScriptUrl, setAppsScriptUrl] = useState(getSavedAppsScriptUrl());
  const [isLinking, setIsLinking] = useState(false);
  const [linkMsg, setLinkMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (data.spreadsheetId) {
      setCustomId(data.spreadsheetId);
    }
  }, [data.spreadsheetId]);

  useEffect(() => {
    if (isOpen) {
      setAppsScriptUrl(getSavedAppsScriptUrl());
    }
  }, [isOpen]);

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

  const handleSaveAppsScript = (e: React.FormEvent) => {
    e.preventDefault();
    saveAppsScriptUrl(appsScriptUrl);
    setAppsScriptUrl(getSavedAppsScriptUrl());
    setLinkMsg({ type: 'success', text: 'Apps Script Web App URL saved!' });
    setTimeout(() => setLinkMsg(null), 3500);
  };

  const handleResetAppsScript = () => {
    saveAppsScriptUrl(DEFAULT_APPS_SCRIPT_URL);
    setAppsScriptUrl(DEFAULT_APPS_SCRIPT_URL);
    setLinkMsg({ type: 'success', text: 'Reset Apps Script URL to default.' });
    setTimeout(() => setLinkMsg(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Google Sheet & Apps Script Config
            </h3>
            <p className="text-xs text-slate-500">
              Direct standalone connection to "{data.spreadsheetName}" ({data.sheetName})
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4 text-xs">
          {/* Status Details */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Spreadsheet Name:</span>
              <span className="font-semibold text-slate-900">{data.spreadsheetName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Worksheet Tab:</span>
              <span className="font-semibold text-emerald-700">{data.sheetName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Sync Status:</span>
              {data.isLiveSynced ? (
                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Live Tracked ({data.totalRounds - data.monthsLeft} completed rounds)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Offline / Fallback Snapshot
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Write Bridge:</span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-indigo-700">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Apps Script Web App (Works via file://)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Rounds Range:</span>
              <span className="font-mono text-indigo-700 font-semibold">
                Columns C to V (20 Rounds)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Last Synced:</span>
              <span className="text-slate-700 font-medium">
                {new Date(data.lastSyncedAt).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Direct Link */}
          {data.spreadsheetUrl && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
              <span className="font-semibold">
                Spreadsheet linked ({data.spreadsheetId?.slice(0, 12)}...)
              </span>
              <a
                href={data.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition text-[11px]"
              >
                <span>Open in Google Sheets</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Admin Settings: Spreadsheet ID + Apps Script Web App URL */}
          {isAdmin && (
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <form onSubmit={handleLink} className="space-y-2">
                <label className="block text-slate-700 font-semibold">
                  Google Sheet URL or ID:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customId}
                    onChange={(e) => setCustomId(e.target.value)}
                    placeholder="Paste https://docs.google.com/spreadsheets/d/... URL or ID"
                    className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-mono"
                  />
                  <button
                    type="submit"
                    disabled={isLinking}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition disabled:opacity-50 cursor-pointer"
                  >
                    {isLinking ? 'Syncing...' : 'Link & Sync'}
                  </button>
                </div>
              </form>

              <form onSubmit={handleSaveAppsScript} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-700 font-semibold">
                    Apps Script Web App URL:
                  </label>
                  <button
                    type="button"
                    onClick={handleResetAppsScript}
                    className="text-[11px] text-indigo-600 hover:underline font-medium cursor-pointer"
                  >
                    Reset to Default
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={appsScriptUrl}
                    onChange={(e) => setAppsScriptUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-mono"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer"
                  >
                    Save URL
                  </button>
                </div>
              </form>

              {linkMsg && (
                <p
                  className={`font-semibold ${
                    linkMsg.type === 'error' ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {linkMsg.text}
                </p>
              )}
            </div>
          )}

          {/* Manual Re-sync button */}
          <div className="pt-2 flex items-center justify-between">
            <span className="text-slate-500 text-[11px]">
              Auto-syncs every 30s directly from Google Sheets.
            </span>
            <button
              onClick={onSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200 transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isSyncing ? 'animate-spin text-indigo-600' : 'text-slate-600'
                }`}
              />
              <span>{isSyncing ? 'Synchronizing...' : 'Sync Now'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
