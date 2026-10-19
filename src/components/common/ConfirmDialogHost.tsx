import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Dialog } from './Dialog';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectConfirmationDialog,
  closeConfirmation,
  setConfirmationProcessing,
} from '../../store/slices/uiSlice';

/**
 * Global host for the Redux-driven confirmation dialog.
 * Renders wherever mounted (currently inside AdminLayout) and executes the
 * stored `onConfirm` callback only after an explicit user confirmation.
 * While the confirmed action is in flight the buttons are disabled and
 * duplicate submissions are blocked.
 */
export const ConfirmDialogHost: React.FC = () => {
  const dispatch = useAppDispatch();
  const confirmation = useAppSelector(selectConfirmationDialog);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Move focus to the primary action button when the dialog opens.
  useEffect(() => {
    if (confirmation?.isOpen) {
      // Defer so the dialog has rendered into the DOM.
      const t = setTimeout(() => confirmButtonRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [confirmation?.isOpen]);

  if (!confirmation || !confirmation.isOpen) return null;

  const handleCancel = () => {
    if (confirmation.isProcessing) return; // no dismissal while submitting
    dispatch(closeConfirmation());
  };

  const handleConfirm = async () => {
    if (confirmation.isProcessing || !confirmation.onConfirm) return;
    dispatch(setConfirmationProcessing(true));
    try {
      await confirmation.onConfirm();
      dispatch(closeConfirmation());
    } catch {
      // The page-level handler is responsible for the error toast; keep the
      // dialog open so the user can retry or cancel.
      dispatch(setConfirmationProcessing(false));
    }
  };

  return (
    <Dialog
      isOpen
      onClose={handleCancel}
      title={confirmation.title}
      maxWidth="sm"
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          {confirmation.destructive && (
            <div className="p-2.5 bg-rose-50 rounded-xl shrink-0" aria-hidden="true">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
          )}
          <p className="text-sm text-slate-600 leading-relaxed pt-0.5">
            {confirmation.message}
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={handleCancel}
            disabled={confirmation.isProcessing}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {confirmation.cancelText || 'Cancel'}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={handleConfirm}
            disabled={confirmation.isProcessing}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${confirmation.destructive
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-blue-600 hover:bg-blue-700'
              }`}
          >
            {confirmation.isProcessing && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            <span>{confirmation.isProcessing ? 'Working…' : confirmation.confirmText || 'Confirm'}</span>
          </button>
        </div>
      </div>
    </Dialog>
  );
};
