import { ChitFundData, DrawSubmission } from '../types/chit';
import { computeChitFundData, RawRoundInput } from '../data/initialChitData';

const SAVED_SHEET_ID_KEY = 'sankranthi_chit_sheet_id';

export function getSavedSpreadsheetId(): string | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem(SAVED_SHEET_ID_KEY) : null;
  } catch {
    return null;
  }
}

export function saveSpreadsheetId(id: string | null) {
  try {
    if (typeof window !== 'undefined' && id) {
      window.localStorage.setItem(SAVED_SHEET_ID_KEY, id);
    }
  } catch {
    // ignore storage errors
  }
}

export async function fetchChitFundData(forceRefresh = false): Promise<ChitFundData> {
  try {
    const params = new URLSearchParams();
    if (forceRefresh) params.set('refresh', '1');
    const savedId = getSavedSpreadsheetId();
    if (savedId) params.set('spreadsheetId', savedId);
    const qs = params.toString();
    const res = await fetch(qs ? `/api/chit/data?${qs}` : '/api/chit/data');
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.warn('Backend /api/chit/data not responding, using computed defaults:', err);
  }
  return computeChitFundData();
}

export async function syncWithGoogleSheets(
  accessToken: string,
  spreadsheetId?: string | null
): Promise<{ success: boolean; data: ChitFundData; message: string }> {
  const res = await fetch('/api/chit/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ spreadsheetId }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Sync failed with HTTP ${res.status}`);
  }

  return await res.json();
}

export async function submitChitDraw(
  submission: DrawSubmission,
  accessToken: string
): Promise<{ success: boolean; data: ChitFundData; message: string }> {
  const res = await fetch('/api/chit/submit-draw', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(submission),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Submit failed with HTTP ${res.status}`);
  }

  return await res.json();
}

export async function searchDriveForSpreadsheet(accessToken: string): Promise<string | null> {
  try {
    const query = encodeURIComponent("name = 'Sankranthi Chit' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false");
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }
    }
  } catch (e) {
    console.error('Error finding spreadsheet in Drive:', e);
  }
  return null;
}
