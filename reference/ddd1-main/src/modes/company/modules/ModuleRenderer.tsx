import React from 'react';
import { CompanyModuleId } from '../../../types';
import { HandoverModule } from './HandoverModule';
import { MeetingsModule } from './MeetingsModule';
import { FilesModule } from './FilesModule';
import { TeamsModule } from './TeamsModule';
import { ProjectsModule } from './ProjectsModule';
import { ChatModule } from './ChatModule';
import { CRMModule } from './CRMModule';
import { ReportsModule } from './ReportsModule';
import { AIModule } from './AIModule';
import { CareerLadderModule } from './CareerLadderModule';

interface ModuleRendererProps {
  moduleId: CompanyModuleId;
  onBack: () => void;
}

export function ModuleRenderer({ moduleId, onBack }: ModuleRendererProps) {
  switch (moduleId) {
    case 'handover':
      return <HandoverModule onBack={onBack} />;
    case 'meetings':
      return <MeetingsModule onBack={onBack} />;
    case 'files':
      return <FilesModule onBack={onBack} />;
    case 'teams':
      return <TeamsModule onBack={onBack} />;
    case 'projects':
      return <ProjectsModule onBack={onBack} />;
    case 'chat':
      return <ChatModule onBack={onBack} />;
    case 'crm':
      return <CRMModule onBack={onBack} />;
    case 'reports':
      return <ReportsModule onBack={onBack} />;
    case 'ai':
      return <AIModule onBack={onBack} />;
    case 'career':
      return <CareerLadderModule onBack={onBack} />;
    default:
      return (
        <div className="flex flex-col items-center justify-center h-full text-white/20 p-10 text-center">
          <div className="text-4xl font-black mb-4 uppercase tracking-widest opacity-10">قريباً</div>
          <p className="text-xs font-bold uppercase tracking-widest">هذه الوحدة قيد التطوير حالياً</p>
          <button 
            onClick={onBack}
            className="mt-8 px-6 py-3 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all"
          >
            العودة للخدمات
          </button>
        </div>
      );
  }
}
