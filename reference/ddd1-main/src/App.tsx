/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { MediaApp } from './modes/media/MediaApp';
import { CompanyApp } from './modes/company/CompanyApp';
import { PersistentModeSwitcher } from './components/GlobalLayer/PersistentModeSwitcher';
import { AnimatePresence, motion } from 'motion/react';

function AppRoot() {
  const { mode, theme } = useApp();

  return (
    <div className={`h-screen w-full bg-[#050505] overflow-hidden relative font-sans antialiased text-white transition-all duration-700 ${theme === 'dim' ? 'theme-dim' : ''}`}>
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-[#0066FF]/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-[20%] -right-[10%] w-[30%] h-[30%] bg-emerald-500/5 rounded-full blur-[100px] animate-float" />
        <div className="absolute -bottom-[10%] left-[20%] w-[50%] h-[50%] bg-purple-500/5 rounded-full blur-[150px]" />
      </div>

      {/* Mode Switcher - Global Layer */}
      <PersistentModeSwitcher />

      {/* App Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="h-full w-full"
        >
          {mode === 'media' ? <MediaApp /> : <CompanyApp />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppRoot />
    </AppProvider>
  );
}

