import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { store } from './store';
import { syncCartOnLogin, clearCart } from './cartSlice';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  phone?: string;
  address?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

declare global {
  interface ImportMeta {
    env: {
      VITE_API_URL: string;
    };
  }
}

// Create axios instance with credentials support
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
  withCredentials: true,
});

// Async thunks
export const register = createAsyncThunk(
  "auth/register",
  async (credentials: { name: string; email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await api.post("/api/auth/register", credentials);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Registration failed");
    }
  }
);

export const login = createAsyncThunk(
  "auth/login",
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await api.post("/api/auth/login", credentials);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Login failed");
    }
  }
);

export const logout = createAsyncThunk(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      await api.post("/api/auth/logout");
      return { success: true }; // Return a value to trigger fulfilled case
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Logout failed");
    }
  }
);

export const refreshToken = createAsyncThunk(
  "auth/refreshToken",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post("/api/auth/refresh-token");
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Token refresh failed");
    }
  }
);

const initialState: AuthState = {
  user: (() => {
    try {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      return token && user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  })(),
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    // Add synchronous logout action
    forceLogout: (state) => {
      console.log('🔴 FORCE LOGOUT: Clearing all state and localStorage');
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      // Clear localStorage immediately
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('cart');
      console.log('🔴 FORCE LOGOUT: localStorage cleared, state reset');
    },
    loginSuccess: (state, action: PayloadAction<{ user: any; token: string }>) => {
      state.user = action.payload.user as any;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('user', JSON.stringify(action.payload.user));
      
      // Sync cart after login
      store.dispatch(syncCartOnLogin());
    },
    updateProfile: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload } as User;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Register
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.accessToken;
        state.isAuthenticated = true;
        localStorage.setItem('token', action.payload.accessToken);
        
        // Sync cart after registration
        store.dispatch(syncCartOnLogin());
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.accessToken;
        state.isAuthenticated = true;
        localStorage.setItem('token', action.payload.accessToken);
        
        // Sync cart after login
        store.dispatch(syncCartOnLogin());
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('cart'); // Also clear cart localStorage
        
        // Don't dispatch here - it causes circular dependency
        // The cart will be cleared by the forceLogout action
      })
      // Refresh Token
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.token = action.payload.accessToken;
        state.isAuthenticated = true;
        localStorage.setItem('token', action.payload.accessToken);
      })
      .addCase(refreshToken.rejected, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      });
  },
});

// Set up axios interceptors for automatic token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If the error is 401 and we haven't tried to refresh the token yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh the token
        // Note: We can't dispatch here due to scope issues
        // The token refresh will be handled by the component calling the API
        
        // For now, just reject the error and let the component handle it
        return Promise.reject(error);
      } catch (refreshError) {
        // If refresh fails, just reject the error
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Add token to all requests
api.interceptors.request.use(
  (config) => {
    // Note: We can't access store here due to scope issues
    // The token will be added by the apiRequest function in queryClient.ts
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const { clearError, loginSuccess, updateProfile, forceLogout } = authSlice.actions;
export default authSlice.reducer;