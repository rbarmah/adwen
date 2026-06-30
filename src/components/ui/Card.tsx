'use client';

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'hero' | 'outlined';
  padding?: 'sm' | 'md' | 'lg' | 'none';
  style?: React.CSSProperties;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
}

export default function Card({
  children,
  variant = 'default',
  padding = 'md',
  style,
  className,
  onClick,
  interactive = false,
}: CardProps) {
  const base: React.CSSProperties = {
    borderRadius: 'var(--r)',
    transition: '0.14s',
    cursor: interactive || onClick ? 'pointer' : 'default',
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    default: {
      background: 'var(--paper-2)',
      border: '2px solid var(--ink)',
      boxShadow: 'var(--shadow)',
    },
    hero: {
      background: 'var(--navy)',
      border: '2px solid var(--ink)',
      boxShadow: 'var(--shadow-lg)',
      color: '#fff',
      position: 'relative',
      overflow: 'hidden',
    },
    outlined: {
      background: 'transparent',
      border: '2px dashed var(--ink)',
      boxShadow: 'none',
    },
  };

  const paddings: Record<string, string> = {
    none: '0',
    sm: '14px',
    md: '22px',
    lg: '30px',
  };

  return (
    <div
      className={className}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{
        ...base,
        ...variantStyles[variant],
        padding: paddings[padding],
        ...style,
      }}
      onMouseEnter={(e) => {
        if (interactive || onClick) {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 7px 0 rgba(14,14,14,.14), 0 26px 60px rgba(14,14,14,.12)';
        }
      }}
      onMouseLeave={(e) => {
        if (interactive || onClick) {
          (e.currentTarget as HTMLDivElement).style.transform = '';
          (e.currentTarget as HTMLDivElement).style.boxShadow = variantStyles[variant].boxShadow as string;
        }
      }}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Sunburst for hero variant */}
      {variant === 'hero' && (
        <div style={{
          position: 'absolute', right: '-60px', top: '-60px',
          width: '300px', height: '300px',
          background: 'repeating-conic-gradient(from 0deg at 50% 50%, rgba(212,237,42,.14) 0deg 8deg, transparent 8deg 16deg)',
          borderRadius: '999px', pointerEvents: 'none',
        }} />
      )}
      {children}
    </div>
  );
}
