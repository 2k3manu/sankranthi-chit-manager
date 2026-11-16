import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardStats } from './components/DashboardStats';
import { SecondChitAlert } from './components/SecondChitAlert';
import { ChitEntryForm } from './components/ChitEntryForm';
import { MemberStatusSearch } from './components/MemberStatusSearch';
import { RoundsTable } from './components/RoundsTable';
import { GoogleSheetModal } from './components/GoogleSheetModal';
import { ManagerUnlockModal } from './components/ManagerUnlockModal';
import {
  fetchChitFundData,
  saveSpreadsheetId,
  submitChitDraw,
} from './services/chitFundService';
import {
  initAuth,
  unlockManager,
  logout,
  getManagerPasscode,
} from './services/auth';
import { ChitFundData, DrawSubmission, UserAuth } from './types/chit';
import { computeChitFundData, DEFAULT_SPREADSHEET_ID } from './data/initialChitData';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [data, setData] = useState<ChitFundData>(() =>
    computeChitFundData(undefined, DEFAULT_SPREADSHEET_ID)
  );
  const [auth, setAuth] = useState<UserAuth>({
    user: null,
    role: 'viewer',
    accessToken: null,
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSheetModal, setShowSheetModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [preselectedRound, setPreselectedRound] = useState<number | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const formSectionRef = useRef<HTMLDivElement | null>(null);
  const lastFocusSyncRef = useRef<number>(0);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 5000);
  };

  // 1. Restore Manager Unlock session & Load Live Sheet Data via GViz JSONP
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, passcode, isAdmin) => {
        setAuth({
          user,
          role: isAdmin ? 'admin' : 'viewer',
          accessToken: passcode,
        });
      },
      () => {
        setAuth({ user: null, role: 'viewer', accessToken: null });
      }
    );

    loadData();

    return () => unsubscribe();
  }, []);

  const loadData = async (forceRefresh = false, overrideId?: string | null) => {
    try {
      const freshData = await fetchChitFundData(forceRefresh, overrideId);
      setData(freshData);
      if (freshData.spreadsheetId) {
        saveSpreadsheetId(freshData.spreadsheetId, freshData.sheetName);
      }
      return freshData;
    } catch (err) {
      console.error('Failed to load data:', err);
      return null;
    }
  };

  // 1b. Automatic background tracking directly from Google Sheets (every 30s + on tab focus)
  useEffect(() => {
    const interval = setInterval(() => {
      loadData(false);
    }, 30_000);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        if (now - lastFocusSyncRef.current > 10_000) {
          lastFocusSyncRef.current = now;
          loadData(false);
        }
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, []);

  // 2. Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 3. Handle Manager Unlock / Lock
  const handleUnlock = (profileId: string, passcode: string) => {
    const result = unlockManager(profileId, passcode);
    setAuth({
      user: result.user,
      role: 'admin',
      accessToken: result.accessToken,
    });
    showToast(
      'success',
      `Manager Mode unlocked for ${result.user.displayName} (${result.user.email}).`
    );
  };

  const handleLogout = async () => {
    await logout();
    setAuth({ user: null, role: 'viewer', accessToken: null });
    showToast('info', 'Manager Mode locked. Returned to Public Viewer Mode.');
  };

  // 4. Handle Manual Sync via GViz JSONP
  const handleManualSync = async () => {
    try {
      setIsSyncing(true);
      const fresh = await fetchChitFundData(true);
      setData(fresh);
      if (fresh.isLiveSynced) {
        showToast(
          'success',
          `Synced ${fresh.totalRounds - fresh.monthsLeft} completed rounds directly from Google Sheet!`
        );
      } else {
        showToast(
          'info',
          `Offline/cached ledger (${fresh.totalRounds - fresh.monthsLeft} rounds). Connect to internet to pull latest Google Sheet entries.`
        );
      }
    } catch (err: any) {
      showToast('error', 'Failed to refresh data: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // 5. Handle Chit Draw Submission via Apps Script Web App POST Bridge
  const handleSubmitDraw = async (submission: DrawSubmission) => {
    const passcode = auth.accessToken || getManagerPasscode();
    if (!passcode) {
      setShowUnlockModal(true);
      throw new Error('Manager authorization required. Please unlock Manager Mode.');
    }

    setIsSubmitting(true);
    try {
      const res = await submitChitDraw(submission, passcode, data);
      if (res.data) {
        setData(res.data);
      }
      showToast('success', res.message);
    } catch (err: any) {
      showToast('error', err.message || 'Submission failed.');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectSecondChitRound = (roundNumber: number) => {
    setPreselectedRound(roundNumber);
    formSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFocusSearch = () => {
    searchInputRef.current?.focus();
    searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleLinkSpreadsheet = async (idOrUrl: string) => {
    const cleanId = saveSpreadsheetId(idOrUrl);
    if (!cleanId) {
      throw new Error('Please enter a valid Google Sheet URL or Spreadsheet ID.');
    }
    const fresh = await loadData(true, cleanId);
    if (fresh) {
      showToast(
        'success',
        `Linked & synced "${fresh.spreadsheetName}" (${fresh.totalRounds - fresh.monthsLeft} completed rounds)!`
      );
    }
  };

  const completedRoundsCount = data.totalRounds - data.monthsLeft;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        auth={auth}
        onOpenUnlockModal={() => setShowUnlockModal(true)}
        onLogout={handleLogout}
        onSync={handleManualSync}
        isSyncing={isSyncing}
        onOpenSheetModal={() => setShowSheetModal(true)}
        onFocusSearch={handleFocusSearch}
        spreadsheetUrl={data.spreadsheetUrl}
        lastSyncedAt={data.lastSyncedAt}
      />

      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : notification.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Banner with Direct Browser Sheet Sync Status */}
        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-xs border shadow-xs ${
            data.isLiveSynced
              ? 'bg-white border-slate-200 text-slate-600'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex flex-wrap items-center gap-2">
            {data.isLiveSynced ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-slate-600 font-medium">Auto-Sync Active:</span>
                <strong className="text-slate-900">"{data.spreadsheetName}"</strong>
                <span className="text-slate-400">•</span>
                <span className="text-slate-600 font-medium">{data.sheetName}</span>
                <span className="text-slate-400">•</span>
                <span className="text-emerald-700 font-semibold">
                  Synced{' '}
                  {new Date(data.lastSyncedAt).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="font-medium">
                  Offline / Cached Ledger ({completedRoundsCount} rounds) — connect to internet for
                  live Google Sheet updates
                </span>
                <button
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="ml-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] transition cursor-pointer disabled:opacity-50"
                >
                  {isSyncing ? 'Syncing...' : 'Retry Sync'}
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-3 text-slate-600">
            <span>
              Next Scheduled Draw:{' '}
              <strong className="text-indigo-700">
                Round {data.currentRoundNumber} (Col{' '}
                {String.fromCharCode(65 + 1 + data.currentRoundNumber)})
              </strong>
            </span>
            <span className="text-slate-300">|</span>
            <span>
              Collection: <strong className="text-slate-900">₹50,000 / month</strong>
            </span>
          </div>
        </div>

        {/* 1. Core Dashboard Stats */}
        <DashboardStats data={data} />

        {/* 2. Second Chit Intelligence Alert Banner */}
        <SecondChitAlert
          data={data}
          isAdmin={auth.role === 'admin'}
          onSelectSecondChitRound={handleSelectSecondChitRound}
        />

        {/* 3. Chit Entry Form (Manager Only / Apps Script Bridge) */}
        <div ref={formSectionRef}>
          <ChitEntryForm
            data={data}
            isAdmin={auth.role === 'admin'}
            onUnlock={handleUnlock}
            onSubmit={handleSubmitDraw}
            isSubmitting={isSubmitting}
            preselectedRound={preselectedRound}
            onClearPreselectedRound={() => setPreselectedRound(null)}
          />
        </div>

        {/* 4. Member Status Search */}
        <MemberStatusSearch data={data} searchRef={searchInputRef} />

        {/* 5. Full 20-Round Monthly Ledger */}
        <RoundsTable
          data={data}
          isAdmin={auth.role === 'admin'}
          onSelectRound={(r) => {
            setPreselectedRound(r);
            formSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
          }}
        />
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 Sankranthi Chit Fund • 20 Members • ₹50,000 Monthly Pool Ledger</p>
          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span>Apps Script Bridge: Active</span>
            <span>•</span>
            <button
              onClick={() => setShowSheetModal(true)}
              className="hover:text-indigo-600 underline underline-offset-2 font-medium cursor-pointer"
            >
              Spreadsheet Config
            </button>
          </div>
        </div>
      </footer>

      {/* Manager Unlock Modal */}
      <ManagerUnlockModal
        isOpen={showUnlockModal}
        onClose={() => setShowUnlockModal(false)}
        onUnlock={handleUnlock}
      />

      {/* Google Sheet & Apps Script Integration Details Modal */}
      <GoogleSheetModal
        data={data}
        isOpen={showSheetModal}
        onClose={() => setShowSheetModal(false)}
        onSync={handleManualSync}
        isSyncing={isSyncing}
        isAdmin={auth.role === 'admin'}
        onLinkSpreadsheet={handleLinkSpreadsheet}
      />
    </div>
  );
}
