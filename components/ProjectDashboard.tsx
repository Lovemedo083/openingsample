import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Button } from './Components';
import {
  CheckCircle, Circle, Clock, MessageCircle, Phone, Send,
  ChevronRight, Loader2, MapPin, Store, Calendar, TrendingUp,
  User, Sparkles, AlertCircle, FileText
} from 'lucide-react';

interface ProjectDashboardProps {
  projectId: string;
  onBack?: () => void;
}

interface Project {
  id: string;
  business_category: string;
  business_detail: string;
  location_dong: string;
  store_size: number;
  store_floor: string;
  estimated_total: number;
  status: string;
  created_at: string;
  pm: {
    id: string;
    name: string;
    phone: string;
    profile_image: string;
    introduction: string;
    rating: number;
  } | null;
}

interface Milestone {
  id: string;
  step_order: number;
  step_name: string;
  step_category: string;
  description: string;
  status: string;
  due_date: string | null;
  completed_date: string | null;
}

interface Message {
  id: string;
  sender_type: string;
  message: string;
  created_at: string;
}

const BUSINESS_LABELS: Record<string, string> = {
  'cafe': '카페/디저트',
  'korean': '한식',
  'chicken': '치킨/분식',
  'pub': '주점/바',
  'retail': '소매/편의점',
  'beauty': '미용/뷰티',
  'fitness': '헬스/운동',
  'education': '교육/학원',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  'PENDING': { label: '대기', color: 'bg-gray-100 text-gray-600' },
  'IN_PROGRESS': { label: '진행중', color: 'bg-blue-100 text-blue-700' },
  'COMPLETED': { label: '완료', color: 'bg-green-100 text-green-700' },
  'SKIPPED': { label: '건너뜀', color: 'bg-gray-100 text-gray-400' },
};

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({ projectId, onBack }) => {
  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'progress' | 'chat'>('progress');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProject();
    loadMilestones();
    loadMessages();

    // 실시간 메시지 구독
    const subscription = supabase
      .channel(`project-${projectId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'project_messages',
        filter: `project_id=eq.${projectId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [projectId]);

  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const loadProject = async () => {
    const { data, error } = await supabase
      .from('startup_projects')
      .select(`
        *,
        pm:project_managers(id, name, phone, profile_image, introduction, rating)
      `)
      .eq('id', projectId)
      .single();

    if (!error && data) {
      setProject({
        ...data,
        pm: data.pm
      });
    }
    setLoading(false);
  };

  const loadMilestones = async () => {
    const { data } = await supabase
      .from('project_milestones')
      .select('*')
      .eq('project_id', projectId)
      .order('step_order');

    if (data) {
      setMilestones(data);
    }
  };

  const loadMessages = async () => {
    const { data } = await supabase
      .from('project_messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at');

    if (data) {
      setMessages(data);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    await supabase.from('project_messages').insert({
      project_id: projectId,
      sender_type: 'USER',
      message: newMessage.trim()
    });

    setNewMessage('');
    setSending(false);
  };

  const formatPrice = (price: number) => {
    if (price >= 100000000) {
      return `${(price / 100000000).toFixed(1)}억`;
    } else if (price >= 10000000) {
      return `${Math.round(price / 10000000)}천만`;
    } else if (price >= 10000) {
      return `${Math.round(price / 10000)}만`;
    }
    return price.toLocaleString();
  };

  const getProgress = () => {
    if (milestones.length === 0) return 0;
    const completed = milestones.filter(m => m.status === 'COMPLETED').length;
    return Math.round((completed / milestones.length) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-600" size={40} />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <AlertCircle size={48} className="text-gray-300 mb-4" />
        <p className="text-gray-500">프로젝트를 찾을 수 없습니다</p>
        <Button className="mt-4" onClick={onBack}>돌아가기</Button>
      </div>
    );
  }

  const progress = getProgress();

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* 헤더 */}
      <div className="bg-brand-600 text-white">
        <div className="px-4 pt-6 pb-28">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold">
                {project.location_dong} {BUSINESS_LABELS[project.business_category] || project.business_category}
              </h1>
              <p className="text-sm opacity-80">
                {project.store_size}평 · 예상 {formatPrice(project.estimated_total)}원
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{progress}%</div>
              <div className="text-xs opacity-80">진행률</div>
            </div>
          </div>

          {/* 진행 바 */}
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* PM 카드 */}
      {project.pm && (
        <div className="px-4 -mt-14">
          <div className="bg-white rounded-2xl shadow-lg p-4">
            <div className="flex items-center gap-4">
              <img
                src={project.pm.profile_image}
                alt={project.pm.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-brand-100"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">{project.pm.name} PM</span>
                  <span className="text-sm text-yellow-500">⭐ {project.pm.rating}</span>
                </div>
                <p className="text-sm text-gray-500 line-clamp-1">{project.pm.introduction}</p>
              </div>
              <a
                href={`tel:${project.pm.phone}`}
                className="w-12 h-12 bg-brand-50 rounded-full flex items-center justify-center text-brand-600"
              >
                <Phone size={20} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 탭 */}
      <div className="flex gap-2 px-4 mt-4">
        <button
          onClick={() => setActiveTab('progress')}
          className={`flex-1 py-3 rounded-xl font-bold transition-colors ${
            activeTab === 'progress'
              ? 'bg-brand-600 text-white'
              : 'bg-white text-gray-600 border'
          }`}
        >
          진행 현황
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-3 rounded-xl font-bold transition-colors relative ${
            activeTab === 'chat'
              ? 'bg-brand-600 text-white'
              : 'bg-white text-gray-600 border'
          }`}
        >
          PM 메시지
          {messages.length > 0 && activeTab !== 'chat' && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {messages.length}
            </span>
          )}
        </button>
      </div>

      {/* 진행 현황 탭 */}
      {activeTab === 'progress' && (
        <div className="p-4 space-y-3">
          {milestones.map((milestone, idx) => {
            const statusInfo = STATUS_LABELS[milestone.status] || STATUS_LABELS['PENDING'];
            const isCompleted = milestone.status === 'COMPLETED';
            const isInProgress = milestone.status === 'IN_PROGRESS';

            return (
              <div
                key={milestone.id}
                className={`bg-white rounded-xl p-4 border-2 transition-colors ${
                  isInProgress ? 'border-brand-200 bg-brand-50' : 'border-transparent'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    isCompleted
                      ? 'bg-green-100 text-green-600'
                      : isInProgress
                        ? 'bg-brand-100 text-brand-600'
                        : 'bg-gray-100 text-gray-400'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle size={20} />
                    ) : isInProgress ? (
                      <Clock size={20} />
                    ) : (
                      <span className="font-bold text-sm">{idx + 1}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className={`font-bold ${isCompleted ? 'text-gray-400' : ''}`}>
                        {milestone.step_name}
                      </h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{milestone.description}</p>
                    {milestone.due_date && (
                      <p className="text-xs text-gray-400 mt-1">
                        예정일: {milestone.due_date}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 채팅 탭 */}
      {activeTab === 'chat' && (
        <div className="flex flex-col h-[calc(100vh-320px)]">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <MessageCircle size={40} className="mx-auto mb-2 opacity-50" />
                <p>아직 메시지가 없습니다</p>
              </div>
            ) : (
              messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_type === 'USER' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.sender_type === 'USER'
                        ? 'bg-brand-600 text-white rounded-br-md'
                        : msg.sender_type === 'PM'
                          ? 'bg-white border rounded-bl-md'
                          : 'bg-gray-100 text-gray-600 text-sm'
                    }`}
                  >
                    {msg.sender_type === 'PM' && (
                      <p className="text-xs text-brand-600 font-bold mb-1">{project.pm?.name} PM</p>
                    )}
                    <p className="whitespace-pre-wrap">{msg.message}</p>
                    <p className={`text-xs mt-1 ${
                      msg.sender_type === 'USER' ? 'text-white/70' : 'text-gray-400'
                    }`}>
                      {new Date(msg.created_at).toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 메시지 입력 */}
          <div className="p-4 bg-white border-t">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="메시지를 입력하세요"
                className="flex-1 px-4 py-3 bg-gray-100 rounded-xl"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              />
              <button
                onClick={sendMessage}
                disabled={sending || !newMessage.trim()}
                className="w-12 h-12 bg-brand-600 text-white rounded-xl flex items-center justify-center disabled:opacity-50"
              >
                {sending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
