'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Integration, ConnectedIntegration } from '@/lib/integrations-types';
import { integrationApi } from '@/lib/integrations-api';
import { getToken } from '@/lib/auth';

/* ── Brand metadata ─────────────────────────────────────────────────────── */
const BRAND: Record<string, { color: string; letter: string; cat: string }> = {
  google_sheets:   { color: '#34a853', letter: 'S', cat: 'Google' },
  gmail:           { color: '#ea4335', letter: 'G', cat: 'Google' },
  google_drive:    { color: '#4285f4', letter: 'D', cat: 'Google' },
  google_calendar: { color: '#1967d2', letter: 'C', cat: 'Google' },
  microsoft_365:   { color: '#0078d4', letter: 'M', cat: 'Microsoft' },
  whatsapp:        { color: '#25d366', letter: 'W', cat: 'Messaging' },
  slack:           { color: '#e01e5a', letter: 'S', cat: 'Messaging' },
  telegram:        { color: '#229ed9', letter: 'T', cat: 'Messaging' },
  stripe:          { color: '#635bff', letter: '$', cat: 'Payments' },
  notion:          { color: '#aaaaaa', letter: 'N', cat: 'Productivity' },
};

function brand(id: string) {
  return BRAND[id] ?? { color: '#3b82f6', letter: id[0]?.toUpperCase() ?? '?', cat: 'Other' };
}

type PermVal = 'allow' | 'ask' | 'deny';
type PermMap = Record<string, Record<string, PermVal>>;

/* ── Icons ──────────────────────────────────────────────────────────────── */
function IconAllow({ on }: { on: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
      <circle cx="8.5" cy="8.5" r="7.5"
        fill={on ? 'rgba(16,185,129,.14)' : 'transparent'}
        stroke={on ? '#10b981' : 'rgba(255,255,255,.12)'} strokeWidth="1.15" />
      <path d="M5.5 8.5l2 2 4-4"
        stroke={on ? '#10b981' : 'rgba(255,255,255,.2)'}
        strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconAsk({ on }: { on: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
      <circle cx="8.5" cy="8.5" r="7.5"
        fill={on ? 'rgba(245,158,11,.12)' : 'transparent'}
        stroke={on ? '#f59e0b' : 'rgba(255,255,255,.12)'} strokeWidth="1.15" />
      <path d="M6.8 6.5c0-.93.76-1.7 1.7-1.7s1.7.77 1.7 1.7c0 .85-.52 1.28-1.02 1.58-.4.24-.68.55-.68 1.02v.15"
        stroke={on ? '#f59e0b' : 'rgba(255,255,255,.2)'} strokeWidth="1.25" strokeLinecap="round" />
      <circle cx="8.5" cy="12" r=".65" fill={on ? '#f59e0b' : 'rgba(255,255,255,.2)'} />
    </svg>
  );
}
function IconDeny({ on }: { on: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
      <circle cx="8.5" cy="8.5" r="7.5"
        fill={on ? 'rgba(239,68,68,.1)' : 'transparent'}
        stroke={on ? '#ef4444' : 'rgba(255,255,255,.12)'} strokeWidth="1.15" />
      <path d="M5.8 5.8l5.4 5.4M11.2 5.8l-5.4 5.4"
        stroke={on ? '#ef4444' : 'rgba(255,255,255,.2)'}
        strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function SpinIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13"
      style={{ animation: 'spin .65s linear infinite', display: 'block' }}>
      <circle cx="6.5" cy="6.5" r="5" stroke="rgba(255,255,255,.1)" strokeWidth="1.4" fill="none" />
      <path d="M6.5 1.5a5 5 0 0 1 5 5" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/* ── Service icon badge ─────────────────────────────────────────────────── */
function SvcIcon({ id, size = 32, glow = false }: { id: string; size?: number; glow?: boolean }) {
  const b = brand(id);
  const r = Math.round(size * 0.27);
  return (
    <div style={{
      width: size, height: size, borderRadius: r, flexShrink: 0,
      background: `linear-gradient(135deg,${b.color}22,${b.color}10)`,
      border: `1px solid ${b.color}30`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.43, fontWeight: 700, color: b.color,
      boxShadow: glow ? `0 0 18px ${b.color}40,0 0 6px ${b.color}25` : 'none',
      transition: 'box-shadow .5s ease',
    }}>{b.letter}</div>
  );
}

/* ── Permission toggle ─────────────────────────────────────────────────── */
function PermToggle({ val, set }: { val: PermVal; set: (v: PermVal) => void }) {
  const opts: [PermVal, React.FC<{ on: boolean }>][] = [
    ['allow', IconAllow], ['ask', IconAsk], ['deny', IconDeny],
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
      {opts.map(([v, Icon]) => (
        <button key={v} onClick={() => set(v)}
          style={{
            width: 24, height: 24, borderRadius: 5,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: val === v ? 'rgba(255,255,255,.05)' : 'transparent',
            opacity: val === v ? 1 : 0.35,
            transition: 'opacity .12s,background .12s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = val === v ? '1' : '0.7'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.05)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = val === v ? '1' : '0.35'; (e.currentTarget as HTMLButtonElement).style.background = val === v ? 'rgba(255,255,255,.05)' : 'transparent'; }}
        ><Icon on={val === v} /></button>
      ))}
    </div>
  );
}

/* ── Tool row ───────────────────────────────────────────────────────────── */
function ToolRow({ name, perm, onSet }: { name: string; perm: PermVal; onSet: (v: PermVal) => void }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '7.5px 24px',
        background: hov ? 'rgba(255,255,255,.022)' : 'transparent',
        borderBottom: '1px solid rgba(255,255,255,.035)',
        transition: 'background .1s',
      }}>
      <span style={{
        flex: 1, fontFamily: '"SF Mono","Fira Code",monospace', fontSize: 12,
        letterSpacing: '.01em', color: hov ? '#b8cde3' : '#6a839c',
        direction: 'ltr', textAlign: 'right',
      }}>{name}</span>
      <PermToggle val={perm} set={onSet} />
    </div>
  );
}

/* ── Tool section ───────────────────────────────────────────────────────── */
function ToolSection({
  title, tools, perms, onSet, defaultOpen = true,
}: {
  title: string;
  tools: Integration['actions'];
  perms: Record<string, PermVal>;
  onSet: (name: string, val: PermVal) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const allAllow = tools.every(t => (perms[t.name] ?? 'ask') === 'allow');

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 24px',
        background: 'rgba(255,255,255,.016)',
        borderBottom: '1px solid rgba(255,255,255,.04)',
        borderTop: '1px solid rgba(255,255,255,.04)',
      }}>
        <button onClick={() => setOpen(o => !o)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, padding: 0 }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
            style={{ transition: 'transform .16s', transform: open ? 'rotate(0)' : 'rotate(-90deg)', flexShrink: 0 }}>
            <path d="M2.5 4.5l3.5 3.5 3.5-3.5" stroke="rgba(255,255,255,.25)"
              strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: '#7a8fa8', letterSpacing: '.02em' }}>{title}</span>
          <span style={{
            fontSize: 10, background: 'rgba(255,255,255,.06)', color: '#4a607a',
            padding: '1px 6px', borderRadius: 8,
          }}>{tools.length}</span>
        </button>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)',
          borderRadius: 6, padding: '3px 9px', cursor: 'pointer', transition: 'background .1s',
        }}
          onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,.09)'}
          onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,.05)'}>
          {allAllow ? <IconAllow on={true} /> : <IconAsk on={true} />}
          <span style={{ fontSize: 11, color: allAllow ? '#10b981' : '#f59e0b', fontWeight: 500 }}>
            {allAllow ? 'السماح دائماً' : 'مخصص'}
          </span>
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <path d="M1.5 3.5l3 3 3-3" stroke="rgba(255,255,255,.3)" strokeWidth="1.1" strokeLinecap="round" />
          </svg>
        </div>
      </div>
      {open && tools.map(t => (
        <ToolRow key={t.name} name={t.name} perm={perms[t.name] ?? 'ask'} onSet={v => onSet(t.name, v)} />
      ))}
    </div>
  );
}

/* ── Canvas connection animation ────────────────────────────────────────── */
function ConnectCanvas({ color, onDone }: { color: string; onDone: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ox = canvas.width * 0.25, oy = canvas.height * 0.22;
    const dx = canvas.width * 0.93, dy = 24;

    const hex2rgb = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `${r},${g},${b}`;
    };
    const rgb = hex2rgb(color.startsWith('#') && color.length >= 7 ? color : '#3b82f6');

    const particles = Array.from({ length: 55 }, (_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.8 + Math.random() * 2.5;
      return {
        x: ox, y: oy,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 1, decay: 0.012 + Math.random() * 0.008,
        size: 2 + Math.random() * 3,
        phase: 'burst' as 'burst' | 'seek',
        delay: Math.floor(Math.random() * 18),
      };
    });

    const rings = [
      { r: 0, opacity: 1 },
      { r: 0, opacity: 0.7, delay: 8 },
      { r: 0, opacity: 0.5, delay: 16 },
    ];
    let frame = 0, logoFlash = 0, done = false;
    const rafRef = { id: 0 };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      rings.forEach(ring => {
        if (frame < ((ring as any).delay ?? 0)) return;
        ring.r += 3.5; ring.opacity *= 0.93;
        if (ring.opacity < 0.01) return;
        ctx.beginPath();
        ctx.arc(ox, oy, ring.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${rgb},${ring.opacity * 0.6})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      let alive = 0;
      particles.forEach(p => {
        if (frame < p.delay) return;
        if (p.phase === 'burst' && frame > 22 + p.delay) p.phase = 'seek';
        if (p.phase === 'seek') {
          const tdx = dx - p.x, tdy = dy - p.y;
          const dist = Math.sqrt(tdx * tdx + tdy * tdy);
          p.vx += (tdx / dist) * 0.35; p.vy += (tdy / dist) * 0.35;
          const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          if (spd > 5) { p.vx = (p.vx / spd) * 5; p.vy = (p.vy / spd) * 5; }
          if (dist < 12) { p.life = 0; logoFlash = Math.min(logoFlash + 0.3, 1); }
        }
        p.x += p.vx; p.y += p.vy; p.life -= p.decay;
        if (p.life > 0) {
          alive++;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${rgb},${p.life * 0.8})`;
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3);
          ctx.strokeStyle = `rgba(${rgb},${p.life * 0.3})`;
          ctx.lineWidth = p.size * 0.6;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
      });

      if (logoFlash > 0) {
        const grad = ctx.createRadialGradient(dx, dy, 0, dx, dy, 50);
        grad.addColorStop(0, `rgba(${rgb},${logoFlash * 0.5})`);
        grad.addColorStop(1, `rgba(${rgb},0)`);
        ctx.beginPath();
        ctx.arc(dx, dy, 50, 0, Math.PI * 2);
        ctx.fillStyle = grad; ctx.fill();
        logoFlash *= 0.88;
      }

      if (!done && alive === 0 && frame > 60) { done = true; onDone(); }
      if (frame < 300) rafRef.id = requestAnimationFrame(draw);
      else if (!done) { done = true; onDone(); }
    };
    draw();
    return () => cancelAnimationFrame(rafRef.id);
  }, [color, onDone]);

  return (
    <canvas ref={ref} style={{
      position: 'fixed', inset: 0, zIndex: 200, pointerEvents: 'none',
    }} />
  );
}

/* ── API Key / Bot Token modal ──────────────────────────────────────────── */
function CredentialModal({
  integration, onSubmit, onClose,
}: {
  integration: Integration;
  onSubmit: (cred: string) => void;
  onClose: () => void;
}) {
  const [val, setVal] = useState('');
  const isBot = integration.auth_type === 'bot_token';
  const b = brand(integration.id);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 180,
      background: 'rgba(0,0,0,.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(6px)', animation: 'fadeIn .18s ease',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        width: 400, borderRadius: 14,
        background: '#0e1525', border: '1px solid rgba(255,255,255,.09)',
        boxShadow: '0 32px 80px rgba(0,0,0,.7)',
        padding: '24px', animation: 'scaleIn .2s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <SvcIcon id={integration.id} size={36} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#eaf0f9' }}>{integration.name}</div>
            <div style={{ fontSize: 11.5, color: '#4d6478' }}>{isBot ? 'Bot Token' : 'API Key'}</div>
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: '#7a8fa8', display: 'block', marginBottom: 6 }}>
            {isBot ? 'أدخل Bot Token' : 'أدخل API Key'}
          </label>
          <input
            value={val} onChange={e => setVal(e.target.value)}
            placeholder={isBot ? 'xxxxxxxx:AAAA...' : 'sk_live_...'}
            autoFocus
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13,
              background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)',
              color: '#dde4ef', direction: 'ltr',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-start' }}>
          <button onClick={() => val.trim() && onSubmit(val.trim())}
            disabled={!val.trim()}
            style={{
              padding: '8px 20px', borderRadius: 8, fontSize: 12.5, fontWeight: 600,
              color: '#fff', background: '#2563eb',
              boxShadow: '0 2px 14px rgba(37,99,235,.3)',
              opacity: val.trim() ? 1 : 0.5, transition: 'all .15s',
            }}>اتصال</button>
          <button onClick={onClose}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 12.5, fontWeight: 500,
              color: '#7a8fa8', background: 'rgba(255,255,255,.04)',
              border: '1px solid rgba(255,255,255,.08)',
            }}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}

/* ── Directory modal ────────────────────────────────────────────────────── */
const DIR_CATS = ['الكل', 'Google', 'Microsoft', 'Messaging', 'Payments', 'Productivity'];

function DirectoryModal({
  integrations, connectedIds, onConnect, onClose,
}: {
  integrations: Integration[];
  connectedIds: Set<string>;
  onConnect: (id: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('الكل');

  const filtered = integrations.filter(s => {
    const matchQ = s.name.toLowerCase().includes(q.toLowerCase());
    const matchCat = cat === 'الكل' || brand(s.id).cat === cat;
    return matchQ && matchCat;
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 150,
      background: 'rgba(0,0,0,.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(6px)', animation: 'fadeIn .18s ease',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        width: 680, maxHeight: '82vh', borderRadius: 16,
        background: '#0e1525', border: '1px solid rgba(255,255,255,.09)',
        boxShadow: '0 32px 80px rgba(0,0,0,.7)',
        display: 'flex', flexDirection: 'column',
        animation: 'scaleIn .2s ease',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '18px 22px 14px',
          borderBottom: '1px solid rgba(255,255,255,.06)', flexShrink: 0,
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#eaf0f9', flex: 1 }}>دليل الروابط</h3>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 7,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#3d5070', transition: 'all .12s',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.07)'; (e.currentTarget as HTMLButtonElement).style.color = '#8ba0bb'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#3d5070'; }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {/* Search + filters */}
        <div style={{ padding: '12px 22px 10px', flexShrink: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 9,
            background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)',
            borderRadius: 9, padding: '8px 13px', marginBottom: 12,
          }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ color: '#3d5070', flexShrink: 0 }}>
              <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.2" />
              <path d="M8.5 8.5l2.8 2.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <input value={q} onChange={e => setQ(e.target.value)}
              placeholder="ابحث عن رابط..."
              style={{ flex: 1, fontSize: 13, color: '#c8d6e8', background: 'none', border: 'none', outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {DIR_CATS.map(c => (
              <button key={c} onClick={() => setCat(c)} style={{
                fontSize: 11.5, fontWeight: 500, padding: '4px 12px', borderRadius: 20,
                background: cat === c ? 'rgba(59,130,246,.18)' : 'rgba(255,255,255,.04)',
                border: `1px solid ${cat === c ? 'rgba(59,130,246,.35)' : 'rgba(255,255,255,.07)'}`,
                color: cat === c ? '#60a5fa' : '#5a7191', transition: 'all .12s',
              }}>{c}</button>
            ))}
          </div>
        </div>
        {/* Grid */}
        <div style={{ overflowY: 'auto', padding: '4px 22px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {filtered.map(s => {
              const isConn = connectedIds.has(s.id);
              return (
                <div key={s.id} style={{
                  background: 'rgba(255,255,255,.03)',
                  border: '1px solid rgba(255,255,255,.07)',
                  borderRadius: 12, padding: '14px 16px',
                  display: 'flex', flexDirection: 'column', gap: 10,
                  transition: 'border-color .15s,background .15s',
                }}
                  onMouseEnter={e => { const d = e.currentTarget as HTMLDivElement; d.style.background = 'rgba(255,255,255,.055)'; d.style.borderColor = `${brand(s.id).color}30`; }}
                  onMouseLeave={e => { const d = e.currentTarget as HTMLDivElement; d.style.background = 'rgba(255,255,255,.03)'; d.style.borderColor = 'rgba(255,255,255,.07)'; }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <SvcIcon id={s.id} size={34} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#d4dff0' }}>{s.name}</div>
                      <div style={{ fontSize: 10.5, color: '#3d5070' }}>{s.auth_type}</div>
                    </div>
                    {isConn ? (
                      <div style={{
                        width: 28, height: 28, borderRadius: 7,
                        background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                          <path d="M2 7l3.5 3.5L11 3" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    ) : (
                      <button onClick={() => { onConnect(s.id); onClose(); }} style={{
                        width: 28, height: 28, borderRadius: 7,
                        background: 'rgba(37,99,235,.12)', border: '1px solid rgba(37,99,235,.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#60a5fa', transition: 'all .12s',
                      }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(37,99,235,.25)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(37,99,235,.12)'; }}>
                        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                          <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <p style={{ fontSize: 11.5, color: '#3d5070', lineHeight: 1.65 }}>{s.description}</p>
                </div>
              );
            })}
          </div>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#2d3f58', fontSize: 13 }}>
              لا توجد نتائج
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Left nav ────────────────────────────────────────────────────────────── */
const NAV = [
  {
    id: 'connectors', label: 'الروابط',
    icon: (a: boolean) => (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="3.5" cy="7" r="2" stroke={a ? '#3b82f6' : '#4a607a'} strokeWidth="1.1" fill={a ? 'rgba(59,130,246,.2)' : 'none'} />
        <circle cx="10.5" cy="3.5" r="2" stroke={a ? '#3b82f6' : '#4a607a'} strokeWidth="1.1" fill={a ? 'rgba(59,130,246,.2)' : 'none'} />
        <circle cx="10.5" cy="10.5" r="2" stroke={a ? '#3b82f6' : '#4a607a'} strokeWidth="1.1" fill={a ? 'rgba(59,130,246,.2)' : 'none'} />
        <path d="M5.5 7h2l.7-3.5M8.5 7h-1l.7 3.5" stroke={a ? '#3b82f6' : '#4a607a'} strokeWidth="1.1" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'skills', label: 'المهارات',
    icon: (a: boolean) => (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 1l1.5 4h4l-3.3 2.4 1.3 4L7 9 3.5 11.4l1.3-4L1.5 5h4z"
          stroke={a ? '#dde4ef' : '#4a607a'} strokeWidth="1.1" strokeLinejoin="round"
          fill={a ? 'rgba(255,255,255,.06)' : 'none'} />
      </svg>
    ),
  },
  {
    id: 'plugins', label: 'الإضافات',
    icon: (a: boolean) => (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        {([[ 2, 2], [7.5, 2], [2, 7.5], [7.5, 7.5]] as [number, number][]).map(([x, y], i) => (
          <rect key={i} x={x} y={y} width="4.5" height="4.5" rx="1.2"
            stroke={a ? '#dde4ef' : '#4a607a'} strokeWidth="1.1"
            fill={a ? 'rgba(255,255,255,.06)' : 'none'} />
        ))}
      </svg>
    ),
  },
];

function LeftNav({ section, setSection }: { section: string; setSection: (s: string) => void }) {
  return (
    <div style={{
      width: 168, flexShrink: 0,
      borderLeft: '1px solid rgba(255,255,255,.055)',
      background: 'rgba(255,255,255,.012)',
      display: 'flex', flexDirection: 'column', padding: '10px 0',
    }}>
      {NAV.map(item => {
        const a = section === item.id;
        return (
          <button key={item.id} onClick={() => setSection(item.id)} style={{
            display: 'flex', alignItems: 'center', gap: 9, padding: '8px 14px',
            background: a ? 'rgba(59,130,246,.1)' : 'transparent',
            borderRight: a ? '2px solid #3b82f6' : '2px solid transparent',
            transition: 'all .12s', color: a ? '#dde4ef' : '#4a607a',
          }}
            onMouseEnter={e => { if (!a) { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.04)'; (e.currentTarget as HTMLButtonElement).style.color = '#8ba0bb'; } }}
            onMouseLeave={e => { if (!a) { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#4a607a'; } }}>
            {item.icon(a)}
            <span style={{ fontSize: 12.5, fontWeight: a ? 500 : 400 }}>{item.label}</span>
          </button>
        );
      })}
      <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,.05)', padding: '10px 0' }}>
        <div style={{ padding: '6px 14px 4px' }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#2d3f58', letterSpacing: '.07em', textTransform: 'uppercase' }}>إضافاتي</span>
        </div>
        <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', color: '#3d5070', transition: 'color .1s' }}
          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#8ba0bb'}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#3d5070'}>
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <span style={{ fontSize: 12 }}>إضافة جديدة</span>
        </button>
      </div>
    </div>
  );
}

/* ── Middle panel ────────────────────────────────────────────────────────── */
function MiddlePanel({
  integrations, connectedIds, activeId, onSelect, onOpenDir,
}: {
  integrations: Integration[];
  connectedIds: Set<string>;
  activeId: string | null;
  onSelect: (id: string) => void;
  onOpenDir: () => void;
}) {
  const connected = integrations.filter(s => connectedIds.has(s.id));
  const notConnected = integrations.filter(s => !connectedIds.has(s.id));

  return (
    <div style={{
      width: 248, flexShrink: 0,
      borderLeft: '1px solid rgba(255,255,255,.055)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '13px 14px', borderBottom: '1px solid rgba(255,255,255,.05)', flexShrink: 0,
      }}>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#c8d6e8' }}>الروابط</span>
        <IconBtn title="بحث"><svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.2" />
          <path d="M8.5 8.5l2.8 2.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg></IconBtn>
        <IconBtn title="دليل الروابط" onClick={onOpenDir} highlight>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </IconBtn>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
        {connected.length > 0 && (
          <>
            <GroupLabel label="متصل" dot="green" />
            {connected.map(s => (
              <MidItem key={s.id} integration={s} active={activeId === s.id}
                connected={true} onSelect={() => onSelect(s.id)} />
            ))}
          </>
        )}
        {notConnected.length > 0 && (
          <div style={{ marginTop: 4 }}>
            <GroupLabel label="غير متصل" dot="dim" />
            {notConnected.map(s => (
              <MidItem key={s.id} integration={s} active={activeId === s.id}
                connected={false} onSelect={() => onSelect(s.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GroupLabel({ label, dot }: { label: string; dot: 'green' | 'dim' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px 3px' }}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%', display: 'inline-block', flexShrink: 0,
        background: dot === 'green' ? '#10b981' : 'rgba(255,255,255,.12)',
        boxShadow: dot === 'green' ? '0 0 5px rgba(16,185,129,.5)' : 'none',
      }} />
      <span style={{ fontSize: 10, fontWeight: 600, color: '#2d3f58', letterSpacing: '.07em', textTransform: 'uppercase' }}>{label}</span>
    </div>
  );
}

function MidItem({ integration, active, connected, onSelect }: {
  integration: Integration; active: boolean; connected: boolean; onSelect: () => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onSelect}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 9,
        padding: '6.5px 10px 6.5px 14px',
        background: active ? 'rgba(59,130,246,.1)' : hov ? 'rgba(255,255,255,.04)' : 'transparent',
        borderRight: active ? '2px solid #3b82f6' : '2px solid transparent',
        transition: 'all .1s', textAlign: 'right',
      }}>
      <SvcIcon id={integration.id} size={27} />
      <span style={{ flex: 1, fontSize: 12.5, color: active ? '#dde4ef' : hov ? '#a8bfd4' : '#6a839c', fontWeight: active ? 500 : 400 }}>
        {integration.name}
      </span>
      <span style={{
        width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
        background: connected ? '#10b981' : 'rgba(255,255,255,.09)',
        boxShadow: connected ? '0 0 5px rgba(16,185,129,.5)' : 'none',
      }} />
    </button>
  );
}

function IconBtn({ children, onClick, highlight, title }: {
  children: React.ReactNode; onClick?: () => void; highlight?: boolean; title?: string;
}) {
  return (
    <button onClick={onClick} title={title} style={{
      width: 27, height: 27, borderRadius: 6,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#3d5070', transition: 'all .12s',
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = highlight ? 'rgba(59,130,246,.15)' : 'rgba(255,255,255,.06)';
        (e.currentTarget as HTMLButtonElement).style.color = highlight ? '#60a5fa' : '#8ba0bb';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
        (e.currentTarget as HTMLButtonElement).style.color = '#3d5070';
      }}>
      {children}
    </button>
  );
}

/* ── Detail panel ────────────────────────────────────────────────────────── */
function DetailPanel({
  integration, connected, perms, onSet,
  loading, justConnected, onConnect, onDisconnect,
}: {
  integration: Integration | null;
  connected: boolean;
  perms: Record<string, PermVal>;
  onSet: (name: string, val: PermVal) => void;
  loading: boolean;
  justConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  if (!integration) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 18,
        animation: 'fadeIn .2s ease',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.055)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'float 3s ease-in-out infinite',
        }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M8 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"
              stroke="#2d3f58" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M14 3h5v5M11 11l8-8" stroke="#2d3f58" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#2d3f58', marginBottom: 5 }}>اختر رابطاً</div>
          <div style={{ fontSize: 12, color: '#1e2d3e', lineHeight: 1.7, maxWidth: 180 }}>
            تحكّم في صلاحيات الأدوات لكل خدمة
          </div>
        </div>
      </div>
    );
  }

  const reads = integration.actions.filter(a => !a.name.includes('create') && !a.name.includes('send') && !a.name.includes('write') && !a.name.includes('update') && !a.name.includes('delete') && !a.name.includes('upload') && !a.name.includes('append') && !a.name.includes('refund') && !a.name.includes('charge') && !a.name.includes('post') && !a.name.includes('add'));
  const writes = integration.actions.filter(a => !reads.includes(a));

  const total = integration.actions.length;
  const allowed = integration.actions.filter(t => (perms[t.name] ?? 'ask') === 'allow').length;
  const asking = integration.actions.filter(t => (perms[t.name] ?? 'ask') === 'ask').length;
  const denied = integration.actions.filter(t => (perms[t.name] ?? 'ask') === 'deny').length;

  return (
    <div key={integration.id} style={{
      flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      animation: 'fadeUp .18s ease',
    }}>
      {/* Header */}
      <div style={{ padding: '20px 28px 18px', borderBottom: '1px solid rgba(255,255,255,.05)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <SvcIcon id={integration.id} size={44} glow={justConnected || connected} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap', marginBottom: 7 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#eaf0f9', letterSpacing: '-.02em' }}>
                {integration.name}
              </h2>
              {connected && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500,
                  color: '#10b981', background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.2)',
                  padding: '2px 9px', borderRadius: 20,
                  animation: justConnected ? 'successPop .4s ease' : 'none',
                }}>
                  <span style={{
                    width: 4, height: 4, borderRadius: '50%', background: '#10b981',
                    boxShadow: '0 0 5px #10b981', display: 'inline-block',
                  }} />
                  متصل
                </span>
              )}
              <span style={{
                fontSize: 11, color: '#5a7191', background: 'rgba(255,255,255,.04)',
                border: '1px solid rgba(255,255,255,.07)', padding: '2px 9px', borderRadius: 20,
              }}>{integration.auth_type}</span>
            </div>
            <p style={{ fontSize: 12.5, color: '#4d6478', lineHeight: 1.8, maxWidth: 460 }}>{integration.description}</p>
          </div>
          <div style={{ display: 'flex', gap: 7, flexShrink: 0, alignItems: 'center' }}>
            {connected ? (
              <button onClick={onDisconnect} style={{
                padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                color: '#7a8fa8', background: 'rgba(255,255,255,.04)',
                border: '1px solid rgba(255,255,255,.08)', transition: 'all .15s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,.08)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,.22)'; (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.04)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,.08)'; (e.currentTarget as HTMLButtonElement).style.color = '#7a8fa8'; }}>
                قطع الاتصال
              </button>
            ) : (
              <button onClick={onConnect} disabled={loading} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '7px 18px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                color: '#fff', background: loading ? 'rgba(37,99,235,.55)' : '#2563eb',
                boxShadow: loading ? 'none' : '0 2px 18px rgba(37,99,235,.32),0 1px 4px rgba(0,0,0,.3)',
                transition: 'all .15s',
              }}
                onMouseEnter={e => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.background = '#1d4ed8'; } }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = loading ? 'rgba(37,99,235,.55)' : '#2563eb'; }}>
                {loading && <SpinIcon />}
                {loading ? 'جارٍ الاتصال...' : 'اتصال'}
              </button>
            )}
            <IconBtn title="خيارات">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="2.5" r=".9" fill="currentColor" />
                <circle cx="7" cy="7" r=".9" fill="currentColor" />
                <circle cx="7" cy="11.5" r=".9" fill="currentColor" />
              </svg>
            </IconBtn>
          </div>
        </div>

        {/* Permission summary bar */}
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,.06)', borderRadius: 2, overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${(allowed / total) * 100}%`, height: '100%', background: '#10b981', transition: 'width .4s ease' }} />
            <div style={{ width: `${(asking / total) * 100}%`, height: '100%', background: '#f59e0b', transition: 'width .4s ease' }} />
            <div style={{ width: `${(denied / total) * 100}%`, height: '100%', background: 'rgba(239,68,68,.6)', transition: 'width .4s ease' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            {[{ n: allowed, c: '#10b981', l: 'مسموح' }, { n: asking, c: '#f59e0b', l: 'سؤال' }, { n: denied, c: '#ef4444', l: 'مرفوض' }]
              .filter(x => x.n > 0)
              .map(({ n, c, l }) => (
                <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10.5, color: c }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: c, display: 'inline-block' }} />
                  {n} {l}
                </span>
              ))}
          </div>
        </div>
      </div>

      {/* Tool permissions title */}
      <div style={{ padding: '13px 28px 10px', borderBottom: '1px solid rgba(255,255,255,.04)', flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#c8d6e8', marginBottom: 2 }}>صلاحيات الأدوات</div>
        <div style={{ fontSize: 11.5, color: '#3d5070' }}>اختر متى يُسمح للمساعد باستخدام هذه الأدوات</div>
      </div>

      {/* Tool rows */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {reads.length > 0 && (
          <ToolSection title="أدوات القراءة" tools={reads} perms={perms}
            onSet={onSet} defaultOpen={true} />
        )}
        {writes.length > 0 && (
          <ToolSection title="أدوات الكتابة" tools={writes} perms={perms}
            onSet={onSet} defaultOpen={true} />
        )}
        {reads.length === 0 && writes.length === 0 && (
          <ToolSection title="جميع الأدوات" tools={integration.actions} perms={perms}
            onSet={onSet} defaultOpen={true} />
        )}
        <div style={{ padding: '14px 24px' }}>
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 9,
            background: 'rgba(59,130,246,.05)', border: '1px solid rgba(59,130,246,.1)',
            borderRadius: 9, padding: '10px 14px',
          }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="6.5" cy="6.5" r="5.5" stroke="#3b82f6" strokeWidth="1.1" />
              <path d="M6.5 4.5v2.5M6.5 8.5v.5" stroke="#3b82f6" strokeWidth="1.1" strokeLinecap="round" />
            </svg>
            <span style={{ fontSize: 11.5, color: '#4d7aab', lineHeight: 1.65 }}>
              تُطبَّق هذه الإعدادات على جميع المهام الآلية. يمكنك تغييرها في أي وقت.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */
export default function IntegrationsHub({
  initialIntegrations,
  initialConnected,
}: {
  initialIntegrations: Integration[];
  initialConnected: ConnectedIntegration[];
}) {
  const [integrations] = useState(initialIntegrations);
  const [connectedIds, setConnectedIds] = useState<Set<string>>(
    () => new Set(initialConnected.map(c => c.integration_id))
  );
  const [activeId, setActiveId] = useState<string | null>(initialIntegrations[0]?.id ?? null);
  const [perms, setPerms] = useState<PermMap>(() => {
    const p: PermMap = {};
    initialIntegrations.forEach(s => {
      p[s.id] = {};
      s.actions.forEach(a => { p[s.id][a.name] = 'ask'; });
    });
    return p;
  });
  const [loading, setLoading] = useState<string | null>(null);
  const [justConnected, setJustConnected] = useState<string | null>(null);
  const [showAnim, setShowAnim] = useState(false);
  const [animColor, setAnimColor] = useState('#3b82f6');
  const [showDir, setShowDir] = useState(false);
  const [showCredModal, setShowCredModal] = useState<Integration | null>(null);
  const [section, setSection] = useState('connectors');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!getToken()) {
      router.replace('/login?redirect=/integrations');
    }
  }, [router]);

  const activeIntegration = integrations.find(s => s.id === activeId) ?? null;
  const isConnected = activeId ? connectedIds.has(activeId) : false;
  const isLoading = activeId ? loading === activeId : false;
  const isJustConn = activeId ? justConnected === activeId : false;

  const handleConnect = useCallback(async (id: string) => {
    const integ = integrations.find(s => s.id === id);
    if (!integ) return;

    if (integ.auth_type === 'api_key' || integ.auth_type === 'bot_token') {
      setShowCredModal(integ);
      return;
    }

    // OAuth2 flow
    setLoading(id);
    setAnimColor(brand(id).color);
    setShowAnim(true);
    try {
      const res = await integrationApi.connect(id);
      if (res.auth_url) {
        window.location.href = res.auth_url;
      } else {
        setConnectedIds(s => new Set(Array.from(s).concat(id)));
        setJustConnected(id);
        setTimeout(() => setJustConnected(null), 1200);
      }
    } catch (e: any) {
      setError(e.message ?? 'فشل الاتصال');
      setShowAnim(false);
    } finally {
      setLoading(null);
    }
  }, [integrations]);

  const handleCredSubmit = useCallback(async (cred: string) => {
    if (!showCredModal) return;
    const id = showCredModal.id;
    setShowCredModal(null);
    setLoading(id);
    setAnimColor(brand(id).color);
    setShowAnim(true);
    try {
      const body = showCredModal.auth_type === 'bot_token' ? { bot_token: cred } : { api_key: cred };
      await integrationApi.connect(id, body);
      setConnectedIds(s => new Set(Array.from(s).concat(id)));
      setJustConnected(id);
      setTimeout(() => setJustConnected(null), 1200);
    } catch (e: any) {
      setError(e.message ?? 'فشل الاتصال');
      setShowAnim(false);
    } finally {
      setLoading(null);
    }
  }, [showCredModal]);

  const handleDisconnect = useCallback(async (id: string) => {
    try {
      await integrationApi.disconnect(id);
      setConnectedIds(s => { const n = new Set(s); n.delete(id); return n; });
    } catch (e: any) {
      setError(e.message ?? 'فشل قطع الاتصال');
    }
  }, []);

  const handleSetPerm = useCallback((integId: string, name: string, val: PermVal) => {
    setPerms(p => ({ ...p, [integId]: { ...p[integId], [name]: val } }));
  }, []);

  const connCount = connectedIds.size;
  const glowColor = activeId ? brand(activeId).color : '#10b981';

  return (
    <>
      {/* Dynamic atmospheric glow */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        transition: 'background 1.2s ease',
        background: `
          radial-gradient(ellipse 65% 55% at 0% 100%, ${glowColor}0c 0%, transparent 65%),
          radial-gradient(ellipse 40% 35% at 100% 0%, rgba(79,70,229,.04) 0%, transparent 55%)
        `,
      }} />

      {/* Canvas animation */}
      {showAnim && <ConnectCanvas color={animColor} onDone={() => setShowAnim(false)} />}

      {/* Directory modal */}
      {showDir && (
        <DirectoryModal
          integrations={integrations}
          connectedIds={connectedIds}
          onConnect={id => { setActiveId(id); handleConnect(id); }}
          onClose={() => setShowDir(false)}
        />
      )}

      {/* Credential modal */}
      {showCredModal && (
        <CredentialModal
          integration={showCredModal}
          onSubmit={handleCredSubmit}
          onClose={() => setShowCredModal(null)}
        />
      )}

      {/* Error toast */}
      {error && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 300, background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.3)',
          borderRadius: 10, padding: '10px 20px', color: '#f87171', fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 10,
          animation: 'fadeUp .2s ease',
        }}>
          {error}
          <button onClick={() => setError(null)} style={{ color: '#f87171', opacity: 0.7 }}>✕</button>
        </div>
      )}

      {/* Main layout */}
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        {/* Topbar */}
        <div style={{
          height: 48, flexShrink: 0, display: 'flex', alignItems: 'center',
          padding: '0 20px', background: 'rgba(255,255,255,.018)',
          borderBottom: '1px solid rgba(255,255,255,.06)', gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: 'linear-gradient(140deg,#2563eb 0%,#4f46e5 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 800, color: '#fff',
              boxShadow: '0 2px 12px rgba(79,70,229,.4)',
            }}>A</div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#e8edf5', letterSpacing: '-.015em' }}>
              ALLOUL<span style={{ color: '#4f8ef7' }}>&amp;</span>Q
            </span>
          </div>
          <span style={{ color: 'rgba(255,255,255,.08)', fontSize: 18, fontWeight: 200 }}>·</span>
          <span style={{ fontSize: 12, color: '#3d5070' }}>الإعدادات</span>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M7 5H3M5 3l-2 2 2 2" stroke="rgba(255,255,255,.15)" strokeWidth="1" strokeLinecap="round" />
          </svg>
          <span style={{ fontSize: 12, color: '#5a7191', fontWeight: 500 }}>الروابط</span>
          <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontSize: 11, fontWeight: 500, padding: '3px 11px', borderRadius: 20,
              background: 'rgba(16,185,129,.07)', border: '1px solid rgba(16,185,129,.16)',
              color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: 5,
              animation: 'glowPulse 2.5s ease-in-out infinite',
            }}>
              <span style={{
                width: 4, height: 4, borderRadius: '50%', background: '#10b981',
                boxShadow: '0 0 6px rgba(16,185,129,.7)', display: 'inline-block',
              }} />
              {connCount} متصل
            </span>
          </div>
        </div>

        {/* 3-panel body */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <DetailPanel
            integration={activeIntegration}
            connected={isConnected}
            perms={activeId ? (perms[activeId] ?? {}) : {}}
            onSet={(name, val) => activeId && handleSetPerm(activeId, name, val)}
            loading={isLoading}
            justConnected={isJustConn}
            onConnect={() => activeId && handleConnect(activeId)}
            onDisconnect={() => activeId && handleDisconnect(activeId)}
          />
          <MiddlePanel
            integrations={integrations}
            connectedIds={connectedIds}
            activeId={activeId}
            onSelect={setActiveId}
            onOpenDir={() => setShowDir(true)}
          />
          <LeftNav section={section} setSection={setSection} />
        </div>
      </div>
    </>
  );
}
