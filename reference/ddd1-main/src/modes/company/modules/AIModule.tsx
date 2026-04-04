import React, { useState } from 'react';
import { ChevronLeft, Send, Sparkles, Brain, Zap, MessageSquare, Bot, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { SmartLogo } from '../../../components/Branding/SmartLogo';

export function AIModule({ onBack }: { onBack: () => void }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'مرحباً بك في Alloul&Q. كيف يمكنني مساعدتك اليوم في إدارة أعمالك؟' }
  ]);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { role: 'user', content: input }]);
    setInput('');
    // Mock response
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', content: 'أنا أقوم بتحليل طلبك الآن باستخدام محرك Alloul&Q المتطور...' }]);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] text-right" dir="rtl">
      {/* Header */}
      <header className="h-24 border-b border-white/5 flex items-center justify-between px-8 sticky top-0 glass-dark z-30">
        <div className="flex items-center gap-5">
          <button onClick={onBack} className="w-11 h-11 glass rounded-2xl flex items-center justify-center text-white/40 hover:text-white transition-all hover:scale-110 rotate-180">
            <ChevronLeft size={24} />
          </button>
          <SmartLogo size="md" />
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
            نشط الآن
          </span>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 hide-scrollbar">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
            >
              <div className={`max-w-[85%] p-4 rounded-[24px] text-sm leading-relaxed shadow-xl ${
                msg.role === 'user' 
                  ? 'bg-[#0066FF] text-white rounded-tr-none' 
                  : 'glass-dark border border-white/5 text-white/80 rounded-tl-none'
              }`}>
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Suggested Actions */}
      <div className="px-6 py-4 overflow-x-auto hide-scrollbar flex gap-3">
        {[
          { icon: Brain, label: 'تحليل الأداء' },
          { icon: Zap, label: 'توقع المبيعات' },
          { icon: MessageSquare, label: 'صياغة بريد' },
          { icon: Bot, label: 'أتمتة المهام' }
        ].map((action, i) => (
          <button key={i} className="flex-shrink-0 px-4 py-2 rounded-xl glass border border-white/5 text-[10px] font-black text-white/60 hover:text-white hover:border-white/20 transition-all flex items-center gap-2">
            <action.icon size={14} />
            {action.label}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-6 pt-2">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="اسأل Alloul&Q عن أي شيء..."
            className="w-full h-16 bg-white/5 border border-white/10 rounded-[20px] px-6 pr-16 text-white placeholder:text-white/20 focus:outline-none focus:border-[#0066FF]/50 transition-all"
          />
          <button 
            onClick={handleSend}
            className="absolute left-3 top-3 w-10 h-10 bg-[#0066FF] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#0066FF]/20 hover:scale-105 transition-all"
          >
            <Send size={18} className="rotate-180" />
          </button>
        </div>
      </div>
    </div>
  );
}
