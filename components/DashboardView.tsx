import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import { formatPrice } from '../utils/formatPrice';
import { NotificationCenter, createNotification } from './NotificationCenter';
import { isPushSupported, subscribeToPush, getPushPermission } from '../utils/pushNotifications';
import {
  Bell, BellRing, ChevronRight, ChevronDown, ChevronUp,
  Clock, User as UserIcon, Phone, Send,
  Loader2, MessageCircle, Rocket, CheckCircle,
  Coffee, Utensils, Beer, ShoppingBag, Scissors, Dumbbell,
  GraduationCap, Building, Monitor, Briefcase, MoreHorizontal,
  ImagePlus, X, CreditCard, FileText, Shield, Check, ArrowRight,
  Hammer
} from 'lucide-react';

interface DashboardViewProps {
  onNavigateToProject: () => void;
  isGuestMode?: boolean;
  onLoginRequired?: () => void;
  userId?: string;
  userName?: string;
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
  8: '비용 견적',
  9: '계약/시작',
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

// 토스페이먼츠 클라이언트 키 (.env에서 관리)
const TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY || '';

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateToProject, isGuestMode, onLoginRequired, userId: propUserId, userName: propUserName }) => {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('사장님');
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [stepToast, setStepToast] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [showPushBanner, setShowPushBanner] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tossPayLoading, setTossPayLoading] = useState<string | null>(null); // payment_id being processed
  const [tossRedirectParams, setTossRedirectParams] = useState<{paymentKey: string; orderId: string; amount: string; paymentId: string} | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const msgChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const projChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const currentStepRef = useRef<number | undefined>(undefined);

  // Keep currentStepRef in sync to avoid stale closures in realtime callback
  useEffect(() => {
    currentStepRef.current = project?.current_step;
  }, [project?.current_step]);

  useEffect(() => {
    loadProject();
    loadUser();

    // Cleanup realtime subscriptions on unmount
    return () => {
      if (msgChannelRef.current) {
        supabase.removeChannel(msgChannelRef.current);
        msgChannelRef.current = null;
      }
      if (projChannelRef.current) {
        supabase.removeChannel(projChannelRef.current);
        projChannelRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadUser = async () => {
    if (isGuestMode) { setUserName('게스트'); setCurrentUserId('guest-0'); return; }
    // prop으로 전달받은 userId/userName 우선 사용 (getUser() lock 경합 방지)
    if (propUserId) {
      setUserName(propUserName || '사장님');
      setCurrentUserId(propUserId);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || '사장님');
        setCurrentUserId(user.id);
      }
    }
    // 푸시 알림 배너 표시 여부
    if (isPushSupported() && !localStorage.getItem('push_banner_dismissed')) {
      const perm = await getPushPermission();
      if (perm === 'default') setShowPushBanner(true);
    }
  };

  const loadProject = async () => {
    if (isGuestMode) {
      setProject({
        id: 'mock', business_category: 'cafe', location_dong: '역삼동',
        store_size: 15, estimated_total: 42000000, status: 'PM_ASSIGNED',
        current_step: 7, pm_id: 'mock-pm', created_at: new Date().toISOString(),
        pm: {
          id: 'mock-pm',
          name: '김민건',
          phone: '010-1234-5678',
          profile_image: '',
          specialties: ['카페', '디저트', '베이커리'],
          introduction: '카페/디저트 전문 매니저입니다. 200건 이상의 창업을 도왔습니다.',
          rating: 4.9,
          completed_projects: 127
        }
      });
      setMessages([
        { id: 'mock-1', sender_type: 'SYSTEM', message: '담당 매니저가 배정되었습니다 🎉\n\n담당 매니저: 김민건님\n\n곧 연락드릴 예정입니다.', created_at: new Date(Date.now() - 3600000).toISOString() },
        { id: 'mock-2', sender_type: 'PM', message: '안녕하세요 사장님, 담당 매니저 김민건입니다.\n\n카페 창업 준비를 함께 도와드리겠습니다. 편하게 질문해주세요.', created_at: new Date(Date.now() - 3000000).toISOString() },
      ]);
      setLoading(false);
      return;
    }

    try {
      // prop에서 userId를 받았으면 사용, 없으면 getUser() 호출
      let authUserId = propUserId;
      if (!authUserId) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        authUserId = authUser?.id;
      }
      if (!authUserId) { setLoading(false); return; }

      const { data: rows } = await supabase
        .from('startup_projects')
        .select('*, pm:project_managers(*)')
        .eq('user_id', authUserId)
        .in('status', ['PENDING_PM', 'PM_ASSIGNED', 'IN_PROGRESS'])
        .order('created_at', { ascending: false })
        .limit(1);

      const data = rows?.[0] || null;
      if (data) {
        setProject(data);
        if (data.id) {
          loadMessages(data.id);
          subscribeToMessages(data.id);
          subscribeToProject(data.id);

          if (data.pm_id && data.status === 'PM_ASSIGNED') {
            try {
              const { data: existingMsgs } = await supabase
                .from('project_messages')
                .select('id')
                .eq('project_id', data.id)
                .eq('sender_type', 'SYSTEM')
                .ilike('message', '%담당 매니저가 배정%')
                .limit(1);

              if (!existingMsgs || existingMsgs.length === 0) {
                await supabase.from('project_messages').insert({
                  project_id: data.id,
                  sender_type: 'SYSTEM',
                  message: `담당 매니저가 배정되었습니다 🎉\n\n담당 매니저: ${data.pm?.name || '매니저'}\n\n프로필을 확인하고 메시지를 보내보세요.`
                });
              }
            } catch (e) {
              console.error('Failed to create PM assignment message:', e);
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to load project:', e);
    }
    setLoading(false);
  };

  // 토스페이 결제 리다이렉트 파라미터 캡처
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tossSuccess = params.get('toss_success');
    const tossFail = params.get('toss_fail');

    if (tossSuccess) {
      setTossRedirectParams({
        paymentKey: params.get('paymentKey') || '',
        orderId: params.get('orderId') || '',
        amount: params.get('amount') || '0',
        paymentId: params.get('paymentId') || '',
      });
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (tossFail) {
      const message = params.get('message') || '결제가 취소되었습니다';
      setStepToast(message);
      setTimeout(() => setStepToast(null), 4000);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // 프로젝트 로드 후 결제 완료 처리 (race condition 방지)
  useEffect(() => {
    if (tossRedirectParams && !isGuestMode) {
      completeTossPayment(
        tossRedirectParams.paymentKey,
        tossRedirectParams.orderId,
        parseInt(tossRedirectParams.amount, 10),
        tossRedirectParams.paymentId
      );
      setTossRedirectParams(null);
    }
  }, [tossRedirectParams]);

  // 토스페이 결제 완료 처리 (서버사이드 Edge Function으로 확인)
  const completeTossPayment = async (paymentKey: string, orderId: string, amount: number, paymentId: string) => {
    if (!paymentId || !project?.id) return;

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(`${supabaseUrl}/functions/v1/confirm-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ paymentKey, orderId, amount, paymentId }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || '결제 확인 실패');
      }

      // 결제 완료 알림
      if (currentUserId) {
        await createNotification({
          userId: currentUserId,
          projectId: project.id,
          type: 'PAYMENT_COMPLETED',
          title: '결제 완료',
          message: `${amount.toLocaleString('ko-KR')}원 결제가 완료되었습니다.`,
        });
      }

      setStepToast('결제가 완료되었습니다!');
      setTimeout(() => setStepToast(null), 4000);
      loadProject();
    } catch (err: any) {
      console.error('Payment completion error:', err);
      setStepToast(err.message || '결제 처리 중 오류가 발생했습니다');
      setTimeout(() => setStepToast(null), 4000);
    }
  };

  // 토스페이 결제 시작
  const handleTossPayment = async (paymentId: string, amount: number, description: string) => {
    if (isGuestMode) {
      if (onLoginRequired) {
        onLoginRequired();
      } else {
        alert('결제를 진행하려면 로그인이 필요합니다.');
      }
      return;
    }

    setTossPayLoading(paymentId);

    try {
      const TossPayments = (window as any).TossPayments;
      if (!TossPayments) {
        alert('결제 모듈을 불러올 수 없습니다.\n페이지를 새로고침한 후 다시 시도해주세요.');
        setTossPayLoading(null);
        return;
      }

      if (!TOSS_CLIENT_KEY) {
        alert('결제 설정이 완료되지 않았습니다.\n관리자에게 문의해주세요.');
        setTossPayLoading(null);
        return;
      }

      const tossPayments = TossPayments(TOSS_CLIENT_KEY);
      const payment = tossPayments.payment({ customerKey: 'ANONYMOUS' });

      const orderId = `order_${paymentId}_${Date.now()}`;

      await payment.requestPayment({
        method: 'CARD',
        amount: { currency: 'KRW', value: amount },
        orderId,
        orderName: description,
        successUrl: `${window.location.origin}?toss_success=true&orderId=${orderId}&paymentId=${paymentId}`,
        failUrl: `${window.location.origin}?toss_fail=true&orderId=${orderId}&paymentId=${paymentId}`,
      });
    } catch (err: any) {
      if (err?.code === 'USER_CANCEL') {
        // 사용자가 결제 취소
      } else {
        console.error('Toss payment error:', err);
        alert('결제 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    }
    setTossPayLoading(null);
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
    if (msgChannelRef.current) {
      supabase.removeChannel(msgChannelRef.current);
    }
    const channel = supabase
      .channel(`dash-msgs-${projectId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'project_messages',
        filter: `project_id=eq.${projectId}`
      }, (payload) => {
        setMessages(prev => {
          const exists = prev.some(m => m.id === (payload.new as Message).id);
          return exists ? prev : [...prev, payload.new as Message];
        });
      })
      .subscribe();
    msgChannelRef.current = channel;
  };

  const subscribeToProject = (projectId: string) => {
    if (projChannelRef.current) {
      supabase.removeChannel(projChannelRef.current);
    }
    const channel = supabase
      .channel(`dash-project-${projectId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'startup_projects',
        filter: `id=eq.${projectId}`
      }, (payload: any) => {
        const newStatus = payload.new?.status;
        const prevStatus = payload.old?.status;
        const newStep = payload.new?.current_step;
        const prevStep = currentStepRef.current;

        // PENDING_PM → PM_ASSIGNED 전환 시 특별 알림
        if (prevStatus === 'PENDING_PM' && newStatus === 'PM_ASSIGNED') {
          setStepToast('담당 매니저가 배정되었습니다! 🎉');
          setTimeout(() => setStepToast(null), 5000);
        } else if (newStep && newStep !== prevStep && STEP_LABELS[newStep]) {
          setStepToast(`단계가 "${STEP_LABELS[newStep]}"(으)로 변경되었습니다`);
          setTimeout(() => setStepToast(null), 4000);
        }
        loadProject();
      })
      .subscribe();
    projChannelRef.current = channel;
  };

  const sendMessage = async () => {
    if (!newMessage.trim() && !selectedImage) return;
    if (!project?.id) return;

    const messageText = newMessage.trim();

    // 게스트 모드: 로컬 시뮬레이션
    if (isGuestMode) {
      const guestMsg: Message = {
        id: `guest-${Date.now()}`, sender_type: 'USER',
        message: messageText || '📷 이미지',
        attachments: imagePreview ? [{ url: imagePreview, type: 'image', name: 'preview' }] : undefined,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, guestMsg]);
      setNewMessage('');
      setSelectedImage(null);
      setImagePreview(null);
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: `pm-${Date.now()}`, sender_type: 'PM',
          message: '게스트 모드에서는 체험만 가능합니다.\n회원가입 후 실제 담당 매니저와 상담해보세요.',
          created_at: new Date().toISOString()
        }]);
      }, 800);
      return;
    }

    setSending(true);
    setImageError(null);

    try {
      let attachments: { url: string; type: string; name: string }[] | undefined;

      if (selectedImage) {
        const fileExt = selectedImage.name.split('.').pop();
        const fileName = `${project.id}/${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat-images')
          .upload(fileName, selectedImage);

        if (uploadError) {
          setImageError('이미지 업로드에 실패했습니다');
          setSending(false);
          return;
        }
        if (uploadData) {
          const { data: urlData } = supabase.storage.from('chat-images').getPublicUrl(fileName);
          attachments = [{ url: urlData.publicUrl, type: selectedImage.type, name: selectedImage.name }];
        }
      }

      const { data, error } = await supabase.from('project_messages').insert({
        project_id: project.id,
        sender_type: 'USER',
        message: messageText || '📷 이미지',
        attachments: attachments || null
      }).select().single();

      if (!error && data) {
        setMessages(prev => {
          const exists = prev.some(m => m.id === data.id);
          return exists ? prev : [...prev, data];
        });
      }
    } catch (err) {
      console.error('메시지 전송 실패:', err);
    }

    setNewMessage('');
    setSelectedImage(null);
    setImagePreview(null);
    setSending(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setImageError('5MB 이하의 이미지만 업로드 가능합니다');
      return;
    }
    setImageError(null);
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
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
          <p className="text-slate-500 mb-4">프로젝트를 불러오는 중 문제가 발생했습니다</p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => { setLoading(true); loadProject(); }}
              className="px-6 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-bold"
            >
              다시 시도
            </button>
            <button
              onClick={onNavigateToProject}
              className="px-6 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600"
            >
              새 프로젝트 시작
            </button>
          </div>
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
      <div className="min-h-screen bg-slate-50 flex flex-col" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
        {/* 채팅 헤더 */}
        <div className={`bg-gradient-to-r ${currentTheme.gradient} text-white px-4 py-3 shrink-0`}>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowChat(false)} className="p-2.5 -ml-1 hover:bg-white/10 rounded-full">
              <ChevronRight className="rotate-180" size={22} />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold truncate">
                {project.pm?.name || '매니저'} 상담
              </h1>
              <p className="text-xs text-white/70">
                {STEP_LABELS[project.current_step]} · {biz.label}
              </p>
            </div>
            {project.pm?.phone && (
              <button
                onClick={() => { if (window.confirm(`${project.pm?.name || '매니저'}에게 전화하시겠습니까?`)) window.location.href = `tel:${project.pm!.phone}`; }}
                className="p-2 bg-white/20 rounded-full"
              >
                <Phone size={16} />
              </button>
            )}
          </div>
        </div>

        {/* 메시지 목록 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map(msg => {
            // 결제 요청 메시지 감지
            const paymentAttachment = (msg.attachments as any[])?.find((a: any) => a.type === 'payment_request');

            if (paymentAttachment) {
              // 결제 요청 카드 렌더링
              const payAmt = paymentAttachment.amount || 0;
              const payDesc = paymentAttachment.name || '결제';
              const payId = paymentAttachment.payment_id || '';

              return (
                <div key={msg.id} className="flex justify-start">
                  <div className="max-w-[85%] w-full">
                    <p className="text-xs font-bold mb-1 text-brand-600">
                      {project.pm?.name || '매니저'}
                    </p>
                    <div className="bg-white border-2 border-orange-200 rounded-2xl overflow-hidden shadow-sm">
                      <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 text-white">
                        <div className="flex items-center gap-2">
                          <CreditCard size={18} />
                          <span className="font-bold text-sm">결제 요청</span>
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="text-xs text-slate-400 mb-1">{payDesc}</p>
                        <p className="text-2xl font-black text-slate-900 mb-3">
                          {payAmt.toLocaleString('ko-KR')}원
                        </p>
                        <button
                          onClick={() => handleTossPayment(payId, payAmt, payDesc)}
                          disabled={tossPayLoading === payId}
                          className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
                        >
                          {tossPayLoading === payId ? (
                            <Loader2 className="animate-spin" size={18} />
                          ) : (
                            <>
                              <CreditCard size={16} />
                              토스페이로 결제하기
                            </>
                          )}
                        </button>
                        <p className="text-[10px] text-slate-300 text-center mt-2">
                          토스페이먼츠 안전결제
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      {new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            }

            return (
              <div key={msg.id} className={`flex ${msg.sender_type === 'USER' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  msg.sender_type === 'USER'
                    ? 'bg-brand-600 text-white rounded-br-md'
                    : msg.sender_type === 'PM'
                      ? 'bg-white border border-slate-200 shadow-sm rounded-bl-md'
                      : 'bg-slate-200 text-slate-600 text-xs'
                }`}>
                  {msg.sender_type !== 'USER' && (
                    <p className={`text-xs font-bold mb-1 ${msg.sender_type === 'PM' ? 'text-brand-600' : 'text-slate-400'}`}>
                      {msg.sender_type === 'PM' ? project.pm?.name || '매니저' : '시스템'}
                    </p>
                  )}
                  {msg.attachments && Array.isArray(msg.attachments) && msg.attachments.filter((a: any) => a.type?.startsWith('image')).map((a: any, idx: number) => (
                    <img key={idx} src={a.url} alt="첨부" className="max-w-full max-h-48 rounded-lg mb-1" />
                  ))}
                  <p className="whitespace-pre-wrap text-sm">{msg.message}</p>
                  <p className={`text-xs mt-1 ${msg.sender_type === 'USER' ? 'text-white/50' : 'text-slate-300'}`}>
                    {new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* 메시지 입력 */}
        <div className="fixed left-0 right-0 bg-white border-t z-40" style={{ bottom: 'calc(56px + env(safe-area-inset-bottom, 0px))' }}>
          <div className="max-w-lg mx-auto">
            {/* 이미지 프리뷰 */}
            {imagePreview && (
              <div className="px-4 pt-2 flex items-center gap-2">
                <img src={imagePreview} alt="미리보기" className="max-h-20 rounded-lg border" />
                <button onClick={() => { setSelectedImage(null); setImagePreview(null); }} className="p-1 text-slate-400 hover:text-red-500">
                  <X size={16} />
                </button>
              </div>
            )}
            {imageError && (
              <div className="px-4 pt-2">
                <p className="text-xs text-red-500">{imageError}</p>
              </div>
            )}
            <div className="px-4 py-3 flex gap-2">
              <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageSelect} />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 shrink-0"
              >
                <ImagePlus size={18} />
              </button>
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
                disabled={sending || (!newMessage.trim() && !selectedImage)}
                className="w-12 h-12 bg-brand-600 rounded-full flex items-center justify-center text-white disabled:opacity-40 shrink-0"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // === PENDING_PM 대기 화면 ===
  if (isPending) {
    return (
      <div className="min-h-screen bg-slate-50" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}>
        {/* 헤더 */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-100">
          <div className="px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/favicon-new.png" alt="오프닝" className="w-8 h-8 rounded-xl shadow-sm" />
              <span className="font-black text-lg text-slate-900">오프닝</span>
            </div>
            <NotificationCenter userId={currentUserId} />
          </div>
        </header>

        {/* 인사 */}
        <div className="px-5 pt-6 pb-4">
          <h1 className="text-xl font-bold text-slate-900">
            {userName}사장님, 반갑습니다!
          </h1>
          <p className="text-sm text-slate-400 mt-1">담당 매니저 배정을 기다리고 있어요</p>
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
              담당 매니저가 배정되기 이전이에요
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              담당 매니저가 배정되면<br/>
              알림으로 알려드릴게요!
            </p>
            <p className="text-xs text-slate-300 mt-2">보통 1영업일 이내 배정됩니다</p>

            {/* 프로그레스 */}
            <div className="mt-6 bg-slate-100 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-brand-400 rounded-full animate-pulse" style={{ width: '15%' }} />
            </div>
            <p className="text-xs text-slate-300 mt-2">담당 매니저 배정 대기중...</p>
          </div>
        </div>

        {/* 다음 단계 안내 */}
        <div className="mx-4 mt-4 bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="font-bold text-sm text-slate-900 mb-3">담당 매니저 배정 후 이렇게 진행돼요</h3>
          <div className="space-y-3">
            {[
              { step: 1, label: '상담 시작', desc: '담당 매니저와 첫 상담을 진행합니다', color: 'bg-blue-500' },
              { step: 2, label: '비용 견적', desc: '구체적인 비용을 산출합니다', color: 'bg-violet-500' },
              { step: 3, label: '계약/시작', desc: '계약 후 본격적으로 시작합니다', color: 'bg-orange-500' },
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

        {/* 고객센터 */}
        <div className="mx-4 mt-4 bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="font-bold text-sm text-slate-900 mb-3">고객센터</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-50 rounded-full flex items-center justify-center">
                <Phone size={18} className="text-brand-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">고객센터 전화</p>
                <a href="tel:1588-1234" className="text-xs text-brand-600">1588-1234</a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-50 rounded-full flex items-center justify-center">
                <MessageCircle size={18} className="text-brand-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">카카오톡 상담</p>
                <span className="text-xs text-slate-400">준비중</span>
              </div>
            </div>
            <button className="w-full py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 font-medium">
              1:1 문의하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // === PM 배정된 후 대시보드 ===
  return (
    <div className="min-h-screen bg-slate-50" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}>
      {/* 단계 변경 토스트 */}
      {stepToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-bold animate-fade-in max-w-[90%]">
          {stepToast}
        </div>
      )}

      {/* 그라데이션 헤더 (단계별 색상) */}
      <div className={`bg-gradient-to-r ${currentTheme.gradient} text-white`}>
        <div className="px-4 pt-4 pb-6">
          {/* 상단 바 */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <img src="/favicon-new.png" alt="오프닝" className="w-8 h-8 rounded-xl bg-white/20 p-0.5" />
              <span className="font-black text-lg">오프닝</span>
            </div>
            <NotificationCenter userId={currentUserId} onOpenChat={() => setShowChat(true)} dark />
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
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${currentTheme.badge}`}>담당 매니저</span>
              </div>
              <p className="text-xs text-slate-400">
                ⭐ {project.pm.rating} · 프로젝트 {project.pm.completed_projects}건 완료
              </p>
            </div>
            <button
              onClick={() => { if (window.confirm(`${project.pm?.name || '매니저'}에게 전화하시겠습니까?`)) window.location.href = `tel:${project.pm!.phone}`; }}
              className={`w-11 h-11 bg-gradient-to-r ${currentTheme.gradient} rounded-xl flex items-center justify-center text-white shadow-md`}
            >
              <Phone size={18} />
            </button>
          </div>

          {/* PM 채팅 바로가기 */}
          <button
            onClick={() => setShowChat(true)}
            className={`w-full mt-3 py-2.5 rounded-xl border ${currentTheme.light} flex items-center justify-center gap-2 text-sm font-bold ${currentTheme.text}`}
          >
            <MessageCircle size={16} />
            담당 매니저와 채팅하기
            {messages.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${currentTheme.badge}`}>
                {messages.filter(m => m.sender_type !== 'USER').length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* 게스트 모드 안내 */}
      {isGuestMode && (
        <div className="mx-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0 text-lg">👋</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900">체험 모드입니다</p>
            <p className="text-xs text-slate-500">로그인하면 데이터가 저장되고 다른 기기에서도 확인할 수 있어요</p>
          </div>
          <button
            onClick={() => { if (onLoginRequired) onLoginRequired(); }}
            className="bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shrink-0"
          >
            로그인
          </button>
        </div>
      )}

      {/* 푸시 알림 구독 배너 */}
      {showPushBanner && !isGuestMode && (
        <div className="mx-4 bg-gradient-to-r from-brand-50 to-blue-50 border border-brand-200 rounded-2xl p-4 mb-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center shrink-0">
            <BellRing size={20} className="text-brand-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900">알림을 받아보세요</p>
            <p className="text-xs text-slate-500">매니저 메시지, 단계 변경 등을 놓치지 마세요</p>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={() => {
                localStorage.setItem('push_banner_dismissed', '1');
                setShowPushBanner(false);
              }}
              className="text-xs text-slate-400 px-2 py-1.5"
            >
              닫기
            </button>
            <button
              onClick={async () => {
                const result = await subscribeToPush(currentUserId);
                if (result) {
                  setShowPushBanner(false);
                  localStorage.setItem('push_banner_dismissed', '1');
                  setStepToast('푸시 알림이 설정되었습니다!');
                  setTimeout(() => setStepToast(null), 3000);
                }
              }}
              className="bg-brand-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
            >
              허용
            </button>
          </div>
        </div>
      )}

      {/* 현재 단계 안내 카드 */}
      {project.current_step === 7 && (
        <div className="mx-4 bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle size={18} className="text-blue-500" />
            <p className="text-sm font-bold text-blue-800">담당 매니저와 첫 상담을 진행 중이에요</p>
          </div>
          <p className="text-xs text-blue-600 mb-2">궁금한 점을 자유롭게 물어보세요. 담당 매니저가 맞춤 비용 견적을 준비합니다.</p>
          <div className="bg-blue-100/70 rounded-xl px-3 py-2 mb-3">
            <p className="text-xs text-blue-700 font-medium">사장님이 할 일: 담당 매니저에게 창업 관련 궁금한 점을 보내보세요</p>
          </div>
          <button
            onClick={() => setShowChat(true)}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            <MessageCircle size={16} />
            담당 매니저에게 메시지 보내기
          </button>
        </div>
      )}
      {project.current_step === 8 && (
        <div className="mx-4 bg-violet-50 border-2 border-violet-200 rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={18} className="text-violet-500" />
            <p className="text-sm font-bold text-violet-800">비용 견적 진행중</p>
          </div>
          <p className="text-xs text-violet-600 mb-2">담당 매니저가 협력업체 견적을 비교하고 최적의 비용을 산출하고 있습니다.</p>
          <div className="bg-violet-100/70 rounded-xl px-3 py-2 mb-3">
            <p className="text-xs text-violet-700 font-medium">사장님이 할 일: 결과를 기다려주세요. 궁금한 점은 채팅으로 문의하세요</p>
          </div>
          <button
            onClick={() => setShowChat(true)}
            className="w-full bg-violet-500 hover:bg-violet-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            <MessageCircle size={16} />
            담당 매니저에게 문의하기
          </button>
        </div>
      )}
      {project.current_step === 9 && (
        <div className="mx-4 bg-orange-50 border-2 border-orange-200 rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard size={18} className="text-orange-500" />
            <p className="text-sm font-bold text-orange-800">결제 대기중</p>
          </div>
          <p className="text-xs text-orange-600 mb-2">
            {messages.some(m => m.attachments && JSON.stringify(m.attachments).includes('payment_request'))
              ? '결제 요청이 도착했습니다. 채팅에서 결제하기 버튼을 눌러 토스페이로 안전하게 결제하세요.'
              : '담당 매니저가 최종 금액을 확정한 후, 채팅으로 결제 요청을 보내드립니다.'}
          </p>
          <div className="bg-orange-100/70 rounded-xl px-3 py-2 mb-3">
            <p className="text-xs text-orange-700 font-medium">사장님이 할 일: 채팅에서 결제 요청을 확인하고 결제해주세요</p>
          </div>
          <button
            onClick={() => {
              if (isGuestMode && onLoginRequired) { onLoginRequired(); return; }
              setShowChat(true);
            }}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            <MessageCircle size={16} />
            {isGuestMode ? '로그인 후 결제하기' : '채팅에서 결제 확인하기'}
          </button>
        </div>
      )}
      {project.current_step === 10 && (
        <div className="mx-4 bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Hammer size={18} className="text-emerald-500" />
            <p className="text-sm font-bold text-emerald-800">시공이 진행되고 있어요</p>
          </div>
          <p className="text-xs text-emerald-600 mb-2">인테리어, 장비 설치가 진행 중입니다. 담당 매니저가 현장을 관리하고 있습니다.</p>
          <div className="bg-emerald-100/70 rounded-xl px-3 py-2 mb-3">
            <p className="text-xs text-emerald-700 font-medium">사장님이 할 일: 담당 매니저가 현장 사진을 채팅으로 공유합니다. 확인해주세요</p>
          </div>
          <button
            onClick={() => setShowChat(true)}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            <MessageCircle size={16} />
            시공 진행상황 확인
          </button>
        </div>
      )}
      {project.current_step === 11 && (
        <div className="mx-4 bg-green-50 border-2 border-green-200 rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Rocket size={18} className="text-green-500" />
            <p className="text-sm font-bold text-green-800">오픈 준비가 완료되었습니다 🎉</p>
          </div>
          <p className="text-xs text-green-600 mb-2">축하합니다! 영업 시작을 위한 모든 준비가 끝났습니다.</p>
          <div className="bg-green-100/70 rounded-xl px-3 py-2 mb-3">
            <p className="text-xs text-green-700 font-medium">사장님이 할 일: 영업신고, 위생교육 등 최종 확인을 진행하세요</p>
          </div>
          <button
            onClick={() => setShowChat(true)}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            <CheckCircle size={16} />
            오픈 체크리스트 확인
          </button>
        </div>
      )}
      {project.current_step === 12 && (
        <div className="mx-4 bg-slate-50 border-2 border-slate-200 rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={18} className="text-slate-500" />
            <p className="text-sm font-bold text-slate-800">사후관리 진행중</p>
          </div>
          <p className="text-xs text-slate-600 mb-2">오픈 이후에도 담당 매니저가 지속적으로 관리합니다. 장비 A/S, 추가 공사, 마케팅 등 필요한 부분이 있으면 언제든 문의하세요.</p>
          <div className="bg-slate-100 rounded-xl px-3 py-2 mb-3">
            <p className="text-xs text-slate-700 font-medium">사장님이 할 일: A/S나 추가 도움이 필요하면 채팅으로 알려주세요</p>
          </div>
          <button
            onClick={() => setShowChat(true)}
            className="w-full bg-slate-600 hover:bg-slate-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            <MessageCircle size={16} />
            담당 매니저에게 문의하기
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
                  <span className={`text-xs px-2 py-1 rounded-full font-bold ${theme.badge}`}>
                    진행중
                  </span>
                )}
                {isDone && (
                  <span className="text-xs text-slate-400">완료</span>
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
            {messages.slice(-3).map(msg => {
              const isPayReq = (msg.attachments as any[])?.some((a: any) => a.type === 'payment_request');
              return (
                <div key={msg.id} className="px-5 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold ${
                      msg.sender_type === 'PM' ? 'text-brand-600' :
                      msg.sender_type === 'USER' ? 'text-slate-500' : 'text-slate-400'
                    }`}>
                      {msg.sender_type === 'PM' ? project.pm?.name || '매니저' :
                       msg.sender_type === 'USER' ? '나' : '시스템'}
                    </span>
                    <span className="text-xs text-slate-300">
                      {new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {isPayReq ? (
                    <div className="flex items-center gap-2">
                      <CreditCard size={14} className="text-orange-500" />
                      <p className="text-sm text-orange-600 font-bold">결제 요청이 도착했습니다</p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600 line-clamp-2">{msg.message}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
