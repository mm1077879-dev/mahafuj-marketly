import React, { useCallback, useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { removeNotification, selectNotifications } from '../../store/slices/uiSlice';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export const NotificationToastContainer: React.FC = () => {
  const dispatch = useAppDispatch();
  const notifications = useAppSelector(selectNotifications);
  const dismissNotification = useCallback(
    (id: string) => dispatch(removeNotification(id)),
    [dispatch]
  );

  return (
    <div
      role="region"
      aria-label="Notifications"
      className="notification-container"
    >
      {notifications.map((toast, index) => (
        <ToastItem
          key={toast.id}
          index={index}
          toast={toast}
          onDismiss={dismissNotification}
        />
      ))}
    </div>
  );
};

interface ToastItemProps {
  index: number;
  toast: {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    title?: string;
    duration?: number;
  };
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, index, onDismiss }) => {
  const [isPaused, setIsPaused] = useState(false);
  const dismiss = useCallback(() => onDismiss(toast.id), [onDismiss, toast.id]);
  const duration = toast.duration ?? (toast.type === 'error' ? 6000 : 4000);

  useEffect(() => {
    if (isPaused) return;
    const timer = setTimeout(dismiss, duration);
    return () => clearTimeout(timer);
  }, [dismiss, duration, isPaused]);

  const icons = {
    success: <CheckCircle2 aria-hidden="true" className="w-5 h-5 text-emerald-600 shrink-0" />,
    error: <AlertCircle aria-hidden="true" className="w-5 h-5 text-rose-600 shrink-0" />,
    warning: <AlertTriangle aria-hidden="true" className="w-5 h-5 text-amber-600 shrink-0" />,
    info: <Info aria-hidden="true" className="w-5 h-5 text-blue-600 shrink-0" />,
  };

  const borderColors = {
    success: 'border-emerald-100 bg-white shadow-emerald-500/10',
    error: 'border-rose-100 bg-white shadow-rose-500/10',
    warning: 'border-amber-100 bg-white shadow-amber-500/10',
    info: 'border-blue-100 bg-white shadow-blue-500/10',
  };

  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
          setIsPaused(false);
        }
      }}
      className={`marketly-toast-enter notification-toast pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg ${borderColors[toast.type]}`}
      style={
        {
          // Newer toasts (lower index) sit on top of older ones.
          zIndex: 100 - index,
          // Slight downward/sideways peek so stacked older toasts stay visible.
          // Consumed by the enter animation; kept as fallback via transform.
          '--toast-x': `${index * -0.5}rem`,
          '--toast-y': `${index * 0.75}rem`,
          transform: `translate(${index * -0.5}rem, ${index * 0.75}rem)`,
        } as React.CSSProperties
      }
    >
      {icons[toast.type]}
      <div className="flex-1 min-w-0">
        {toast.title && (
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
            {toast.title}
          </h4>
        )}
        <p className="text-sm font-medium text-slate-700 leading-snug">{toast.message}</p>
      </div>
      <button
        onClick={dismiss}
        className="text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 p-1 rounded transition-colors"
        aria-label="Dismiss notification"
      >
        <X aria-hidden="true" className="w-4 h-4" />
      </button>
      <div
        aria-hidden="true"
        className="marketly-toast-countdown absolute inset-x-0 bottom-0 left-0 right-0 h-1 rounded-b-xl"
        style={{
          background: 'linear-gradient(to right, #ef4444, #fbbf24)',
          animationDuration: `${duration}ms`,
          animationPlayState: isPaused ? 'paused' : 'running',
        }}
      />
    </div>
  );
};
