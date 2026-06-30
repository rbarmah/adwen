'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// ─── Types ──────────────────────────────────────────────────────────────────
type Phase = 'topic_select' | 'briefing' | 'conversation' | 'thinking' | 'feedback' | 'challenge';

interface FeynmanResult {
  feynman_score: number;
  verdict: string;
  correct_points: string[];
  missing_concepts: string[];
  misconceptions: string[];
  ideal_explanation: string;
  follow_up_question: string;
  encouragement: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// ─── Score color mapping ─────────────────────────────────────────────────────
function getScoreColor(score: number) {
  if (score >= 85) return { main: 'var(--green)', bg: 'rgba(34,197,94,0.1)',  label: 'Excellent' };
  if (score >= 70) return { main: 'var(--cobalt)', bg: 'rgba(59,130,246,0.1)', label: 'Good' };
  if (score >= 50) return { main: 'var(--tangerine)', bg: 'rgba(245,158,11,0.1)', label: 'Partial' };
  if (score >= 30) return { main: 'var(--magenta)', bg: 'rgba(239,68,68,0.1)',  label: 'Weak' };
  return { main: 'var(--cobalt)', bg: 'rgba(124,58,237,0.1)', label: 'Try Again' };
}

// ─── Animated score circle ───────────────────────────────────────────────────
function ScoreCircle({ score }: { score: number }) {
  const [displayScore, setDisplayScore] = useState(0);
  const { main, bg, label } = getScoreColor(score);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = (displayScore / 100) * circumference;

  useEffect(() => {
    let frame: number;
    const start = Date.now();
    const duration = 1200;
    const animate = () => {
      const elapsed = Date.now() - start;
      const pct = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - pct, 3);
      setDisplayScore(Math.round(eased * score));
      if (pct < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div style={{ position: 'relative', width: '140px', height: '140px' }}>
        <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="70" cy="70" r={radius} fill="none" stroke="var(--ink)" strokeWidth="12" />
          <circle
            cx="70" cy="70" r={radius} fill="none"
            stroke={main} strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.05s linear' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: '2.2rem', fontWeight: 900, color: main, lineHeight: 1 }}>
            {displayScore}
          </span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em' }}>
            / 100
          </span>
        </div>
      </div>
      <div style={{
        padding: '6px 18px', borderRadius: '999px',
        background: bg, border: `1.5px solid ${main}`,
        fontSize: '13px', fontWeight: 700, color: main,
      }}>
        {label}
      </div>
    </div>
  );
}

// ─── Waveform animation (when mic is active) ─────────────────────────────────
function Waveform({ active }: { active: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '32px' }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} style={{
          width: '3px',
          borderRadius: '3px',
          background: active ? 'var(--green)' : 'var(--line)',
          height: active ? `${20 + Math.sin(i * 0.8) * 12}px` : '6px',
          animation: active ? `wave ${0.5 + i * 0.08}s ease-in-out infinite alternate` : 'none',
          transition: 'all 0.3s ease',
        }} />
      ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function TeachItBackRoom() {
  const params   = useParams();
  const router   = useRouter();
  const courseId = params.id as string;

  const [phase,       setPhase]       = useState<Phase>('topic_select');
  const [topics,      setTopics]      = useState<any[]>([]);
  const [activeTopic, setActiveTopic] = useState<any>(null);
  const [briefing,    setBriefing]    = useState<string>('');
  const [loading,     setLoading]     = useState(true);
  const [courseName,  setCourseName]  = useState('');

  // Conversation state
  const [transcript,      setTranscript]      = useState<Message[]>([]);
  const [currentInput,    setCurrentInput]    = useState('');
  const [isAiTyping,      setIsAiTyping]      = useState(false);
  const chatEndRef        = useRef<HTMLDivElement>(null);

  // Recording state
  const [isListening,     setIsListening]     = useState(false);
  const [isTranscribing,  setIsTranscribing]  = useState(false);
  const [voiceSupported,  setVoiceSupported]  = useState(false);
  const mediaRecorderRef  = useRef<MediaRecorder | null>(null);
  const audioChunksRef    = useRef<Blob[]>([]);

  // Feedback state
  const [result,          setResult]          = useState<FeynmanResult | null>(null);
  const [evaluating,      setEvaluating]      = useState(false);
  const [evalError,       setEvalError]       = useState<string | null>(null);
  const [speakingSection, setSpeakingSection] = useState<string | null>(null);

  // Challenge state
  const [challengeAnswer,  setChallengeAnswer]  = useState('');
  const [challengeDone,    setChallengeDone]    = useState(false);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, isAiTyping]);

  // ─── Fetch topics ──────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: c } = await supabase.from('courses').select('name').eq('id', courseId).single();
      if (c) setCourseName((c as any).name);

      const { data: ms } = await supabase.from('mastery_states').select('*').eq('course_id', courseId).order('id');
      const list = (ms as any) || [];
      const seen = new Set<string>();
      const deduped = list.filter((m: any) => {
        if (seen.has(m.skill_or_topic)) return false;
        seen.add(m.skill_or_topic);
        return true;
      });
      setTopics(deduped.map((m: any) => ({
        name: m.skill_or_topic,
        mastery: Math.round(m.p_mastered * 100),
      })));
      setLoading(false);
    };
    load();

    // Check voice support
    if (typeof window !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      setVoiceSupported(true);
    }
  }, [courseId]);

  // ─── Topic selection ───────────────────────────────────────────────────────
  const handleSelectTopic = useCallback(async (topic: any) => {
    setActiveTopic(topic);
    setPhase('briefing');
    setTranscript([]);
    setCurrentInput('');
    setResult(null);
    setEvalError(null);
    setChallengeAnswer('');
    setChallengeDone(false);

    // Fetch brief overview from content_units
    const supabase = createClient();
    const { data: unit } = await (supabase.from('content_units') as any)
      .select('cleaned_text')
      .eq('course_id', courseId)
      .eq('topic', topic.name)
      .maybeSingle();

    if (unit?.cleaned_text) {
      // Take first 600 chars as briefing
      const text = unit.cleaned_text.slice(0, 600);
      setBriefing(text + (unit.cleaned_text.length > 600 ? '...' : ''));
    } else {
      setBriefing('');
    }
  }, [courseId]);

  const startConversation = () => {
    setPhase('conversation');
    setTranscript([
      {
        role: 'assistant',
        content: `So, what is ${activeTopic.name} about? Explain it to me like I'm a classmate who missed that lecture.`
      }
    ]);
  };

  // ─── Voice input ───────────────────────────────────────────────────────────
  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        setIsListening(false);
        setIsTranscribing(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());

        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.webm');

        try {
          const res = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          });
          if (res.ok) {
            const data = await res.json();
            setCurrentInput(prev => (prev + ' ' + data.text).trim());
          } else {
            console.error('Failed to transcribe audio');
          }
        } catch (error) {
          console.error('Transcription error:', error);
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsListening(true);
    } catch (error) {
      console.error('Microphone access denied or error', error);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      setIsListening(false);
    }
  }, []);

  // ─── Sending messages ──────────────────────────────────────────────────────
  const handleSendMessage = async () => {
    if (!currentInput.trim() || isAiTyping || isTranscribing) return;
    
    if (isListening) stopListening();

    const newMessage: Message = { role: 'user', content: currentInput.trim() };
    const updatedTranscript = [...transcript, newMessage];
    
    setTranscript(updatedTranscript);
    setCurrentInput('');
    setIsAiTyping(true);

    try {
      const res = await fetch(`/api/courses/${courseId}/feynman-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: activeTopic.name, transcript: updatedTranscript }),
      });

      if (!res.ok) {
        throw new Error('Failed to fetch reply');
      }

      const data = await res.json();
      setTranscript(prev => [...prev, { role: 'assistant', content: data.message }]);
    } catch (error) {
      console.error('Chat error:', error);
      setTranscript(prev => [...prev, { role: 'assistant', content: 'Oops, I lost my train of thought. Can you repeat that or continue?' }]);
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ─── TTS (browser Speech Synthesis) ────────────────────────────────────────
  const speak = useCallback((text: string, sectionKey: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    if (speakingSection === sectionKey) {
      setSpeakingSection(null);
      return;
    }

    const utt = new SpeechSynthesisUtterance(text);
    utt.rate  = 0.95;
    utt.pitch = 1.0;
    // Prefer a natural voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en'))
      || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utt.voice = preferred;

    utt.onend   = () => setSpeakingSection(null);
    utt.onerror = () => setSpeakingSection(null);

    setSpeakingSection(sectionKey);
    window.speechSynthesis.speak(utt);
  }, [speakingSection]);

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setSpeakingSection(null);
  };

  // ─── Submit for evaluation ─────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    const userMessageCount = transcript.filter(m => m.role === 'user').length;
    if (userMessageCount < 2) return;
    if (isListening) stopListening();

    setEvaluating(true);
    setEvalError(null);
    setPhase('thinking');

    try {
      const res = await fetch(`/api/courses/${courseId}/feynman`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: activeTopic.name, transcript }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }

      const data: FeynmanResult = await res.json();
      setResult(data);
      setPhase('feedback');
    } catch (err: any) {
      setEvalError(err.message || 'Evaluation failed. Please try again.');
      setPhase('conversation');
    } finally {
      setEvaluating(false);
    }
  }, [transcript, isListening, stopListening, activeTopic, courseId]);

  // ─── RENDER ────────────────────────────────────────────────────────────────
  const userMessageCount = transcript.filter(m => m.role === 'user').length;
  const canSubmit = userMessageCount >= 2;

  return (
    <div className="animate-fade-in" style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'var(--font-body)',
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--paper-2)', borderBottom: '2px solid var(--ink)',
        padding: '16px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button className="btn btn-ghost" onClick={() => router.back()} style={{ padding: '8px 16px', fontSize: '13px' }}>
          ← Back to Study Room
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            padding: '6px 14px', borderRadius: '999px',
            background: 'var(--magenta)', border: '1px solid var(--magenta)',
            fontSize: '12px', fontWeight: 700, color: 'var(--magenta)', letterSpacing: '0.06em',
          }}>
            🎤 TEACH IT BACK
          </div>
          {activeTopic && (
            <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>
              {activeTopic.name}
            </span>
          )}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.05em' }}>
          FEYNMAN TECHNIQUE
        </div>
      </div>

      {/* ─────────────── PHASE: TOPIC SELECT ─────────────────── */}
      {phase === 'topic_select' && (
        <div style={{ maxWidth: '860px', margin: '0 auto', padding: '60px 40px', flex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '20px' }}>🎓</div>
            <h1 className="h-lg" style={{ justifyContent: 'center', display: 'flex', marginBottom: '16px' }}>
              Teach It Back
            </h1>
            <p style={{ fontSize: '1.05rem', color: 'var(--muted)', maxWidth: '480px', margin: '0 auto', lineHeight: 1.7 }}>
              Pick a topic. Explain it to Adwen as if you're the teacher.<br />
              Get scored on how well you actually understand it.
            </p>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: '80px', borderRadius: '14px', background: 'var(--paper-2)', animation: 'pulse 1.5s ease infinite' }} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
              {topics.map((topic, i) => {
                const { main } = getScoreColor(topic.mastery);
                return (
                  <button key={i} className="card card-interactive" onClick={() => handleSelectTopic(topic)} style={{
                    textAlign: 'left', width: '100%', display: 'flex', flexDirection: 'column'
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: '8px', textTransform: 'uppercase' }}>
                      Topic {i + 1}
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 700,  marginBottom: '16px', lineHeight: 1.4 }}>
                      {topic.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ flex: 1, height: '4px', borderRadius: '4px', background: 'var(--paper-2)' }}>
                        <div style={{ height: '100%', borderRadius: '4px', width: `${topic.mastery}%`, background: main, transition: 'width 0.6s ease' }} />
                      </div>
                      <span style={{ fontSize: '12px', color: main, fontWeight: 700 }}>{topic.mastery}%</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '8px' }}>
                      Current mastery
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─────────────── PHASE: BRIEFING ─────────────────────── */}
      {phase === 'briefing' && activeTopic && (
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '60px 40px', flex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📖</div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800,  margin: '0 0 8px' }}>
              Quick Refresher
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
              Study these key points for <strong style={{ color: 'var(--magenta)' }}>{activeTopic.name}</strong>. Then explain it back without looking.
            </p>
          </div>

          {briefing && (
            <div className="card" style={{ marginBottom: '28px', fontSize: '14px', lineHeight: 1.9, color: 'var(--ink)' }}>
              {briefing}
            </div>
          )}

          {!briefing && (
            <div className="callout callout-magenta" style={{ marginBottom: '28px', justifyContent: 'center' }}>
              No course material found for this topic yet. You can still try to explain what you know — Adwen will evaluate based on general academic knowledge.
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-ghost" onClick={() => setPhase('topic_select')} style={{ flex: 1, justifyContent: 'center' }}>
              ← Pick different topic
            </button>
            <button className="btn btn-primary" onClick={startConversation} style={{ flex: 2, justifyContent: 'center' }}>I'm ready to explain →</button>
          </div>
        </div>
      )}

      {/* ─────────────── PHASE: CONVERSATION ────────────────────── */}
      {phase === 'conversation' && activeTopic && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, maxWidth: '860px', margin: '0 auto', width: '100%', position: 'relative' }}>
          
          {/* Chat Transcript Area */}
          <div style={{ flex: 1, padding: '40px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '160px' }}>
            {transcript.map((msg, i) => {
              const isUser = msg.role === 'user';
              return (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-end',
                  gap: '12px'
                }}>
                  {!isUser && (
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: 'var(--green-soft)', border: '2px solid var(--green)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px'
                    }}>
                      🧑‍🎓
                    </div>
                  )}
                  <div style={{
                    maxWidth: '75%',
                    background: isUser ? 'var(--cobalt)' : 'var(--paper-2)',
                    color: isUser ? '#fff' : 'var(--ink)',
                    padding: '16px 20px',
                    borderRadius: isUser ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                    border: isUser ? 'none' : '2px solid var(--line)',
                    fontSize: '15px',
                    lineHeight: 1.6,
                    boxShadow: 'var(--shadow)'
                  }}>
                    {msg.content}
                  </div>
                </div>
              );
            })}

            {isAiTyping && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-end', gap: '12px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'var(--green-soft)', border: '2px solid var(--green)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px'
                }}>
                  🧑‍🎓
                </div>
                <div style={{
                  background: 'var(--paper-2)',
                  padding: '16px 20px',
                  borderRadius: '20px 20px 20px 4px',
                  border: '2px solid var(--line)',
                  display: 'flex', gap: '6px', alignItems: 'center'
                }}>
                  <div className="dot-typing" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--muted)', animation: 'pulse 1s infinite alternate' }} />
                  <div className="dot-typing" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--muted)', animation: 'pulse 1s infinite alternate 0.2s' }} />
                  <div className="dot-typing" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--muted)', animation: 'pulse 1s infinite alternate 0.4s' }} />
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Input Area (Sticky Bottom) */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'linear-gradient(to top, var(--paper) 70%, transparent)',
            padding: '24px 40px 40px',
            display: 'flex', flexDirection: 'column', gap: '12px'
          }}>
            
            {evalError && (
              <div style={{ background: 'var(--magenta)', color: '#fff', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', textAlign: 'center' }}>
                {evalError}
              </div>
            )}

            <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <textarea
                  value={currentInput}
                  onChange={e => setCurrentInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isTranscribing || isAiTyping || evaluating}
                  placeholder={isTranscribing ? "Transcribing audio..." : "Explain it here..."}
                  rows={Math.min(6, currentInput.split('\n').length || 1)}
                  style={{
                    width: '100%', background: 'var(--paper-2)',
                    border: '2px solid var(--ink)', boxShadow: 'var(--shadow-elevated)',
                    borderRadius: '16px', padding: '16px 54px 16px 16px', resize: 'none',
                    fontFamily: 'var(--font-body)', fontSize: '15px',
                    lineHeight: 1.5, outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--magenta)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--ink)'; }}
                />
                
                {/* Mic Button inside textarea */}
                {voiceSupported && (
                  <button 
                    className="btn-icon"
                    onClick={isListening ? stopListening : startListening}
                    disabled={isTranscribing || isAiTyping || evaluating}
                    style={{
                      position: 'absolute', right: '12px', bottom: '12px',
                      background: isListening ? 'var(--magenta)' : 'transparent',
                      color: isListening ? '#fff' : 'var(--muted)',
                      border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    title={isListening ? "Stop listening" : "Start speaking"}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      {isListening ? (
                        <rect x="6" y="6" width="12" height="12" />
                      ) : (
                        <>
                          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                          <line x1="12" x2="12" y1="19" y2="22" />
                        </>
                      )}
                    </svg>
                  </button>
                )}
              </div>
              
              <button 
                className="btn btn-primary"
                onClick={handleSendMessage}
                disabled={!currentInput.trim() || isTranscribing || isAiTyping || evaluating}
                style={{ height: '54px', width: '54px', padding: 0, borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13" />
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                </svg>
              </button>
            </div>

            {/* Sub-actions area */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px' }}>
              {isListening && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--magenta)', animation: 'pulse 1s infinite alternate' }} />
                  <span style={{ fontSize: '12px', color: 'var(--magenta)', fontWeight: 600 }}>Listening...</span>
                </div>
              )}
              {!isListening && (
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  {canSubmit ? "You can end the session to get your score now." : "Keep explaining to unlock evaluation."}
                </div>
              )}

              {canSubmit && (
                <button 
                  className="btn btn-primary"
                  onClick={handleSubmit}
                  disabled={evaluating || isAiTyping || isTranscribing}
                  style={{ padding: '6px 16px', fontSize: '13px', background: 'var(--green)', borderColor: 'var(--green)' }}
                >
                  {evaluating ? 'Evaluating...' : 'Get my score →'}
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ─────────────── PHASE: THINKING ─────────────────────── */}
      {phase === 'thinking' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 40px', textAlign: 'center', flex: 1 }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            border: '4px solid var(--line)', borderTop: '4px solid var(--magenta)',
            animation: 'spin 0.8s linear infinite', marginBottom: '32px',
          }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800,  marginBottom: '12px' }}>
            Adwen is evaluating your explanation...
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.7, maxWidth: '400px' }}>
            Checking coverage, accuracy, depth, and clarity against your course material.
          </p>
          <div style={{ marginTop: '32px', padding: '16px 24px', background: 'var(--paper-2)', borderRadius: '12px', maxWidth: '400px' }}>
            <p style={{ fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic', margin: 0, lineHeight: 1.6 }}>
              💡 The Feynman Technique — named after physicist Richard Feynman — says: if you can't explain it simply, you don't understand it yet.
            </p>
          </div>
        </div>
      )}

      {/* ─────────────── PHASE: FEEDBACK ─────────────────────── */}
      {phase === 'feedback' && result && (
        <div style={{ maxWidth: '820px', margin: '0 auto', padding: '40px 40px 80px', flex: 1 }}>
          {/* Score hero */}
          <div className="card" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '40px', flexWrap: 'wrap' }}>
            <ScoreCircle score={result.feynman_score} />
            <div style={{ flex: 1, minWidth: '260px' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>
                Adwen's Verdict
              </div>
              <p style={{ fontSize: '1.1rem',  lineHeight: 1.7, margin: '0 0 16px', fontWeight: 500 }}>
                {result.verdict}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, fontStyle: 'italic' }}>
                ✨ {result.encouragement}
              </p>
            </div>
          </div>

          {/* Correct / Missing / Misconceptions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            {/* Correct */}
            {result.correct_points.length > 0 && (
              <div style={{ background: 'var(--green-soft)', border: '2px solid var(--green)', borderRadius: '14px', padding: '20px' }}>
                <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--green)', marginBottom: '12px' }}>✅ What you got right</div>
                <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {result.correct_points.map((pt, i) => (
                    <li key={i} style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6 }}>{pt}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Missing */}
            {result.missing_concepts.length > 0 && (
              <div style={{ background: '#FDEBD7', border: '2px solid var(--tangerine)', borderRadius: '14px', padding: '20px' }}>
                <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--tangerine)', marginBottom: '12px' }}>⚠️ Missing concepts</div>
                <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {result.missing_concepts.map((c, i) => (
                    <li key={i} style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6 }}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Misconceptions — span full width if both columns above exist */}
            {result.misconceptions.length > 0 && (
              <div style={{ gridColumn: '1 / -1', background: '#FBDCEC', border: '2px solid var(--magenta)', borderRadius: '14px', padding: '20px' }}>
                <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--magenta)', marginBottom: '12px' }}>❌ Misconceptions — be careful here</div>
                <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {result.misconceptions.map((m, i) => (
                    <li key={i} style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6 }}>{m}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Ideal explanation */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                🎯 How a strong answer sounds
              </div>
              <button className="btn btn-ghost" onClick={() => speak(result.ideal_explanation, 'ideal')} style={{ padding: '6px 14px', fontSize: '12px' }}>
                {speakingSection === 'ideal' ? '⏸ Stop' : '🔊 Hear it'}
              </button>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.9, margin: 0 }}>
              {result.ideal_explanation}
            </p>
          </div>

          {/* Challenge question — leads to phase 6 */}
          <div className="callout callout-magenta" style={{ marginBottom: '28px', display: 'block' }}>
            <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--magenta)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              🎯 Challenge question
            </div>
            <p style={{ fontSize: '15px',  lineHeight: 1.7, margin: 0, fontWeight: 500 }}>
              {result.follow_up_question}
            </p>
          </div>

          {/* Action buttons */}
          <div className="actions"><button className="btn btn-ghost" onClick={() => { setTranscript([]); setPhase('topic_select'); setActiveTopic(null); }} style={{ flex: 1, justifyContent: 'center' }}>🔄 Try again</button><button className="btn btn-primary" onClick={() => setPhase('challenge')} style={{ flex: 2, justifyContent: 'center' }}>Answer the challenge question →</button><button className="btn btn-ghost" onClick={() => { setPhase('topic_select'); setActiveTopic(null); }} style={{ flex: 1, justifyContent: 'center' }}>Next topic →</button></div>
        </div>
      )}

      {/* ─────────────── PHASE: CHALLENGE ────────────────────── */}
      {phase === 'challenge' && result && (
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '60px 40px', flex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🎯</div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800,  marginBottom: '12px' }}>
              Challenge Question
            </h2>
          </div>

          <div className="callout callout-magenta" style={{ marginBottom: '24px', display: 'block' }}>
            <p style={{ fontSize: '16px',  lineHeight: 1.8, margin: 0, fontWeight: 600 }}>
              {result.follow_up_question}
            </p>
          </div>

          {!challengeDone ? (
            <>
              <textarea
                value={challengeAnswer}
                onChange={e => setChallengeAnswer(e.target.value)}
                placeholder="Your answer..."
                rows={6}
                style={{
                  width: '100%', background: 'var(--paper-2)',
                  border: '2px solid var(--ink)', boxShadow: 'var(--shadow)', borderRadius: '10px', padding: '16px',
                  resize: 'vertical',  fontFamily: 'var(--font-body)',
                  fontSize: '14px', lineHeight: 1.8, outline: 'none', boxSizing: 'border-box',
                  marginBottom: '16px',
                }}
              />
              <div className="actions"><button className="btn btn-ghost" onClick={() => setPhase('feedback')} style={{ flex: 1, justifyContent: 'center' }}>← Back</button><button className="btn btn-primary" disabled={challengeAnswer.trim().length < 10} onClick={() => setChallengeDone(true)} style={{ flex: 2, justifyContent: 'center' }}>See model answer →</button></div>
            </>
          ) : (
            <div>
              {/* Student's answer */}
              <div className="card" style={{ marginBottom: '16px' }}>
                <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Your answer</div>
                <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.8, margin: 0 }}>{challengeAnswer}</p>
              </div>

              {/* Model answer: derive from ideal_explanation */}
              <div className="callout callout-green" style={{ display: 'block', background: 'var(--green-soft)', border: '2px solid var(--green)', marginBottom: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Model answer</div>
                  <button onClick={() => speak(result.ideal_explanation, 'model')} style={{
                    padding: '4px 12px', borderRadius: '999px', cursor: 'pointer',
                    background: 'var(--green-soft)', border: '2px solid var(--green)',
                    color: 'var(--green)', fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-body)',
                  }}>
                    {speakingSection === 'model' ? '⏸ Stop' : '🔊 Hear'}
                  </button>
                </div>
                <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.8, margin: 0 }}>
                  {result.ideal_explanation}
                </p>
              </div>

              <div className="actions"><button className="btn btn-primary" onClick={() => { setPhase('topic_select'); setActiveTopic(null); }} style={{ flex: 1, justifyContent: 'center' }}>Try another topic →</button></div>
            </div>
          )}
        </div>
      )}

      {/* Inline keyframe styles */}
      <style>{`
        @keyframes wave {
          from { height: 6px; }
          to   { height: 28px; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
