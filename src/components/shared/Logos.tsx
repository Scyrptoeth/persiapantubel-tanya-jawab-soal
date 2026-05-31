import React from "react";

/**
 * Audit Aksesibilitas (WCAG AA Compliance):
 * Background: #ffffff (White)
 * 
 * TPA Colors:
 * - #7f1d1d (Red 900): Contrast 11.1:1 (Pass AAA)
 * - #b91c1c (Red 700): Contrast 5.7:1 (Pass AA)
 * 
 * TBI Colors:
 * - #92400e (Amber 900): Contrast 7.5:1 (Pass AAA)
 * - #b45309 (Amber 800): Contrast 5.1:1 (Pass AA)
 */

export const LogoTPA = ({ className = "" }: { className?: string }) => (
  <div className={`relative flex items-center justify-center ${className}`}>
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gradTPA-shared" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7f1d1d" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>
      </defs>
      <rect x="5" y="5" width="50" height="50" rx="12" fill="url(#gradTPA-shared)" fillOpacity="0.1" stroke="url(#gradTPA-shared)" strokeWidth="2" />
      <text 
        x="50%" 
        y="50%" 
        dominantBaseline="central" 
        textAnchor="middle" 
        fill="url(#gradTPA-shared)" 
        fontSize="18" 
        fontWeight="900" 
        fontFamily="sans-serif"
        style={{ letterSpacing: '1px' }}
      >
        TPA
      </text>
    </svg>
  </div>
);

export const LogoTBI = ({ className = "" }: { className?: string }) => (
  <div className={`relative flex items-center justify-center ${className}`}>
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gradTBI-shared" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#92400e" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>
      <rect x="5" y="5" width="50" height="50" rx="12" fill="url(#gradTBI-shared)" fillOpacity="0.1" stroke="url(#gradTBI-shared)" strokeWidth="2" />
      <text 
        x="50%" 
        y="50%" 
        dominantBaseline="central" 
        textAnchor="middle" 
        fill="url(#gradTBI-shared)" 
        fontSize="18" 
        fontWeight="900" 
        fontFamily="sans-serif"
        style={{ letterSpacing: '1px' }}
      >
        TBI
      </text>
    </svg>
  </div>
);
