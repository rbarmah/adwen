'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

/** Settings page */
export default function SettingsPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState('');
  const [consentMeasure, setConsentMeasure] = useState(false);
  const [consentData, setConsentData] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setUserEmail(user.email);
      if (user) {
        const { data: profile } = await (supabase
          .from('profiles') as any)
          .select('consent_measure, consent_data')
          .eq('id', user.id)
          .single();
        if (profile) {
          setConsentMeasure(!!profile.consent_measure);
          setConsentData(!!profile.consent_data);
        }
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleToggle = async (field: 'consent_measure' | 'consent_data', value: boolean) => {
    if (field === 'consent_measure') setConsentMeasure(value);
    else setConsentData(value);

    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await (supabase.from('profiles') as any)
          .update({ [field]: value })
          .eq('id', user.id);
      }
    } catch (err) {
      console.error('Failed to update setting:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/account/export');
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `adwen-data-export.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' });
      if (!res.ok) throw new Error('Delete failed');
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/login');
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete account. Please try again.');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: '680px', margin: '0 auto' }}>
        <div className="skeleton" style={{ height: 40, width: 200, marginBottom: 32 }} />
        <div className="skeleton" style={{ height: 200, marginBottom: 24 }} />
        <div className="skeleton" style={{ height: 200 }} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '680px', margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', textTransform: 'uppercase', marginBottom: '32px' }}>
        SETTINGS
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        <Card padding="lg">
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: '16px' }}>Privacy &amp; Consent</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Diagnostic measurement</p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>Allow response pattern analysis</p>
              </div>
              <button
                onClick={() => handleToggle('consent_measure', !consentMeasure)}
                disabled={saving}
                style={{
                  width: 44,
                  height: 26,
                  borderRadius: 13,
                  border: '2px solid var(--ink)',
                  background: consentMeasure ? 'var(--success)' : '#ddd',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  padding: 0,
                }}
                aria-label={`Toggle diagnostic measurement ${consentMeasure ? 'off' : 'on'}`}
              >
                <div style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: '#fff',
                  border: '2px solid var(--ink)',
                  position: 'absolute',
                  top: 2,
                  left: consentMeasure ? 20 : 2,
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Data storage</p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>Store and process study data</p>
              </div>
              <button
                onClick={() => handleToggle('consent_data', !consentData)}
                disabled={saving}
                style={{
                  width: 44,
                  height: 26,
                  borderRadius: 13,
                  border: '2px solid var(--ink)',
                  background: consentData ? 'var(--success)' : '#ddd',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  padding: 0,
                }}
                aria-label={`Toggle data storage ${consentData ? 'off' : 'on'}`}
              >
                <div style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: '#fff',
                  border: '2px solid var(--ink)',
                  position: 'absolute',
                  top: 2,
                  left: consentData ? 20 : 2,
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>
          </div>
        </Card>

        <Card padding="lg">
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: '16px' }}>Data Rights (Act 843)</h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', marginBottom: '16px', lineHeight: 1.6 }}>
            Under Ghana&apos;s Data Protection Act, 2012 (Act 843), you have the right to access,
            correct, and request deletion of your personal data.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Button variant="ghost" size="sm" onClick={handleExport} disabled={exporting}>
              {exporting ? 'Exporting…' : 'Export my data'}
            </Button>
            {showDeleteConfirm ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--danger)', fontWeight: 700 }}>
                  Are you sure? This cannot be undone.
                </span>
                <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Deleting…' : 'Yes, delete everything'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                Delete my account
              </Button>
            )}
          </div>
        </Card>

        <Card padding="lg">
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: '16px' }}>Account</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Signed in as</p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>{userEmail || 'Loading…'}</p>
            </div>
            <Badge variant="green" size="sm">Active</Badge>
          </div>
        </Card>

        <Card padding="lg">
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: '16px' }}>Help</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>App tutorial</p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>Replay the walkthrough of all features</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                localStorage.removeItem('adwen_tutorial_seen');
                router.push('/courses');
              }}
            >
              Replay tutorial →
            </Button>
          </div>
        </Card>

      </div>
    </div>
  );
}
