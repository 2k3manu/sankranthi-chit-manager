import { ChitFundData, DrawSubmission } from '../types/chit';
import {
  computeChitFundData,
  DEFAULT_SPREADSHEET_ID,
  INITIAL_ROUND_INPUTS,
  RAW_MEMBERS,
  RawRoundInput,
  ROUND_DATES,
} from '../data/initialChitData';
import {
  extractSpreadsheetInfo,
  parseAmountCell,
  parseWinnerCell,
} from '../utils/sheetParser';

export const DEFAULT_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbwZvMwD_7YCjqdjHVR5oKN9wO366Vn-LMuVic5Xd894fN8I3xXWTmn_8hTXNEjQ1h4H/exec';

const SAVED_SHEET_ID_KEY = 'sankranthi_chit_sheet_id';
const SAVED_SHEET_NAME_KEY = 'sankranthi_chit_sheet_name';
const SAVED_APPS_SCRIPT_URL_KEY = 'sankranthi_chit_apps_script_url';
const OFFLINE_CACHE_KEY = 'sankranthi_chit_offline_cache_v1';

interface OfflineSnapshot {
  spreadsheetId: string;
  spreadsheetName: string;
  sheetName: string;
  roundInputs: RawRoundInput[];
  customDates?: string[];
  customMembers?: { slNo: number; name: string }[];
  lastSyncedAt: string;
}

export function getSavedSpreadsheetId(): string {
  try {
    const saved =
      typeof window !== 'undefined' ? window.localStorage.getItem(SAVED_SHEET_ID_KEY) : null;
    return saved || DEFAULT_SPREADSHEET_ID;
  } catch {
    return DEFAULT_SPREADSHEET_ID;
  }
}

export function getSavedSheetName(): string {
  try {
    const saved =
      typeof window !== 'undefined' ? window.localStorage.getItem(SAVED_SHEET_NAME_KEY) : null;
    return saved || 'Sheet1';
  } catch {
    return 'Sheet1';
  }
}

export function saveSpreadsheetId(idOrUrl: string | null, sheetName?: string): string | null {
  const parsed = idOrUrl ? extractSpreadsheetInfo(idOrUrl) : { spreadsheetId: null, gid: null };
  const cleanId = parsed.spreadsheetId || idOrUrl;
  try {
    if (typeof window !== 'undefined') {
      if (cleanId) window.localStorage.setItem(SAVED_SHEET_ID_KEY, cleanId);
      if (sheetName) window.localStorage.setItem(SAVED_SHEET_NAME_KEY, sheetName);
    }
  } catch {
    // ignore storage errors
  }
  return cleanId;
}

export function getSavedAppsScriptUrl(): string {
  try {
    const saved =
      typeof window !== 'undefined'
        ? window.localStorage.getItem(SAVED_APPS_SCRIPT_URL_KEY)
        : null;
    return saved && saved.trim() ? saved.trim() : DEFAULT_APPS_SCRIPT_URL;
  } catch {
    return DEFAULT_APPS_SCRIPT_URL;
  }
}

export function saveAppsScriptUrl(url: string) {
  try {
    if (typeof window !== 'undefined') {
      const trimmed = url.trim();
      if (trimmed) {
        window.localStorage.setItem(SAVED_APPS_SCRIPT_URL_KEY, trimmed);
      } else {
        window.localStorage.removeItem(SAVED_APPS_SCRIPT_URL_KEY);
      }
    }
  } catch {
    // ignore storage errors
  }
}

function loadOfflineSnapshot(): OfflineSnapshot | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(OFFLINE_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OfflineSnapshot;
  } catch {
    return null;
  }
}

function saveOfflineSnapshot(snapshot: OfflineSnapshot) {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(snapshot));
    }
  } catch {
    // ignore storage errors
  }
}

interface GvizCell {
  v?: unknown;
  f?: string;
}

interface GvizTableResponse {
  status?: string;
  errors?: { detailed_message?: string; message?: string }[];
  table?: {
    rows?: { c?: (GvizCell | null)[] }[];
  };
}

let jsonpCounter = 0;

/**
 * Fetches a single range from Google Sheets GViz endpoint via JSONP (<script> tag).
 * Works directly on file://, http://, and https:// without CORS failures.
 */
function fetchGvizRangeJsonp(
  spreadsheetId: string,
  sheetName: string,
  range: string,
  timeoutMs = 8000
): Promise<(GvizCell | null)[][]> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('Document unavailable'));
      return;
    }

    const cbName = `__chitGvizCb_${Date.now()}_${++jsonpCounter}`;
    const script = document.createElement('script');
    let settled = false;

    const cleanup = () => {
      try {
        delete (window as any)[cbName];
      } catch {
        (window as any)[cbName] = undefined;
      }
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(`Timeout reading ${range} from Google Sheets`));
    }, timeoutMs);

    (window as any)[cbName] = (payload: GvizTableResponse) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();

      if (!payload || payload.status === 'error') {
        const msg =
          payload?.errors?.[0]?.detailed_message ||
          payload?.errors?.[0]?.message ||
          'Google Sheets GViz returned an error';
        reject(new Error(msg));
        return;
      }

      const rows = (payload.table?.rows || []).map((r) => r.c || []);
      resolve(rows);
    };

    const tqx = encodeURIComponent(`responseHandler:${cbName}`);
    const sheetParam = encodeURIComponent(sheetName);
    const rangeParam = encodeURIComponent(range);
    script.src = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=${tqx}&headers=0&sheet=${sheetParam}&range=${rangeParam}&_=${Date.now()}`;
    script.async = true;

    script.onerror = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      reject(new Error('Network error loading Google Sheet data'));
    };

    document.head.appendChild(script);
  });
}

function cellDisplay(cell: GvizCell | null | undefined): string {
  if (!cell) return '';
  if (cell.f !== undefined && cell.f !== null) return String(cell.f).trim();
  if (cell.v !== undefined && cell.v !== null) return String(cell.v).trim();
  return '';
}

function cellRaw(cell: GvizCell | null | undefined): unknown {
  if (!cell) return undefined;
  return cell.v !== undefined && cell.v !== null ? cell.v : cell.f;
}

/**
 * Fetches live chit fund data directly from the public Google Sheet via GViz JSONP
 * (no backend server required; works locally from file:// and online).
 * Falls back cleanly to cached snapshot / initial data when offline.
 */
export async function fetchChitFundData(
  _forceRefresh = false,
  overrideSpreadsheetIdOrUrl?: string | null
): Promise<ChitFundData> {
  const parsedOverride = overrideSpreadsheetIdOrUrl
    ? extractSpreadsheetInfo(overrideSpreadsheetIdOrUrl).spreadsheetId
    : null;
  const spreadsheetId = parsedOverride || getSavedSpreadsheetId();
  const sheetName = getSavedSheetName();

  try {
    const [
      datesRows,
      membersRows,
      primaryWinnerRows,
      primaryAmountRows,
      secondWinnerRows,
      secondAmountRows,
    ] = await Promise.all([
      fetchGvizRangeJsonp(spreadsheetId, sheetName, 'A2:V2'),
      fetchGvizRangeJsonp(spreadsheetId, sheetName, 'A3:B22'),
      fetchGvizRangeJsonp(spreadsheetId, sheetName, 'A24:V24'),
      fetchGvizRangeJsonp(spreadsheetId, sheetName, 'A25:V25'),
      fetchGvizRangeJsonp(spreadsheetId, sheetName, 'A27:V27'),
      fetchGvizRangeJsonp(spreadsheetId, sheetName, 'A28:V28'),
    ]);

    const dateRow = datesRows[0] || [];
    const customDates: string[] = [];
    for (let i = 0; i < 20; i++) {
      const d = cellDisplay(dateRow[2 + i]);
      if (d) customDates[i] = d;
    }

    const customMembers: { slNo: number; name: string }[] = [];
    membersRows.forEach((row) => {
      const sl = Number(cellDisplay(row[0]));
      const name = cellDisplay(row[1]);
      if (Number.isInteger(sl) && sl >= 1 && sl <= 20 && name) {
        customMembers.push({ slNo: sl, name });
      }
    });

    const pWinRow = primaryWinnerRows[0] || [];
    const pAmtRow = primaryAmountRows[0] || [];
    const sWinRow = secondWinnerRows[0] || [];
    const sAmtRow = secondAmountRows[0] || [];

    const roundInputs: RawRoundInput[] = [];
    for (let r = 1; r <= 20; r++) {
      const colIdx = 1 + r; // Column C = index 2 for round 1
      const primaryWinner = parseWinnerCell(cellDisplay(pWinRow[colIdx]));
      const primaryAmount = parseAmountCell(cellRaw(pAmtRow[colIdx]));
      const secondWinner = parseWinnerCell(cellDisplay(sWinRow[colIdx]));
      const secondAmount = parseAmountCell(cellRaw(sAmtRow[colIdx]));

      roundInputs.push({
        roundNumber: r,
        primaryWinner,
        primaryAmount,
        secondWinner,
        secondAmount,
      });
    }

    const nowIso = new Date().toISOString();
    saveSpreadsheetId(spreadsheetId, sheetName);
    saveOfflineSnapshot({
      spreadsheetId,
      spreadsheetName: 'Sankranthi Chit',
      sheetName,
      roundInputs,
      customDates: customDates.length > 0 ? customDates : ROUND_DATES,
      customMembers: customMembers.length > 0 ? customMembers : RAW_MEMBERS,
      lastSyncedAt: nowIso,
    });

    return computeChitFundData(roundInputs, spreadsheetId, nowIso, {
      spreadsheetName: 'Sankranthi Chit',
      sheetName,
      customDates: customDates.length > 0 ? customDates : undefined,
      customMembers: customMembers.length > 0 ? customMembers : undefined,
      isLiveSynced: true,
      publicAutoSyncAvailable: true,
      syncSource: 'google_sheets_public',
      syncError: null,
    });
  } catch (err: any) {
    const cached = loadOfflineSnapshot();
    if (cached && cached.spreadsheetId === spreadsheetId) {
      return computeChitFundData(cached.roundInputs, cached.spreadsheetId, cached.lastSyncedAt, {
        spreadsheetName: cached.spreadsheetName || 'Sankranthi Chit',
        sheetName: cached.sheetName || sheetName,
        customDates: cached.customDates,
        customMembers: cached.customMembers,
        isLiveSynced: false,
        publicAutoSyncAvailable: false,
        syncSource: 'cached',
        syncError: err?.message || 'Offline mode — showing cached ledger',
      });
    }

    return computeChitFundData(
      INITIAL_ROUND_INPUTS,
      spreadsheetId,
      new Date().toISOString(),
      {
        spreadsheetName: 'Sankranthi Chit',
        sheetName,
        isLiveSynced: false,
        publicAutoSyncAvailable: false,
        syncSource: 'initial',
        syncError: err?.message || 'Offline mode — showing built-in fallback ledger',
      }
    );
  }
}

/**
 * Writes a chit draw directly to Google Sheets via the Google Apps Script Web App bridge.
 * Uses Content-Type: text/plain;charset=utf-8 to avoid CORS preflight failures from file://.
 */
export async function submitChitDraw(
  submission: DrawSubmission,
  passcode: string,
  currentData?: ChitFundData
): Promise<{ success: boolean; data: ChitFundData; message: string }> {
  const { roundNumber, chitType, winnerName, amountReceived } = submission;

  if (!roundNumber || roundNumber < 1 || roundNumber > 20) {
    throw new Error('Invalid round number (1-20)');
  }
  if (!winnerName || !winnerName.trim()) {
    throw new Error('Winner name is required');
  }
  const amount = Number(amountReceived);
  if (isNaN(amount) || amount <= 0 || amount > 50000) {
    throw new Error('Amount received must be between ₹1 and ₹50,000');
  }
  if (!passcode || !passcode.trim()) {
    throw new Error('Manager passcode is required. Please unlock Manager Mode.');
  }

  const baseData = currentData || (await fetchChitFundData(true));

  // Duplicate winner validation
  if (winnerName !== 'Agent' && !baseData.availableMembers.includes(winnerName)) {
    const alreadyWon = baseData.pastWinners.find(
      (w) => w.name.toLowerCase().trim() === winnerName.toLowerCase().trim()
    );
    if (alreadyWon && (alreadyWon.roundNumber !== roundNumber || alreadyWon.chitType !== chitType)) {
      throw new Error(
        `Member "${winnerName}" has already taken their chit in Round ${alreadyWon.roundNumber}!`
      );
    }
  }

  const appsScriptUrl = getSavedAppsScriptUrl();
  const payload = {
    passcode: passcode.trim(),
    roundIndex: roundNumber,
    winner: winnerName.trim(),
    amount,
    isSecondChit: chitType === 'second',
  };

  const response = await fetch(appsScriptUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    redirect: 'follow',
    body: JSON.stringify(payload),
  });

  const rawText = await response.text();
  let parsedResponse: any = null;
  try {
    parsedResponse = JSON.parse(rawText);
  } catch {
    // Non-JSON response fallback
  }

  if (!response.ok) {
    throw new Error(
      parsedResponse?.error ||
        parsedResponse?.message ||
        `Apps Script bridge returned HTTP ${response.status}`
    );
  }

  if (parsedResponse && (parsedResponse.success === false || parsedResponse.error)) {
    throw new Error(
      parsedResponse.error || parsedResponse.message || 'Apps Script rejected the submission.'
    );
  }

  // Wait briefly for Google Sheets formulas/GViz cache, then re-fetch live sheet via GViz JSONP
  await new Promise((r) => setTimeout(r, 600));
  const refreshedData = await fetchChitFundData(true);

  return {
    success: true,
    data: refreshedData,
    message: `Recorded ${chitType === 'primary' ? 'Primary Chit' : 'Second Chit'} for Round ${roundNumber}: ${winnerName} (₹${amount.toLocaleString('en-IN')}) & synced from Google Sheet!`,
  };
}
