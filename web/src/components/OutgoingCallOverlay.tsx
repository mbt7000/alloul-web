'use client';

import { useEffect, useRef, useState } from 'react';
import { PhoneOff, Phone, Video } from 'lucide-react';
import { useCallContext } from '@/context/CallContext';

export default function OutgoingCallOverlay() {
  const { outgoing, cancelCall } = useCallContext();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Ringtone (outgoing)
  useEffect(() => {
    if (outgoing) {
      try {
        const audio = new Audio('https://cdn.pixabay.com/audio/2022/10/30/audio_e8d54fc519.mp3');
        audio.loop = true;
        audio.volume = 0.5;
        audio.play().catch(() => {});
        audioRef.current = audio;
      } catch { /* ignore */ }
      setElapsed(0);
    } else {
      audioRef.current?.pause();
      audioRef.current = null;
    }
    return () => { audioRef.current?.pause(); };
  }, [!!outgoing]);

  // Elapsed timer
  useEffect(() => {
    if (!outgoing) return;
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [!!outgoing]);

  if (!outgoing) return null;

  const isVideo  = outgoing.call_type === 'video';
  const initials = outgoing.receiver_name
    .split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase() || '؟';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(7,11,20,0.94)',
      backdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <style>{`
        @keyframes ringPulse {
          0%,100% { transform:scale(1); opacity:0.4; }
          50% { transform:scale(1.12); opacity:0.8; }
        }
        @keyframes avatarBob {
          0%,100% { transform:scale(1); }
          50% { transform:scale(1.04); }
        }
        @keyframes dotBlink {
          0%,80%,100% { opacity:0; }
          40% { opacity:1; }
        }
      `}</style>

      {/* Pulsing rings */}
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
        {[380, 280, 200].map((size, i) => (
          <div key={size} style={{
            position:'absolute', width:size, height:size, borderRadius:'50%',
            border:`1px solid rgba(59,130,246,${0.04 + i * 0.05})`,
            animation:`ringPulse ${1.8 + i * 0.4}s ease-in-out infinite`,
            animationDelay:`${i * 0.2}s`,
          }} />
        ))}
      </div>

      <div style={{ textAlign:'center', padding:'0 32px', position:'relative', zIndex:1 }}>

        {/* Label */}
        <p style={{ color:'rgba(255,255,255,0.45)', fontSize:13, marginBottom:20, letterSpacing:'0.03em' }}>
          {isVideo ? 'اتصال فيديو…' : 'اتصال صوتي…'}
        </p>

        {/* Avatar */}
        <div style={{ animation:'avatarBob 2s ease-in-out infinite', marginBottom:20 }}>
          <div style={{
            width:112, height:112, borderRadius:'50%', margin:'0 auto',
            background:'rgba(59,130,246,0.12)',
            border:'2.5px solid rgba(59,130,246,0.4)',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 0 40px rgba(59,130,246,0.15)',
          }}>
            <span style={{ fontSize:38, fontWeight:800, color:'#60A5FA' }}>{initials}</span>
          </div>
        </div>

        {/* Name */}
        <h2 style={{ color:'#fff', fontSize:24, fontWeight:800, marginBottom:8 }}>
          {outgoing.receiver_name}
        </h2>

        {/* "يرن" with dots */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:4, marginBottom:52 }}>
          <span style={{ color:'rgba(255,255,255,0.4)', fontSize:14 }}>يرن</span>
          {[0,1,2].map(i => (
            <span key={i} style={{
              width:4, height:4, borderRadius:'50%',
              background:'rgba(255,255,255,0.4)',
              display:'inline-block',
              animation:`dotBlink 1.4s ease-in-out infinite`,
              animationDelay:`${i * 0.2}s`,
            }} />
          ))}
          <span style={{ color:'rgba(255,255,255,0.2)', fontSize:12, marginRight:8 }}>
            {`${Math.floor(elapsed/60).toString().padStart(2,'0')}:${(elapsed%60).toString().padStart(2,'0')}`}
          </span>
        </div>

        {/* Cancel */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
          <button
            onClick={cancelCall}
            style={{
              width:68, height:68, borderRadius:'50%',
              background:'#EF4444', border:'none', cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 0 24px rgba(239,68,68,0.4)',
              transition:'transform 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform='scale(1.1)')}
            onMouseLeave={e => (e.currentTarget.style.transform='scale(1)')}
          >
            <PhoneOff size={26} color="#fff" />
          </button>
          <span style={{ color:'rgba(255,255,255,0.4)', fontSize:12 }}>إلغاء</span>
        </div>
      </div>
    </div>
  );
}
