'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

/* ─── Types ──────────────────────────────────────────────────────────────────── */
type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextType {
  toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });
export const useToast = () => useContext(ToastContext);

/* ─── Provider ───────────────────────────────────────────────────────────────── */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const VARIANT_STYLES: Record<ToastVariant, { bg: string; border: string; color: string; icon: string }> = {
    success: { bg: 'var(--green-soft, #E2F3EA)', border: 'var(--green, #2FA36A)', color: '#1f6b45', icon: '✓' },
    error:   { bg: '#FBDCEC', border: 'var(--magenta, #EC3F8F)', color: '#8C1F5A', icon: '✗' },
    warning: { bg: '#FDEBD7', border: 'var(--tangerine, #F5821F)', color: '#8A4D10', icon: '⚠' },
    info:    { bg: 'var(--cobalt-soft, #E4E6FB)', border: 'var(--cobalt, #2A3BC9)', color: 'var(--cobalt-ink, #1E2AA8)', icon: 'ℹ' },
  };

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      {/* Toast container */}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          maxWidth: '380px',
          width: '100%',
          pointerEvents: 'none',
        }}
      >
        {toasts.map(t => {
          const s = VARIANT_STYLES[t.variant];
          return (
            <div
              key={t.id}
              style={{
                background: s.bg,
                border: `2px solid ${s.border}`,
                borderRadius: 'var(--r-sm, 14px)',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: s.color,
                fontSize: '13.5px',
                fontWeight: 600,
                fontFamily: 'var(--font-body)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                animation: 'fade 0.3s ease',
                pointerEvents: 'auto',
                cursor: 'pointer',
              }}
              onClick={() => dismiss(t.id)}
            >
              <span style={{ fontSize: '16px', fontWeight: 800, flexShrink: 0 }}>{s.icon}</span>
              <span style={{ flex: 1 }}>{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
