import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import {
  Bell, ChevronRight, ChevronDown, ChevronUp,
  Clock, User as UserIcon, Phone, Send,
  Loader2, MessageCircle, Rocket, CheckCircle,
  Coffee, Utensils, Beer, ShoppingBag, Scissors, Dumbbell,
  GraduationCap, Building, Monitor, Briefcase, MoreHorizontal,
  ImagePlus, X
} from 'lucide-react';

interface DashboardViewProps {
  onNavigateToProject: () => void;
  isGuestMode?: boolean;
}

interface ProjectDetail {
  id: string;
  business_category: string;
  location_dong: string;
  store_size: number;
  estimated_total: number;
  status: string;
  current_step: number;
  pm_id: string | null;
  created_at: string;
  pm?: {
    id: string;
    name: string;
    phone: string;
    profile_image: string;
    specialties: string[];
    introduction: string;
    rating: number;
    completed_projects: number;
  };
}

interface Message {
  id: string;
  sender_type: 'USER' | 'PM' | 'SYSTEM';
  message: string;
  attachments?: { url: string; type: string; name: string }[];
  created_at: string;
}

// 단계별 테마 색상
const STEP_THEMES: Record<number, { gradient: string; light: string; text: string; progress: string; badge: string; icon: string }> = {
  7:  { gradient: 'from-blue-500 to-blue-600', light: 'bg-blue-50', text: 'text-blue-600', progress: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700', icon: 'text-blue-500' },
  8:  { gradient: 'from-violet-500 to-purple-600', light: 'bg-violet-50', text: 'text-violet-600', progress: 'bg-violet-500', badge: 'bg-violet-100 text-violet-700', icon: 'text-violet-500' },
  9:  { gradient: 'from-orange-500 to-amber-600', light: 'bg-orange-50', text: 'text-orange-600', progress: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700', icon: 'text-orange-500' },
  10: { gradient: 'from-emerald-500 to-teal-600', light: 'bg-emerald-50', text: 'text-emerald-600', progress: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700', icon: 'text-emerald-500' },
  11: { gradient: 'from-green-500 to-lime-600', light: 'bg-green-50', text: 'text-green-600', progress: 'bg-green-500', badge: 'bg-green-100 text-green-700', icon: 'text-green-500' },
  12: { gradient: 'from-slate-500 to-gray-600', light: 'bg-slate-50', text: 'text-slate-600', progress: 'bg-slate-500', badge: 'bg-slate-100 text-slate-700', icon: 'text-slate-500' },
};

const STEP_LABELS: Record<number, string> = {
  7: '상담 시작',
  8: '비용 컨설팅',
  9: '계약/착수',
  10: '시공 진행',
  11: '오픈 완료',
  12: '사후관리',
};

const BUSINESS_LABELS: Record<string, { label: string; icon: any; emoji: string }> = {
  cafe: { label: '카페/디저트', icon: Coffee, emoji: '☕' },
  restaurant: { label: '음식점', icon: Utensils, emoji: '🍽️' },
  chicken: { label: '치킨/분식', icon: Utensils, emoji: '🍗' },
  pub: { label: '주점/바', icon: Beer, emoji: '🍺' },
  retail: { label: '소매/편의점', icon: ShoppingBag, emoji: '🏪' },
  beauty: { label: '미용/뷰티', icon: Scissors, emoji: '💇' },
  fitness: { label: '헬스/운동', icon: Dumbbell, emoji: '💪' },
  education: { label: '교육/학원', icon: GraduationCap, emoji: '📚' },
  pcroom: { label: 'PC방/오락시설', icon: Monitor, emoji: '🖥️' },
  hotel: { label: '호텔/숙박', icon: Building, emoji: '🏨' },
  office: { label: '사무실', icon: Briefcase, emoji: '🏢' },
  etc: { label: '기타', icon: MoreHorizontal, emoji: '📦' },
};

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateToProject, isGuestMode }) => {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('사장');
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProject();
    loadUser();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadUser = async () => {
    if (isGuestMode) { setUserName('게스트'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || '사장');
    }
  };

  const loadProject = async () => {
    if (isGuestMode) {
      setProject({
        id: 'mock', business_category: 'cafe', location_dong: '역삼동',
        store_size: 15, estimated_total: 42000000, status: 'PENDING_PM',
        current_step: 6, pm_id: null, created_at: new Date().toISOString()
      });
      setLoading(false);
      return;
    }

    try {
      const { data } = await supabase
        .from('startup_projects')
        .select('*, pm:project_managers(*)')
        .in('status', ['PENDING_PM', 'PM_ASSIGNED', 'IN_PROGRESS'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setProject(data);
        if (data.id) {
          loadMessages(data.id);
          subscribeToMessages(data.id);
          subscribeToProject(data.id);
        }
      }
    } catch (e) {
      console.error('Failed to load project:', e);
    }
    setLoading(false);
  };

  const loadMessages = async (projectId: string) => {
    const { data } = await supabase
      .from('project_messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at');
    if (data) setMessages(data);
  };

  const subscribeToMessages = (projectId: string) => {
    supabase
      .channel(`dash-msgs-${projectId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'project_messages',
        filter: `project_id=eq.${projectId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();
  };

  const subscribeToProject = (projectId: string) => {
    supabase
      .channel(`dash-project-${projectId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'startup_projects',
        filter: `id=eq.${projectId}`
      }, () => {
        // 프로젝트 업데이트 시 전체 다시 로드
        loadProject();
      })
      .subscribe();
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !project?.id || isGuestMode) return;
    setSending(true);

    const { data, error } = await supabase.from('project_messages').insert({
      project_id: project.id,
      sender_type: 'USER',
      message: newMessage.trim()
    }).select().single();

    if (!error && data) {
      setMessages(prev => {
        const exists = prev.some(m => m.id === data.id);
        return exists ? prev : [...prev, data];
      });
    }
    setNewMessage('');
    setSending(false);
  };

  const formatPrice = (price: number) => {
    if (price >= 100000000) return `${(price / 100000000).toFixed(1)}억`;
    if (price >= 10000) return `${(price / 10000).toFixed(0)}만`;
    return `${price}원`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-brand-600" size={32} />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8 text-center">
        <div>
          <Rocket size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500">프로젝트를 찾을 수 없습니다</p>
        </div>
      </div>
    );
  }

  const biz = BUSINESS_LABELS[project.business_category] || BUSINESS_LABELS.etc;
  const isPending = project.status === 'PENDING_PM';
  const currentTheme = STEP_THEMES[project.current_step] || STEP_THEMES[7];
  const pmStepNum = project.current_step >= 7 ? project.current_step - 6 : 0;
  const progressPercent = isPending ? 0 : Math.round((pmStepNum / 6) * 100);

  // === 채팅 풀스크린 ===
  if (showChat && !isPending) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col pb-20">
        {/* 채팅 헤더 */}
        <div className={`bg-gradient-to-r ${currentTheme.gradient} text-white px-4 py-3 shrink-0`}>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowChat(false)} className="p-1 hover:bg-white/10 rounded-full">
              <ChevronRight className="rotate-180" size={20} />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold truncate">
                {project.pm?.name || 'PM'} 상담
              </h1>
              <p className="text-xs text-white/70">
                {STEP_LABELS[project.current_step]} · {biz.label}
              </p>
            </div>
            {project.pm?.phone && (
              <a href={`tel:${project.pm.phone}`} className="p-2 bg-white/20 rounded-full">
                <Phone size={16} />
              </a>
            )}
          </div>
        </div>

        {/* 메시지 목록 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender_type === 'USER' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                msg.sender_type === 'USER'
                  ? 'bg-brand-600 text-white rounded-br-md'
                  : msg.sender_type === 'PM'
                    ? 'bg-white border border-slate-200 shadow-sm rounded-bl-md'
                    : 'bg-slate-200 text-slate-600 text-xs'
              }`}>
                {msg.sender_type !== 'USER' && (
                  <p className={`text-[10px] font-bold mb-1 ${msg.sender_type === 'PM' ? 'text-brand-600' : 'text-slate-400'}`}>
                    {msg.sender_type === 'PM' ? project.pm?.name || 'PM' : '시스템'}
                  </p>
                )}
                <p className="whitespace-pre-wrap text-sm">{msg.message}</p>
                <p className={`text-[10px] mt-1 ${msg.sender_type === 'USER' ? 'text-white/50' : 'text-slate-300'}`}>
                  {new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* 메시지 입력 */}
        <div className="fixed bottom-[72px] left-0 right-0 bg-white border-t z-40">
          <div className="max-w-lg mx-auto px-4 py-3 flex gap-2">
            <input
              type="text"
              placeholder="메시지를 입력하세요..."
              className="flex-1 px-4 py-2.5 bg-slate-100 rounded-full text-sm outline-none focus:ring-2 focus:ring-brand-500"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button
              onClick={sendMessage}
              disabled={sending || !newMessage.trim()}
              className="w-10 h-10 bg-brand-600 rounded-full flex items-center justify-center text-white disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // === PENDING_PM 대기 화면 ===
  if (isPending) {
    return (
      <div className="min-h-screen bg-slate-50 pb-24">
        {/* 헤더 */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-100">
          <div className="px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/favicon-new.png" alt="오프닝" className="w-8 h-8 rounded-xl shadow-sm" />
              <span className="font-black text-lg text-slate-900">오프닝</span>
            </div>
            <button className="relative p-2 text-slate-400">
              <Bell size={20} />
            </button>
          </div>
        </header>

        {/* 인사 */}
        <div className="px-5 pt-6 pb-4">
          <h1 className="text-xl font-bold text-slate-900">
            {userName}사장님, 반갑습니다!
          </h1>
          <p className="text-sm text-slate-400 mt-1">PM 배정을 기다리고 있어요</p>
        </div>

        {/* PM 대기 카드 */}
        <div className="mx-4 bg-white rounded-2xl border-2 border-brand-100 shadow-sm overflow-hidden">
          {/* 상단 그라데이션 */}
          <div className="bg-gradient-to-r from-brand-500 to-brand-600 p-5 text-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-3xl">{biz.emoji}</div>
              <div>
                <p className="font-bold text-lg">{biz.label}</p>
                <p className="text-sm text-white/70">강남구 {project.location_dong} · {project.store_size}평</p>
              </div>
            </div>
            <div className="bg-white/15 rounded-xl p-3">
              <p className="text-sm text-white/80">예상 창업 비용</p>
              <p className="font-black text-xl">{formatPrice(project.estimated_total)}</p>
            </div>
          </div>

          {/* 대기 상태 */}
          <div className="p-5 text-center">
            <div className="w-16 h-16 mx-auto bg-brand-50 rounded-full flex items-center justify-center mb-4">
              <div className="relative">
                <Clock size={28} className="text-brand-500" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-pulse" />
              </div>
            </div>
            <h3 className="font-bold text-lg text-slate-900 mb-2">
              PM이 배정되기 이전이에요
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              담당 PM이 배정되면<br/>
              알림으로 알려드릴게요!
            </p>

            {/* 프로그레스 */}
            <div className="mt-6 bg-slate-100 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-brand-400 rounded-full animate-pulse" style={{ width: '15%' }} />
            </div>
            <p className="text-xs text-slate-300 mt-2">PM 배정 대기중...</p>
          </div>
        </div>

        {/* 다음 단계 안내 */}
        <div className="mx-4 mt-4 bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="font-bold text-sm text-slate-900 mb-3">PM 배정 후 이렇게 진행돼요</h3>
          <div className="space-y-3">
            {[
              { step: 1, label: '상담 시작', desc: 'PM과 첫 상담을 진행합니다', color: 'bg-blue-500' },
              { step: 2, label: '비용 컨설팅', desc: '구체적인 비용을 산출합니다', color: 'bg-violet-500' },
              { step: 3, label: '계약/착수', desc: '계약 후 본격적으로 시작합니다', color: 'bg-orange-500' },
              { step: 4, label: '시공 진행', desc: '인테리어·장비 설치를 진행합니다', color: 'bg-emerald-500' },
              { step: 5, label: '오픈 완료', desc: '가게가 문을 엽니다!', color: 'bg-green-500' },
              { step: 6, label: '사후관리', desc: '오픈 후에도 함께합니다', color: 'bg-slate-400' },
            ].map(item => (
              <div key={item.step} className="flex items-center gap-3">
                <div className={`w-6 h-6 ${item.color} rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                  {item.step}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700">{item.label}</p>
                  <p className="text-xs text-slate-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // === PM 배정된 후 대시보드 ===
  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* 그라데이션 헤더 (단계별 색상) */}
      <div className={`bg-gradient-to-r ${currentTheme.gradient} text-white`}>
        <div className="px-4 pt-4 pb-6">
          {/* 상단 바 */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <img src="/favicon-new.png" alt="오프닝" className="w-8 h-8 rounded-xl bg-white/20 p-0.5" />
              <span className="font-black text-lg">오프닝</span>
            </div>
            <button className="relative p-2 bg-white/15 rounded-full">
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-400 rounded-full" />
            </button>
          </div>

          {/* 인사 + 단계 정보 */}
          <div className="mb-4">
            <p className="text-sm text-white/70 mb-1">{userName}사장님의 창업 프로젝트</p>
            <h1 className="text-2xl font-black">{STEP_LABELS[project.current_step]}</h1>
          </div>

          {/* 진행 바 */}
          <div className="bg-white/20 rounded-full p-1">
            <div className="flex gap-1">
              {[7, 8, 9, 10, 11, 12].map(step => (
                <div
                  key={step}
                  className={`h-2 flex-1 rounded-full transition-all duration-500 ${
                    step <= project.current_step ? 'bg-white' : 'bg-white/20'
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-white/60">
            <span>{pmStepNum}/6 단계</span>
            <span>{progressPercent}%</span>
          </div>
        </div>
      </div>

      {/* 프로젝트 요약 */}
      <div className="mx-4 -mt-3 bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{biz.emoji}</div>
          <div className="flex-1">
            <p className="font-bold text-slate-900">{biz.label}</p>
            <p className="text-xs text-slate-400">강남구 {project.location_dong} · {project.store_size}평</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">예상 비용</p>
            <p className={`font-bold ${currentTheme.text}`}>{formatPrice(project.estimated_total)}</p>
          </div>
        </div>
      </div>

      {/* PM 카드 */}
      {project.pm && (
        <div className="mx-4 bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-4">
          <div className="flex items-center gap-4">
            <img
              src={project.pm.profile_image || '/favicon-new.png'}
              alt={project.pm.name}
              className={`w-14 h-14 rounded-full border-2 ${currentTheme.light} object-cover`}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-lg text-slate-900">{project.pm.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${currentTheme.badge}`}>담당 PM</span>
              </div>
              <p className="text-xs text-slate-400">
                ⭐ {project.pm.rating} · 프로젝트 {project.pm.completed_projects}건 완료
              </p>
            </div>
            <a
              href={`tel:${project.pm.phone}`}
              className={`w-11 h-11 bg-gradient-to-r ${currentTheme.gradient} rounded-xl flex items-center justify-center text-white shadow-md`}
            >
              <Phone size={18} />
            </a>
          </div>

          {/* PM 채팅 바로가기 */}
          <button
            onClick={() => setShowChat(true)}
            className={`w-full mt-3 py-2.5 rounded-xl border ${currentTheme.light} flex items-center justify-center gap-2 text-sm font-bold ${currentTheme.text}`}
          >
            <MessageCircle size={16} />
            PM과 채팅하기
            {messages.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${currentTheme.badge}`}>
                {messages.filter(m => m.sender_type !== 'USER').length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* 단계별 진행 상태 */}
      <div className="mx-4 bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-4">
        <h3 className="font-bold text-sm text-slate-900 mb-4">진행 단계</h3>
        <div className="space-y-4">
          {[7, 8, 9, 10, 11, 12].map(step => {
            const theme = STEP_THEMES[step];
            const isActive = step === project.current_step;
            const isDone = step < project.current_step;
            const stepNum = step - 6;

            return (
              <div key={step} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                  isDone ? `${theme.progress} text-white` :
                  isActive ? `${theme.progress} text-white ring-4 ring-offset-2 ${theme.light.replace('bg-', 'ring-')}` :
                  'bg-slate-100 text-slate-400'
                }`}>
                  {isDone ? <CheckCircle size={16} /> : stepNum}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${isActive ? 'text-slate-900' : isDone ? 'text-slate-500' : 'text-slate-400'}`}>
                    {STEP_LABELS[step]}
                  </p>
                </div>
                {isActive && (
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${theme.badge}`}>
                    진행중
                  </span>
                )}
                {isDone && (
                  <span className="text-[10px] text-slate-400">완료</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 최근 메시지 미리보기 */}
      {messages.length > 0 && (
        <div className="mx-4 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">최근 대화</h3>
            <button onClick={() => setShowChat(true)} className="text-xs text-brand-600 font-bold">
              전체보기 <ChevronRight size={12} className="inline" />
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {messages.slice(-3).map(msg => (
              <div key={msg.id} className="px-5 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold ${
                    msg.sender_type === 'PM' ? 'text-brand-600' :
                    msg.sender_type === 'USER' ? 'text-slate-500' : 'text-slate-400'
                  }`}>
                    {msg.sender_type === 'PM' ? project.pm?.name || 'PM' :
                     msg.sender_type === 'USER' ? '나' : '시스템'}
                  </span>
                  <span className="text-[10px] text-slate-300">
                    {new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-slate-600 line-clamp-2">{msg.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
