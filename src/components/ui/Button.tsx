'use client';

import React from 'react';

type ButtonVariant = 'primary' | 'ghost' | 'lime' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: 'var(--tangerine)',
    color: 'var(--ink)',
    border: '2px solid var(--ink)',
    boxShadow: '0 4px 0 var(--ink)',
  },
  ghost: {
    background: '#fff',
    color: 'var(--ink)',
    border: '2px solid var(--ink)',
    boxShadow: 'none',
  },
  lime: {
    background: 'var(--lime)',
    color: 'var(--ink)',
    border: '2px solid var(--ink)',
    boxShadow: '0 4px 0 var(--ink)',
  },
  danger: {
    background: '#FBDCEC',
    color: '#8C1F5A',
    border: '2px solid var(--ink)',
    boxShadow: 'none',
  },
};

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: '7px 14px', fontSize: '12.5px', minHeight: '34px' },
  md: { padding: '13px 22px', fontSize: '14px', minHeight: '44px' },
  lg: { padding: '15px 28px', fontSize: '15px', minHeight: '50px' },
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  style,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        borderRadius: 'var(--pill)',
        fontFamily: 'var(--font-body)',
        fontWeight: 800,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.4 : 1,
        transition: '0.14s',
        whiteSpace: 'nowrap',
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...(disabled || loading ? { transform: 'none', boxShadow: 'none' } : {}),
        ...style,
      }}
      disabled={disabled || loading}
      onMouseEnter={(e) => {
        if (disabled || loading) return;
        if (variant === 'primary' || variant === 'lime') {
          (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 0 var(--ink)';
        } else if (variant === 'ghost') {
          (e.currentTarget as HTMLButtonElement).style.background = 'var(--lime)';
        }
      }}
      onMouseLeave={(e) => {
        if (disabled || loading) return;
        (e.currentTarget as HTMLButtonElement).style.transform = '';
        (e.currentTarget as HTMLButtonElement).style.boxShadow = variantStyles[variant].boxShadow as string || '';
        if (variant === 'ghost') {
          (e.currentTarget as HTMLButtonElement).style.background = '#fff';
        }
      }}
      onMouseDown={(e) => {
        if (disabled || loading) return;
        if (variant === 'primary' || variant === 'lime') {
          (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 0 var(--ink)';
        }
      }}
      onMouseUp={(e) => {
        if (disabled || loading) return;
        if (variant === 'primary' || variant === 'lime') {
          (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 0 var(--ink)';
        }
      }}
      {...props}
    >
      {loading && (
        <span style={{
          width: '14px', height: '14px',
          border: '2px solid currentColor', borderTopColor: 'transparent',
          borderRadius: '50%', animation: 'spin 0.6s linear infinite',
        }} />
      )}
      {icon && !loading && icon}
      {children}
    </button>
  );
}
