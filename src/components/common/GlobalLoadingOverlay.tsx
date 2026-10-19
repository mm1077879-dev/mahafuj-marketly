import React, { useState, useEffect } from 'react';
import { ShoppingBag } from 'lucide-react';

export const GlobalLoadingOverlay: React.FC = () => {
  // Show initial brand animation only during genuine document load/reload
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Dismiss once initial document hydration completes
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 400);

    return () => clearTimeout(timer);
  }, []); // Run strictly on initial mount, NOT on internal route navigation changes

  if (!isLoading) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading page content"
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-xs transition-opacity duration-300 pointer-events-none"
    >
      <div className="flex flex-col items-center gap-4 p-6 rounded-3xl bg-white/95 border border-slate-200/90 shadow-2xl">
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
          {/* Elegant Circular Rotating Indicator Ring */}
          <svg
            className="w-full h-full animate-spin text-blue-600 motion-reduce:animate-none"
            viewBox="0 0 100 100"
            fill="none"
          >
            <circle
              className="text-slate-100"
              strokeWidth="6"
              stroke="currentColor"
              cx="50"
              cy="50"
              r="42"
            />
            <circle
              className="text-blue-600"
              strokeWidth="6"
              strokeDasharray="260"
              strokeDashoffset="180"
              strokeLinecap="round"
              stroke="currentColor"
              cx="50"
              cy="50"
              r="42"
            />
          </svg>

          {/* Centered Brand Icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
            </div>
          </div>
        </div>

        <div className="text-center">
          <span className="font-display font-bold text-sm text-slate-800 tracking-tight block">
            Marketly
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            Loading luxury experience...
          </span>
        </div>
      </div>
    </div>
  );
};

export default GlobalLoadingOverlay;
