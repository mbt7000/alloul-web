import React, { useState } from 'react';
import { MediaTabId } from '../../types';
import { 
  Home, 
  Search, 
  Bell, 
  User, 
  Compass, 
  PlusSquare, 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreHorizontal,
  TrendingUp,
  Hash,
  CheckCircle2,
  Globe,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SmartLogo } from '../../components/Branding/SmartLogo';

export function MediaApp() {
  const [activeTab, setActiveTab] = useState<MediaTabId>('home');

  const renderTab = () => {
    switch (activeTab) {
      case 'home': return <MediaHome />;
      case 'explore': return <MediaExplore />;
      case 'notifications': return <MediaNotifications />;
      case 'search': return <MediaSearch />;
      case 'profile': return <UserProfile />;
      default: return <MediaHome />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] text-right" dir="rtl">
      {/* Media Header */}
      <header className="h-24 border-b border-white/5 flex items-center justify-between px-8 sticky top-0 glass-dark z-30">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-[20px] bg-gradient-to-br from-[#0066FF] to-[#0044CC] flex items-center justify-center shadow-2xl shadow-[#0066FF]/30 rotate-3 group hover:rotate-0 transition-all duration-500">
              <Globe size={28} className="text-white" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#0066FF] animate-pulse shadow-[0_0_8px_rgba(0,102,255,0.5)]" />
                <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.4em]">MEDIA MODE</p>
              </div>
            </div>
          </div>

          <div className="h-10 w-px bg-white/10 hidden md:block" />
          
          <SmartLogo size="sm" className="hidden md:flex" />
        </div>
        <div className="flex items-center gap-4">
          <button className="w-11 h-11 glass rounded-2xl transition-all hover:scale-110 text-white/40 hover:text-white flex items-center justify-center hover:glow-blue">
            <PlusSquare size={22} />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto hide-scrollbar pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {renderTab()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Tabs */}
      <nav className="fixed bottom-8 left-8 right-8 h-24 glass-dark rounded-[40px] flex items-center justify-around px-6 z-40 border-white/10 shadow-2xl hover:border-white/20 transition-all duration-500">
        <TabButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={Home} label="الرئيسية" />
        <TabButton active={activeTab === 'explore'} onClick={() => setActiveTab('explore')} icon={Compass} label="استكشاف" />
        <TabButton active={activeTab === 'search'} onClick={() => setActiveTab('search')} icon={Search} label="بحث" />
        <TabButton active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} icon={Bell} label="التنبيهات" />
        <TabButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={User} label="حسابي" />
      </nav>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: any) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 group py-2 flex-1">
      <div className={`w-12 h-12 rounded-2xl transition-all duration-500 flex items-center justify-center ${
        active ? 'bg-white text-black shadow-2xl scale-110 rotate-3' : 'text-white/20 group-hover:text-white/50 group-hover:bg-white/5'
      }`}>
        <Icon size={24} strokeWidth={active ? 2.5 : 2} />
      </div>
      <span className={`text-[9px] font-black uppercase tracking-widest transition-all duration-500 ${active ? 'text-white opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
        {label}
      </span>
    </button>
  );
}

function MediaHome() {
  const [postContent, setPostContent] = useState('');
  const posts = [
    { 
      id: 1, 
      user: 'Alloul Cloud ☁️', 
      handle: '@alloul_cloud',
      avatar: 'https://picsum.photos/seed/1/100/100', 
      content: 'أطلقنا اليوم نمط الشركات الجديد في تطبيق Alloul One! 🚀 تجربة عمل مؤسسية متكاملة في جيبك. #AlloulOne #Enterprise #Business 🏢', 
      time: '2س',
      likes: 124,
      comments: 18,
      shares: 45,
      verified: true
    },
    { 
      id: 2, 
      user: 'سارة أحمد 🎨', 
      handle: '@sarah_design',
      avatar: 'https://picsum.photos/seed/2/100/100', 
      content: 'تصميم الواجهة في التطبيق الجديد مذهل جداً. استخدام الـ Bento Grid أعطى طابع عصري واحترافي. 😍✨', 
      time: '4س',
      likes: 89,
      comments: 12,
      shares: 8,
      verified: false
    },
    { 
      id: 3, 
      user: 'عالم التقنية 💻', 
      handle: '@tech_world',
      avatar: 'https://picsum.photos/seed/3/100/100', 
      content: 'إعادة هيكلة تطبيق إنتاجي ضخم ليس بالأمر السهل، ولكن Alloul One جعل الأمر يبدو بسيطاً وسلساً للغاية. فخور بهذا العمل العربي. 🌍🔥', 
      time: '6س',
      likes: 210,
      comments: 34,
      shares: 67,
      verified: true
    },
  ];

  return (
    <div className="divide-y divide-white/5">
      {/* Create Post Area */}
      <div className="p-6 border-b border-white/5 bg-white/[0.01]">
        <div className="flex gap-4">
          <img src="https://picsum.photos/seed/me/100/100" className="w-12 h-12 rounded-2xl border border-white/10 flex-shrink-0 object-cover" />
          <div className="flex-1 space-y-4">
            <textarea 
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="ماذا يدور في ذهنك؟"
              className="w-full bg-transparent border-none focus:ring-0 text-white placeholder-white/20 resize-none text-lg min-h-[80px]"
            />
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setPostContent('أنا متحمس جداً لاستخدام Alloul One اليوم! 🚀 #AlloulOne')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass-blue text-[#0066FF] text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all group"
                >
                  <Sparkles size={14} className="group-hover:animate-pulse" />
                  اقتراح ذكي
                </button>
              </div>
              <button 
                disabled={!postContent}
                className={`px-6 py-2 rounded-2xl font-black text-sm transition-all ${
                  postContent ? 'bg-[#0066FF] text-white shadow-lg shadow-[#0066FF]/30 hover:scale-105' : 'bg-white/5 text-white/20'
                }`}
              >
                نشر
              </button>
            </div>
          </div>
        </div>
      </div>

      {posts.map(post => (
        <div key={post.id} className="p-6 space-y-4 hover:bg-white/[0.02] transition-all cursor-pointer group border-b border-white/5">
          <div className="flex items-start gap-4">
            <div className="relative">
              <img src={post.avatar} className="w-12 h-12 rounded-2xl border border-white/10 flex-shrink-0 object-cover shadow-xl" />
              {post.verified && (
                <div className="absolute -bottom-1 -right-1 bg-[#0066FF] rounded-full p-0.5 border-2 border-[#050505]">
                  <CheckCircle2 size={10} className="text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm font-black text-white truncate">{post.user}</span>
                  <span className="text-[10px] text-white/30 font-bold truncate">{post.handle}</span>
                  <span className="text-[10px] text-white/20">• {post.time}</span>
                </div>
                <button className="p-2 glass rounded-xl text-white/20 hover:text-white transition-colors">
                  <MoreHorizontal size={14} />
                </button>
              </div>
              <p className="text-sm text-white/80 leading-relaxed mt-2 whitespace-pre-wrap">{post.content}</p>
              
              <div className="flex items-center justify-between mt-6 max-w-sm">
                <button className="flex items-center gap-2 text-white/30 hover:text-pink-500 transition-all group/btn">
                  <div className="p-2.5 glass rounded-2xl group-hover/btn:bg-pink-500/10 group-hover/btn:text-pink-500">
                    <Heart size={16} />
                  </div>
                  <span className="text-[10px] font-black">{post.likes}</span>
                </button>
                <button className="flex items-center gap-2 text-white/30 hover:text-[#0066FF] transition-all group/btn">
                  <div className="p-2.5 glass rounded-2xl group-hover/btn:bg-[#0066FF]/10 group-hover/btn:text-[#0066FF]">
                    <MessageCircle size={16} />
                  </div>
                  <span className="text-[10px] font-black">{post.comments}</span>
                </button>
                <button className="flex items-center gap-2 text-white/30 hover:text-green-500 transition-all group/btn">
                  <div className="p-2.5 glass rounded-2xl group-hover/btn:bg-green-500/10 group-hover/btn:text-green-500">
                    <Share2 size={16} />
                  </div>
                  <span className="text-[10px] font-black">{post.shares}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MediaExplore() {
  const trends = [
    { tag: 'AlloulOne', posts: '12.4K', category: 'تقنية' },
    { tag: 'المملكة_العربية_السعودية', posts: '85.2K', category: 'أخبار' },
    { tag: 'رؤية_2030', posts: '45.1K', category: 'اقتصاد' },
    { tag: 'تطوير_التطبيقات', posts: '8.9K', category: 'برمجة' },
    { tag: 'الذكاء_الاصطناعي', posts: '32.7K', category: 'علوم' },
  ];

  return (
    <div className="p-6 space-y-8">
      <div className="relative group">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#0066FF] transition-colors" size={18} />
        <input 
          type="text" 
          placeholder="استكشف المحتوى..." 
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pr-12 pl-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#0066FF]/50 transition-all"
        />
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-2 text-white/40">
          <TrendingUp size={18} />
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">المواضيع الرائجة</h3>
        </div>
        <div className="divide-y divide-white/5">
          {trends.map((trend, i) => (
            <button key={i} className="w-full py-5 flex flex-col items-start gap-1 hover:bg-white/[0.02] transition-all text-right group">
              <span className="text-[8px] text-white/30 font-black uppercase tracking-widest">{trend.category} · رائج</span>
              <div className="text-base font-bold text-white group-hover:text-[#0066FF] transition-colors"># {trend.tag}</div>
              <span className="text-[10px] text-white/20 font-bold">{trend.posts} منشور</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MediaNotifications() {
  const notifications = [
    { id: 1, type: 'like', user: 'أحمد خالد', content: 'أعجب بمنشورك', time: '2د', avatar: 'https://picsum.photos/seed/10/50/50' },
    { id: 2, type: 'follow', user: 'ليلى إبراهيم', content: 'بدأت بمتابعتك', time: '15د', avatar: 'https://picsum.photos/seed/11/50/50' },
    { id: 3, type: 'mention', user: 'خالد عبدالله', content: 'ذكرك في تعليق: "عمل رائع!"', time: '1س', avatar: 'https://picsum.photos/seed/12/50/50' },
    { id: 4, type: 'repost', user: 'سارة محمد', content: 'أعادت نشر منشورك', time: '3س', avatar: 'https://picsum.photos/seed/13/50/50' },
  ];

  return (
    <div className="divide-y divide-white/5">
      {notifications.map(notif => (
        <div key={notif.id} className="p-5 flex items-start gap-4 hover:bg-white/[0.02] transition-colors cursor-pointer">
          <div className="relative">
            <img src={notif.avatar} className="w-12 h-12 rounded-full border border-white/10" />
            <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-[#050505] flex items-center justify-center ${
              notif.type === 'like' ? 'bg-pink-500' : 
              notif.type === 'follow' ? 'bg-[#0066FF]' : 
              notif.type === 'mention' ? 'bg-green-500' : 'bg-purple-500'
            }`}>
              {notif.type === 'like' ? <Heart size={10} className="text-white" /> : 
               notif.type === 'follow' ? <User size={10} className="text-white" /> : 
               notif.type === 'mention' ? <MessageCircle size={10} className="text-white" /> : <Share2 size={10} className="text-white" />}
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">{notif.user}</span>
              <span className="text-[10px] text-white/20 font-bold">{notif.time}</span>
            </div>
            <p className="text-sm text-white/50 mt-0.5">{notif.content}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function MediaSearch() {
  return (
    <div className="p-6 space-y-8">
      <div className="relative group">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#0066FF] transition-colors" size={18} />
        <input 
          type="text" 
          placeholder="ابحث عن أشخاص، مواضيع، أو كلمات..." 
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pr-12 pl-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#0066FF]/50 transition-all"
        />
      </div>

      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-white/10">
          <Search size={40} />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white/40">ابدأ البحث</h3>
          <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">ابحث عن أي شيء في عالم Alloul One</p>
        </div>
      </div>
    </div>
  );
}

function UserProfile() {
  return (
    <div className="flex flex-col h-full">
      <div className="h-32 bg-gradient-to-br from-[#0066FF] to-[#0044CC] relative">
        <div className="absolute -bottom-12 right-6">
          <img src="https://picsum.photos/seed/me/150/150" className="w-24 h-24 rounded-full border-4 border-[#050505] object-cover shadow-2xl" />
        </div>
      </div>
      
      <div className="p-6 pt-16 space-y-6">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-white">محمد ألّول</h2>
            <p className="text-sm text-white/40 font-bold">@m_alloul</p>
          </div>
          <button className="px-6 py-2.5 bg-white text-black rounded-full text-xs font-black uppercase tracking-widest hover:bg-white/90 transition-all">
            تعديل الملف
          </button>
        </div>

        <p className="text-sm text-white/80 leading-relaxed">
          مؤسس ومدير تنفيذي لشركة Alloul Cloud. شغوف بالتقنية والتصميم وبناء المنتجات التي تترك أثراً. 🚀
        </p>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black text-white">1,240</span>
            <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">متابع</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black text-white">850</span>
            <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">يتابع</span>
          </div>
        </div>

        <div className="border-t border-white/5 pt-6">
          <div className="flex items-center gap-2 text-white/40 mb-6">
            <Hash size={18} />
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">منشوراتي</h3>
          </div>
          <div className="flex flex-col items-center justify-center py-10 text-center opacity-20">
            <PlusSquare size={40} className="mb-4" />
            <p className="text-xs font-bold uppercase tracking-widest">لا توجد منشورات بعد</p>
          </div>
        </div>
      </div>
    </div>
  );
}
