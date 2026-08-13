const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4001';
// Must match AuthContext TOKEN_KEY so meeting APIs receive the JWT
const TOKEN_KEY = 'conference_token';
const LEGACY_TOKEN_KEY = 'meetspace_token';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
}

interface AuthResponse {
  token: string;
  user: User;
}

const getToken = (): string | null => {
  const current = localStorage.getItem(TOKEN_KEY);
  if (current) return current;
  // Migrate older key so meetings list works after login from previous builds
  const legacy = localStorage.getItem(LEGACY_TOKEN_KEY);
  if (legacy) {
    localStorage.setItem(TOKEN_KEY, legacy);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    return legacy;
  }
  return null;
};
const setToken = (t: string) => {
  localStorage.setItem(TOKEN_KEY, t);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
};
const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
};

export const authHeaders = (): HeadersInit => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken() ?? ''}`,
});

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Request failed');
  return data as T;
}

export const authService = {
  async signUp(name: string, email: string, password: string): Promise<User> {
    const res = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const { token, user } = await handleResponse<AuthResponse>(res);
    setToken(token);
    return user;
  },

  async signIn(email: string, password: string): Promise<User> {
    const res = await fetch(`${API_URL}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const { token, user } = await handleResponse<AuthResponse>(res);
    setToken(token);
    return user;
  },

  async getCurrentUser(): Promise<User | null> {
    if (!getToken()) return null;
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: authHeaders(),
      });
      if (!res.ok) { clearToken(); return null; }
      return res.json() as Promise<User>;
    } catch {
      return null;
    }
  },

  signOut(): void {
    clearToken();
  },

  generateRoomId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const seg = (n: number) =>
      Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${seg(3)}-${seg(4)}-${seg(3)}`;
  },
};
