'use client';

import React, { useState } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

export default function Input({ label, hint, id, style, type, ...props }: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className="field" style={{ marginBottom: 0 }}>
      {label && <label htmlFor={id}>{label}{hint && <span className="hint" style={{ display: 'inline', marginLeft: 6 }}>— {hint}</span>}</label>}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input 
          className="inp" 
          id={id} 
          style={{ ...style, paddingRight: isPassword ? '40px' : undefined }} 
          type={isPassword ? (showPassword ? 'text' : 'password') : type}
          {...props} 
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: '12px',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: 'var(--muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, id, ...props }: SelectProps) {
  return (
    <div className="field" style={{ marginBottom: 0 }}>
      {label && <label htmlFor={id}>{label}</label>}
      <select className="inp" id={id} {...props}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
}

export function Slider({ label, value, min, max, onChange, formatValue }: SliderProps) {
  return (
    <div className="field" style={{ marginBottom: 0 }}>
      <label>{label}</label>
      <div className="slider-wrap">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <div className="slider-val">
          {formatValue ? formatValue(value) : value}
        </div>
      </div>
    </div>
  );
}

