import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Provider with mandatory Workspace scopes
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.readonly');

// Configured admin email list from user requirements
export const ALLOWED_ADMIN_EMAILS = [
  '2k3manu@gmail.com',
  'ningaraj1905@gmail.com',
  'mantyamora@gmail.com',
];

// In-memory token cache (NEVER localStorage/sessionStorage as mandated by skill)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const isUserAdmin = (email: string | null | undefined): boolean => {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  return ALLOWED_ADMIN_EMAILS.some((admin) => admin.toLowerCase() === normalized);
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null, isAdmin: boolean) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const admin = isUserAdmin(user.email);
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken, admin);
      } else if (!isSigningIn) {
        // If reloaded or token not available yet, user can sign in via button to grant scope token
        if (onAuthSuccess) onAuthSuccess(user, null, admin);
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{
  user: User;
  accessToken: string;
  isAdmin: boolean;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google sign-in');
    }

    cachedAccessToken = credential.accessToken;
    const admin = isUserAdmin(result.user.email);
    return {
      user: result.user,
      accessToken: cachedAccessToken,
      isAdmin: admin,
    };
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};
