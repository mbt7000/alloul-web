import React from 'react';
import { motion } from 'motion/react';

interface SmartLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function SmartLogo({ size = 'md', showText = true, className = "" }: SmartLogoProps) {
  const sizes = {
    sm: { icon: 32, text: 'text-[11px]' },
    md: { icon: 52, text: 'text-xl' },
    lg: { icon: 84, text: 'text-4xl' }
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative group">
        {/* Neural Network Glow */}
        <div className="absolute inset-0 bg-[#0066FF] blur-[25px] opacity-20 group-hover:opacity-60 transition-all duration-1000 animate-pulse" />
        
        {/* Logo SVG - Dense Network/Grid */}
        <svg 
          width={sizes[size].icon} 
          height={sizes[size].icon} 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10"
        >
          {/* Background Neural Network - Dense Grid */}
          <g opacity="0.4">
            {/* Grid Nodes */}
            {Array.from({ length: 5 }).map((_, i) => 
              Array.from({ length: 5 }).map((_, j) => (
                <circle key={`${i}-${j}`} cx={20 + i * 15} cy={20 + j * 15} r="1" fill="white" />
              ))
            )}
            
            {/* Horizontal Connections */}
            {Array.from({ length: 5 }).map((_, i) => (
              <line key={`h-${i}`} x1="20" y1={20 + i * 15} x2="80" y2={20 + i * 15} stroke="white" strokeWidth="0.2" strokeOpacity="0.2" />
            ))}
            {/* Vertical Connections */}
            {Array.from({ length: 5 }).map((_, i) => (
              <line key={`v-${i}`} x1={20 + i * 15} y1="20" x2={20 + i * 15} y2="80" stroke="white" strokeWidth="0.2" strokeOpacity="0.2" />
            ))}
            
            {/* Central Hub */}
            <circle cx="50" cy="50" r="3" fill="#0066FF" />
            <circle cx="50" cy="50" r="6" stroke="#0066FF" strokeWidth="0.5" strokeOpacity="0.3" />
          </g>

          {/* The "Q" / AI Integration */}
          <motion.path
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 2.5, ease: "circOut" }}
            d="M50 20C33.4315 20 20 33.4315 20 50C20 66.5685 33.4315 80 50 80C57.5 80 64.5 77.2 69.8 72.5L85 88"
            stroke="url(#smart-gradient)"
            strokeWidth="7"
            strokeLinecap="round"
          />

          {/* AI Sparkle */}
          <motion.path
            d="M50 38L52 48H62L54 54L57 64L50 58L43 64L46 54L38 48H48L50 38Z"
            fill="white"
            animate={{ scale: [0.8, 1.1, 0.8], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="drop-shadow-[0_0_10px_rgba(255,255,255,0.9)]"
          />

          <defs>
            <linearGradient id="smart-gradient" x1="20" y1="20" x2="85" y2="88" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0066FF" />
              <stop offset="1" stopColor="#00E0FF" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-baseline gap-0.5">
            <span className={`${sizes[size].text} font-black tracking-tighter text-white uppercase leading-none`}>
              ALLOUL
            </span>
            <span className={`${sizes[size].text} font-black tracking-tighter text-[#0066FF] leading-none`}>
              &Q
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5 opacity-60">
            <div className="flex gap-0.5">
              <div className="w-1 h-1 rounded-full bg-[#0066FF] animate-pulse" />
              <div className="w-1 h-1 rounded-full bg-[#0066FF] animate-pulse delay-75" />
              <div className="w-1 h-1 rounded-full bg-[#0066FF] animate-pulse delay-150" />
            </div>
            <span className="text-[7px] font-black text-white/50 uppercase tracking-[0.5em]">
              NEURAL ENTERPRISE
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
