import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardStats } from './components/DashboardStats';
import { SecondChitAlert } from './components/SecondChitAlert';
import { ChitEntryForm } from './components/ChitEntryForm';
import { MemberStatusSearch } from './components/MemberStatusSearch';
import { RoundsTable } from './components/RoundsTable';
import { GoogleSheetModal } from './components/GoogleSheetModal';
import {
  fetchChitFundData,
  saveSpreadsheetId,
  submitChitDraw,
  syncWithGoogleSheets,
} from './services/chitFundService';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  isUserAdmin,
} from './services/auth';
import { ChitFundData, DrawSubmission, UserAuth } from './types/chit';
import { computeChitFundData } from './data/initialChitData';
import { CheckCircle2, AlertCircle, Sparkles, FileSpreadsheet, ShieldCheck } from 'lucide-react';

export default function App() {
  const [data, setData] = useState<ChitFundData>(computeChitFundData());
  const [auth, setAuth] = useState<UserAuth>({
    user: null,
    role: 'viewer',
    accessToken: null,
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSheetModal, setShowSheetModal] = useState(false);
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

  // 1. Initialize Auth and Load Data
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token, isAdmin) => {
        setAuth({
          user: {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
          },
          role: isAdmin ? 'admin' : 'viewer',
          accessToken: token,
        });
      },
      () => {
        setAuth({ user: null, role: 'viewer', accessToken: null });
      }
    );

    // Load initial chit fund data from backend
    loadData();

    return () => unsubscribe();
  }, []);

  const loadData = async (forceRefresh = false) => {
    try {
      const freshData = await fetchChitFundData(forceRefresh);
      setData(freshData);
      if (freshData.spreadsheetId) {
        saveSpreadsheetId(freshData.spreadsheetId);
      }
      return freshData;
    } catch (err) {
      console.error('Failed to load data:', err);
      return null;
    }
  };

  // Persist linked spreadsheetId locally (public non-secret ID) for restart recovery
  useEffect(() => {
    if (data.spreadsheetId) {
      saveSpreadsheetId(data.spreadsheetId);
    }
  }, [data.spreadsheetId]);

  // 1b. Automatic background tracking from Google Sheets (every 30s + on tab focus)
  useEffect(() => {
    const runAutoSync = async () => {
      const token = auth.accessToken || getAccessToken();
      if (token) {
        try {
          const res = await syncWithGoogleSheets(token, data.spreadsheetId);
          if (res.data) setData(res.data);
        } catch (err: any) {
          // If token expired, clear accessToken so UI prompts re-auth
          if (err.message?.includes('401') || err.message?.toLowerCase().includes('credential')) {
            setAuth((prev) => ({ ...prev, accessToken: null }));
          }
        }
      } else {
        await loadData(false);
      }
    };

    const interval = setInterval(runAutoSync, 30_000);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        if (now - lastFocusSyncRef.current > 10_000) {
          lastFocusSyncRef.current = now;
          runAutoSync();
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
  }, [auth.accessToken, data.spreadsheetId]);

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

  // 3. Handle Google Sign-in
  const handleLogin = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setAuth({
          user: {
            uid: result.user.uid,
            email: result.user.email,
            displayName: result.user.displayName,
            photoURL: result.user.photoURL,
          },
          role: result.isAdmin ? 'admin' : 'viewer',
          accessToken: result.accessToken,
        });

        if (result.isAdmin) {
          showToast(
            'success',
            `Signed in as Manager (${result.user.email}). Syncing Google Sheet...`
          );
          await handleSyncWithToken(result.accessToken);
        } else {
          showToast(
            'info',
            `Signed in as ${result.user.email}. Regular members have Viewer access.`
          );
        }
      }
    } catch (err: any) {
      console.error('Sign-in failed:', err);
      showToast('error', err.message || 'Google sign-in was cancelled or failed.');
    }
  };

  const handleLogout = async () => {
    await logout();
    setAuth({ user: null, role: 'viewer', accessToken: null });
    showToast('info', 'Signed out. Returned to Public Viewer Mode.');
  };

  // 4. Handle Google Sheets Sync
  const handleSyncWithToken = async (token: string, silent = false) => {
    try {
      setIsSyncing(true);
      const res = await syncWithGoogleSheets(token, data.spreadsheetId);
      if (res.data) {
        setData(res.data);
      }
      if (!silent) {
        showToast('success', res.message || 'Synced with Google Sheet "Sankranthi Chit"!');
      }
    } catch (err: any) {
      console.warn('Sync warning:', err);
      if (err.message?.includes('401') || err.message?.toLowerCase().includes('credential')) {
        setAuth((prev) => ({ ...prev, accessToken: null }));
      }
      showToast('error', `Sheet sync error: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleManualSync = async () => {
    const token = auth.accessToken || getAccessToken();
    if (!token) {
      // If signed in as Admin without an active OAuth token (e.g., after page reload),
      // trigger Google Sign-In popup on this user click to restore Google Sheets access!
      if (auth.role === 'admin') {
        await handleLogin();
        return;
      }

      // Public viewer refresh: attempt server-side public CSV refresh
      try {
        setIsSyncing(true);
        const fresh = await fetchChitFundData(true);
        setData(fresh);
        if (fresh.isLiveSynced) {
          showToast(
            'success',
            `Synced ${fresh.totalRounds - fresh.monthsLeft} completed rounds from Google Sheet!`
          );
        } else {
          showToast(
            'info',
            `Showing saved ledger (${fresh.totalRounds - fresh.monthsLeft} rounds). Manager sign-in needed to pull directly from private Google Sheet.`
          );
        }
      } catch (err: any) {
        showToast('error', 'Failed to refresh data: ' + err.message);
      } finally {
        setIsSyncing(false);
      }
      return;
    }
    await handleSyncWithToken(token);
  };

  // 5. Handle Chit Draw Submission
  const handleSubmitDraw = async (submission: DrawSubmission) => {
    let token = auth.accessToken || getAccessToken();
    if (!token) {
      // Attempt re-auth if manager clicked submit after a page reload
      const result = await googleSignIn();
      if (!result?.accessToken) {
        throw new Error('Manager authorization required. Please sign in with Google.');
      }
      token = result.accessToken;
      setAuth({
        user: {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
        },
        role: result.isAdmin ? 'admin' : 'viewer',
        accessToken: result.accessToken,
      });
    }

    setIsSubmitting(true);
    try {
      const res = await submitChitDraw(submission, token);
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

  const handleLinkSpreadsheet = async (id: string) => {
    let token = auth.accessToken || getAccessToken();
    if (!token) {
      const result = await googleSignIn();
      if (!result?.accessToken) {
        throw new Error('Sign in as manager required');
      }
      token = result.accessToken;
      setAuth({
        user: {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
        },
        role: result.isAdmin ? 'admin' : 'viewer',
        accessToken: result.accessToken,
      });
    }

    const res = await fetch('/api/chit/link-spreadsheet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ spreadsheetId: id }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to link sheet');
    }

    const json = await res.json();
    if (json.data) {
      setData(json.data);
    }
    showToast('success', json.message);
  };

  const completedRoundsCount = data.totalRounds - data.monthsLeft;
  const adminNeedsReauth =
    auth.role === 'admin' && !auth.accessToken && !data.publicAutoSyncAvailable;
  const isActivelySynced = Boolean(
    data.isLiveSynced && (data.publicAutoSyncAvailable || !adminNeedsReauth)
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        auth={auth}
        onLogin={handleLogin}
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
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-xs font-semibold ${
              notification.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-200'
                : notification.type === 'error'
                ? 'bg-rose-950/95 border-rose-500/50 text-rose-200'
                : 'bg-slate-900/95 border-slate-700 text-slate-200'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Banner with Real Sheet Connection & Sync Status */}
        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-xs border ${
            isActivelySynced
              ? 'bg-slate-900/80 border-slate-800/80 text-slate-400'
              : 'bg-amber-950/25 border-amber-500/30 text-amber-200'
          }`}
        >
          <div className="flex flex-wrap items-center gap-2">
            {isActivelySynced ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-300 font-medium">
                  {data.publicAutoSyncAvailable ? 'Auto-Sync Active:' : 'Live Google Sheet:'}
                </span>
                <strong className="text-white">"{data.spreadsheetName}"</strong>
                <span className="text-slate-500">•</span>
                <span className="text-slate-300">{data.sheetName}</span>
                <span className="text-slate-500">•</span>
                <span className="text-emerald-400 font-medium">
                  Synced {new Date(data.lastSyncedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="font-medium">
                  {adminNeedsReauth
                    ? 'Private sheet paused after reload — click Sync (or share sheet as "Anyone with link: Viewer" for zero-login monthly auto-sync):'
                    : `Showing saved ledger (${completedRoundsCount} rounds) — connect Google Sheet for automatic monthly updates`}
                </span>
                <button
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="ml-1 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] transition cursor-pointer disabled:opacity-50"
                >
                  {isSyncing ? 'Syncing...' : 'Sync from Google Sheet'}
                </button>
                {auth.role === 'admin' && (
                  <button
                    onClick={() => setShowSheetModal(true)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] border border-slate-700 transition cursor-pointer"
                  >
                    Sheet Settings
                  </button>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <span>
              Next Scheduled Draw: <strong className="text-amber-400">Round {data.currentRoundNumber} (Col {String.fromCharCode(65 + 1 + data.currentRoundNumber)})</strong>
            </span>
            <span className="text-slate-600">|</span>
            <span>
              Collection: <strong className="text-slate-200">₹50,000 / month</strong>
            </span>
          </div>
        </div>

        {/* 1. Core Dashboard Stats: Months Left, Remaining Balance, Pool, Disbursed */}
        <DashboardStats data={data} />

        {/* 2. Second Chit Intelligence Alert Banner */}
        <SecondChitAlert
          data={data}
          isAdmin={auth.role === 'admin'}
          onSelectSecondChitRound={handleSelectSecondChitRound}
        />

        {/* 3. Chit Entry Form (Manager Only / Role Protected) */}
        <div ref={formSectionRef}>
          <ChitEntryForm
            data={data}
            isAdmin={auth.role === 'admin'}
            onLogin={handleLogin}
            onSubmit={handleSubmitDraw}
            isSubmitting={isSubmitting}
            preselectedRound={preselectedRound}
            onClearPreselectedRound={() => setPreselectedRound(null)}
          />
        </div>

        {/* 4. Member Status Search (Public Member View: B3:B22) */}
        <MemberStatusSearch data={data} searchRef={searchInputRef} />

        {/* 5. Full 20-Round Monthly Ledger (Columns C to V, Rows 23-29) */}
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
      <footer className="mt-auto border-t border-slate-800 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            © 2026 Sankranthi Chit Fund • 20 Members • ₹50,000 Monthly Pool Ledger
          </p>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span>Google Sheets Integration: Active</span>
            <span>•</span>
            <button
              onClick={() => setShowSheetModal(true)}
              className="hover:text-amber-400 underline underline-offset-2"
            >
              Spreadsheet Config
            </button>
          </div>
        </div>
      </footer>

      {/* Google Sheet Integration Details Modal */}
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
