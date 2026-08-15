import React from 'react';
import './AmbientBackground.css';

interface AmbientBackgroundProps {
  variant?: 'meeting' | 'lobby';
  className?: string;
}

/**
 * Bright aurora atmosphere — fixed full-viewport so it stays visible
 * behind translucent cards and around the meeting grid.
 * Inline styles are a fallback if the CSS file fails to load.
 */
export const AmbientBackground: React.FC<AmbientBackgroundProps> = ({
  variant = 'meeting',
  className = '',
}) => {
  return (
    <div
      className={`ambient-bg ambient-bg--${variant} ${className}`}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        background:
          'radial-gradient(ellipse 90% 60% at 10% 0%, #0e4d6e 0%, transparent 55%), radial-gradient(ellipse 80% 50% at 95% 20%, #0f5c52 0%, transparent 50%), radial-gradient(ellipse 70% 55% at 50% 100%, #1e3a8a 0%, transparent 55%), linear-gradient(160deg, #07111f 0%, #0a1628 40%, #061018 100%)',
      }}
    >
      <div
        className="ambient-bg__glow ambient-bg__glow--a"
        style={{
          position: 'absolute',
          width: 'min(70vw, 640px)',
          height: 'min(70vw, 640px)',
          top: '-18%',
          left: '-12%',
          borderRadius: '50%',
          filter: 'blur(40px)',
          background:
            'radial-gradient(circle, rgba(56,189,248,0.65) 0%, rgba(14,165,233,0.25) 45%, transparent 70%)',
        }}
      />
      <div
        className="ambient-bg__glow ambient-bg__glow--b"
        style={{
          position: 'absolute',
          width: 'min(60vw, 560px)',
          height: 'min(60vw, 560px)',
          right: '-14%',
          top: '22%',
          borderRadius: '50%',
          filter: 'blur(40px)',
          background:
            'radial-gradient(circle, rgba(45,212,191,0.55) 0%, rgba(20,184,166,0.22) 45%, transparent 70%)',
        }}
      />
      <div
        className="ambient-bg__glow ambient-bg__glow--c"
        style={{
          position: 'absolute',
          width: 'min(65vw, 600px)',
          height: 'min(65vw, 600px)',
          left: '25%',
          bottom: '-22%',
          borderRadius: '50%',
          filter: 'blur(40px)',
          background:
            'radial-gradient(circle, rgba(96,165,250,0.55) 0%, rgba(37,99,235,0.22) 45%, transparent 70%)',
        }}
      />
      <div className="ambient-bg__beam" />
      <div className="ambient-bg__mesh" />
      <div className="ambient-bg__grain" />
      <div className="ambient-bg__vignette" />
    </div>
  );
};
