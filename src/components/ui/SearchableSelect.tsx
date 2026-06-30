'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

interface SearchableSelectProps {
  label?: string;
  hint?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; group?: string }[];
  id?: string;
  allowCustom?: boolean;
}

/**
 * A searchable, filterable select with grouped results.
 * Supports keyboard navigation, custom text entry, and
 * groups options by their `group` property.
 */
export default function SearchableSelect({
  label,
  hint,
  placeholder = 'Search…',
  value,
  onChange,
  options,
  id,
  allowCustom = true,
}: SearchableSelectProps) {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value changes
  useEffect(() => {
    if (!open) setQuery(value || '');
  }, [value, open]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Filter options
  const q = query.toLowerCase().trim();
  const filtered = q.length === 0
    ? options
    : options.filter(
        (o) =>
          o.label.toLowerCase().includes(q) ||
          (o.group && o.group.toLowerCase().includes(q))
      );

  // Group filtered results
  const grouped = new Map<string, { value: string; label: string }[]>();
  for (const o of filtered) {
    const g = o.group || '';
    if (!grouped.has(g)) grouped.set(g, []);
    grouped.get(g)!.push(o);
  }

  // Flat list for keyboard navigation
  const flatList = filtered;

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIdx >= 0 && listRef.current) {
      const el = listRef.current.querySelector(`[data-idx="${highlightIdx}"]`);
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIdx]);

  const selectOption = useCallback(
    (val: string) => {
      onChange(val);
      setQuery(val);
      setOpen(false);
      setHighlightIdx(-1);
    },
    [onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      return;
    }
    if (!open) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIdx((i) => Math.min(i + 1, flatList.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIdx((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightIdx >= 0 && highlightIdx < flatList.length) {
          selectOption(flatList[highlightIdx].value);
        } else if (allowCustom && query.trim()) {
          selectOption(query.trim());
        }
        break;
      case 'Escape':
        setOpen(false);
        setHighlightIdx(-1);
        break;
    }
  };

  const showCount = filtered.length;
  const maxDisplay = 120;
  const truncated = showCount > maxDisplay;

  return (
    <div className="field" style={{ marginBottom: 0, position: 'relative' }} ref={wrapRef}>
      {label && (
        <label htmlFor={id}>
          {label}
          {hint && <span className="hint" style={{ display: 'inline', marginLeft: 6 }}>— {hint}</span>}
        </label>
      )}

      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          className="inp"
          id={id}
          type="text"
          autoComplete="off"
          placeholder={placeholder}
          value={query}
          onFocus={() => {
            setOpen(true);
            setHighlightIdx(-1);
            // Select all text on focus for easy replacement
            inputRef.current?.select();
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlightIdx(-1);
            if (allowCustom) onChange(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          style={{ paddingRight: 32 }}
        />
        {/* Dropdown chevron */}
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="var(--muted)" strokeWidth="2.5" strokeLinecap="round"
          style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            pointerEvents: 'none', opacity: 0.6,
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {open && (
        <div
          ref={listRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 100,
            maxHeight: 280,
            overflowY: 'auto',
            background: 'var(--paper-2, #fff)',
            border: '2px solid var(--ink)',
            borderRadius: 'var(--r-sm, 8px)',
            boxShadow: 'var(--shadow-hard, 0 4px 12px rgba(0,0,0,.15))',
            marginTop: 4,
          }}
        >
          {filtered.length === 0 && (
            <div style={{ padding: '14px 16px', fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
              {allowCustom ? (
                <>No matches. Press <strong>Enter</strong> to use &quot;{query}&quot;</>
              ) : (
                'No matches found'
              )}
            </div>
          )}

          {Array.from(grouped.entries()).map(([group, items]) => {
            // Find the starting flat index for items in this group
            const startIdx = flatList.indexOf(items[0]);

            return (
              <div key={group}>
                {group && (
                  <div style={{
                    padding: '8px 14px 4px',
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--cobalt, #2A3BC9)',
                    fontFamily: 'var(--font-mono, monospace)',
                    background: 'var(--surface, #F5F5F5)',
                    borderBottom: '1px solid var(--line, #eee)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                  }}>
                    {group}
                  </div>
                )}
                {items.slice(0, maxDisplay).map((item, i) => {
                  const flatIdx = startIdx + i;
                  const isHighlighted = flatIdx === highlightIdx;
                  const isSelected = item.value === value;

                  return (
                    <div
                      key={item.value}
                      data-idx={flatIdx}
                      onClick={() => selectOption(item.value)}
                      onMouseEnter={() => setHighlightIdx(flatIdx)}
                      style={{
                        padding: '9px 14px',
                        fontSize: 13,
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                        background: isHighlighted
                          ? 'var(--lime, #D4FF00)'
                          : isSelected
                          ? 'rgba(42,59,201,0.06)'
                          : 'transparent',
                        color: isHighlighted ? 'var(--ink, #111)' : 'var(--ink, #111)',
                        borderBottom: '1px solid var(--line, #f0f0f0)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        transition: 'background 0.08s',
                      }}
                    >
                      {isSelected && (
                        <span style={{ fontSize: 11, color: 'var(--cobalt, #2A3BC9)' }}>✓</span>
                      )}
                      <span>{item.label}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {truncated && (
            <div style={{ padding: '10px 14px', fontSize: 11, color: 'var(--muted)', textAlign: 'center', fontStyle: 'italic' }}>
              Showing {maxDisplay} of {showCount} results — type to narrow down
            </div>
          )}
        </div>
      )}
    </div>
  );
}
