import React, { useState } from 'react';
import {
  ShieldCheck,
  Eye,
  FileSpreadsheet,
  Lock,
  Unlock,
  RefreshCw,
  Search,
  ExternalLink,
} from 'lucide-react';
import { UserAuth } from '../types/chit';

interface NavbarProps {
  auth: UserAuth;
  onOpenUnlockModal: () => void;
  onLogout: () => void;
  onSync: () => void;
  isSyncing: boolean;
  onOpenSheetModal: () => void;
  onFocusSearch: () => void;
  spreadsheetUrl: string | null;
  lastSyncedAt: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  auth,
  onOpenUnlockModal,
  onLogout,
  onSync,
  isSyncing,
  onOpenSheetModal,
  onFocusSearch,
  spreadsheetUrl,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-emerald-600 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white font-bold text-xl">
            ₹
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-slate-900 tracking-tight leading-none">
                Sankranthi Chit
              </h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                20 Rounds
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              ₹50,000 / Month • Monthly Pool Ledger
            </p>
          </div>
        </div>

        {/* Center / Action Shortcuts */}
        <div className="flex items-center gap-2">
          <button
            onClick={onFocusSearch}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/70 text-slate-700 text-xs font-medium border border-slate-200 transition cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-indigo-600" />
            <span>Search Member Status</span>
            <kbd className="px-1.5 py-0.5 text-[10px] bg-white text-slate-500 rounded border border-slate-300">
              /
            </kbd>
          </button>

          <button
            onClick={onOpenSheetModal}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-200 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sheet1: "Sankranthi Chit"</span>
          </button>

          <button
            onClick={onSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 shadow-xs transition disabled:opacity-50 cursor-pointer"
            title="Sync latest entries directly from Google Sheets"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isSyncing ? 'animate-spin text-indigo-600' : 'text-slate-600'
              }`}
            />
            <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync'}</span>
          </button>
        </div>

        {/* Right: Role Badge & Manager Unlock / Lock */}
        <div className="flex items-center gap-2.5">
          {auth.role === 'admin' ? (
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <div className="hidden sm:block text-left">
                <span className="text-[11px] font-bold text-indigo-700 block leading-none">
                  Manager Mode
                </span>
                <span className="text-[10px] text-indigo-600/80 truncate max-w-[130px] block">
                  {auth.user?.displayName || auth.user?.email || 'Unlocked'}
                </span>
              </div>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs font-medium text-slate-600">Viewer Mode</span>
            </div>
          )}

          {auth.user ? (
            <div className="relative flex items-center gap-2">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1 pl-2 pr-2.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                  {(auth.user.displayName || auth.user.email || 'M')[0].toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-slate-800">
                  {auth.user.displayName || 'Manager'}
                </span>
              </button>

              <button
                onClick={onLogout}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition cursor-pointer"
                title="Lock Manager Mode"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Lock</span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-10 w-60 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {auth.user.displayName || 'Manager'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{auth.user.email}</p>
                    <span className="inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Authorized Manager
                    </span>
                  </div>

                  {spreadsheetUrl && (
                    <a
                      href={spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                      Open Google Sheet
                    </a>
                  )}

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Lock / Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenUnlockModal}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition active:scale-95 cursor-pointer"
              title="Unlock Manager Mode to record chit draws"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Manager Unlock</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
