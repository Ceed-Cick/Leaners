import { AuthUser, Department } from '../types';

const TOKEN_STORAGE_KEY = 'ruet_mindmap_auth_token';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignUpData {
  fullName: string;
  email: string;
  password: string;
  studentId?: string;
  department: Department;
  series: string;
  currentSemester?: string;
}

export interface AuthResponse {
  message?: string;
  user: AuthUser;
  token: string;
  expiresAt: number;
}

export const authService = {
  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  },

  setToken(token: string): void {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch (e) {
      console.warn('Failed to save auth token to localStorage:', e);
    }
  },

  clearToken(): void {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to remove auth token from localStorage:', e);
    }
  },

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to sign in. Please check your credentials.');
    }

    if (data.token) {
      this.setToken(data.token);
    }

    return data;
  },

  async signUp(signUpData: SignUpData): Promise<AuthResponse> {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(signUpData),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to create account. Please try again.');
    }

    if (data.token) {
      this.setToken(data.token);
    }

    return data;
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.clearToken();
        }
        return null;
      }

      const data = await response.json();
      return data.user || null;
    } catch (error) {
      console.warn('Error fetching current authenticated user session:', error);
      return null;
    }
  },

  async logout(): Promise<void> {
    const token = this.getToken();
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.warn('Error reporting logout to server:', error);
      }
    }
    this.clearToken();
  },
};
