import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User, BangladeshAddress } from '../../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  savedAddresses: BangladeshAddress[];
  token: string | null;
}

const loadStoredUser = (): { user: User | null; token: string | null } => {
  try {
    const storedUserStr = localStorage.getItem('marketly_user');
    const storedToken = localStorage.getItem('marketly_token');
    if (storedUserStr && storedToken) {
      const parsed = JSON.parse(storedUserStr);
      return { user: parsed, token: storedToken };
    }
  } catch (e) {
    console.warn('Failed to parse stored auth user', e);
  }
  return { user: null, token: null };
};

const initialAuth = loadStoredUser();

const initialState: AuthState = {
  user: initialAuth.user,
  isAuthenticated: !!initialAuth.user,
  token: initialAuth.token,
  savedAddresses: initialAuth.user?.addresses || [],
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; token: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.savedAddresses = action.payload.user.addresses || [];

      try {
        localStorage.setItem('marketly_user', JSON.stringify(action.payload.user));
        localStorage.setItem('marketly_token', action.payload.token);
      } catch (e) {
        console.warn('Failed to save auth to localStorage', e);
      }
    },
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      if (action.payload) {
        state.savedAddresses = action.payload.addresses || [];
        localStorage.setItem('marketly_user', JSON.stringify(action.payload));
      } else {
        state.token = null;
        localStorage.removeItem('marketly_user');
        localStorage.removeItem('marketly_token');
      }
    },
    loginAsCustomer: (state) => {
      const demoCust: User = {
        id: 'usr_cust_2',
        name: 'Emily Johnson',
        email: 'customer@marketly.com',
        role: 'customer',
        phone: '+880 1819-987654',
        avatar:
          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
        addresses: [
          {
            fullName: 'Emily Johnson',
            phone: '+880 1819-987654',
            email: 'customer@marketly.com',
            division: 'Chittagong',
            district: 'Chittagong',
            upazila: 'Panchlaish',
            union: 'GEC Circle',
            streetAddress: 'Apartment 5B, Rose Valley, Nasirabad',
            postalCode: '4000',
          },
        ],
      };
      state.user = demoCust;
      state.isAuthenticated = true;
      state.savedAddresses = demoCust.addresses || [];
      state.token = 'demo_cust_token';
      localStorage.setItem('marketly_user', JSON.stringify(demoCust));
      localStorage.setItem('marketly_token', 'demo_cust_token');
    },
    loginAsAdmin: (state) => {
      const demoAdmin: User = {
        id: 'usr_admin_1',
        name: 'Mahim Haque (Super Admin)',
        email: 'admin@marketly.com',
        role: 'super_admin',
        phone: '+880 1712-345678',
        avatar:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
        addresses: [
          {
            fullName: 'Mahim Haque',
            phone: '+880 1712-345678',
            email: 'admin@marketly.com',
            division: 'Dhaka',
            district: 'Dhaka',
            upazila: 'Gulshan',
            union: 'Ward 19',
            streetAddress: 'House 42, Road 11, Block D, Banani',
            postalCode: '1213',
          },
        ],
      };
      state.user = demoAdmin;
      state.isAuthenticated = true;
      state.savedAddresses = demoAdmin.addresses || [];
      state.token = 'demo_admin_token';
      localStorage.setItem('marketly_user', JSON.stringify(demoAdmin));
      localStorage.setItem('marketly_token', 'demo_admin_token');
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.token = null;
      localStorage.removeItem('marketly_user');
      localStorage.removeItem('marketly_token');
    },
    addAddress: (state, action: PayloadAction<BangladeshAddress>) => {
      state.savedAddresses.push(action.payload);
      if (state.user) {
        state.user.addresses = state.savedAddresses;
        localStorage.setItem('marketly_user', JSON.stringify(state.user));
      }
    },
  },
});

export const {
  setCredentials,
  setUser,
  loginAsCustomer,
  loginAsAdmin,
  logout,
  addAddress,
} = authSlice.actions;

export const selectCurrentUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectIsAdmin = (state: { auth: AuthState }) =>
  state.auth.user?.role === 'admin' || state.auth.user?.role === 'super_admin';
export const selectSavedAddresses = (state: { auth: AuthState }) => state.auth.savedAddresses;

export default authSlice.reducer;
