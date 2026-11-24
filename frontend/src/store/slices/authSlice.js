import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiGet, apiPost, setAuthToken, getAuthToken } from '../../api/client';

export const checkAuth = createAsyncThunk('auth/checkAuth', async (_, { rejectWithValue }) => {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const res = await apiGet('/auth/me');
    return res.user;
  } catch (err) {
    setAuthToken(null);
    return rejectWithValue(err.message || 'Session expired');
  }
});

export const loginUser = createAsyncThunk('auth/loginUser', async ({ emailOrUsername, password }, { rejectWithValue }) => {
  try {
    const res = await apiPost('/auth/login', { emailOrUsername, password });
    if (res?.token && res?.user) {
      setAuthToken(res.token);
      return { token: res.token, user: res.user };
    }
    return rejectWithValue('Invalid server response');
  } catch (err) {
    return rejectWithValue(err.message || 'Invalid credentials');
  }
});

export const registerUser = createAsyncThunk('auth/registerUser', async (formData, { rejectWithValue }) => {
  try {
    const res = await apiPost('/auth/register', formData);
    if (res?.token && res?.user) {
      setAuthToken(res.token);
      return { token: res.token, user: res.user };
    }
    return rejectWithValue('Invalid server response');
  } catch (err) {
    return rejectWithValue(err.message || 'Registration failed');
  }
});

export const logoutUser = createAsyncThunk('auth/logoutUser', async (_, { getState }) => {
  try {
    const token = getState().auth.token;
    if (token) {
      await apiPost('/auth/logout', {});
    }
  } catch {
    // Best effort
  } finally {
    setAuthToken(null);
  }
  return null;
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: getAuthToken(),
    loading: true,
    error: null,
  },
  reducers: {
    clearAuthError: (state) => {
      state.error = null;
    },
    updateCurrentUser: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
  extraReducers: (builder) => {
    // checkAuth
    builder
      .addCase(checkAuth.pending, (state) => {
        state.loading = true;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(checkAuth.rejected, (state) => {
        state.loading = false;
        state.user = null;
        state.token = null;
      });

    // loginUser
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // registerUser
    builder
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // logoutUser
    builder.addCase(logoutUser.fulfilled, (state) => {
      state.user = null;
      state.token = null;
      state.loading = false;
      state.error = null;
    });
  },
});

export const { clearAuthError, updateCurrentUser } = authSlice.actions;
export default authSlice.reducer;
