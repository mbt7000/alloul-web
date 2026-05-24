'use client';

import { useEffect, useRef, useState } from 'react';
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  ControlBar,
  Chat,
  useTracks,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
  LayoutContextProvider,
  useChatToggle,
  ConnectionStateToast,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import {
  PhoneOff,
  Mic, MicOff,
  Video, VideoOff,
  MessageSquare,
  Users,
  Monitor,
  MoreVertical,
  Wifi,
  Clock,
} from 'lucide-react';

interface ActiveRoom { ws_url: string; token: string; title: string; }

// ── Inner room component (rendered inside LiveKitRoom context) ─────────────

function RoomInner({ title, onLeave }: { title: string; onLeave: () => void }) {
  const room        = useRoomContext();
  const { localParticipant, isMicrophoneMuted, isCameraEnabled } = useLocalParticipant();
  const participants = useParticipants();
  const tracks       = useTracks([
    { source: Track.Source.Camera,      withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);

  const [showChat,    setShowChat]    = useState(false);
  const [elapsed,     setElapsed]     = useState(0);
  const [micMuted,    setMicMuted]    = useState(false);
  const [camOff,      setCamOff]      = useState(false);
  const [sharing,     setSharing]     = useState(false);

  // Timer
  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const fmtTime = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
      : `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  const toggleMic = async () => {
    await localParticipant.setMicrophoneEnabled(micMuted);
    setMicMuted(v => !v);
  };

  const toggleCam = async () => {
    await localParticipant.setCameraEnabled(camOff);
    setCamOff(v => !v);
  };

  const toggleShare = async () => {
    try {
      await localParticipant.setScreenShareEnabled(!sharing);
      setSharing(v => !v);
    } catch {}
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col select-none"
      style={{ background: '#070B14', fontFamily: 'var(--font-inter, sans-serif)' }}
      dir="ltr"
    >
      {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Live badge */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
          style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', color: '#F87171' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
          LIVE
        </div>

        {/* Title */}
        <span className="text-white font-bold text-sm flex-1 truncate">{title}</span>

        {/* Timer */}
        <div className="flex items-center gap-1.5 text-white/40 text-xs">
          <Clock size={11} />
          <span className="tabular-nums">{fmtTime(elapsed)}</span>
        </div>

        {/* Participant count */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
          style={{ background: 'rgba(46,139,255,0.12)', border: '1px solid rgba(46,139,255,0.25)', color: '#60A5FA' }}
        >
          <Users size={11} />
          {participants.length}
        </div>

        {/* Leave */}
        <button
          onClick={onLeave}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:bg-red-500/20"
          style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#F87171' }}
        >
          <PhoneOff size={13} />
          <span>Leave</span>
        </button>
      </div>

      {/* ── MAIN AREA ────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Video grid */}
        <div className="flex-1 relative overflow-hidden">
          {tracks.length === 0 ? (
            /* Waiting screen */
            <div className="w-full h-full flex flex-col items-center justify-center gap-4">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(20,224,164,0.08)', border: '1px solid rgba(20,224,164,0.2)' }}
              >
                <Video size={32} style={{ color: '#14E0A4' }} />
              </div>
              <p className="text-white/40 text-sm">Waiting for others to join…</p>
            </div>
          ) : (
            <GridLayout tracks={tracks} style={{ height: '100%', padding: '12px', gap: '8px' }}>
              <ParticipantTile />
            </GridLayout>
          )}

          {/* Connection toast */}
          <ConnectionStateToast />
        </div>

        {/* Chat panel */}
        {showChat && (
          <div
            className="w-[300px] flex flex-col flex-shrink-0"
            style={{ borderLeft: '1px solid rgba(255,255,255,0.07)', background: 'rgba(10,14,24,0.95)' }}
          >
            <div
              className="flex items-center justify-between px-4 py-3 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span className="text-white font-bold text-sm">Chat</span>
              <button onClick={() => setShowChat(false)} className="text-white/30 hover:text-white/60 transition-colors text-lg leading-none">×</button>
            </div>
            <div className="flex-1 overflow-hidden">
              <Chat
                style={{ height: '100%', '--lk-bg': 'transparent', '--lk-border-color': 'rgba(255,255,255,0.07)' } as any}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── BOTTOM CONTROL BAR ───────────────────────────────────────────── */}
      <div
        className="flex items-center justify-center gap-3 px-6 py-4 flex-shrink-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(7,11,20,0.92)', backdropFilter: 'blur(12px)' }}
      >
        {/* Mic */}
        <ControlButton
          active={!micMuted}
          onClick={toggleMic}
          activeIcon={<Mic size={18} />}
          inactiveIcon={<MicOff size={18} />}
          label={micMuted ? 'Unmute' : 'Mute'}
          danger={micMuted}
        />

        {/* Camera */}
        <ControlButton
          active={!camOff}
          onClick={toggleCam}
          activeIcon={<Video size={18} />}
          inactiveIcon={<VideoOff size={18} />}
          label={camOff ? 'Start Video' : 'Stop Video'}
          danger={camOff}
        />

        {/* Screen share */}
        <ControlButton
          active={sharing}
          onClick={toggleShare}
          activeIcon={<Monitor size={18} />}
          inactiveIcon={<Monitor size={18} />}
          label={sharing ? 'Stop Share' : 'Share Screen'}
          highlight={sharing}
        />

        {/* Chat toggle */}
        <ControlButton
          active={showChat}
          onClick={() => setShowChat(v => !v)}
          activeIcon={<MessageSquare size={18} />}
          inactiveIcon={<MessageSquare size={18} />}
          label="Chat"
          highlight={showChat}
        />

        {/* Spacer */}
        <div className="w-px h-8 mx-1" style={{ background: 'rgba(255,255,255,0.08)' }} />

        {/* Leave (red) */}
        <button
          onClick={onLeave}
          className="flex flex-col items-center gap-1 group"
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105"
            style={{ background: '#EF4444', boxShadow: '0 0 20px rgba(239,68,68,0.4)' }}
          >
            <PhoneOff size={18} className="text-white" />
          </div>
          <span className="text-[10px] text-red-400 font-medium">Leave</span>
        </button>
      </div>

      {/* Audio renderer (handles remote audio) */}
      <RoomAudioRenderer />
    </div>
  );
}

// ── Small control button ─────────────────────────────────────────────────

function ControlButton({
  active, onClick, activeIcon, inactiveIcon, label, danger = false, highlight = false,
}: {
  active: boolean;
  onClick: () => void;
  activeIcon: React.ReactNode;
  inactiveIcon: React.ReactNode;
  label: string;
  danger?: boolean;
  highlight?: boolean;
}) {
  const bg      = danger    ? 'rgba(239,68,68,0.15)'
                : highlight ? 'rgba(20,224,164,0.15)'
                : active    ? 'rgba(255,255,255,0.08)'
                :             'rgba(255,255,255,0.04)';
  const border  = danger    ? 'rgba(239,68,68,0.4)'
                : highlight ? 'rgba(20,224,164,0.4)'
                : active    ? 'rgba(255,255,255,0.12)'
                :             'rgba(255,255,255,0.07)';
  const color   = danger    ? '#F87171'
                : highlight ? '#14E0A4'
                : active    ? '#E2E8F0'
                :             '#6B7280';

  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 group">
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105 group-hover:brightness-110"
        style={{ background: bg, border: `1px solid ${border}` }}
      >
        <span style={{ color }}>{active ? activeIcon : inactiveIcon}</span>
      </div>
      <span className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</span>
    </button>
  );
}

// ── Exported overlay wrapper ─────────────────────────────────────────────

export default function MeetingRoomOverlay({ room, onLeave }: { room: ActiveRoom; onLeave: () => void }) {
  return (
    <LiveKitRoom
      serverUrl={room.ws_url}
      token={room.token}
      connect={true}
      audio={true}
      video={true}
      onDisconnected={onLeave}
    >
      <LayoutContextProvider>
        <RoomInner title={room.title} onLeave={onLeave} />
      </LayoutContextProvider>
    </LiveKitRoom>
  );
}
