import React, { useState } from 'react';
import {
  Coins,
  ShieldCheck,
  Eye,
  FileSpreadsheet,
  LogOut,
  RefreshCw,
  Search,
  ExternalLink,
} from 'lucide-react';
import { UserAuth } from '../types/chit';

interface NavbarProps {
  auth: UserAuth;
  onLogin: () => void;
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
  onLogin,
  onLogout,
  onSync,
  isSyncing,
  onOpenSheetModal,
  onFocusSearch,
  spreadsheetUrl,
  lastSyncedAt,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-bold text-xl">
            ₹
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-white tracking-tight leading-none">
                Sankranthi Chit
              </h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                20 Rounds
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              ₹50,000 / Month • Monthly Pool Ledger
            </p>
          </div>
        </div>

        {/* Center / Action Shortcuts */}
        <div className="flex items-center gap-2">
          <button
            onClick={onFocusSearch}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700/60 transition"
          >
            <Search className="w-3.5 h-3.5 text-amber-400" />
            <span>Search Member Status</span>
            <kbd className="px-1.5 py-0.5 text-[10px] bg-slate-900 text-slate-400 rounded border border-slate-700">
              /
            </kbd>
          </button>

          <button
            onClick={onOpenSheetModal}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 text-xs font-medium border border-emerald-800/40 transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sheet1: "Sankranthi Chit"</span>
          </button>

          <button
            onClick={onSync}
            disabled={isSyncing}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition disabled:opacity-50 ${
              auth.role === 'admin' && !auth.accessToken
                ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title={
              auth.role === 'admin' && !auth.accessToken
                ? 'Click to authorize & sync live data from Google Sheets'
                : 'Sync latest entries from Google Sheets'
            }
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : auth.role === 'admin' && !auth.accessToken ? 'text-amber-400' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">
              {isSyncing
                ? 'Syncing...'
                : auth.role === 'admin' && !auth.accessToken
                ? 'Sync Sheet'
                : 'Sync'}
            </span>
          </button>
        </div>

        {/* Right: Role Badge & Auth */}
        <div className="flex items-center gap-3">
          {auth.role === 'admin' ? (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <div className="hidden sm:block text-left">
                <span className="text-[11px] font-bold text-amber-400 block leading-none">
                  Manager Mode
                </span>
                <span className="text-[10px] text-amber-300/80 truncate max-w-[120px] block">
                  {auth.user?.email || 'Admin'}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-slate-800/60 border border-slate-700/60 px-2.5 py-1 rounded-lg">
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-medium text-slate-400">Viewer Mode</span>
            </div>
          )}

          {/* Google Sign In / Sign Out */}
          {auth.user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1 pl-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
              >
                {auth.user.photoURL ? (
                  <img
                    src={auth.user.photoURL}
                    alt={auth.user.displayName || 'User'}
                    className="w-7 h-7 rounded-full object-cover ring-1 ring-amber-400/40"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-xs">
                    {(auth.user.displayName || auth.user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="hidden sm:inline text-xs font-medium text-slate-200">
                  {auth.user.displayName?.split(' ')[0] || 'Account'}
                </span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-xl py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-800">
                    <p className="text-xs font-semibold text-white truncate">
                      {auth.user.displayName || 'Manager'}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">{auth.user.email}</p>
                    <span
                      className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded font-semibold ${
                        auth.role === 'admin'
                          ? 'bg-amber-400/20 text-amber-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {auth.role === 'admin' ? 'Authorized Admin' : 'Regular Member'}
                    </span>
                  </div>

                  {spreadsheetUrl && (
                    <a
                      href={spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                      Open Google Sheet
                    </a>
                  )}

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-rose-400 hover:bg-slate-800 flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Official Google Sign In Button */
            <button
              onClick={onLogin}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-800 font-medium text-xs shadow transition active:scale-95"
              title="Manager sign-in to edit chit draws"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              <span className="font-semibold text-slate-700">Manager Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
