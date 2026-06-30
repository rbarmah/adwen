import React from 'react';
import { Target, Trophy, AlertTriangle, TrendingUp, Lightbulb, CheckCircle } from 'lucide-react';
import DOMPurify from 'isomorphic-dompurify';

const SECTION_STYLES: Record<string, { icon: React.ElementType, color: string, bg: string, border: string }> = {
  // Profile Analysis Keys
  'overall profile': { icon: Target, color: '#1B3055', bg: 'linear-gradient(135deg, #F0F4F8, #E2E8F0)', border: '#CBD5E1' },
  'key strengths': { icon: Trophy, color: '#00A99D', bg: 'linear-gradient(135deg, #E6F9F7, #F0FBF9)', border: '#B3EDE7' },
  'struggle': { icon: AlertTriangle, color: '#E24329', bg: 'linear-gradient(135deg, #FEF2F0, #FFF8F7)', border: '#FAD8D1' },
  'academic trajectory': { icon: TrendingUp, color: '#2563EB', bg: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)', border: '#BFDBFE' },
  'strategic recommendations': { icon: Lightbulb, color: '#F59E0B', bg: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)', border: '#FDE68A' },
  
  // Course Analysis Keys
  'demanding': { icon: Target, color: '#1B3055', bg: 'linear-gradient(135deg, #F0F4F8, #E2E8F0)', border: '#CBD5E1' },
  'excel': { icon: Trophy, color: '#00A99D', bg: 'linear-gradient(135deg, #E6F9F7, #F0FBF9)', border: '#B3EDE7' },
  'friction': { icon: AlertTriangle, color: '#E24329', bg: 'linear-gradient(135deg, #FEF2F0, #FFF8F7)', border: '#FAD8D1' },
  'wassce': { icon: TrendingUp, color: '#2563EB', bg: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)', border: '#BFDBFE' },
  'strategy': { icon: Lightbulb, color: '#F59E0B', bg: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)', border: '#FDE68A' },
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {sections.map((section, idx) => {
        // Find matching style or fallback
        const lowerTitle = section.title.toLowerCase();
        let style: { icon: React.ElementType; color: string; bg: string; border: string } = { icon: CheckCircle, color: '#475569', bg: '#F8FAFC', border: '#E2E8F0' };
        
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
            border: `1px solid ${style.border}`,
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                background: '#fff',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                color: style.color
              }}>
                <Icon size={20} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: style.color, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {section.title || 'Analysis'}
              </h3>
            </div>
            
            <div style={{ color: '#334155', fontSize: '15px', lineHeight: '1.6', fontFamily: 'var(--font-body)' }}
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
