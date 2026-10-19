import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { usePreferences } from '../../services/preferences';

export const TopAnnouncementBar: React.FC = () => {
  const navigate = useNavigate();
  const { currency, changeCurrency, t } = usePreferences();

  return (
    <div className="bg-slate-900 text-white text-xs py-1.5 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        {/* Clickable Announcement Banner */}
        <div
          onClick={() => navigate('/shop?sale=true')}
          className="flex items-center gap-1.5 text-slate-200 hover:text-white transition-colors cursor-pointer group text-center sm:text-left"
        >
          <span className="text-amber-400 font-bold uppercase tracking-wider text-[10px] bg-amber-400/20 px-2 py-0.5 rounded">
            Special Offer
          </span>
          <span className="font-medium text-[11px] sm:text-xs">
            {t('announcement')}
          </span>
          <ChevronRight className="w-3.5 h-3.5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
        </div>

        {/* Currency Control (Language switcher removed per prompt specification) */}
        <div className="flex items-center gap-3 text-[11px] text-slate-300">
          <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/60">
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Currency:</span>
            <button
              type="button"
              onClick={() => changeCurrency(currency === 'USD' ? 'BDT' : 'USD')}
              className="font-bold text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-0.5 cursor-pointer"
              title="Toggle between USD ($) and BDT (৳)"
            >
              <span>{currency === 'BDT' ? '৳ BDT' : '$ USD'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopAnnouncementBar;
