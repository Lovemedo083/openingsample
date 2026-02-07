import React from 'react';
import { MainTab } from '../types';
import { Home, MessageSquare, Menu, User } from 'lucide-react';

interface BottomNavProps {
  currentTab: MainTab;
  onTabChange: (tab: MainTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange }) => {
  const tabs: { id: MainTab; label: string; icon: React.ReactNode }[] = [
    { id: 'HOME', label: '홈', icon: <Home size={22} /> },
    { id: 'CONSULTING', label: '상담', icon: <MessageSquare size={22} /> },
    { id: 'MORE', label: '더보기', icon: <Menu size={22} /> },
    { id: 'MYPAGE', label: '마이페이지', icon: <User size={22} /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)] z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <div className="max-w-lg mx-auto flex justify-between px-2">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-2 min-h-[56px] transition-all mx-1
                ${isActive ? 'text-brand-700' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <div className={`mb-0.5 p-1 rounded-lg transition-all ${isActive ? 'bg-brand-50 scale-110' : ''}`}>
                {tab.icon}
              </div>
              <span className={`text-[11px] ${isActive ? 'font-bold text-brand-700' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
