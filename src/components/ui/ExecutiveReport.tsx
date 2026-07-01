import React from 'react';
import { Target, Trophy, AlertTriangle, TrendingUp, Lightbulb, CheckCircle } from 'lucide-react';
import DOMPurify from 'isomorphic-dompurify';

const SECTION_STYLES: Record<string, { icon: React.ElementType, color: string, bg: string, border: string }> = {
  // Profile Analysis Keys
  'overall profile': { icon: Target, color: 'var(--navy)', bg: 'var(--paper-2)', border: 'var(--line)' },
  'key strengths': { icon: Trophy, color: 'var(--green)', bg: 'var(--green-soft)', border: 'var(--green)' },
  'struggle': { icon: AlertTriangle, color: 'var(--magenta)', bg: '#FEF2F0', border: 'var(--magenta)' },
  'academic trajectory': { icon: TrendingUp, color: 'var(--cobalt)', bg: 'var(--cobalt-soft)', border: 'var(--cobalt)' },
  'strategic recommendations': { icon: Lightbulb, color: 'var(--tangerine)', bg: '#FFF8F0', border: 'var(--tangerine)' },
  
  // Course Analysis Keys
  'demanding': { icon: Target, color: 'var(--navy)', bg: 'var(--paper-2)', border: 'var(--line)' },
  'excel': { icon: Trophy, color: 'var(--green)', bg: 'var(--green-soft)', border: 'var(--green)' },
  'friction': { icon: AlertTriangle, color: 'var(--magenta)', bg: '#FEF2F0', border: 'var(--magenta)' },
  'wassce': { icon: TrendingUp, color: 'var(--cobalt)', bg: 'var(--cobalt-soft)', border: 'var(--cobalt)' },
  'strategy': { icon: Lightbulb, color: 'var(--tangerine)', bg: '#FFF8F0', border: 'var(--tangerine)' },
};

function parseMarkdownToSections(markdown: string) {
  const lines = markdown.split('\n');
  const sections: { title: string; content: string }[] = [];
  let currentTitle = '';
  let currentContent: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('### ')) {
      if (currentTitle || currentContent.length > 0) {
        sections.push({ title: currentTitle, content: currentContent.join('\n').trim() });
      }
      currentTitle = line.replace('### ', '').trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }
  
  if (currentTitle || currentContent.length > 0) {
    sections.push({ title: currentTitle, content: currentContent.join('\n').trim() });
  }

  return sections;
}

export default function ExecutiveReport({ markdown }: { markdown: string }) {
  if (!markdown) return null;

  const sections = parseMarkdownToSections(markdown);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {sections.map((section, idx) => {
        // Find matching style or fallback
        const lowerTitle = section.title.toLowerCase();
        let style: { icon: React.ElementType; color: string; bg: string; border: string } = { icon: CheckCircle, color: 'var(--ink)', bg: 'var(--paper-2)', border: 'var(--line)' };
        
        for (const [key, val] of Object.entries(SECTION_STYLES)) {
          if (lowerTitle.includes(key)) {
            style = val;
            break;
          }
        }

        const Icon = style.icon;

        return (
          <div key={idx} style={{
            background: style.bg,
            border: `2px solid ${style.border}`,
            borderLeft: `5px solid ${style.border}`,
            borderRadius: 'var(--r-sm)',
            padding: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{
                width: '32px', height: '32px',
                background: '#fff',
                borderRadius: '8px',
                border: `2px solid ${style.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: style.color,
                flexShrink: 0,
              }}>
                <Icon size={16} />
              </div>
              <h3 style={{
                margin: 0, fontSize: 'var(--text-base)', fontWeight: 700,
                color: 'var(--ink)', fontFamily: 'var(--font-body)',
                lineHeight: 1.3,
              }}>
                {section.title || 'Analysis'}
              </h3>
            </div>
            
            <div style={{ color: 'var(--ink)', fontSize: '13.5px', lineHeight: '1.75', fontFamily: 'var(--font-body)' }}
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(
                  section.content
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    .replace(/\n\n/g, '<br/><br/>')
                    .replace(/^- (.*)/gm, '<li style="margin-left: 20px; list-style-type: disc;">$1</li>'),
                  { ALLOWED_TAGS: ['strong', 'em', 'br', 'li', 'ul', 'ol', 'p', 'span'], ALLOWED_ATTR: ['style'] }
                )
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
