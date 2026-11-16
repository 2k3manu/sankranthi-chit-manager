export interface ManagerProfile {
  id: string;
  name: string;
  email: string;
}

export const MANAGER_PROFILES: ManagerProfile[] = [
  { id: 'manu', name: 'Manu', email: '2k3manu@gmail.com' },
  { id: 'ningaraj', name: 'Ningaraju', email: 'ningaraj1905@gmail.com' },
  { id: 'mantyamora', name: 'Mantyamora', email: 'mantyamora@gmail.com' },
];

export const ALLOWED_ADMIN_EMAILS = MANAGER_PROFILES.map((p) => p.email);

export const MANAGER_PASSCODE = 'SANKRANTHI2026';

const SESSION_STORAGE_KEY = 'sankranthi_chit_manager_session_v1';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface StoredManagerSession {
  profileId: string;
  name: string;
  email: string;
  passcode: string;
  unlockedAt: string;
}

export const isUserAdmin = (email: string | null | undefined): boolean => {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  return ALLOWED_ADMIN_EMAILS.some((admin) => admin.toLowerCase() === normalized);
};

export function getSavedManagerSession(): StoredManagerSession | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredManagerSession;
    const validProfile = MANAGER_PROFILES.find(
      (p) => p.id === parsed.profileId || p.email.toLowerCase() === parsed.email?.toLowerCase()
    );
    if (!validProfile || parsed.passcode !== MANAGER_PASSCODE) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export const initAuth = (
  onAuthSuccess?: (user: AuthUser, passcode: string | null, isAdmin: boolean) => void,
  onAuthFailure?: () => void
) => {
  const session = getSavedManagerSession();
  if (session) {
    const user: AuthUser = {
      uid: session.profileId,
      email: session.email,
      displayName: session.name,
      photoURL: null,
    };
    onAuthSuccess?.(user, session.passcode, true);
  } else {
    onAuthFailure?.();
  }
  return () => {};
};

export const unlockManager = (
  profileId: string,
  passcode: string
): {
  user: AuthUser;
  accessToken: string;
  isAdmin: boolean;
} => {
  const profile = MANAGER_PROFILES.find((p) => p.id === profileId);
  if (!profile) {
    throw new Error('Please select a valid manager profile.');
  }

  if (passcode.trim() !== MANAGER_PASSCODE) {
    throw new Error('Invalid Manager Passcode. Please check and try again.');
  }

  const session: StoredManagerSession = {
    profileId: profile.id,
    name: profile.name,
    email: profile.email,
    passcode: MANAGER_PASSCODE,
    unlockedAt: new Date().toISOString(),
  };

  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  } catch {
    // ignore storage errors
  }

  const user: AuthUser = {
    uid: profile.id,
    email: profile.email,
    displayName: profile.name,
    photoURL: null,
  };

  return {
    user,
    accessToken: MANAGER_PASSCODE,
    isAdmin: true,
  };
};

export const getManagerPasscode = (): string | null => {
  return getSavedManagerSession()?.passcode ?? null;
};

export const getAccessToken = (): string | null => {
  return getManagerPasscode();
};

export const logout = async () => {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
};
