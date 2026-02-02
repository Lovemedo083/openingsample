import React from 'react';
import { MainTab } from '../types';
import { Home, ShoppingBag, FileText, MessageSquare, HelpCircle, DoorOpen, LogOut, Settings, User, Armchair, Rocket, Plus } from 'lucide-react';

interface SidebarProps {
  currentTab: MainTab;
  onTabChange: (tab: MainTab) => void;
  className?: string;
  hasActiveProject?: boolean;
  onStartNewProject?: () => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange, className = '', hasActiveProject, onStartNewProject, onLogout }) => {
  const tabs: { id: MainTab; label: string; icon: React.ReactNode }[] = [
    { id: 'HOME', label: '홈', icon: <Home size={20} /> },
    { id: 'PROJECT' as MainTab, label: hasActiveProject ? '내 프로젝트' : '창업 시작하기', icon: <Rocket size={20} /> },
    { id: 'FURNITURE', label: '가구 마켓', icon: <Armchair size={20} /> },
    { id: 'LISTINGS', label: '패키지 매물', icon: <ShoppingBag size={20} /> },
    { id: 'QUOTE', label: '견적 관리', icon: <FileText size={20} /> },
    { id: 'FAQ', label: 'FAQ', icon: <HelpCircle size={20} /> },
    { id: 'CONSULTING', label: '내 상담', icon: <MessageSquare size={20} /> },
  ];

  return (
    <aside className={`w-64 bg-white border-r border-gray-200 flex-col h-screen sticky top-0 z-50 shrink-0 ${className}`}>
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-gray-100 mb-4">
        <div className="flex items-center gap-2">
             <img src="/favicon-new.png" alt="오프닝" className="w-9 h-9 rounded-xl" />
             <span className="font-black text-xl tracking-tight text-slate-900">오프닝</span>
        </div>
      </div>

      {/* 새 프로젝트 시작 버튼 */}
      {onStartNewProject && !hasActiveProject && (
        <div className="px-3 mb-4">
          <button
            onClick={onStartNewProject}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-lg shadow-brand-500/20 transition-all"
          >
            <Plus size={20} />
            창업 시작하기
          </button>
        </div>
      )}
      
      {/* Navigation */}
      <div className="flex-1 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Menu</div>
        {tabs.map((tab) => {
           const isActive = currentTab === tab.id;
           return (
             <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group
                  ${isActive 
                    ? 'bg-brand-50 text-brand-700 shadow-sm ring-1 ring-brand-100' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
             >
                <div className={`transition-colors ${isActive ? 'text-brand-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
                  {tab.icon}
                </div>
                {tab.label}
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500"></div>}
             </button>
           );
        })}

        <div className="mt-8 px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Support</div>
        <button
          onClick={() => onTabChange('MORE')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
            <Settings size={20} className="text-gray-400" />
            설정
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-red-600 transition-colors"
        >
            <LogOut size={20} className="text-gray-400" />
            로그아웃
        </button>
      </div>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-gray-100 bg-gray-50/50">
         <div className="flex items-center gap-3 p-2 hover:bg-white hover:shadow-sm rounded-xl cursor-pointer transition-all border border-transparent hover:border-gray-200">
             <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-brand-600 shadow-sm">
                 <User size={20} />
             </div>
             <div className="text-left flex-1 min-w-0">
                 <div className="text-sm font-bold text-slate-900 truncate">김사장님</div>
                 <div className="text-xs text-gray-500 truncate">개인회원 · 마포구</div>
             </div>
         </div>
      </div>
    </aside>
  );
}