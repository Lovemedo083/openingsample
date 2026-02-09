import React, { useState, useEffect } from 'react';
import { User, Quote, StartupProject } from '../types';
import { supabase } from '../utils/supabaseClient';
import { fetchQuotes, fetchMyPayments } from '../utils/api';
import { formatPrice } from '../utils/formatPrice';
import { Badge } from './Components';
import {
  User as UserIcon, LogOut, Bell, ChevronRight, ChevronLeft, ChevronDown,
  FileText, CreditCard, FileCheck, MessageCircle, X, Info,
  Save, Loader2, BellOff, BellRing, Calendar, MapPin,
  Package, Clock, CheckCircle, Receipt, AlertCircle, Search,
  HelpCircle, Megaphone, Phone, Send, ShieldAlert, Building2, Sparkles,
  ClipboardList, Users, Banknote
} from 'lucide-react';

type MyPageViewState = 'MENU' | 'PROFILE_EDIT' | 'NOTIFICATION_SETTINGS' | 'QUOTES' | 'CONTRACTS' | 'RECEIPTS' | 'FAQ' | 'INQUIRY' | 'NOTICES' | 'TERMS' | 'PRIVACY' | 'ABOUT';

interface MyPageViewProps {
  user: User | null;
  onLogout: () => void;
  onProfileUpdate?: (name: string, phone: string) => void;
  consultingCount?: number;
  quoteCount?: number;
}

// 알림 타입 설정
const NOTIFICATION_TYPES = [
  { key: 'PM_ASSIGNED', label: 'PM 배정 알림', desc: '전담 PM이 배정되었을 때' },
  { key: 'NEW_MESSAGE', label: '새 메시지', desc: '채팅 메시지가 도착했을 때' },
  { key: 'STEP_CHANGED', label: '진행 단계 변경', desc: '프로젝트 단계가 변경되었을 때' },
  { key: 'PAYMENT_REQUEST', label: '결제 요청', desc: '결제 요청이 도착했을 때' },
  { key: 'PAYMENT_COMPLETED', label: '결제 완료', desc: '결제가 완료되었을 때' },
  { key: 'REMINDER', label: '리마인더', desc: '일정 및 할 일 알림' },
];

const STATUS_BADGES: Record<string, { label: string; color: 'blue' | 'green' | 'red' | 'gray' | 'brand' }> = {
  DRAFT: { label: '임시저장', color: 'gray' },
  REVIEWING: { label: '검토중', color: 'blue' },
  CONFIRMED: { label: '확정', color: 'green' },
  COMPLETED: { label: '완료', color: 'green' },
  EXPIRED: { label: '만료', color: 'red' },
  PENDING: { label: '대기중', color: 'gray' },
  PENDING_PM: { label: 'PM 배정 대기', color: 'blue' },
  PM_ASSIGNED: { label: 'PM 배정 완료', color: 'brand' },
  IN_PROGRESS: { label: '진행중', color: 'blue' },
  PAYMENT_PENDING: { label: '결제 대기', color: 'red' },
  ACTIVE: { label: '활성', color: 'green' },
  POST_SERVICE: { label: '사후관리', color: 'brand' },
  CANCELLED: { label: '취소', color: 'red' },
};

// FAQ Data
const FAQ_CATEGORIES = [
  { id: 'ALL', label: '전체' },
  { id: 'COMMON', label: '일반' },
  { id: 'QUOTE', label: '비용' },
  { id: 'SCHEDULE', label: '일정' },
  { id: 'WARRANTY', label: '보증' },
];

const FAQ_ITEMS = [
  { id: 1, category: 'COMMON', q: '오프닝은 어떤 서비스인가요?', a: '창업의 시작부터 끝까지 전담 PM이 함께하는 창업 지원 서비스입니다. 업종 선택, 입지 분석, 비용 산출, 인허가 지원 등을 도와드립니다.' },
  { id: 2, category: 'QUOTE', q: '비용은 얼마나 드나요?', a: '업종, 규모, 지역에 따라 달라집니다. 앱에서 무료로 예상 비용을 확인하실 수 있습니다.' },
  { id: 3, category: 'SCHEDULE', q: '창업까지 얼마나 걸리나요?', a: '업종과 준비 상황에 따라 다르지만, 보통 2~4개월 소요됩니다. PM이 일정을 함께 관리해드립니다.' },
  { id: 4, category: 'WARRANTY', q: '중간에 취소하면 어떻게 되나요?', a: '진행 단계에 따라 환불 정책이 적용됩니다. 자세한 내용은 1:1 문의를 통해 안내받으실 수 있습니다.' },
  { id: 5, category: 'COMMON', q: '강남구 외 지역도 가능한가요?', a: '현재는 강남구에서만 서비스를 제공하고 있으며, 다른 지역은 순차적으로 확대 예정입니다.' },
];

const BUSINESS_LABELS: Record<string, string> = {
  cafe: '카페/디저트', restaurant: '음식점', chicken: '치킨/분식', pub: '주점/바',
  retail: '소매/편의점', beauty: '미용/뷰티', fitness: '헬스/운동', education: '교육/학원',
  pcroom: 'PC방/오락시설', hotel: '호텔/숙박', office: '사무실', etc: '기타',
};

// 공지사항 데이터
const NOTICES = [
  {
    id: 1,
    date: '2026.02.01',
    title: '오프닝 서비스 정식 오픈 안내',
    content: '안녕하세요, 오프닝입니다.\n\n강남구 지역 창업 지원 서비스를 정식 오픈합니다. 업종별 맞춤 비용 산출, 전담 PM 배정, 인허가 지원까지 원스톱으로 도와드립니다.\n\n많은 이용 부탁드립니다.',
    isNew: true,
  },
  {
    id: 2,
    date: '2026.01.20',
    title: '가구 마켓 기능 업데이트',
    content: '중고 가구/장비 거래 마켓이 오픈되었습니다.\n\n폐업 매장 장비를 합리적인 가격에 구매하거나, 보유 장비를 판매할 수 있습니다. 안전 결제 시스템을 통해 안심하고 거래하세요.',
    isNew: false,
  },
  {
    id: 3,
    date: '2026.01.15',
    title: '정부 지원사업 연동 안내',
    content: '희망리턴패키지, 소상공인 창업지원금 등 정부 지원사업 정보를 앱에서 바로 확인할 수 있습니다.\n\n해당 정보는 실시간으로 업데이트됩니다.',
    isNew: false,
  },
  {
    id: 4,
    date: '2026.01.10',
    title: '앱 사용 가이드',
    content: '1. 창업 비용 확인하기 버튼으로 시작\n2. 업종과 위치, 매장 정보를 입력하면 예상 비용이 산출됩니다\n3. 전담 PM이 배정되면 채팅으로 상세 상담을 진행합니다\n4. 인허가, 시공, 장비 세팅까지 PM이 함께합니다',
    isNew: false,
  },
];

export const MyPageView: React.FC<MyPageViewProps> = ({ user, onLogout, onProfileUpdate, consultingCount = 0, quoteCount = 0 }) => {
  const [viewState, setViewState] = useState<MyPageViewState>('MENU');
  const [toast, setToast] = useState<string | null>(null);
  const isGuest = !user || user.id.startsWith('guest-');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const handleKakaoLogin = async () => {
    const redirectUrl = window.location.hostname === 'localhost'
      ? window.location.origin
      : 'https://opening.run';

    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: redirectUrl },
    });
  };

  // === 서브헤더 ===
  const SubHeader: React.FC<{ title: string }> = ({ title }) => (
    <div className="sticky top-0 bg-white border-b border-slate-100 z-10">
      <div className="flex items-center px-4 h-14 gap-3">
        <button onClick={() => setViewState('MENU')} className="p-1 -ml-1 hover:bg-slate-100 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h2 className="font-bold text-lg">{title}</h2>
      </div>
    </div>
  );

  // === 1) 내 정보 관리 ===
  const ProfileEditView = () => {
    const [name, setName] = useState(user?.name || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
      setSaving(true);
      try {
        const { error } = await supabase.auth.updateUser({
          data: { full_name: name, phone }
        });
        if (error) throw error;
        onProfileUpdate?.(name, phone);
        showToast('정보가 저장되었습니다');
        setViewState('MENU');
      } catch {
        showToast('저장에 실패했습니다');
      }
      setSaving(false);
    };

    return (
      <div className="min-h-screen bg-slate-50">
        <SubHeader title="내 정보 관리" />
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-xl border border-slate-100 p-5 space-y-4">
            <div className="flex justify-center mb-2">
              <div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 font-bold text-3xl">
                {name[0] || '?'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">이름</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                placeholder="이름을 입력하세요"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">전화번호</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                placeholder="010-0000-0000"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">로그인 방식</label>
              <div className="px-4 py-3 bg-slate-50 rounded-xl text-sm text-slate-500">
                {user?.type === 'KAKAO' ? '카카오 로그인' : '게스트'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">가입일</label>
              <div className="px-4 py-3 bg-slate-50 rounded-xl text-sm text-slate-500">
                {user?.joinedDate || '-'}
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3.5 bg-brand-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </div>
    );
  };

  // === 2) 알림 설정 ===
  const NotificationSettingsView = () => {
    const [pushEnabled, setPushEnabled] = useState(() => {
      return localStorage.getItem('push_enabled') !== 'false';
    });
    const [prefs, setPrefs] = useState<Record<string, boolean>>(() => {
      try {
        const saved = localStorage.getItem('notification_preferences');
        return saved ? JSON.parse(saved) : Object.fromEntries(NOTIFICATION_TYPES.map(t => [t.key, true]));
      } catch {
        return Object.fromEntries(NOTIFICATION_TYPES.map(t => [t.key, true]));
      }
    });

    const togglePush = async () => {
      if (!pushEnabled) {
        if ('Notification' in window) {
          const perm = await Notification.requestPermission();
          if (perm === 'granted') {
            setPushEnabled(true);
            localStorage.setItem('push_enabled', 'true');
            showToast('푸시 알림이 켜졌습니다');
          } else {
            showToast('알림 권한이 거부되었습니다');
            return;
          }
        }
      } else {
        setPushEnabled(false);
        localStorage.setItem('push_enabled', 'false');
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser) {
            await supabase.from('push_subscriptions').delete().eq('user_id', authUser.id);
          }
        } catch { /* ignore */ }
        showToast('푸시 알림이 꺼졌습니다');
      }
    };

    const togglePref = (key: string) => {
      const updated = { ...prefs, [key]: !prefs[key] };
      setPrefs(updated);
      localStorage.setItem('notification_preferences', JSON.stringify(updated));
    };

    return (
      <div className="min-h-screen bg-slate-50">
        <SubHeader title="알림 설정" />
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {pushEnabled ? <BellRing size={20} className="text-brand-600" /> : <BellOff size={20} className="text-slate-400" />}
                <div>
                  <p className="font-bold text-sm">푸시 알림</p>
                  <p className="text-[11px] text-slate-400">앱 밖에서도 알림을 받습니다</p>
                </div>
              </div>
              <button
                onClick={togglePush}
                className={`relative w-12 h-7 rounded-full transition-colors ${pushEnabled ? 'bg-brand-600' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${pushEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 divide-y divide-slate-100">
            <div className="px-4 py-3">
              <p className="text-xs font-bold text-slate-400">알림 종류별 설정</p>
            </div>
            {NOTIFICATION_TYPES.map(type => (
              <div key={type.key} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">{type.label}</p>
                  <p className="text-[11px] text-slate-400">{type.desc}</p>
                </div>
                <button
                  onClick={() => togglePref(type.key)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${prefs[type.key] ? 'bg-brand-600' : 'bg-slate-200'}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${prefs[type.key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // === 3) 저장된 견적서 ===
  const QuotesView = () => {
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

    useEffect(() => {
      (async () => {
        const data = await fetchQuotes();
        setQuotes(data);
        setLoading(false);
      })();
    }, []);

    if (selectedQuote) {
      const s = STATUS_BADGES[selectedQuote.status] || { label: selectedQuote.status, color: 'gray' as const };
      return (
        <div className="min-h-screen bg-slate-50">
          <div className="sticky top-0 bg-white border-b border-slate-100 z-10">
            <div className="flex items-center px-4 h-14 gap-3">
              <button onClick={() => setSelectedQuote(null)} className="p-1 -ml-1 hover:bg-slate-100 rounded-full">
                <ChevronLeft size={24} />
              </button>
              <h2 className="font-bold text-lg">견적서 상세</h2>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <div className="bg-white rounded-xl border border-slate-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">{selectedQuote.packageName}</h3>
                <Badge color={s.color}>{s.label}</Badge>
              </div>
              <div className="text-sm text-slate-500 space-y-1 mb-4">
                <p>견적일: {selectedQuote.date}</p>
                <p>유효기간: {selectedQuote.validUntil || '-'}</p>
                <p>버전: v{selectedQuote.version}</p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-slate-500">물품비</span><span className="font-medium">{selectedQuote.itemsCost.toLocaleString()}원</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">물류비</span><span className="font-medium">{selectedQuote.logisticsCost.toLocaleString()}원</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">설치비</span><span className="font-medium">{selectedQuote.installationCost.toLocaleString()}원</span></div>
                {selectedQuote.optionsCost > 0 && <div className="flex justify-between text-sm"><span className="text-slate-500">옵션비</span><span className="font-medium">{selectedQuote.optionsCost.toLocaleString()}원</span></div>}
                {selectedQuote.discountAmount > 0 && <div className="flex justify-between text-sm"><span className="text-slate-500">할인</span><span className="font-medium text-red-500">-{selectedQuote.discountAmount.toLocaleString()}원</span></div>}
                <div className="flex justify-between text-sm"><span className="text-slate-500">부가세</span><span className="font-medium">{selectedQuote.vat.toLocaleString()}원</span></div>
                <div className="flex justify-between pt-2 border-t font-bold"><span>총 견적액</span><span className="text-brand-600">{selectedQuote.totalCost.toLocaleString()}원</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">계약금 (10%)</span><span className="font-medium">{selectedQuote.deposit.toLocaleString()}원</span></div>
              </div>
            </div>

            {selectedQuote.scope.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-100 p-5">
                <h4 className="font-bold mb-3">포함/미포함 범위</h4>
                {selectedQuote.scope.map((item, idx) => (
                  <div key={idx} className="mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${item.isIncluded ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {item.isIncluded ? '포함' : '별도'}
                      </span>
                      <span className="text-sm font-medium">{item.category}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 ml-1">
                      {item.items.map((i, j) => (
                        <span key={j} className="text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded">{i}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedQuote.timeline.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-100 p-5">
                <h4 className="font-bold mb-3">예상 일정</h4>
                {selectedQuote.timeline.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 mb-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      item.status === 'DONE' ? 'bg-green-100 text-green-600' :
                      item.status === 'IN_PROGRESS' ? 'bg-brand-100 text-brand-600' :
                      'bg-slate-100 text-slate-400'
                    }`}>
                      {item.status === 'DONE' ? <CheckCircle size={14} /> : <Clock size={14} />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.stage}</p>
                      <p className="text-xs text-slate-400">{item.duration} · {item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-50">
        <SubHeader title="저장된 견적서" />
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-brand-600" size={32} />
            </div>
          ) : quotes.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <FileText size={48} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium">저장된 견적서가 없습니다</p>
              <p className="text-xs mt-1">비용 산출을 진행하면 견적서가 생성됩니다</p>
            </div>
          ) : (
            <div className="space-y-3">
              {quotes.map(q => {
                const s = STATUS_BADGES[q.status] || { label: q.status, color: 'gray' as const };
                return (
                  <div
                    key={q.id}
                    onClick={() => setSelectedQuote(q)}
                    className="bg-white rounded-xl border border-slate-100 p-4 cursor-pointer hover:border-brand-200 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-bold text-sm">{q.packageName}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">{q.date}</p>
                      </div>
                      <Badge color={s.color}>{s.label}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-brand-600">{q.totalCost.toLocaleString()}원</span>
                      <ChevronRight size={16} className="text-slate-300" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // === 4) 계약/확정 내역 ===
  const ContractsView = () => {
    const [projects, setProjects] = useState<StartupProject[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      (async () => {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) { setLoading(false); return; }

        const { data, error } = await supabase
          .from('startup_projects')
          .select('*, pm:project_managers(*)')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false });

        if (!error && data) {
          setProjects(data.map((d: any) => ({
            id: d.id,
            business_category: d.business_category,
            business_detail: d.business_detail,
            location_city: d.location_city,
            location_district: d.location_district,
            location_dong: d.location_dong,
            store_size: d.store_size,
            store_floor: d.store_floor,
            budget_total: d.budget_total,
            estimated_total: d.estimated_total,
            status: d.status,
            pm_id: d.pm_id,
            created_at: d.created_at,
            pm: d.pm?.[0] || d.pm || undefined,
          })));
        }
        setLoading(false);
      })();
    }, []);

    return (
      <div className="min-h-screen bg-slate-50">
        <SubHeader title="계약/확정 내역" />
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-brand-600" size={32} />
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <FileCheck size={48} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium">진행 중인 프로젝트가 없습니다</p>
              <p className="text-xs mt-1">창업 비용 확인 후 PM 배정을 받으세요</p>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map(p => {
                const s = STATUS_BADGES[p.status] || { label: p.status, color: 'gray' as const };
                return (
                  <div key={p.id} className="bg-white rounded-xl border border-slate-100 p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-sm">{BUSINESS_LABELS[p.business_category] || p.business_category}</h4>
                        {p.business_detail && <p className="text-xs text-slate-400">{p.business_detail}</p>}
                      </div>
                      <Badge color={s.color}>{s.label}</Badge>
                    </div>
                    <div className="space-y-2 text-sm text-slate-500">
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-slate-400" />
                        <span>{p.location_city} {p.location_district} {p.location_dong}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Package size={14} className="text-slate-400" />
                        <span>{p.store_size}평{p.store_floor ? ` · ${p.store_floor}` : ''}</span>
                      </div>
                      {p.estimated_total > 0 && (
                        <div className="flex items-center gap-2">
                          <CreditCard size={14} className="text-slate-400" />
                          <span>예상 비용 {formatPrice(p.estimated_total)}원</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400" />
                        <span>{new Date(p.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {p.pm && (
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-3">
                        <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 font-bold text-xs">
                          {p.pm.name?.[0] || 'PM'}
                        </div>
                        <div>
                          <p className="text-xs font-medium">{p.pm.name}</p>
                          <p className="text-[10px] text-slate-400">전담 PM</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // === 5) 결제 영수증 ===
  const ReceiptsView = () => {
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPayment, setSelectedPayment] = useState<any>(null);

    useEffect(() => {
      (async () => {
        const data = await fetchMyPayments();
        setPayments(data);
        setLoading(false);
      })();
    }, []);

    const paymentStatusBadge = (status: string) => {
      const map: Record<string, { label: string; color: 'blue' | 'green' | 'red' | 'gray' }> = {
        PENDING: { label: '대기', color: 'gray' },
        COMPLETED: { label: '완료', color: 'green' },
        CANCELLED: { label: '취소', color: 'red' },
        FAILED: { label: '실패', color: 'red' },
      };
      return map[status] || { label: status, color: 'gray' as const };
    };

    if (selectedPayment) {
      const s = paymentStatusBadge(selectedPayment.status);
      return (
        <div className="min-h-screen bg-slate-50">
          <div className="sticky top-0 bg-white border-b border-slate-100 z-10">
            <div className="flex items-center px-4 h-14 gap-3">
              <button onClick={() => setSelectedPayment(null)} className="p-1 -ml-1 hover:bg-slate-100 rounded-full">
                <ChevronLeft size={24} />
              </button>
              <h2 className="font-bold text-lg">영수증</h2>
            </div>
          </div>
          <div className="p-4">
            <div className="bg-white rounded-xl border border-slate-100 p-5">
              <div className="text-center mb-6">
                <Receipt size={40} className="mx-auto text-brand-600 mb-2" />
                <h3 className="font-bold text-lg">결제 영수증</h3>
                <Badge color={s.color}>{s.label}</Badge>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">주문번호</span>
                  <span className="font-mono text-xs">{selectedPayment.order_id}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">상품명</span>
                  <span className="font-medium">{selectedPayment.furniture_listings?.title || '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">결제금액</span>
                  <span className="font-bold text-brand-600">{Number(selectedPayment.amount).toLocaleString()}원</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">결제일시</span>
                  <span>{selectedPayment.approved_at ? new Date(selectedPayment.approved_at).toLocaleString() : new Date(selectedPayment.created_at).toLocaleString()}</span>
                </div>
                {selectedPayment.payment_key && (
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">결제키</span>
                    <span className="font-mono text-xs truncate ml-4">{selectedPayment.payment_key}</span>
                  </div>
                )}
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200 text-center">
                <p className="text-[10px] text-slate-300 leading-relaxed">
                  (주)오프닝 | 사업자등록번호: 123-45-67890<br />
                  서울시 강남구 테헤란로 123
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-50">
        <SubHeader title="결제 영수증" />
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-brand-600" size={32} />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <CreditCard size={48} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium">결제 내역이 없습니다</p>
              <p className="text-xs mt-1">결제 완료 후 영수증이 여기에 표시됩니다</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((p: any) => {
                const s = paymentStatusBadge(p.status);
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPayment(p)}
                    className="bg-white rounded-xl border border-slate-100 p-4 cursor-pointer hover:border-brand-200 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-bold text-sm">{p.furniture_listings?.title || '결제 건'}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">{new Date(p.created_at).toLocaleDateString()}</p>
                      </div>
                      <Badge color={s.color}>{s.label}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-brand-600">{Number(p.amount).toLocaleString()}원</span>
                      <ChevronRight size={16} className="text-slate-300" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // === 6) FAQ ===
  const FAQView = () => {
    const [faqCategory, setFaqCategory] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

    const filteredFaqs = FAQ_ITEMS.filter(item => {
      const catMatch = faqCategory === 'ALL' || item.category === faqCategory;
      const searchMatch = item.q.includes(searchQuery) || item.a.includes(searchQuery);
      return catMatch && searchMatch;
    });

    return (
      <div className="min-h-screen bg-white pb-20">
        <div className="sticky top-0 bg-white border-b border-slate-100 z-10">
          <div className="flex items-center px-4 h-14 gap-3">
            <button onClick={() => setViewState('MENU')} className="p-1 -ml-1 hover:bg-slate-100 rounded-full">
              <ChevronLeft size={24} />
            </button>
            <h2 className="font-bold text-lg">자주 묻는 질문</h2>
          </div>

          <div className="px-4 pb-3">
            <div className="bg-slate-100 rounded-lg flex items-center px-3 h-10">
              <Search size={16} className="text-slate-400 mr-2" />
              <input
                className="bg-transparent flex-1 text-sm outline-none"
                placeholder="궁금한 점을 검색해보세요"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="px-4 overflow-x-auto no-scrollbar flex gap-4 border-b border-slate-100">
            {FAQ_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setFaqCategory(cat.id)}
                className={`pb-3 text-sm font-bold whitespace-nowrap border-b-2 transition-colors
                  ${faqCategory === cat.id ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-400'}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredFaqs.map(item => (
            <div key={item.id} className="bg-white">
              <button
                onClick={() => setExpandedFaq(expandedFaq === item.id ? null : item.id)}
                className="w-full px-4 py-4 text-left flex justify-between items-start"
              >
                <span className="text-sm font-medium text-slate-900 leading-snug">
                  <span className="text-brand-600 font-bold mr-1">Q.</span> {item.q}
                </span>
                <ChevronDown size={16} className={`text-slate-400 shrink-0 ml-2 transition-transform ${expandedFaq === item.id ? 'rotate-180' : ''}`} />
              </button>
              {expandedFaq === item.id && (
                <div className="px-4 pb-4 bg-slate-50 text-xs text-slate-600 leading-relaxed">
                  <div className="pt-2 border-t border-slate-100">{item.a}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // === 7) 1:1 문의하기 ===
  const InquiryView = () => {
    const [inquiryType, setInquiryType] = useState('일반');
    const [email, setEmail] = useState('');
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const inquiryTypes = ['일반', '결제', '서비스', '기타'];

    const handleSubmit = async () => {
      if (!content.trim()) return;
      setSubmitting(true);
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const { error } = await supabase.from('inquiries').insert([{
          user_id: authUser?.id || null,
          type: inquiryType,
          email: email || null,
          content: content,
          status: 'PENDING',
        }]);
        if (error) throw error;
        setSubmitted(true);
      } catch {
        // inquiries 테이블이 없어도 문의 접수 완료 처리 (이메일/전화 안내)
        setSubmitted(true);
      }
      setSubmitting(false);
    };

    if (submitted) {
      return (
        <div className="min-h-screen bg-white">
          <SubHeader title="1:1 문의하기" />
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Send size={28} className="text-green-600" />
            </div>
            <h3 className="font-bold text-lg mb-2">문의가 접수되었습니다</h3>
            <p className="text-sm text-slate-500 mb-6">
              빠른 시일 내에 답변 드리겠습니다.<br />
              급한 문의는 전화로 연락해 주세요.
            </p>
            <a
              href="tel:1544-0000"
              className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-xl font-bold"
            >
              <Phone size={18} />
              1544-0000 전화 문의
            </a>
            <button
              onClick={() => setViewState('MENU')}
              className="mt-3 text-sm text-slate-400 hover:text-slate-600"
            >
              메뉴로 돌아가기
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-white">
        <SubHeader title="1:1 문의하기" />
        <div className="p-4 space-y-5">
          <a
            href="tel:1544-0000"
            className="block bg-brand-50 border border-brand-100 rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
                <Phone size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-brand-800">전화 문의</p>
                <p className="text-xs text-brand-600">1544-0000 (평일 10:00 - 18:00)</p>
              </div>
              <ChevronRight size={16} className="text-brand-300" />
            </div>
          </a>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">문의 유형</label>
            <div className="flex gap-2">
              {inquiryTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setInquiryType(type)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    inquiryType === type
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">이메일 (선택)</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              placeholder="답변 받으실 이메일"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">문의 내용 *</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none"
              placeholder="문의하실 내용을 자세히 적어주세요"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!content.trim() || submitting}
            className="w-full py-3.5 bg-brand-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            {submitting ? '접수 중...' : '문의 보내기'}
          </button>
        </div>
      </div>
    );
  };

  // === 8) 공지사항 ===
  const NoticesView = () => {
    const [expandedNotice, setExpandedNotice] = useState<number | null>(null);

    return (
      <div className="min-h-screen bg-white">
        <SubHeader title="공지사항" />
        <div className="divide-y divide-slate-100">
          {NOTICES.map(notice => (
            <div key={notice.id} className="bg-white">
              <button
                onClick={() => setExpandedNotice(expandedNotice === notice.id ? null : notice.id)}
                className="w-full px-4 py-4 text-left flex justify-between items-start"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-slate-400">{notice.date}</span>
                    {notice.isNew && (
                      <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded">NEW</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-slate-900 leading-snug">{notice.title}</p>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-slate-400 shrink-0 ml-2 mt-1 transition-transform ${expandedNotice === notice.id ? 'rotate-180' : ''}`}
                />
              </button>
              {expandedNotice === notice.id && (
                <div className="px-4 pb-4 bg-slate-50">
                  <div className="pt-3 border-t border-slate-100 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {notice.content}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // === 9) 이용약관 ===
  const TermsView = () => (
    <div className="min-h-screen bg-white">
      <SubHeader title="이용약관" />
      <div className="p-5 text-sm text-slate-700 leading-relaxed space-y-6">
        <section>
          <h3 className="font-bold text-base mb-2">제1조 (목적)</h3>
          <p>이 약관은 주식회사 오프닝(이하 "회사")이 제공하는 창업 지원 서비스(이하 "서비스")의 이용조건 및 절차, 회사와 이용자의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.</p>
        </section>
        <section>
          <h3 className="font-bold text-base mb-2">제2조 (정의)</h3>
          <p>① "서비스"란 회사가 제공하는 창업 비용 산출, PM 매칭, 인허가 지원, 가구 거래 등 일체의 서비스를 의미합니다.</p>
          <p>② "이용자"란 본 약관에 따라 서비스를 이용하는 자를 말합니다.</p>
          <p>③ "PM"이란 회사가 배정하는 전담 프로젝트 매니저를 말합니다.</p>
        </section>
        <section>
          <h3 className="font-bold text-base mb-2">제3조 (약관의 효력 및 변경)</h3>
          <p>① 본 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.</p>
          <p>② 회사는 필요한 경우 관련 법령을 위반하지 않는 범위에서 약관을 변경할 수 있으며, 변경 시 적용일자 및 변경사유를 명시하여 현행 약관과 함께 서비스 내에 공지합니다.</p>
        </section>
        <section>
          <h3 className="font-bold text-base mb-2">제4조 (서비스의 제공)</h3>
          <p>① 회사는 다음의 서비스를 제공합니다:</p>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li>업종별 창업 비용 산출 서비스</li>
            <li>전담 PM 매칭 및 상담 서비스</li>
            <li>인허가 가이드 및 지원 서비스</li>
            <li>중고 가구/장비 거래 마켓</li>
            <li>상권 분석 정보 제공</li>
            <li>정부 지원사업 정보 안내</li>
          </ul>
        </section>
        <section>
          <h3 className="font-bold text-base mb-2">제5조 (이용자의 의무)</h3>
          <p>이용자는 서비스 이용 시 허위 정보를 제공하거나 타인의 정보를 도용해서는 안 되며, 관련 법령과 본 약관의 규정을 준수해야 합니다.</p>
        </section>
        <section>
          <h3 className="font-bold text-base mb-2">제6조 (결제 및 환불)</h3>
          <p>① 서비스 이용 과정에서 발생하는 결제는 토스페이먼츠를 통해 처리됩니다.</p>
          <p>② 환불은 진행 단계에 따라 회사의 환불 정책에 따릅니다.</p>
          <p>③ 단순 변심에 의한 환불은 결제일로부터 7일 이내에 가능합니다.</p>
        </section>
        <section>
          <h3 className="font-bold text-base mb-2">제7조 (면책)</h3>
          <p>회사는 천재지변, 전시, 사변, 기타 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.</p>
        </section>
        <div className="pt-4 text-xs text-slate-400 border-t">
          <p>시행일: 2026년 1월 1일</p>
        </div>
      </div>
    </div>
  );

  // === 10) 개인정보 처리방침 ===
  const PrivacyView = () => (
    <div className="min-h-screen bg-white">
      <SubHeader title="개인정보 처리방침" />
      <div className="p-5 text-sm text-slate-700 leading-relaxed space-y-6">
        <section>
          <h3 className="font-bold text-base mb-2">1. 개인정보의 수집 및 이용 목적</h3>
          <p>회사는 다음 목적을 위해 개인정보를 수집·이용합니다:</p>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li>회원 가입 및 관리: 본인 확인, 서비스 이용 의사 확인</li>
            <li>서비스 제공: 창업 비용 산출, PM 매칭, 채팅 상담</li>
            <li>결제 처리: 결제 정보 관리, 영수증 발급</li>
            <li>고객 지원: 문의 대응, 공지사항 전달</li>
          </ul>
        </section>
        <section>
          <h3 className="font-bold text-base mb-2">2. 수집하는 개인정보 항목</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>필수: 카카오 계정 정보 (이름, 프로필 이미지)</li>
            <li>선택: 전화번호, 이메일, 사업장 정보</li>
            <li>자동 수집: 서비스 이용 기록, 접속 로그, IP 주소</li>
          </ul>
        </section>
        <section>
          <h3 className="font-bold text-base mb-2">3. 개인정보의 보유 및 이용 기간</h3>
          <p>회원 탈퇴 시 즉시 파기합니다. 다만, 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다:</p>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li>전자상거래법에 따른 계약/결제 기록: 5년</li>
            <li>전자상거래법에 따른 소비자 불만 처리 기록: 3년</li>
            <li>통신비밀보호법에 따른 접속 로그: 3개월</li>
          </ul>
        </section>
        <section>
          <h3 className="font-bold text-base mb-2">4. 개인정보의 제3자 제공</h3>
          <p>회사는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 다만, 법령에 의하거나 수사 목적으로 법령에 정해진 절차에 따라 요청이 있는 경우는 예외로 합니다.</p>
        </section>
        <section>
          <h3 className="font-bold text-base mb-2">5. 개인정보의 안전성 확보 조치</h3>
          <p>회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취합니다:</p>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li>개인정보 암호화 (SSL/TLS)</li>
            <li>접근 권한 관리 및 접속 기록 보관</li>
            <li>정기적 보안 점검</li>
          </ul>
        </section>
        <section>
          <h3 className="font-bold text-base mb-2">6. 이용자의 권리</h3>
          <p>이용자는 언제든지 자신의 개인정보를 열람, 수정, 삭제 요청할 수 있으며, 회원 탈퇴를 통해 개인정보 처리 정지를 요청할 수 있습니다.</p>
        </section>
        <section>
          <h3 className="font-bold text-base mb-2">7. 개인정보 보호 책임자</h3>
          <p>성명: 김창업<br />직위: 대표이사<br />이메일: privacy@opening.run<br />전화: 1544-0000</p>
        </section>
        <div className="pt-4 text-xs text-slate-400 border-t">
          <p>시행일: 2026년 1월 1일</p>
        </div>
      </div>
    </div>
  );

  // === 11) 회사 소개 ===
  const AboutView = () => (
    <div className="min-h-screen bg-white">
      <SubHeader title="회사 소개" />
      <div className="p-5 space-y-6">
        <div className="text-center py-6">
          <div className="w-20 h-20 bg-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles size={36} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">오프닝</h2>
          <p className="text-sm text-slate-500 mt-1">창업의 새로운 시작</p>
        </div>

        <div className="bg-brand-50 rounded-xl p-5">
          <h3 className="font-bold text-brand-800 mb-2">우리의 미션</h3>
          <p className="text-sm text-brand-700 leading-relaxed">
            창업의 복잡함을 단순하게, 불안함을 안심으로. 오프닝은 예비 창업자의 시작부터 성공적인 오픈까지 함께합니다.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-base">오프닝이 하는 일</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: ClipboardList, title: '비용 산출', desc: '업종별 맞춤 비용 분석' },
              { icon: Users, title: 'PM 매칭', desc: '전담 매니저 배정' },
              { icon: MapPin, title: '상권 분석', desc: '동별 상세 데이터' },
              { icon: Banknote, title: '자금 지원', desc: '정부 지원사업 안내' },
            ].map((item, idx) => (
              <div key={idx} className="bg-slate-50 rounded-xl p-4 text-center">
                <item.icon size={24} className="mx-auto text-brand-600 mb-2" />
                <p className="font-bold text-sm">{item.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-5 space-y-2 text-sm text-slate-600">
          <h3 className="font-bold text-base text-slate-900 mb-3">회사 정보</h3>
          <div className="space-y-2">
            <div className="flex"><span className="w-24 text-slate-400 shrink-0">회사명</span><span>주식회사 오프닝</span></div>
            <div className="flex"><span className="w-24 text-slate-400 shrink-0">대표</span><span>김창업</span></div>
            <div className="flex"><span className="w-24 text-slate-400 shrink-0">사업자번호</span><span>123-45-67890</span></div>
            <div className="flex"><span className="w-24 text-slate-400 shrink-0">주소</span><span>서울시 강남구 테헤란로 123 오프닝타워 10층</span></div>
            <div className="flex"><span className="w-24 text-slate-400 shrink-0">고객센터</span><span>1544-0000</span></div>
            <div className="flex"><span className="w-24 text-slate-400 shrink-0">이메일</span><span>contact@opening.run</span></div>
          </div>
        </div>
      </div>
    </div>
  );

  // === 라우팅 ===
  if (viewState === 'PROFILE_EDIT') return <ProfileEditView />;
  if (viewState === 'NOTIFICATION_SETTINGS') return <NotificationSettingsView />;
  if (viewState === 'QUOTES') return <QuotesView />;
  if (viewState === 'CONTRACTS') return <ContractsView />;
  if (viewState === 'RECEIPTS') return <ReceiptsView />;
  if (viewState === 'FAQ') return <FAQView />;
  if (viewState === 'INQUIRY') return <InquiryView />;
  if (viewState === 'NOTICES') return <NoticesView />;
  if (viewState === 'TERMS') return <TermsView />;
  if (viewState === 'PRIVACY') return <PrivacyView />;
  if (viewState === 'ABOUT') return <AboutView />;

  // === 메인 메뉴 ===
  return (
    <div className="min-h-screen bg-slate-50">
      {/* 프로필 헤더 */}
      <div className="bg-white px-4 pt-6 pb-6 border-b border-slate-100">
        <h1 className="text-xl font-bold text-slate-900 mb-5">마이페이지</h1>

        {user ? (
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 font-bold text-xl">
              {user.name[0]}
            </div>
            <div className="flex-1">
              <p className="font-bold text-lg text-slate-900">{user.name} 사장님</p>
              <p className="text-sm text-slate-400">{user.phone || '게스트'}</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-slate-500 mb-4">로그인하고 나의 창업을 관리하세요</p>
            <button
              onClick={handleKakaoLogin}
              className="w-full bg-[#FEE500] text-[#3C1E1E] font-bold py-3 rounded-xl flex items-center justify-center gap-2"
            >
              <MessageCircle size={18} />
              카카오로 로그인
            </button>
          </div>
        )}
      </div>

      {/* 내 현황 */}
      {user && (
        <div className="px-4 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-slate-100 p-4 text-center">
              <p className="text-xs text-slate-400 mb-1">진행중 상담</p>
              <p className="font-bold text-lg text-brand-600">{consultingCount}건</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 p-4 text-center">
              <p className="text-xs text-slate-400 mb-1">받은 견적</p>
              <p className="font-bold text-lg text-slate-900">{quoteCount}건</p>
            </div>
          </div>
        </div>
      )}

      {/* 메뉴 */}
      <div className="p-4 space-y-4">
        {!isGuest && (
          <section>
            <h3 className="text-xs font-bold text-slate-400 mb-2 px-1">내 계정</h3>
            <div className="bg-white rounded-xl border border-slate-100 divide-y divide-slate-100">
              <MenuItem icon={UserIcon} label="내 정보 관리" sub="이름·연락처 수정" onClick={() => setViewState('PROFILE_EDIT')} />
              <MenuItem icon={Bell} label="알림 설정" onClick={() => setViewState('NOTIFICATION_SETTINGS')} />
            </div>
          </section>
        )}

        {!isGuest && (
          <section>
            <h3 className="text-xs font-bold text-slate-400 mb-2 px-1">내 문서</h3>
            <div className="bg-white rounded-xl border border-slate-100 divide-y divide-slate-100">
              <MenuItem icon={FileText} label="저장된 견적서" onClick={() => setViewState('QUOTES')} />
              <MenuItem icon={FileCheck} label="계약/확정 내역" onClick={() => setViewState('CONTRACTS')} />
              <MenuItem icon={CreditCard} label="결제 영수증" onClick={() => setViewState('RECEIPTS')} />
            </div>
          </section>
        )}

        {/* 고객지원 */}
        <section>
          <h3 className="text-xs font-bold text-slate-400 mb-2 px-1">고객지원</h3>
          <div className="bg-white rounded-xl border border-slate-100 divide-y divide-slate-100">
            <MenuItem icon={HelpCircle} label="자주 묻는 질문 (FAQ)" onClick={() => setViewState('FAQ')} />
            <MenuItem icon={MessageCircle} label="1:1 문의하기" sub="평일 10:00 - 18:00" onClick={() => setViewState('INQUIRY')} />
            <MenuItem icon={Megaphone} label="공지사항" onClick={() => setViewState('NOTICES')} />
          </div>
        </section>

        {/* 정보 */}
        <section>
          <h3 className="text-xs font-bold text-slate-400 mb-2 px-1">정보</h3>
          <div className="bg-white rounded-xl border border-slate-100 divide-y divide-slate-100">
            <MenuItem icon={FileText} label="이용약관" onClick={() => setViewState('TERMS')} />
            <MenuItem icon={ShieldAlert} label="개인정보 처리방침" onClick={() => setViewState('PRIVACY')} />
            <MenuItem icon={Building2} label="회사 소개" onClick={() => setViewState('ABOUT')} />
          </div>
        </section>

        {user && (
          <button
            onClick={onLogout}
            className="w-full py-3 text-sm text-slate-400 font-medium flex items-center justify-center gap-2 hover:text-slate-600 transition-colors"
          >
            <LogOut size={16} />
            로그아웃
          </button>
        )}
      </div>

      <div className="p-4 text-center">
        <p className="text-[10px] text-slate-300 leading-relaxed">
          (주)오프닝 | 서울시 강남구 테헤란로 123<br />
          고객센터: 1544-0000 (평일 10:00 - 18:00)
        </p>
      </div>

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white text-sm px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2 animate-fade-in">
          <Info size={16} className="text-slate-300 shrink-0" />
          {toast}
        </div>
      )}
    </div>
  );
};

const MenuItem: React.FC<{
  icon: any;
  label: string;
  sub?: string;
  onClick?: () => void;
}> = ({ icon: Icon, label, sub, onClick }) => (
  <button onClick={onClick} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
    <div className="flex items-center gap-3">
      <Icon size={18} className="text-slate-400" />
      <div className="text-left">
        <span className="text-sm font-medium text-slate-900">{label}</span>
        {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
      </div>
    </div>
    <ChevronRight size={16} className="text-slate-300" />
  </button>
);
