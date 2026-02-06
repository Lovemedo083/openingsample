import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import {
  Search, Bell, ChevronRight, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle, Clock, User as UserIcon
} from 'lucide-react';

interface DashboardViewProps {
  onNavigateToProject: () => void;
  isGuestMode?: boolean;
}

interface ProjectSummary {
  id: string;
  business_category: string;
  location_dong: string;
  store_size: number;
  estimated_total: number;
  status: string;
  current_step: number;
  pm?: {
    name: string;
    profile_image: string;
  };
}

interface TodoItem {
  id: string;
  title: string;
  isUrgent: boolean;
  dueDate?: string;
}

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateToProject, isGuestMode }) => {
  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [userName, setUserName] = useState('사장');

  // Mock todo items (PM이 배정하는 할일 목록)
  const [todos] = useState<TodoItem[]>([
    { id: '1', title: '포스기 대금 결제', isUrgent: true, dueDate: '이번주' },
    { id: '2', title: '인테리어 시공업체 미팅', isUrgent: false, dueDate: '다음주 월' },
  ]);

  useEffect(() => {
    loadProject();
    loadUser();
  }, []);

  const loadUser = async () => {
    if (isGuestMode) {
      setUserName('게스트');
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || '사장');
    }
  };

  const loadProject = async () => {
    if (isGuestMode) {
      // 게스트 모드 mock 데이터
      setProject({
        id: 'mock',
        business_category: 'cafe',
        location_dong: '역삼동',
        store_size: 15,
        estimated_total: 42000000,
        status: 'IN_PROGRESS',
        current_step: 5,
        pm: { name: '김민건', profile_image: '' }
      });
      return;
    }

    try {
      const { data } = await supabase
        .from('startup_projects')
        .select('*, pm:project_managers(name, profile_image)')
        .in('status', ['PM_ASSIGNED', 'IN_PROGRESS'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setProject(data);
      }
    } catch (e) {
      console.error('Failed to load project:', e);
    }
  };

  const progressPercent = project ? Math.min(Math.round((project.current_step / 10) * 100), 100) : 0;

  // 오늘 요일 인덱스 (월=0)
  const today = new Date();
  const dayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100">
        <div className="px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <img src="/favicon-new.png" alt="오프닝" className="w-8 h-8 rounded-xl shadow-sm" />
            <span className="font-black text-lg text-slate-900">오프닝</span>
          </div>
          <div className="flex-1 mx-3 bg-slate-100 h-9 rounded-full flex items-center px-3 text-slate-400 text-sm gap-2">
            <Search size={14} />
            <span className="truncate text-xs">업종, 지역, 예산 검색</span>
          </div>
          <button className="relative p-2 text-slate-400 hover:text-brand-600 transition-colors">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
          </button>
        </div>
      </header>

      {/* 이번주 할 일 */}
      <section className="bg-white mx-4 mt-4 rounded-2xl p-5 shadow-sm border border-slate-100">
        <h2 className="text-lg font-bold text-slate-900 mb-1">
          {userName}사장님 이번주 처리해야 할 일이에요!
        </h2>
        <div className="mt-4 space-y-3">
          {todos.map(todo => (
            <div
              key={todo.id}
              className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100"
            >
              {todo.isUrgent ? (
                <AlertTriangle size={18} className="text-amber-500 shrink-0" />
              ) : (
                <Clock size={18} className="text-slate-400 shrink-0" />
              )}
              <span className={`flex-1 text-sm font-medium ${todo.isUrgent ? 'text-slate-900' : 'text-slate-600'}`}>
                {todo.title}
              </span>
              {todo.dueDate && (
                <span className="text-xs text-slate-400 shrink-0">{todo.dueDate}</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 진행중인 프로젝트 */}
      {project && (
        <section
          onClick={onNavigateToProject}
          className="bg-brand-50 mx-4 mt-4 rounded-2xl p-5 border-2 border-brand-200 cursor-pointer hover:border-brand-300 transition-colors"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900">지금 진행중인 프로젝트</h3>
            <ChevronRight size={18} className="text-slate-400" />
          </div>

          {/* Progress Bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-100 text-brand-700 text-xs font-bold rounded-full">
                {progressPercent}%
              </span>
              <span className="text-xs text-slate-500">마감</span>
            </div>
            <div className="w-full h-2 bg-brand-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-600 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* PM 정보 */}
          {project.pm && (
            <div className="flex items-center justify-end gap-2 mt-3">
              <div className="w-6 h-6 bg-brand-200 rounded-full flex items-center justify-center">
                <UserIcon size={12} className="text-brand-700" />
              </div>
              <span className="text-xs font-bold text-brand-700">{project.pm.name}</span>
            </div>
          )}
        </section>
      )}

      {/* 주간 캘린더 */}
      <section className="bg-white mx-4 mt-4 rounded-2xl border border-slate-100 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-100">
          {WEEKDAYS.map((day, idx) => (
            <div
              key={day}
              className={`py-3 text-center text-sm font-medium ${
                idx === dayIndex
                  ? 'text-brand-600 font-bold'
                  : idx >= 5
                    ? 'text-red-400'
                    : 'text-slate-500'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 캘린더 본문 (접히는 영역) */}
        {isCalendarOpen && (
          <div className="p-4 text-center text-sm text-slate-400 min-h-[120px] flex items-center justify-center">
            등록된 일정이 없습니다
          </div>
        )}

        <button
          onClick={() => setIsCalendarOpen(!isCalendarOpen)}
          className="w-full py-3 text-sm text-slate-400 font-medium flex items-center justify-center gap-1 hover:bg-slate-50 transition-colors border-t border-slate-100"
        >
          달력 펼치기
          {isCalendarOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </section>
    </div>
  );
};
