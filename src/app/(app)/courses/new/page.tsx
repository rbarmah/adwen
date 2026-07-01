'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input, { Slider } from '@/components/ui/Input';
import Badge, { Sparkle } from '@/components/ui/Badge';
import { createClient } from '@/lib/supabase/client';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
const MAX_TOTAL_SIZE = 30 * 1024 * 1024; // 30MB total
const MAX_FILES = 3;
const ALLOWED_EXTENSIONS = ['pdf', 'pptx', 'ppt', 'docx', 'doc', 'txt', 'png', 'jpg', 'jpeg'];

function validateFile(file: File, existingFiles: File[]): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `"${file.name}" has an unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`;
  }
  if (existingFiles.length >= MAX_FILES) {
    return `You can only upload up to ${MAX_FILES} files per course to ensure optimal processing speed.`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `"${file.name}" is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum is 10MB per file.`;
  }
  const totalSize = existingFiles.reduce((sum, f) => sum + f.size, 0) + file.size;
  if (totalSize > MAX_TOTAL_SIZE) {
    return `Adding "${file.name}" would exceed the 30MB total upload limit.`;
  }
  return null;
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, '_')  // Remove path separators and special chars
    .replace(/\.\./g, '_')           // Prevent directory traversal
    .slice(0, 200);                  // Limit length
}

export default function NewCoursePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [courseName, setCourseName] = useState('');
  const [difficulty, setDifficulty] = useState(5);
  const [examDate, setExamDate] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const dropped = Array.from(e.dataTransfer.files);
    const valid: File[] = [];
    for (const file of dropped) {
      const error = validateFile(file, [...files, ...valid]);
      if (error) { alert(error); continue; }
      valid.push(file);
    }
    setFiles((prev) => [...prev, ...valid]);

    // Auto-suggest course name from first file
    if (!courseName && valid.length > 0) {
      const name = valid[0].name
        .replace(/\.(pdf|pptx?|docx?|txt|png|jpg)$/i, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .slice(0, 100);
      setCourseName(name);
    }
  }, [courseName, files]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      const valid: File[] = [];
      for (const file of selected) {
        const error = validateFile(file, [...files, ...valid]);
        if (error) { alert(error); continue; }
        valid.push(file);
      }
      setFiles((prev) => [...prev, ...valid]);
      if (!courseName && valid.length > 0) {
        const name = valid[0].name
          .replace(/\.(pdf|pptx?|docx?|txt|png|jpg)$/i, '')
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase())
          .slice(0, 100);
        setCourseName(name);
      }
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (name: string) => {
    if (name.match(/\.pdf$/i)) return '📄';
    if (name.match(/\.pptx?$/i)) return '📊';
    if (name.match(/\.docx?$/i)) return '📝';
    if (name.match(/\.(png|jpg|jpeg)$/i)) return '🖼️';
    return '📎';
  };

  // Add mock file helper (makes it easy to test in browser without selecting local files)
  const addMockFile = (filename: string, suggestedCourse: string) => {
    const blob = new Blob(['mock content'], { type: 'application/pdf' });
    const file = new File([blob], filename, { type: 'application/pdf' });
    setFiles((prev) => [...prev, file]);
    if (!courseName) {
      setCourseName(suggestedCourse);
    }
  };

  const handleSubmit = async () => {
    if (!user || files.length === 0 || !courseName) return;
    setLoading(true);
    const supabase = createClient();

    try {
      // 1. Create course
      const { data: newCourseData, error: courseError } = await (supabase.from('courses') as any)
        .insert({
          user_id: user.id,
          name: courseName,
          exam_date: examDate || null,
          self_difficulty: difficulty,
          status: 'analyzing'
        })
        .select()
        .single();

      if (courseError) throw courseError;
      const newCourse = newCourseData as any;

      // 2. Upload files and create course files records
      const fileRecords = [];
      for (const file of files) {
        // Construct path following RLS pattern (starts with auth.uid())
        const fileExt = file.name.split('.').pop() || 'pdf';
        const filePath = `${user.id}/${Date.now()}_${sanitizeFilename(file.name)}`;
        
        const { error: uploadError } = await supabase.storage
          .from('course-uploads')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        fileRecords.push({
          course_id: newCourse.id,
          user_id: user.id,
          filename: file.name,
          kind: fileExt,
          storage_path: filePath
        });
      }
      await (supabase.from('course_files') as any).insert(fileRecords);

      // Redirect to Stage 3 (Analysis)
      router.push(`/courses/${newCourse.id}/analysis`);
    } catch (err) {
      console.error('Error creating course:', err);
      alert('Error creating course. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }} className="animate-fade-in responsive-container responsive-pad">
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', textTransform: 'uppercase' }}>
          NEW{' '}
          <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', color: 'var(--magenta)' }}>
            course
          </span>
        </h1>
        <p style={{ color: 'var(--muted)', marginTop: '8px' }}>
          Upload your lecture slides, handouts, and past papers. The course is your upload.
        </p>
      </div>

      {/* Upload zone */}
      <Card padding="lg" style={{ marginBottom: '24px' }}>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          style={{
            border: `3px dashed ${dragActive ? 'var(--cobalt)' : 'var(--line)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '48px 32px',
            textAlign: 'center',
            background: dragActive ? 'rgba(42,59,201,0.04)' : 'var(--surface)',
            transition: 'all var(--transition-fast)',
            cursor: 'pointer',
          }}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <input
            id="file-input"
            type="file"
            multiple
            accept=".pdf,.pptx,.ppt,.docx,.doc,.txt,.png,.jpg,.jpeg"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>
            {dragActive ? '📥' : '📂'}
          </div>
          <p style={{ fontWeight: 600, fontSize: 'var(--text-lg)', marginBottom: '8px' }}>
            {dragActive ? 'Drop files here' : 'Drag & drop your course materials'}
          </p>
          <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>
            PDF, PowerPoint, Word, images — up to 10MB and 3 files per course
          </p>
          <p style={{ color: 'var(--muted-light)', fontSize: 'var(--text-xs)', marginTop: '8px' }}>
            Past papers are especially helpful for calibrating your exam preparation
          </p>
        </div>

        {/* Mock file buttons removed — only available in development */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px', flexWrap: 'wrap' }}>
            <Button variant="ghost" size="sm" onClick={() => {
              const blob = new Blob(['mock content'], { type: 'application/pdf' });
              const file = new File([blob], 'CHE357_Lectures.pdf', { type: 'application/pdf' });
              setFiles((prev) => [...prev, file]);
              if (!courseName) setCourseName('CHE 357 — Reaction Engineering');
            }}>
              + CHE 357 Mock
            </Button>
          </div>
        )}

        {/* File list */}
        {files.length > 0 && (
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--muted)' }}>
              UPLOADED FILES ({files.length})
            </h3>
            {files.map((file, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface)',
                  fontSize: 'var(--text-sm)',
                }}
              >
                <span>{getFileIcon(file.name)}</span>
                <span style={{ flex: 1, fontWeight: 500 }}>{file.name}</span>
                <Badge variant="muted" size="sm">
                  {(file.size / 1024).toFixed(0)} KB
                </Badge>
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    fontSize: 'var(--text-base)',
                    padding: '4px',
                    minHeight: '32px',
                  }}
                  aria-label={`Remove ${file.name}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Course details */}
      <Card padding="lg">
        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: '20px' }}>
          Course details
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <Input
            label="Course name"
            placeholder="Auto-suggested from your files"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            hint="We'll suggest a name from your uploaded files"
            id="course-name"
          />

          <Input
            label="Exam date (optional)"
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            hint="Helps us schedule your review sessions"
            id="exam-date"
          />

          <Slider
            label="How difficult is this course for you?"
            value={difficulty}
            min={1}
            max={10}
            onChange={setDifficulty}
            formatValue={(v) => `${v}/10`}
          />
        </div>

        <Button
          style={{ width: '100%', marginTop: '32px' }}
          size="lg"
          onClick={handleSubmit}
          loading={loading}
          disabled={files.length === 0 || !courseName || loading}
        >
          Create course & start analysis →
        </Button>
      </Card>
    </div>
  );
}
