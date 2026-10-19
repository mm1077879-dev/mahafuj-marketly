import { createSlice, nanoid, PayloadAction } from '@reduxjs/toolkit';

const MAX_VISIBLE_NOTIFICATIONS = 5;

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  title?: string;
  duration?: number;
}

export interface FlyAnimationData {
  startX: number;
  startY: number;
  image: string;
  timestamp: number;
}

interface UiState {
  isCartDrawerOpen: boolean;
  isMobileMenuOpen: boolean;
  searchQuery: string;
  notifications: ToastNotification[];
  flyAnimation: FlyAnimationData | null;
  confirmationDialog: {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    /** Marks the confirm action as destructive so the UI renders a danger-styled button. */
    destructive?: boolean;
    /** Set while the confirmed async action is in flight; prevents duplicate submissions. */
    isProcessing?: boolean;
    /** Callback executed when the user explicitly confirms. Functions bypass serializableCheck (disabled in store). */
    onConfirm?: () => void;
  } | null;
}

const initialState: UiState = {
  isCartDrawerOpen: false,
  isMobileMenuOpen: false,
  searchQuery: '',
  notifications: [],
  flyAnimation: null,
  confirmationDialog: null,
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    openCartDrawer: (state) => {
      state.isCartDrawerOpen = true;
    },
    closeCartDrawer: (state) => {
      state.isCartDrawerOpen = false;
    },
    toggleCartDrawer: (state) => {
      state.isCartDrawerOpen = !state.isCartDrawerOpen;
    },
    openMobileMenu: (state) => {
      state.isMobileMenuOpen = true;
    },
    closeMobileMenu: (state) => {
      state.isMobileMenuOpen = false;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    triggerFlyAnimation: (state, action: PayloadAction<FlyAnimationData>) => {
      state.flyAnimation = action.payload;
    },
    clearFlyAnimation: (state) => {
      state.flyAnimation = null;
    },
    addNotification: {
      reducer: (state, action: PayloadAction<ToastNotification>) => {
        state.notifications.unshift(action.payload);
        state.notifications = state.notifications.slice(0, MAX_VISIBLE_NOTIFICATIONS);
      },
      prepare: (notification: Omit<ToastNotification, 'id'>) => ({
        payload: { ...notification, id: nanoid() },
      }),
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter((n) => n.id !== action.payload);
    },
    showConfirmation: (
      state,
      action: PayloadAction<{
        title: string;
        message: string;
        confirmText?: string;
        cancelText?: string;
        destructive?: boolean;
        onConfirm?: () => void;
      }>
    ) => {
      state.confirmationDialog = {
        isOpen: true,
        ...action.payload,
      };
    },
    closeConfirmation: (state) => {
      state.confirmationDialog = null;
    },
    setConfirmationProcessing: (state, action: PayloadAction<boolean>) => {
      if (state.confirmationDialog) {
        state.confirmationDialog.isProcessing = action.payload;
      }
    },
  },
});

export const {
  openCartDrawer,
  closeCartDrawer,
  toggleCartDrawer,
  openMobileMenu,
  closeMobileMenu,
  setSearchQuery,
  triggerFlyAnimation,
  clearFlyAnimation,
  addNotification,
  removeNotification,
  showConfirmation,
  closeConfirmation,
  setConfirmationProcessing,
} = uiSlice.actions;

export const selectIsCartDrawerOpen = (state: { ui: UiState }) => state.ui.isCartDrawerOpen;
export const selectIsMobileMenuOpen = (state: { ui: UiState }) => state.ui.isMobileMenuOpen;
export const selectSearchQuery = (state: { ui: UiState }) => state.ui.searchQuery;
export const selectNotifications = (state: { ui: UiState }) => state.ui.notifications;
export const selectFlyAnimation = (state: { ui: UiState }) => state.ui.flyAnimation;
export const selectConfirmationDialog = (state: { ui: UiState }) => state.ui.confirmationDialog;

export default uiSlice.reducer;
