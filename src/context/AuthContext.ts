// Auth global state via Zustand. Wraps the auth service.
import { create } from 'zustand';
import {
  AuthState, initAuth, signIn, signUp, signOut, signInWithGoogle, getSession, onAuthChange,
} from '../services/auth';

interface AuthStore {
  auth: AuthState;
  ready: boolean;
  bootstrap: () => Promise<void>;
  emailSignIn: (email: string, pw: string) => Promise<{ error?: string }>;
  emailSignUp: (email: string, pw: string, name?: string) => Promise<{ error?: string }>;
  googleSignIn: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

export const useAuth = create<AuthStore>((set) => ({
  auth: { status: 'loading' },
  ready: false,

  async bootstrap() {
    // Build the Supabase client BEFORE asking for a session. Without this the
    // client was never created, so getSession() always returned signedOut and
    // nobody could ever log in.
    initAuth();
    // Subscribe first so a session restored mid-bootstrap is never missed.
    await onAuthChange(session => set({ auth: session, ready: true }));
    const s = await getSession();
    set({ auth: s, ready: true });
  },

  async emailSignIn(email, pw) {
    const res = await signIn(email, pw);
    return res;
  },
  async emailSignUp(email, pw, name) {
    const res = await signUp(email, pw, name);
    return res;
  },
  async googleSignIn() {
    return signInWithGoogle();
  },
  async signOut() {
    await signOut();
    set({ auth: { status: 'signedOut' } });
  },
}));
