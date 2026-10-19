import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Advertisement } from '../../types';
import { ExternalLink } from 'lucide-react';

interface HomeAdBannerProps {
  placement: 'below_hero' | 'between_collections' | 'before_footer';
}

export const HomeAdBanner: React.FC<HomeAdBannerProps> = ({ placement }) => {
  const [ad, setAd] = useState<Advertisement | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    api.getAdvertisements()
      .then((ads) => {
        if (!isMounted) return;
        const matchingAds = ads.filter((a) => a.placement === placement && a.active && a.imageUrl);
        if (matchingAds.length > 0) {
          // Sort by priority descending and pick top
          matchingAds.sort((a, b) => (b.priority || 1) - (a.priority || 1));
          setAd(matchingAds[0]);
        } else {
          setAd(null);
        }
      })
      .catch(() => {
        if (isMounted) setAd(null);
      });

    return () => {
      isMounted = false;
    };
  }, [placement]);

  // Zero-pill & Zero-layout-shift rule: If no ad or broken image, render strictly null with NO wrapper markup or margins!
  if (!ad || imageError || !ad.imageUrl) {
    return null;
  }

  const content = (
    <div className="relative w-full rounded-3xl overflow-hidden shadow-xs border border-slate-200/80 bg-slate-900 group">
      <img
        src={ad.imageUrl}
        alt={ad.title}
        onError={() => setImageError(true)}
        className="w-full h-36 sm:h-48 md:h-60 object-cover object-center group-hover:scale-[1.01] transition-transform duration-300"
      />
      {/* Title & Badge Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent flex items-end p-4 sm:p-6 justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full bg-blue-600/90 text-white text-[10px] font-bold uppercase tracking-wider mb-1.5 inline-block">
            Sponsored Highlight
          </span>
          <h3 className="font-display font-extrabold text-base sm:text-xl text-white drop-shadow-xs">
            {ad.title}
          </h3>
        </div>

        {ad.destinationUrl && (
          <div className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/95 hover:bg-white text-slate-900 font-bold text-xs transition-colors shrink-0 shadow-sm">
            <span>Explore Offer</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full">
      {ad.destinationUrl ? (
        <a
          href={ad.destinationUrl}
          target={ad.openInNewTab ? '_blank' : '_self'}
          rel={ad.openInNewTab ? 'noopener noreferrer' : undefined}
          className="block w-full"
        >
          {content}
        </a>
      ) : (
        content
      )}
    </div>
  );
};
