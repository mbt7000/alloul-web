import React from 'react';
import { useApp } from '../../context/AppContext';
import { Globe, Building2, Repeat, Sun, Moon, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function PersistentModeSwitcher() {
  const { mode, setMode, theme, setTheme } = useApp();

  const toggleMode = () => {
    setMode(mode === 'media' ? 'company' : 'media');
  };

  const toggleTheme = () => {
    setTheme(theme === 'official' ? 'dim' : 'official');
  };

  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3">
      <motion.button
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={toggleMode}
        className="glass-dark px-6 py-3.5 rounded-[32px] flex items-center gap-5 group transition-all duration-500 hover:border-white/20 hover:glow-blue shadow-2xl"
      >
        <div className="relative w-10 h-10 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ rotate: -180, opacity: 0, scale: 0.2 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 180, opacity: 0, scale: 0.2 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              {mode === 'media' ? (
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0066FF] to-[#0044CC] flex items-center justify-center shadow-xl shadow-[#0066FF]/30 rotate-3">
                  <Globe size={20} className="text-white" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-xl shadow-emerald-500/30 -rotate-3">
                  <Building2 size={20} className="text-white" />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex flex-col items-start pr-4 border-r border-white/10 min-w-[140px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ x: 20, opacity: 0, filter: "blur(10px)" }}
              animate={{ x: 0, opacity: 1, filter: "blur(0px)" }}
              exit={{ x: -20, opacity: 0, filter: "blur(10px)" }}
              transition={{ duration: 0.4, ease: "circOut" }}
              className="flex flex-col items-start"
            >
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 leading-none mb-1.5">
                {mode === 'media' ? 'نمط التواصل' : 'نمط الأعمال'}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="p-2.5 rounded-2xl bg-white/5 group-hover:bg-white/10 transition-all group-hover:rotate-180 duration-700">
          <Repeat size={16} className="text-white/20 group-hover:text-white transition-colors" />
        </div>
      </motion.button>

      {/* Theme Switcher */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={toggleTheme}
        className={`w-14 h-14 rounded-full glass-dark border border-white/10 flex items-center justify-center shadow-2xl transition-all duration-500 ${
          theme === 'official' ? 'text-[#0066FF] glow-blue' : 'text-white/40'
        }`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={theme}
            initial={{ opacity: 0, rotate: -90 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: 90 }}
            transition={{ duration: 0.3 }}
          >
            {theme === 'official' ? <Sun size={24} /> : <Moon size={24} />}
          </motion.div>
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
