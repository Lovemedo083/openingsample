import React from 'react';
import { MainTab } from '../types';
import { Home, ShoppingBag, FileText, MessageSquare, Menu, Armchair, Rocket } from 'lucide-react';

interface BottomNavProps {
  currentTab: MainTab;
  onTabChange: (tab: MainTab) => void;
  hasActiveProject?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange, hasActiveProject }) => {
  const tabs: { id: MainTab; label: string; icon: React.ReactNode }[] = [
    { id: 'HOME', label: '홈', icon: <Home size={22} /> },
    ...(hasActiveProject ? [{ id: 'PROJECT' as MainTab, label: '프로젝트', icon: <Rocket size={22} /> }] : []),
    { id: 'FURNITURE', label: '가구마켓', icon: <Armchair size={22} /> },
    { id: 'CONSULTING', label: '상담', icon: <MessageSquare size={22} /> },
    { id: 'MORE', label: '더보기', icon: <Menu size={22} /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)] z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <div className="max-w-7xl mx-auto flex justify-between px-2">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-3 min-h-[60px] transition-colors
                ${isActive ? 'text-brand-700' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <div className={`mb-1 transition-transform ${isActive ? 'scale-110' : ''}`}>
                {tab.icon}
              </div>
              <span className={`text-[10px] font-medium ${isActive ? 'font-bold' : ''}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
