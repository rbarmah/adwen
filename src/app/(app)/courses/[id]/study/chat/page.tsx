'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import MathText from '@/components/ui/MathText';

type Message = { role: 'user' | 'assistant'; content: string; streaming?: boolean };

// L1 cache — survives topic switches within the same session
const chatCache = new Map<string, Message[]>();

const QUICK_PROMPTS = [
  "Explain this topic simply 🧠",
  'Give me a worked example 📐',
  'What do examiners test here? 🎯',
  'Common mistakes students make? ⚠️',
  'How does this connect to the rest? 🔗',
  'Quiz me on this topic 💪',
];

// ─── Rich Markdown Renderer ──────────────────────────────────────────────────
// Renders headings (coloured), bullets, numbered lists, bold, inline code,
// blockquotes, and horizontal rules — all with the Adwen design system.

function ChatMarkdown({ text }: { text: string }) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ── Heading: ### → h4, ## → h3, # → h2
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      const colors = ['var(--cobalt)', 'var(--magenta)', 'var(--green)'];
      const sizes = ['15px', '14px', '13.5px'];
      elements.push(
        <div key={i} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginTop: i === 0 ? 0 : '18px',
          marginBottom: '8px',
        }}>
          <div style={{
            width: '3px',
            height: level === 1 ? '20px' : '16px',
            borderRadius: '3px',
            background: colors[level - 1] || 'var(--cobalt)',
            flexShrink: 0,
          }} />
          <span style={{
            fontFamily: 'var(--font-body)',
            fontSize: sizes[level - 1] || '14px',
            fontWeight: 800,
            color: colors[level - 1] || 'var(--ink)',
            letterSpacing: '-0.01em',
            lineHeight: 1.3,
          }}>
            <InlineFormat text={content} />
          </span>
        </div>
      );
      i++;
      continue;
    }

    // ── Horizontal rule
    if (/^---+$/.test(line.trim())) {
      elements.push(
        <hr key={i} style={{
          border: 'none',
          borderTop: '2px solid var(--line)',
          margin: '14px 0',
        }} />
      );
      i++;
      continue;
    }

    // ── Blockquote (with smart coloring for exam tips vs warnings)
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      const joinedQuote = quoteLines.join(' ');
      const isWarning = joinedQuote.includes('⚠️') || joinedQuote.toLowerCase().includes('watch out') || joinedQuote.toLowerCase().includes('trap') || joinedQuote.toLowerCase().includes('common mistake');
      const isExamTip = joinedQuote.includes('🎯') || joinedQuote.toLowerCase().includes('exam tip');
      const isInsight = joinedQuote.includes('💡');

      const accentColor = isWarning ? 'var(--tangerine)' : isExamTip ? 'var(--green)' : isInsight ? 'var(--cobalt)' : 'var(--cobalt)';
      const bgColor = isWarning ? '#FEF3E8' : isExamTip ? 'var(--green-soft)' : isInsight ? 'var(--cobalt-soft)' : 'var(--cobalt-soft)';

      elements.push(
        <div key={`q-${i}`} style={{
          borderLeft: `3px solid ${accentColor}`,
          background: bgColor,
          padding: '11px 14px',
          borderRadius: '0 10px 10px 0',
          margin: '10px 0',
          fontSize: '13px',
          lineHeight: 1.7,
          color: 'var(--ink)',
          fontWeight: 500,
        }}>
          <InlineFormat text={quoteLines.join('\n')} />
        </div>
      );
      continue;
    }

    // ── Unordered list (- or *)
    if (/^\s*[-*]\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} style={{
          margin: '6px 0',
          paddingLeft: '6px',
          display: 'flex',
          flexDirection: 'column',
          gap: '5px',
          listStyle: 'none',
        }}>
          {listItems.map((item, j) => (
            <li key={j} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              lineHeight: 1.75,
              fontSize: '14px',
            }}>
              <span style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: 'var(--cobalt)',
                flexShrink: 0,
                marginTop: '8px',
              }} />
              <span><InlineFormat text={item} /></span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // ── Numbered list
    if (/^\s*\d+[\.\)]\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\s*\d+[\.\)]\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\s*\d+[\.\)]\s+/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} style={{
          margin: '6px 0',
          paddingLeft: '0',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          listStyle: 'none',
          counterReset: 'adwen-ol',
        }}>
          {listItems.map((item, j) => (
            <li key={j} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              lineHeight: 1.7,
              counterIncrement: 'adwen-ol',
            }}>
              <span style={{
                width: '20px',
                height: '20px',
                borderRadius: '6px',
                background: 'var(--cobalt)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                flexShrink: 0,
                marginTop: '3px',
              }}>
                {j + 1}
              </span>
              <span><InlineFormat text={item} /></span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // ── Empty line → small spacer
    if (line.trim() === '') {
      elements.push(<div key={i} style={{ height: '6px' }} />);
      i++;
      continue;
    }

    // ── Regular paragraph
    elements.push(
      <p key={i} style={{ margin: '2px 0', lineHeight: 1.8 }}>
        <InlineFormat text={line} />
      </p>
    );
    i++;
  }

  return <>{elements}</>;
}

// Inline formatting: **bold**, `code`, *italic*
function InlineFormat({ text }: { text: string }) {
  // Split on bold, code, and italic markers
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('`') && part.endsWith('`'))
          return (
            <code key={i} style={{
              background: 'rgba(42,59,201,0.08)',
              border: '1px solid rgba(42,59,201,0.15)',
              padding: '1px 6px',
              borderRadius: '5px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.88em',
              fontWeight: 600,
              color: 'var(--cobalt)',
            }}>
              {part.slice(1, -1)}
            </code>
          );
        if (part.startsWith('**') && part.endsWith('**'))
          return <strong key={i} style={{ fontWeight: 800, color: 'var(--ink)' }}>{part.slice(2, -2)}</strong>;
        if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**'))
          return <em key={i} style={{ fontStyle: 'italic', color: 'var(--muted)' }}>{part.slice(1, -1)}</em>;
        return <MathText key={i} text={part} />;
      })}
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function StudyChatPage() {
  const params   = useParams();
  const router   = useRouter();
  const courseId = params.id as string;

  const [topics,       setTopics]       = useState<any[]>([]);
  const [currentTopic, setCurrentTopic] = useState(0);
  const [courseName,   setCourseName]   = useState('');
  const [loading,      setLoading]      = useState(true);
  const [messages,     setMessages]     = useState<Message[]>([]);
  const [chatInput,    setChatInput]    = useState('');
  const [chatLoading,  setChatLoading]  = useState(false);

  const chatEndRef  = useRef<HTMLDivElement>(null);
  const chatInputRef= useRef<HTMLTextAreaElement>(null);
  const abortRef    = useRef<AbortController | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const savingRef   = useRef(false);
  const [mobileTopicsOpen, setMobileTopicsOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
      const { data: c } = await supabase.from('courses').select('name').eq('id', courseId).single();
      if (c) setCourseName((c as any).name);

      const { data: ms } = await supabase.from('mastery_states').select('skill_or_topic,p_mastered').eq('course_id', courseId).order('id');
      const list = (ms as any[]) || [];
      const seen = new Set<string>();
      const deduped = list.filter(m => { if (seen.has(m.skill_or_topic)) return false; seen.add(m.skill_or_topic); return true; });

      if (deduped.length > 0) {
        setTopics(deduped.map(m => ({ name: m.skill_or_topic, mastery: Math.round(m.p_mastered * 100) })));
      } else {
        const { data: u } = await supabase.from('content_units').select('topic').eq('course_id', courseId);
        const seen2 = new Set<string>();
        const units = ((u as any[]) || []).filter(x => { if (seen2.has(x.topic)) return false; seen2.add(x.topic); return true; });
        setTopics(units.map(x => ({ name: x.topic, mastery: 35 })));
      }
      setLoading(false);
    };
    load();
  }, [courseId]);

  // Load persisted chat when topic changes
  useEffect(() => {
    if (!topics.length || !courseId) return;
    const topicName = topics[currentTopic]?.name;
    if (!topicName) return;

    const cacheKey = `${courseId}|${topicName}`;

    // L1 hit — instant
    if (chatCache.has(cacheKey)) {
      setMessages(chatCache.get(cacheKey)!);
      return;
    }

    // L2 — load from Supabase
    const loadChat = async () => {
      const supabase = createClient();
      const { data } = await (supabase
        .from('chat_messages') as any)
        .select('role, content')
        .eq('course_id', courseId)
        .eq('topic', topicName)
        .order('created_at', { ascending: true });

      const loaded: Message[] = (data || []).map((r: any) => ({
        role: r.role as 'user' | 'assistant',
        content: r.content,
      }));
      chatCache.set(cacheKey, loaded);
      setMessages(loaded);
    };
    loadChat();
  }, [currentTopic, topics, courseId]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || chatLoading) return;
    const topicName = topics[currentTopic]?.name || 'this topic';
    const userMsg: Message = { role: 'user', content: text.trim() };
    const newMsgs = [...messages, userMsg];
    setMessages([...newMsgs, { role: 'assistant', content: '', streaming: true }]);
    setChatInput(''); setChatLoading(true);
    abortRef.current = new AbortController();
    try {
      const res = await fetch(`/api/courses/${courseId}/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMsgs.map(m => ({ role: m.role, content: m.content })), topic: topicName }),
        signal: abortRef.current.signal,
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `${res.status}`); }
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const d = line.slice(6).trim();
          if (d === '[DONE]') break;
          try { const p = JSON.parse(d); if (p.text) { buf += p.text; setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: 'assistant', content: buf, streaming: true }; return u; }); } } catch { /* partial */ }
        }
      }
      setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: 'assistant', content: buf, streaming: false }; return u; });

      // ── Persist both messages to Supabase ──
      const topicForSave = topics[currentTopic]?.name || 'unknown';
      const cacheKey = `${courseId}|${topicForSave}`;
      if (userId && !savingRef.current) {
        savingRef.current = true;
        const supabase = createClient();
        await (supabase.from('chat_messages') as any).insert([
          { user_id: userId, course_id: courseId, topic: topicForSave, role: 'user', content: text.trim() },
          { user_id: userId, course_id: courseId, topic: topicForSave, role: 'assistant', content: buf },
        ]).then(() => {
          // Update L1 cache
          const final = [...newMsgs, { role: 'assistant' as const, content: buf }];
          chatCache.set(cacheKey, final);
        }).catch((e: any) => console.warn('[chat] Save error:', e))
          .finally(() => { savingRef.current = false; });
      }
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: 'assistant', content: `Sorry, I couldn't respond: ${e.message}`, streaming: false }; return u; });
    } finally { setChatLoading(false); abortRef.current = null; setTimeout(() => chatInputRef.current?.focus(), 80); }
  }, [chatLoading, messages, topics, currentTopic, courseId, userId]);

  // ── Clear chat for the current topic ──
  const clearChat = useCallback(async () => {
    const topicName = topics[currentTopic]?.name;
    if (!topicName || !userId) return;
    setMessages([]);
    chatCache.set(`${courseId}|${topicName}`, []);
    const supabase = createClient();
    await (supabase.from('chat_messages') as any)
      .delete()
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .eq('topic', topicName)
      .then(() => {})
      .catch((e: any) => console.warn('[chat] Clear error:', e));
  }, [topics, currentTopic, courseId, userId]);

  const topicName = topics[currentTopic]?.name || '';

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="skeleton" style={{ height: '36px', width: '180px' }} />
      <div className="skeleton" style={{ height: '400px' }} />
    </div>
  );

  const renderTopics = () => (
    <>
      <h3 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Topics</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {topics.map((topic, i) => (
          <button key={i} onClick={() => { setCurrentTopic(i); setMobileTopicsOpen(false); }} style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: 'none', background: currentTopic === i ? 'rgba(42,59,201,0.06)' : 'transparent', color: currentTopic === i ? 'var(--cobalt)' : 'var(--ink)', cursor: 'pointer', fontSize: '12.5px', fontWeight: currentTopic === i ? 700 : 500, textAlign: 'left', fontFamily: 'var(--font-body)', width: '100%', transition: 'all 0.15s' }}>
            {topic.name}
          </button>
        ))}
      </div>
      {messages.length > 0 && (
        <button onClick={clearChat} style={{
          marginTop: '12px',
          padding: '7px 10px',
          borderRadius: 'var(--radius-sm)',
          border: '1.5px solid var(--line)',
          background: 'transparent',
          color: 'var(--muted)',
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: 600,
          fontFamily: 'var(--font-body)',
          width: '100%',
          transition: 'all 0.15s',
          textAlign: 'center',
        }}>
          🗑 Clear this chat
        </button>
      )}
    </>
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={() => router.push(`/courses/${courseId}/study`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-body)', padding: '4px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
            ← Study Room
          </button>
          <span className="desktop-only" style={{ color: 'var(--line)' }}>·</span>
          <h1 className="desktop-only" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', textTransform: 'uppercase', lineHeight: 1, margin: 0 }}>
            💬 Chat with <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', color: 'var(--cobalt)', fontSize: '1.1em' }}>Adwen</span>
          </h1>
          <span className="desktop-only" style={{ fontSize: '13px', color: 'var(--muted)', marginLeft: '12px' }}>{courseName}</span>
        </div>
        <button 
          className="mobile-only"
          onClick={() => setMobileTopicsOpen(true)} 
          style={{ background: 'var(--paper-2)', border: '2px solid var(--ink)', padding: '6px 14px', borderRadius: '99px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '10.5px', fontWeight: 700, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
        >
          Topics <span style={{ color: 'var(--ink)', fontSize: '14px' }}>▾</span>
        </button>
      </div>

      {/* Layout */}
      <div className="responsive-grid-1" style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '20px', flex: 1, minHeight: 0 }}>
        {/* Topic sidebar */}
        <div className="desktop-only card-premium" style={{ padding: '16px', overflowY: 'auto' }}>
          {renderTopics()}
        </div>

        {/* Chat area */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* Messages */}
          <div className="card-premium responsive-pad-sm" style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px', minHeight: 0 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 16px' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>💬</div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase' }}>
                  Chat about <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', color: 'var(--cobalt)', fontSize: '1.1em' }}>{topicName}</span>
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '28px', lineHeight: 1.7, maxWidth: '360px', margin: '0 auto 28px' }}>
                  Adwen answers from your actual uploaded notes. Ask anything.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                  {QUICK_PROMPTS.map((p, qi) => (
                    <button key={qi} onClick={() => sendMessage(p)} style={{
                      padding: '8px 16px',
                      borderRadius: '999px',
                      border: '2px solid var(--ink)',
                      background: '#fff',
                      fontSize: '12.5px',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-body)',
                      color: 'var(--ink)',
                      fontWeight: 700,
                      transition: 'all 0.15s',
                      boxShadow: '0 2px 0 var(--ink)',
                    }}
                      onMouseEnter={e => {
                        (e.target as HTMLElement).style.background = 'var(--ink)';
                        (e.target as HTMLElement).style.color = '#fff';
                        (e.target as HTMLElement).style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={e => {
                        (e.target as HTMLElement).style.background = '#fff';
                        (e.target as HTMLElement).style.color = 'var(--ink)';
                        (e.target as HTMLElement).style.transform = 'none';
                      }}
                    >{p}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                gap: '14px',
                alignItems: 'flex-start',
              }}>
                {/* Avatar */}
                {msg.role === 'user' ? (
                  <div style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '10px',
                    flexShrink: 0,
                    background: 'var(--cobalt)',
                    border: '2px solid var(--ink)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    color: '#fff',
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                  }}>
                    Y
                  </div>
                ) : (
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '12px',
                    flexShrink: 0,
                    background: 'var(--ink)',
                    border: '2px solid var(--ink)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    <span style={{
                      fontFamily: 'var(--font-accent)',
                      fontSize: '18px',
                      fontWeight: 700,
                      color: 'var(--lime)',
                      lineHeight: 1,
                    }}>A</span>
                  </div>
                )}

                {/* User bubble */}
                {msg.role === 'user' ? (
                  <div style={{
                    maxWidth: '72%',
                    padding: '12px 18px',
                    borderRadius: '16px 4px 16px 16px',
                    background: 'var(--cobalt)',
                    color: '#fff',
                    border: '2px solid var(--ink)',
                    fontSize: '14px',
                    lineHeight: 1.7,
                    boxShadow: '0 2px 0 var(--ink)',
                    fontWeight: 500,
                  }}>
                    {msg.content}
                  </div>
                ) : (
                  /* Assistant bubble — premium card */
                  <div style={{
                    maxWidth: '88%',
                    borderRadius: '2px 18px 18px 18px',
                    background: '#fff',
                    border: '1.5px solid rgba(14,14,14,0.08)',
                    boxShadow: '0 1px 3px rgba(14,14,14,0.04), 0 6px 24px rgba(14,14,14,0.06)',
                    overflow: 'hidden',
                  }}>
                    {/* Subtle top accent line */}
                    <div style={{
                      height: '3px',
                      background: 'linear-gradient(90deg, var(--cobalt), var(--magenta), var(--tangerine))',
                      opacity: 0.7,
                    }} />

                    {/* Content area */}
                    <div style={{
                      padding: '16px 20px 18px',
                      fontSize: '14px',
                      lineHeight: 1.8,
                      color: 'var(--ink)',
                    }}>
                      <ChatMarkdown text={msg.content} />
                      {msg.streaming && (
                        <span style={{
                          display: 'inline-block',
                          width: '2px',
                          height: '16px',
                          background: 'var(--cobalt)',
                          borderRadius: '1px',
                          marginLeft: '2px',
                          animation: 'blink 1s step-end infinite',
                          verticalAlign: 'text-bottom',
                        }} />
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div style={{ borderTop: '2px solid var(--line)', paddingTop: '14px', display: 'flex', gap: '10px', alignItems: 'flex-end', flexShrink: 0, marginTop: '14px' }}>
            <textarea ref={chatInputRef} value={chatInput} onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(chatInput); } }}
              placeholder={`Ask about ${topicName}...`}
              disabled={chatLoading} rows={2}
              style={{
                flex: 1, resize: 'none', padding: '12px 16px',
                borderRadius: '14px',
                border: '2px solid var(--ink)',
                fontFamily: 'var(--font-body)', fontSize: '14px',
                lineHeight: 1.6, outline: 'none', background: '#fff',
                color: 'var(--ink)', transition: 'border-color 0.15s',
                boxShadow: '0 2px 0 var(--ink)',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--cobalt)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--ink)'; }}
            />
            <Button onClick={() => sendMessage(chatInput)} disabled={!chatInput.trim() || chatLoading} loading={chatLoading} size="md" style={{ flexShrink: 0, alignSelf: 'flex-end', padding: '10px 16px' }}>
              <span className="desktop-only">Send →</span>
              <span className="mobile-only" style={{ fontSize: '18px', fontWeight: 800, lineHeight: 1 }}>↑</span>
            </Button>
            {chatLoading && <Button variant="ghost" size="md" onClick={() => abortRef.current?.abort()} style={{ flexShrink: 0, alignSelf: 'flex-end', padding: '10px 16px' }}>
              <span className="desktop-only">Stop</span>
              <span className="mobile-only" style={{ fontSize: '18px', fontWeight: 800, lineHeight: 1 }}>■</span>
            </Button>}
          </div>
        </div>
      </div>

      {/* ── Mobile Topics Drawer ── */}
      {mobileTopicsOpen && (
        <div className="mobile-only">
          <div className="sidebar-overlay open" onClick={() => setMobileTopicsOpen(false)} style={{ zIndex: 9998 }} />
          <aside className="sidebar-drawer open" style={{ background: 'var(--surface-2)', padding: '24px 20px', zIndex: 9999 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <span style={{ fontWeight: 800, fontSize: 16 }}>Topics</span>
              <button onClick={() => setMobileTopicsOpen(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: 'var(--ink)' }}>✕</button>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 80px)', paddingBottom: '24px' }}>
              {renderTopics()}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
