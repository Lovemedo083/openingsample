import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Button } from './Components';
import { createNotification } from './NotificationCenter';
import {
  Plus, Edit2, Trash2, Save, X, Building2, Phone, Mail,
  DollarSign, Tag, Search, Filter, ChevronDown, ChevronUp,
  Users, TrendingUp, Package, Settings, LogOut, Home,
  Hammer, PaintBucket, SignpostBig, Wifi, Shield, Bike,
  Truck, Store, Sparkles, Wind, CreditCard, BarChart3,
  UserCheck, Calendar, Eye, Download, RefreshCw, Clock,
  CheckCircle, XCircle, AlertCircle, Image, MessageSquare,
  Briefcase, Send, ArrowLeft
} from 'lucide-react';

// Toss 결제 키 (환경변수)
const TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY || '';
const TOSS_SECRET_KEY = import.meta.env.VITE_TOSS_SECRET_KEY || '';

interface Partner {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  description: string;
  price_min: number;
  price_max: number;
  price_unit: string;
  commission_rate: number;
  service_area: string[];
  is_active: boolean;
  created_at: string;
  // 추가 필드
  address: string;
  owner_comment: string;
  admin_memo: string;
}

interface Customer {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  signup_source: string;
  created_at: string;
  projects_count?: number;
}

interface Payment {
  id: string;
  customer_id: string;
  customer_name?: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method: string;
  description: string;
  created_at: string;
  toss_payment_key?: string;
}

interface PM {
  id: string;
  name: string;
  email: string;
  phone: string;
  profile_image?: string;
  specialties: string[];
  introduction?: string;
  greeting_message?: string;
  experience_years?: number;
  completed_projects: number;
  rating: number;
  is_available: boolean;
  created_at: string;
}

interface AdminViewProps {
  onLogout: () => void;
}

type AdminTab = 'dashboard' | 'payments' | 'customers' | 'pm' | 'partners' | 'projects';

interface ProjectWithPM {
  id: string;
  business_category: string;
  location_dong: string;
  store_size: number;
  estimated_total: number;
  status: string;
  current_step: number;
  pm_id: string;
  pm_name?: string;
  user_name?: string;
  user_phone?: string;
  created_at: string;
  user_id: string;
}

interface ProjectMessage {
  id: string;
  project_id: string;
  sender_type: 'USER' | 'PM' | 'SYSTEM';
  message: string;
  created_at: string;
}

// 협력업체 카테고리
const PARTNER_CATEGORIES = [
  { id: 'construction', label: '공사/시설', icon: Hammer, subcategories: ['철거', '인테리어', '간판', '전기', '가스', '환기'] },
  { id: 'equipment', label: '장비/집기', icon: Package, subcategories: ['주방장비', '가구', '냉장설비', 'POS'] },
  { id: 'operation', label: '운영지원', icon: Settings, subcategories: ['청소', 'CCTV/보안', '인터넷/통신', '보험'] },
  { id: 'logistics', label: '물류/배달', icon: Truck, subcategories: ['배달대행', '물류', '원재료공급'] },
  { id: 'marketing', label: '마케팅', icon: TrendingUp, subcategories: ['배달앱입점', 'SNS마케팅', '간판/사인물'] },
];

// 프로젝트 단계 라벨
const STEP_LABELS: Record<number, string> = {
  7: '상담 시작',
  8: '비용 견적',
  9: '계약/시작',
  10: '시공 진행',
  11: '오픈 완료',
  12: '사후관리'
};

export const AdminView: React.FC<AdminViewProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [loading, setLoading] = useState(true);

  // 대시보드 통계
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalProjects: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    activePartners: 0,
    activePMs: 0
  });

  // 데이터
  const [partners, setPartners] = useState<Partner[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pms, setPMs] = useState<PM[]>([]);
  const [allProjects, setAllProjects] = useState<ProjectWithPM[]>([]);
  const [projectMessages, setProjectMessages] = useState<ProjectMessage[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectFilterPM, setProjectFilterPM] = useState<string | null>(null);
  const [adminMessage, setAdminMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [adminMessageType, setAdminMessageType] = useState<'PM' | 'SYSTEM'>('PM');

  // 필터/검색
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // 모달
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [showPMModal, setShowPMModal] = useState(false);
  const [editingPM, setEditingPM] = useState<PM | null>(null);

  // 파트너 폼
  const [partnerForm, setPartnerForm] = useState<Partial<Partner>>({
    name: '', category: '', subcategory: '', contact_name: '', contact_phone: '',
    contact_email: '', description: '', price_min: 0, price_max: 0, price_unit: '만원',
    commission_rate: 10, service_area: ['강남구'], is_active: true,
    address: '', owner_comment: '', admin_memo: ''
  });

  // PM 폼
  const [pmForm, setPMForm] = useState<Partial<PM>>({
    name: '', email: '', phone: '', profile_image: '', specialties: [], introduction: '', greeting_message: '', completed_projects: 0, is_available: true
  });
  const [newSpecialty, setNewSpecialty] = useState('');

  useEffect(() => {
    loadAllData();

    // 신규 프로젝트 실시간 알림
    const channel = supabase
      .channel('admin-new-projects')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'startup_projects',
      }, () => {
        setNewProjectAlert(true);
        loadAllProjects();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadStats(),
      loadPartners(),
      loadCustomers(),
      loadPayments(),
      loadPMs(),
      loadAllProjects()
    ]);
    setLoading(false);
  };

  const loadAllProjects = async () => {
    const { data: projects } = await supabase
      .from('startup_projects')
      .select('*, profiles:user_id(name, phone, email, full_name)')
      .order('created_at', { ascending: false });

    if (projects) {
      // PM 이름 + 신청자 이름 매핑
      const projectsWithPM = projects.map((p: any) => {
        const pm = pms.find(pm => pm.id === p.pm_id);
        return {
          ...p,
          pm_name: pm?.name || '미배정',
          user_name: p.profiles?.full_name || p.profiles?.name || p.profiles?.email?.split('@')[0] || null,
          user_phone: p.profiles?.phone || null,
        };
      });
      setAllProjects(projectsWithPM);
    }
  };

  const loadProjectMessages = async (projectId: string) => {
    const { data } = await supabase
      .from('project_messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at');

    if (data) {
      setProjectMessages(data);
    }
  };

  const sendAdminMessage = async () => {
    if (!adminMessage.trim() || !selectedProjectId) return;

    setSendingMessage(true);
    const { error } = await supabase.from('project_messages').insert({
      project_id: selectedProjectId,
      sender_type: adminMessageType === 'SYSTEM' ? 'SYSTEM' : 'PM',
      message: `[관리자] ${adminMessage.trim()}`
    });

    if (!error) {
      setAdminMessage('');
      loadProjectMessages(selectedProjectId);
    } else {
      alert('메시지 전송 실패: ' + error.message);
    }
    setSendingMessage(false);
  };

  // PM 배정 선택 상태
  const [assignPmId, setAssignPmId] = useState<string>('');
  // 신규 프로젝트 알림
  const [newProjectAlert, setNewProjectAlert] = useState(false);

  // PENDING_PM 프로젝트 수락 (PM 배정)
  const acceptProject = async (projectId: string) => {
    if (!assignPmId) {
      alert('배정할 PM을 선택해주세요.');
      return;
    }

    const { error } = await supabase
      .from('startup_projects')
      .update({
        pm_id: assignPmId,
        status: 'PM_ASSIGNED',
        current_step: 7,
        pm_approved_step: 7
      })
      .eq('id', projectId);

    if (!error) {
      const pm = pms.find(p => p.id === assignPmId);
      // 로컬 상태 업데이트
      setAllProjects(prev => prev.map(p =>
        p.id === projectId ? { ...p, pm_id: assignPmId, pm_name: pm?.name || '', status: 'PM_ASSIGNED', current_step: 7 } : p
      ));

      // PM 배정 알림 메시지 전송
      await supabase.from('project_messages').insert({
        project_id: projectId,
        sender_type: 'SYSTEM',
        message: `담당 매니저가 배정되었습니다 🎉\n\n담당 매니저: ${pm?.name || ''}님\n\n곧 연락드릴 예정입니다.`
      });

      // PM 환영 메시지
      const pmGreeting = pm?.greeting_message || '안녕하세요! 담당 매니저입니다. 창업 준비를 함께 도와드리겠습니다.';
      await supabase.from('project_messages').insert({
        project_id: projectId,
        sender_type: 'PM',
        message: `안녕하세요, 담당 매니저 ${pm?.name}입니다.\n\n${pmGreeting}\n\n곧 전화드리겠습니다.`
      });

      // 앱 내 알림 생성
      const targetProject = allProjects.find(p => p.id === projectId);
      if (targetProject?.user_id) {
        await createNotification({
          userId: targetProject.user_id,
          projectId,
          type: 'PM_ASSIGNED',
          title: '담당 매니저 배정 완료',
          message: `${pm?.name || '매니저'}님이 담당 매니저로 배정되었습니다. 곧 연락드릴 예정입니다.`,
        });
      }

      loadProjectMessages(projectId);
      setAssignPmId('');
    } else {
      alert('PM 배정 실패: ' + error.message);
    }
  };

  // 프로젝트 단계 변경
  const changeProjectStep = async (projectId: string, newStep: number) => {
    const currentProject = allProjects.find(p => p.id === projectId);
    if (!currentProject) return;

    const currentStep = currentProject.current_step;
    const diff = newStep - currentStep;

    // 같은 단계면 무시
    if (diff === 0) return;

    // 2단계 이상 점프 시 경고
    if (Math.abs(diff) > 1) {
      if (!window.confirm(`현재 ${currentStep}단계에서 ${newStep}단계로 ${diff > 0 ? '건너뛰기' : '되돌리기'}합니다.\n정말 진행하시겠습니까?`)) {
        return;
      }
    }

    // Step 9→10 전환 시 결제 확인
    if (newStep === 10 && currentStep === 9) {
      const { data: payments } = await supabase
        .from('payments')
        .select('id')
        .eq('furniture_listing_id', projectId)
        .eq('status', 'completed')
        .limit(1);

      if (!payments || payments.length === 0) {
        if (!window.confirm('이 프로젝트에 완료된 결제가 없습니다.\n결제 없이 시공 단계로 진행하시겠습니까?')) {
          return;
        }
      }
    }

    const status = newStep >= 11 ? 'COMPLETED' : newStep >= 7 ? 'IN_PROGRESS' : 'PM_ASSIGNED';

    const { error } = await supabase
      .from('startup_projects')
      .update({
        current_step: newStep,
        pm_approved_step: newStep,
        status
      })
      .eq('id', projectId);

    if (!error) {
      // 로컬 상태 업데이트
      setAllProjects(prev => prev.map(p =>
        p.id === projectId ? { ...p, current_step: newStep, status } : p
      ));

      // 단계 변경 알림 메시지 전송
      await supabase.from('project_messages').insert({
        project_id: projectId,
        sender_type: 'SYSTEM',
        message: `프로젝트 단계가 "${STEP_LABELS[newStep]}"(으)로 변경되었습니다.`
      });

      // 앱 내 알림 생성
      if (currentProject.user_id) {
        await createNotification({
          userId: currentProject.user_id,
          projectId,
          type: 'STEP_CHANGED',
          title: `단계 변경: ${STEP_LABELS[newStep]}`,
          message: `프로젝트가 "${STEP_LABELS[newStep]}" 단계로 변경되었습니다.`,
        });
      }

      loadProjectMessages(projectId);
    } else {
      alert('단계 변경 실패: ' + error.message);
    }
  };

  const loadStats = async () => {
    const [customersRes, projectsRes, partnersRes, pmsRes] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('startup_projects').select('*', { count: 'exact', head: true }),
      supabase.from('partners').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('project_managers').select('*', { count: 'exact', head: true }).eq('is_available', true)
    ]);

    setStats({
      totalCustomers: customersRes.count || 0,
      totalProjects: projectsRes.count || 0,
      totalRevenue: 0,
      monthlyRevenue: 0,
      activePartners: partnersRes.count || 0,
      activePMs: pmsRes.count || 0
    });
  };

  const loadPartners = async () => {
    const { data } = await supabase.from('partners').select('*').order('created_at', { ascending: false });
    if (data) setPartners(data);
  };

  const loadCustomers = async () => {
    const { data: authUsers } = await supabase.auth.admin.listUsers();

    // Fallback: Load from profiles table
    const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });

    if (profiles) {
      const customerList: Customer[] = profiles.map(p => ({
        id: p.id,
        email: p.email || '',
        full_name: p.full_name || '',
        phone: p.phone || '',
        signup_source: p.signup_source || '',
        created_at: p.created_at
      }));
      setCustomers(customerList);
    }
  };

  const loadPayments = async () => {
    const { data } = await supabase.from('payments').select('*').order('created_at', { ascending: false });
    if (data) setPayments(data);
    else {
      // 더미 데이터
      setPayments([]);
    }
  };

  const loadPMs = async () => {
    const { data } = await supabase.from('project_managers').select('*').order('created_at', { ascending: false });
    if (data) setPMs(data);
  };

  // Partner CRUD
  const savePartner = async () => {
    if (!partnerForm.name || !partnerForm.category) {
      alert('업체명과 카테고리는 필수입니다.');
      return;
    }

    if (editingPartner) {
      await supabase.from('partners').update(partnerForm).eq('id', editingPartner.id);
    } else {
      await supabase.from('partners').insert([partnerForm]);
    }

    setShowAddModal(false);
    setEditingPartner(null);
    resetPartnerForm();
    loadPartners();
  };

  const deletePartner = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    await supabase.from('partners').delete().eq('id', id);
    loadPartners();
  };

  const resetPartnerForm = () => {
    setPartnerForm({
      name: '', category: '', subcategory: '', contact_name: '', contact_phone: '',
      contact_email: '', description: '', price_min: 0, price_max: 0, price_unit: '만원',
      commission_rate: 10, service_area: ['강남구'], is_active: true,
      address: '', owner_comment: '', admin_memo: ''
    });
  };

  // PM CRUD
  const savePM = async () => {
    if (!pmForm.name || !pmForm.email) {
      alert('이름과 이메일은 필수입니다.');
      return;
    }

    const pmData = {
      name: pmForm.name,
      email: pmForm.email,
      phone: pmForm.phone,
      profile_image: pmForm.profile_image,
      specialties: pmForm.specialties || [],
      introduction: pmForm.introduction || '',
      greeting_message: pmForm.greeting_message || '안녕하세요! 담당 매니저입니다. 창업 준비를 함께 도와드리겠습니다.',
      completed_projects: pmForm.completed_projects || 0,
      is_available: pmForm.is_available ?? true,
      rating: pmForm.rating || 5.0
    };

    if (editingPM) {
      await supabase.from('project_managers').update(pmData).eq('id', editingPM.id);
    } else {
      await supabase.from('project_managers').insert([pmData]);
    }

    setShowPMModal(false);
    setEditingPM(null);
    setPMForm({ name: '', email: '', phone: '', specialties: [], introduction: '', greeting_message: '', completed_projects: 0, is_available: true });
    setNewSpecialty('');
    loadPMs();
  };

  const deletePM = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    await supabase.from('project_managers').delete().eq('id', id);
    loadPMs();
  };

  // 필터링
  const filteredPartners = partners.filter(p => {
    if (selectedCategory && p.category !== selectedCategory) return false;
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const filteredCustomers = customers.filter(c => {
    if (!searchQuery) return true;
    return c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           c.phone?.includes(searchQuery);
  });

  // 탭 메뉴
  const tabs = [
    { id: 'dashboard', label: '대시보드', icon: BarChart3 },
    { id: 'projects', label: '프로젝트', icon: Briefcase },
    { id: 'payments', label: '결제관리', icon: CreditCard },
    { id: 'customers', label: '고객관리', icon: Users },
    { id: 'pm', label: 'PM관리', icon: UserCheck },
    { id: 'partners', label: '파트너관리', icon: Building2 },
  ] as const;

  return (
    <div className="min-h-[100dvh] bg-gray-100 flex flex-col">
      {/* 헤더 */}
      <header className="bg-slate-900 text-white px-4 md:px-6 py-3 md:py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            <img src="/favicon-new.png" alt="오프닝" className="w-8 h-8 md:w-10 md:h-10 rounded-xl" />
            <div>
              <h1 className="text-base md:text-xl font-bold">오프닝 관리자</h1>
              <p className="text-xs md:text-sm text-slate-400 hidden md:block">통합 관리 시스템</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-sm"
          >
            <LogOut size={16} />
            <span className="hidden md:inline">로그아웃</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* 사이드바 - 데스크톱만 */}
        <aside className="hidden md:block w-64 bg-white border-r p-4 overflow-y-auto">
          <nav className="space-y-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (tab.id === 'projects') setNewProjectAlert(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-colors ${
                    activeTab === tab.id
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={20} />
                  <span className="flex-1 text-left">{tab.label}</span>
                  {tab.id === 'projects' && (() => {
                    const pendingCount = allProjects.filter(p => p.status === 'PENDING_PM').length;
                    return pendingCount > 0 ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${newProjectAlert ? 'bg-red-500 text-white animate-pulse' : 'bg-amber-100 text-amber-700'}`}>
                        신규 {pendingCount}
                      </span>
                    ) : null;
                  })()}
                </button>
              );
            })}
          </nav>

          {/* 빠른 통계 */}
          <div className="mt-8 p-4 bg-slate-50 rounded-xl">
            <h3 className="font-bold text-sm text-slate-700 mb-3">현황</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">고객</span>
                <span className="font-bold">{stats.totalCustomers}명</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">프로젝트</span>
                <span className="font-bold">{stats.totalProjects}개</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">활성 PM</span>
                <span className="font-bold text-brand-600">{stats.activePMs}명</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">파트너</span>
                <span className="font-bold text-green-600">{stats.activePartners}개</span>
              </div>
            </div>
          </div>
        </aside>

        {/* 메인 콘텐츠 */}
        <main className="flex-1 p-3 md:p-6 overflow-y-auto pb-28 md:pb-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="animate-spin text-gray-400" size={32} />
            </div>
          ) : (
            <>
              {/* 대시보드 */}
              {activeTab === 'dashboard' && (
                <div className="space-y-4 md:space-y-6">
                  <h2 className="text-xl md:text-2xl font-bold">대시보드</h2>

                  {/* 통계 카드 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    <div className="bg-white p-6 rounded-xl border">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                          <Users className="text-blue-600" size={24} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">총 고객</p>
                          <p className="text-2xl font-bold">{stats.totalCustomers}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                          <Package className="text-green-600" size={24} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">진행 프로젝트</p>
                          <p className="text-2xl font-bold">{stats.totalProjects}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                          <Building2 className="text-purple-600" size={24} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">협력 파트너</p>
                          <p className="text-2xl font-bold">{stats.activePartners}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                          <CreditCard className="text-yellow-600" size={24} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">이번 달 매출</p>
                          <p className="text-2xl font-bold">{stats.monthlyRevenue.toLocaleString()}원</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 최근 가입 고객 */}
                  <div className="bg-white rounded-xl border">
                    <div className="px-6 py-4 border-b flex items-center justify-between">
                      <h3 className="font-bold">최근 가입 고객</h3>
                      <button onClick={() => setActiveTab('customers')} className="text-sm text-brand-600 hover:underline">
                        전체보기
                      </button>
                    </div>
                    <div className="divide-y">
                      {customers.slice(0, 5).map(customer => (
                        <div key={customer.id} className="px-6 py-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                              <Users size={18} className="text-gray-400" />
                            </div>
                            <div>
                              <p className="font-medium">{customer.full_name || '이름 없음'}</p>
                              <p className="text-sm text-gray-500">{customer.email}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">
                              {customer.signup_source || '직접 가입'}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(customer.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 결제관리 */}
              {activeTab === 'payments' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">결제관리</h2>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => loadPayments()}>
                        <RefreshCw size={18} className="mr-2" />
                        새로고침
                      </Button>
                      <Button variant="outline">
                        <Download size={18} className="mr-2" />
                        내보내기
                      </Button>
                    </div>
                  </div>

                  {/* Toss 키 표시 */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h3 className="font-bold text-blue-800 mb-2">Toss 결제 연동 (테스트 모드)</h3>
                    <div className="text-sm text-blue-700 space-y-1">
                      <p>Client Key: {TOSS_CLIENT_KEY.slice(0, 20)}...</p>
                      <p>Secret Key: {TOSS_SECRET_KEY.slice(0, 20)}...</p>
                    </div>
                  </div>

                  {/* 결제 통계 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    <div className="bg-white p-4 rounded-xl border">
                      <p className="text-sm text-gray-500">총 결제액</p>
                      <p className="text-xl font-bold text-green-600">
                        {payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0).toLocaleString()}원
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border">
                      <p className="text-sm text-gray-500">대기중</p>
                      <p className="text-xl font-bold text-yellow-600">
                        {payments.filter(p => p.status === 'pending').length}건
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border">
                      <p className="text-sm text-gray-500">완료</p>
                      <p className="text-xl font-bold text-green-600">
                        {payments.filter(p => p.status === 'completed').length}건
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border">
                      <p className="text-sm text-gray-500">환불</p>
                      <p className="text-xl font-bold text-red-600">
                        {payments.filter(p => p.status === 'refunded').length}건
                      </p>
                    </div>
                  </div>

                  {/* 결제 내역 */}
                  <div className="bg-white rounded-xl border overflow-hidden">
                    {payments.length === 0 ? (
                      <div className="text-center py-20 text-gray-500">
                        <CreditCard size={48} className="mx-auto mb-4 text-gray-300" />
                        <p>결제 내역이 없습니다</p>
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="text-left px-4 py-3 text-sm font-bold text-gray-700">결제번호</th>
                            <th className="text-left px-4 py-3 text-sm font-bold text-gray-700">고객</th>
                            <th className="text-left px-4 py-3 text-sm font-bold text-gray-700">금액</th>
                            <th className="text-left px-4 py-3 text-sm font-bold text-gray-700">상태</th>
                            <th className="text-left px-4 py-3 text-sm font-bold text-gray-700">결제일</th>
                            <th className="text-right px-4 py-3 text-sm font-bold text-gray-700">관리</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {payments.map(payment => (
                            <tr key={payment.id} className="hover:bg-gray-50">
                              <td className="px-4 py-4 font-mono text-sm">{payment.id.slice(0, 8)}</td>
                              <td className="px-4 py-4">{payment.customer_name}</td>
                              <td className="px-4 py-4 font-bold">{payment.amount.toLocaleString()}원</td>
                              <td className="px-4 py-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                  payment.status === 'completed' ? 'bg-green-100 text-green-700' :
                                  payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                  payment.status === 'refunded' ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {payment.status === 'completed' ? '완료' :
                                   payment.status === 'pending' ? '대기' :
                                   payment.status === 'refunded' ? '환불' : '실패'}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-500">
                                {new Date(payment.created_at).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-4 text-right">
                                <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                                  <Eye size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* 고객관리 */}
              {activeTab === 'customers' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">고객관리</h2>
                    <div className="flex gap-4">
                      <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="이름, 이메일, 전화번호 검색..."
                          className="pl-10 pr-4 py-2 border rounded-lg w-64"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                      <Button variant="outline">
                        <Download size={18} className="mr-2" />
                        내보내기
                      </Button>
                    </div>
                  </div>

                  {/* 가입경로 통계 */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-4">
                    {['search', 'instagram', 'youtube', 'blog', 'friend', 'other'].map(source => (
                      <div key={source} className="bg-white p-4 rounded-xl border text-center">
                        <p className="text-xs text-gray-500 mb-1">
                          {source === 'search' ? '검색' :
                           source === 'instagram' ? '인스타그램' :
                           source === 'youtube' ? '유튜브' :
                           source === 'blog' ? '블로그' :
                           source === 'friend' ? '지인추천' : '기타'}
                        </p>
                        <p className="text-xl font-bold">
                          {customers.filter(c => c.signup_source === source).length}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* 고객 목록 */}
                  <div className="bg-white rounded-xl border overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-4 py-3 text-sm font-bold text-gray-700">고객</th>
                          <th className="text-left px-4 py-3 text-sm font-bold text-gray-700">연락처</th>
                          <th className="text-left px-4 py-3 text-sm font-bold text-gray-700">가입경로</th>
                          <th className="text-left px-4 py-3 text-sm font-bold text-gray-700">가입일</th>
                          <th className="text-right px-4 py-3 text-sm font-bold text-gray-700">관리</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredCustomers.map(customer => (
                          <tr key={customer.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                  <Users size={18} className="text-gray-400" />
                                </div>
                                <div>
                                  <p className="font-bold">{customer.full_name || '이름 없음'}</p>
                                  <p className="text-sm text-gray-500">{customer.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm">{customer.phone || '-'}</td>
                            <td className="px-4 py-4">
                              <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                                {customer.signup_source === 'search' ? '검색' :
                                 customer.signup_source === 'instagram' ? '인스타그램' :
                                 customer.signup_source === 'youtube' ? '유튜브' :
                                 customer.signup_source === 'blog' ? '블로그' :
                                 customer.signup_source === 'friend' ? '지인추천' :
                                 customer.signup_source || '직접 가입'}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-500">
                              {new Date(customer.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-4 text-right">
                              <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                                <Eye size={16} />
                              </button>
                              <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                                <MessageSquare size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* PM관리 */}
              {activeTab === 'pm' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">PM관리</h2>
                    <Button onClick={() => { setPMForm({ name: '', email: '', phone: '', specialty: [], is_active: true }); setEditingPM(null); setShowPMModal(true); }}>
                      <Plus size={18} className="mr-2" />
                      PM 추가
                    </Button>
                  </div>

                  {/* PM 목록 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                    {pms.map(pm => (
                      <div key={pm.id} className="bg-white rounded-xl border p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            {pm.profile_image ? (
                              <img src={pm.profile_image} alt={pm.name} className="w-14 h-14 rounded-full object-cover" />
                            ) : (
                              <div className="w-14 h-14 bg-brand-100 rounded-full flex items-center justify-center">
                                <UserCheck size={24} className="text-brand-600" />
                              </div>
                            )}
                            <div>
                              <h3 className="font-bold text-lg">{pm.name}</h3>
                              <p className="text-sm text-gray-500">{pm.email}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            pm.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {pm.is_available ? '활성' : '비활성'}
                          </span>
                        </div>

                        {/* 태그 */}
                        {pm.specialties && pm.specialties.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {pm.specialties.map((tag, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-brand-50 text-brand-700 text-xs rounded-full">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* 인삿말 */}
                        {pm.introduction && (
                          <p className="text-xs text-gray-500 mb-3 line-clamp-2 italic">"{pm.introduction}"</p>
                        )}

                        <div className="space-y-2 text-sm mb-4">
                          <div className="flex justify-between">
                            <span className="text-gray-500">연락처</span>
                            <span>{pm.phone || '-'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">완료 프로젝트</span>
                            <span className="font-bold text-brand-600">{pm.completed_projects || 0}건</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">평점</span>
                            <span className="font-bold text-yellow-600">★ {pm.rating?.toFixed(1) || '5.0'}</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            fullWidth
                            onClick={() => { setEditingPM(pm); setPMForm(pm); setShowPMModal(true); }}
                          >
                            <Edit2 size={14} className="mr-1" />
                            수정
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deletePM(pm.id)}
                            className="text-red-500 hover:bg-red-50"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {pms.length === 0 && (
                      <div className="col-span-3 text-center py-20 bg-white rounded-xl border">
                        <UserCheck size={48} className="mx-auto mb-4 text-gray-300" />
                        <h3 className="font-bold text-gray-700 mb-2">등록된 PM이 없습니다</h3>
                        <p className="text-gray-500 text-sm mb-4">PM을 추가하여 시작하세요</p>
                        <Button onClick={() => setShowPMModal(true)}>
                          <Plus size={18} className="mr-2" />
                          PM 추가
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 파트너관리 */}
              {activeTab === 'partners' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <h2 className="text-2xl font-bold">파트너관리</h2>
                      <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="업체명 검색..."
                          className="pl-10 pr-4 py-2 border rounded-lg w-64"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>
                    <Button onClick={() => { resetPartnerForm(); setEditingPartner(null); setShowAddModal(true); }}>
                      <Plus size={18} className="mr-2" />
                      협력업체 추가
                    </Button>
                  </div>

                  {/* 카테고리 탭 */}
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-colors ${
                        !selectedCategory ? 'bg-slate-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      전체 ({partners.length})
                    </button>
                    {PARTNER_CATEGORIES.map(cat => {
                      const Icon = cat.icon;
                      const count = partners.filter(p => p.category === cat.id).length;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap flex items-center gap-2 transition-colors ${
                            selectedCategory === cat.id ? 'bg-slate-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <Icon size={16} />
                          {cat.label} ({count})
                        </button>
                      );
                    })}
                  </div>

                  {/* 파트너 목록 */}
                  {filteredPartners.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl border">
                      <Building2 size={48} className="mx-auto mb-4 text-gray-300" />
                      <h3 className="font-bold text-gray-700 mb-2">등록된 협력업체가 없습니다</h3>
                      <Button onClick={() => setShowAddModal(true)}>
                        <Plus size={18} className="mr-2" />
                        협력업체 추가
                      </Button>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="text-left px-4 py-3 text-sm font-bold text-gray-700">업체명</th>
                            <th className="text-left px-4 py-3 text-sm font-bold text-gray-700">카테고리</th>
                            <th className="text-left px-4 py-3 text-sm font-bold text-gray-700">담당자</th>
                            <th className="text-left px-4 py-3 text-sm font-bold text-gray-700">가격</th>
                            <th className="text-left px-4 py-3 text-sm font-bold text-gray-700">수수료</th>
                            <th className="text-left px-4 py-3 text-sm font-bold text-gray-700">상태</th>
                            <th className="text-right px-4 py-3 text-sm font-bold text-gray-700">관리</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {filteredPartners.map(partner => (
                            <tr key={partner.id} className="hover:bg-gray-50">
                              <td className="px-4 py-4">
                                <p className="font-bold">{partner.name}</p>
                                <p className="text-xs text-gray-500 truncate max-w-xs">{partner.description}</p>
                              </td>
                              <td className="px-4 py-4">
                                <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                                  {PARTNER_CATEGORIES.find(c => c.id === partner.category)?.label}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-sm">
                                <p>{partner.contact_name}</p>
                                <p className="text-gray-500">{partner.contact_phone}</p>
                              </td>
                              <td className="px-4 py-4 text-sm">
                                {partner.price_min}~{partner.price_max}{partner.price_unit}
                              </td>
                              <td className="px-4 py-4">
                                <span className="font-bold text-brand-600">{partner.commission_rate}%</span>
                              </td>
                              <td className="px-4 py-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                  partner.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                }`}>
                                  {partner.is_active ? '활성' : '비활성'}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-right">
                                <button
                                  onClick={() => { setEditingPartner(partner); setPartnerForm(partner); setShowAddModal(true); }}
                                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => deletePartner(partner.id)}
                                  className="p-2 hover:bg-red-50 rounded-lg text-red-500"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* 프로젝트 열람 */}
              {activeTab === 'projects' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">프로젝트 열람</h2>
                    <div className="flex gap-4">
                      <select
                        className="px-4 py-2 border rounded-lg"
                        value={projectFilterPM || ''}
                        onChange={(e) => setProjectFilterPM(e.target.value || null)}
                      >
                        <option value="">전체 PM</option>
                        {pms.map(pm => (
                          <option key={pm.id} value={pm.id}>{pm.name}</option>
                        ))}
                      </select>
                      <Button variant="outline" onClick={loadAllProjects}>
                        <RefreshCw size={18} className="mr-2" />
                        새로고침
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-6">
                    {/* 프로젝트 목록 */}
                    <div className="w-1/3 bg-white rounded-xl border overflow-hidden">
                      <div className="px-4 py-3 bg-gray-50 border-b font-bold text-sm">
                        프로젝트 목록 ({(projectFilterPM ? allProjects.filter(p => p.pm_id === projectFilterPM) : allProjects).length})
                      </div>
                      <div className="divide-y max-h-[calc(100vh-300px)] overflow-y-auto">
                        {(projectFilterPM ? allProjects.filter(p => p.pm_id === projectFilterPM) : allProjects).map(project => {
                          const pm = pms.find(p => p.id === project.pm_id);
                          const isPendingPM = project.status === 'PENDING_PM';
                          return (
                            <button
                              key={project.id}
                              onClick={() => { setSelectedProjectId(project.id); loadProjectMessages(project.id); }}
                              className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                                selectedProjectId === project.id ? 'bg-brand-50 border-l-4 border-brand-600' : ''
                              } ${isPendingPM ? 'border-l-4 border-amber-400 bg-amber-50/30' : ''}`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-sm">{project.business_category}</span>
                                {isPendingPM ? (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold animate-pulse">
                                    PM 대기
                                  </span>
                                ) : (
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    project.current_step >= 8 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    Step {project.current_step}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">
                                강남구 {project.location_dong} · {project.store_size}평
                              </p>
                              {project.user_name && (
                                <p className="text-xs text-gray-700 font-bold mt-1">
                                  신청자: {project.user_name}
                                  {project.user_phone && <span className="text-gray-400 font-normal ml-1">{project.user_phone}</span>}
                                </p>
                              )}
                              <p className="text-xs text-brand-600 font-medium mt-1">
                                담당: {pm?.name || '미배정'}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(project.created_at).toLocaleDateString()}
                              </p>
                            </button>
                          );
                        })}
                        {allProjects.length === 0 && (
                          <div className="p-8 text-center text-gray-400">
                            <Briefcase size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">프로젝트가 없습니다</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 채팅 내용 */}
                    <div className="flex-1 bg-white rounded-xl border overflow-hidden flex flex-col">
                      <div className="px-4 py-3 bg-gray-50 border-b font-bold text-sm">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <MessageSquare size={16} />
                            채팅 내용
                          </div>
                          {selectedProjectId && (
                            <button
                              onClick={() => loadProjectMessages(selectedProjectId)}
                              className="text-xs text-brand-600 hover:underline flex items-center gap-1"
                            >
                              <RefreshCw size={12} />
                              새로고침
                            </button>
                          )}
                        </div>
                        {/* 신청자 정보 */}
                        {selectedProjectId && (() => {
                          const sp = allProjects.find(p => p.id === selectedProjectId);
                          if (!sp?.user_name) return null;
                          return (
                            <div className="flex items-center gap-2 mb-2 text-xs">
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-bold">{sp.user_name}</span>
                              {sp.user_phone && <span className="text-gray-400">{sp.user_phone}</span>}
                              <span className="text-gray-300">·</span>
                              <span className="text-gray-500">{sp.business_category} · 강남구 {sp.location_dong} · {sp.store_size}평</span>
                            </div>
                          );
                        })()}
                        {/* PM 배정 / 단계 변경 */}
                        {selectedProjectId && (() => {
                          const selectedProject = allProjects.find(p => p.id === selectedProjectId);
                          const isPendingPM = selectedProject?.status === 'PENDING_PM';

                          if (isPendingPM) {
                            return (
                              <div className="pt-2 border-t space-y-2">
                                <div className="flex items-center gap-2 bg-amber-50 px-3 py-2 rounded-lg">
                                  <AlertCircle size={14} className="text-amber-600 shrink-0" />
                                  <span className="text-xs font-bold text-amber-700">PM 배정 대기중인 프로젝트</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <select
                                    className="flex-1 text-xs px-2 py-1.5 border rounded-lg bg-white"
                                    value={assignPmId}
                                    onChange={(e) => setAssignPmId(e.target.value)}
                                  >
                                    <option value="">PM 선택</option>
                                    {pms.filter(p => p.is_available).map(pm => (
                                      <option key={pm.id} value={pm.id}>{pm.name}</option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => acceptProject(selectedProjectId)}
                                    className="px-4 py-1.5 bg-brand-600 text-white text-xs font-bold rounded-lg hover:bg-brand-700 transition-colors"
                                  >
                                    프로젝트 수락
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div className="flex items-center gap-2 pt-2 border-t">
                              <span className="text-xs text-gray-500">단계:</span>
                              <select
                                className="flex-1 text-xs px-2 py-1.5 border rounded-lg bg-white"
                                value={selectedProject?.current_step || 7}
                                onChange={(e) => changeProjectStep(selectedProjectId, Number(e.target.value))}
                              >
                                {Object.entries(STEP_LABELS).map(([step, label]) => (
                                  <option key={step} value={step}>
                                    {step}. {label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        })()}
                      </div>
                      {selectedProjectId ? (
                        <>
                          <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[calc(100vh-350px)] bg-gray-50">
                            {projectMessages.length === 0 ? (
                              <div className="text-center py-12 text-gray-400">
                                <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                                <p className="text-sm">메시지가 없습니다</p>
                              </div>
                            ) : (
                              projectMessages.map(msg => (
                                <div
                                  key={msg.id}
                                  className={`flex ${msg.sender_type === 'PM' ? 'justify-end' : 'justify-start'}`}
                                >
                                  <div
                                    className={`max-w-[80%] rounded-xl px-4 py-2 ${
                                      msg.sender_type === 'PM'
                                        ? 'bg-brand-600 text-white'
                                        : msg.sender_type === 'USER'
                                          ? 'bg-white border shadow-sm'
                                          : 'bg-gray-200 text-gray-600'
                                    }`}
                                  >
                                    <p className={`text-xs font-bold mb-1 ${
                                      msg.sender_type === 'PM' ? 'text-white/70' : 'text-gray-400'
                                    }`}>
                                      {msg.sender_type === 'PM' ? 'PM' : msg.sender_type === 'USER' ? '고객' : '시스템'}
                                    </p>
                                    <p className="whitespace-pre-wrap text-sm">{msg.message}</p>
                                    <p className={`text-[10px] mt-1 ${
                                      msg.sender_type === 'PM' ? 'text-white/50' : 'text-gray-300'
                                    }`}>
                                      {new Date(msg.created_at).toLocaleString('ko-KR')}
                                    </p>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Admin 메시지 입력 */}
                          <div className="border-t p-4 bg-white">
                            <div className="flex gap-2 mb-2">
                              <button
                                onClick={() => setAdminMessageType('PM')}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                                  adminMessageType === 'PM'
                                    ? 'bg-brand-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                PM 대리 답장
                              </button>
                              <button
                                onClick={() => setAdminMessageType('SYSTEM')}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                                  adminMessageType === 'SYSTEM'
                                    ? 'bg-gray-700 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                시스템 메시지
                              </button>
                            </div>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder={adminMessageType === 'PM' ? 'PM으로 메시지 보내기...' : '시스템 공지 보내기...'}
                                className="flex-1 px-4 py-2 bg-gray-100 rounded-lg text-sm"
                                value={adminMessage}
                                onChange={(e) => setAdminMessage(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && sendAdminMessage()}
                              />
                              <Button
                                onClick={sendAdminMessage}
                                disabled={sendingMessage || !adminMessage.trim()}
                              >
                                {sendingMessage ? <RefreshCw className="animate-spin" size={18} /> : <Send size={18} />}
                              </Button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-400">
                          <div className="text-center">
                            <Briefcase size={48} className="mx-auto mb-4 opacity-50" />
                            <p>프로젝트를 선택하면 채팅 내용을 볼 수 있습니다</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* 파트너 추가/수정 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">{editingPartner ? '협력업체 수정' : '협력업체 추가'}</h2>
              <button onClick={() => { setShowAddModal(false); setEditingPartner(null); }} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">업체명 *</label>
                <input type="text" className="w-full px-4 py-2 border rounded-lg" value={partnerForm.name} onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">카테고리 *</label>
                  <select className="w-full px-4 py-2 border rounded-lg" value={partnerForm.category} onChange={(e) => setPartnerForm({ ...partnerForm, category: e.target.value, subcategory: '' })}>
                    <option value="">선택</option>
                    {PARTNER_CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">세부 카테고리</label>
                  <select className="w-full px-4 py-2 border rounded-lg" value={partnerForm.subcategory} onChange={(e) => setPartnerForm({ ...partnerForm, subcategory: e.target.value })} disabled={!partnerForm.category}>
                    <option value="">선택</option>
                    {PARTNER_CATEGORIES.find(c => c.id === partnerForm.category)?.subcategories.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">설명</label>
                <textarea className="w-full px-4 py-2 border rounded-lg resize-none h-20" value={partnerForm.description} onChange={(e) => setPartnerForm({ ...partnerForm, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">담당자명</label>
                  <input type="text" className="w-full px-4 py-2 border rounded-lg" value={partnerForm.contact_name} onChange={(e) => setPartnerForm({ ...partnerForm, contact_name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">연락처</label>
                  <input type="tel" className="w-full px-4 py-2 border rounded-lg" value={partnerForm.contact_phone} onChange={(e) => setPartnerForm({ ...partnerForm, contact_phone: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">이메일</label>
                  <input type="email" className="w-full px-4 py-2 border rounded-lg" value={partnerForm.contact_email} onChange={(e) => setPartnerForm({ ...partnerForm, contact_email: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">최소 가격</label>
                  <input type="number" className="w-full px-4 py-2 border rounded-lg" value={partnerForm.price_min} onChange={(e) => setPartnerForm({ ...partnerForm, price_min: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">최대 가격</label>
                  <input type="number" className="w-full px-4 py-2 border rounded-lg" value={partnerForm.price_max} onChange={(e) => setPartnerForm({ ...partnerForm, price_max: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">단위</label>
                  <select className="w-full px-4 py-2 border rounded-lg" value={partnerForm.price_unit} onChange={(e) => setPartnerForm({ ...partnerForm, price_unit: e.target.value })}>
                    <option value="만원">만원</option>
                    <option value="평당 만원">평당 만원</option>
                    <option value="월 만원">월 만원</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">수수료율 (%)</label>
                  <input type="number" className="w-full px-4 py-2 border rounded-lg" value={partnerForm.commission_rate} onChange={(e) => setPartnerForm({ ...partnerForm, commission_rate: Number(e.target.value) })} />
                </div>
              </div>
              {/* 위치 */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">업체 위치/주소</label>
                <input type="text" className="w-full px-4 py-2 border rounded-lg" placeholder="서울시 강남구 역삼동 123-45" value={partnerForm.address || ''} onChange={(e) => setPartnerForm({ ...partnerForm, address: e.target.value })} />
              </div>
              {/* 사장 코멘트 */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">사장님 코멘트 (고객에게 표시)</label>
                <textarea className="w-full px-4 py-2 border rounded-lg resize-none h-16" placeholder="창업 관련 전문 업체입니다. 성심성의껏 도와드리겠습니다." value={partnerForm.owner_comment || ''} onChange={(e) => setPartnerForm({ ...partnerForm, owner_comment: e.target.value })} />
              </div>
              {/* 관리자 메모 */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">관리자 메모 (내부용)</label>
                <textarea className="w-full px-4 py-2 border rounded-lg resize-none h-16 bg-yellow-50" placeholder="내부 참고용 메모..." value={partnerForm.admin_memo || ''} onChange={(e) => setPartnerForm({ ...partnerForm, admin_memo: e.target.value })} />
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setShowAddModal(false); setEditingPartner(null); }}>취소</Button>
              <Button onClick={savePartner}><Save size={18} className="mr-2" />{editingPartner ? '수정' : '추가'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* PM 추가/수정 모달 */}
      {showPMModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto m-4">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold">{editingPM ? 'PM 수정' : 'PM 추가'}</h2>
              <button onClick={() => { setShowPMModal(false); setEditingPM(null); setNewSpecialty(''); }} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* 프로필 사진 */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <img
                    src={pmForm.profile_image || '/favicon-new.png'}
                    alt="프로필"
                    className="w-24 h-24 rounded-full object-cover border-4 border-brand-100"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/favicon-new.png'; }}
                  />
                  <label className="absolute bottom-0 right-0 w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-brand-700 transition-colors">
                    <Image size={16} className="text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        // Show loading state
                        const loadingUrl = pmForm.profile_image;
                        setPMForm({ ...pmForm, profile_image: '' });

                        try {
                          const fileExt = file.name.split('.').pop();
                          const fileName = `pm_${Date.now()}.${fileExt}`;

                          // Try uploading to avatars bucket first, then profiles
                          let uploadError: any = null;
                          let bucketName = 'avatars';

                          const { error: avatarsError } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
                          if (avatarsError) {
                            bucketName = 'profiles';
                            const { error: profilesError } = await supabase.storage.from('profiles').upload(fileName, file, { upsert: true });
                            uploadError = profilesError;
                          }

                          if (uploadError) {
                            console.error('파일 업로드 실패:', uploadError);
                            alert(`이미지 업로드 실패: ${uploadError.message}\n\nSupabase Storage에 'avatars' 또는 'profiles' 버킷을 생성하고 Public 접근을 허용해주세요.`);
                            setPMForm({ ...pmForm, profile_image: loadingUrl });
                            return;
                          }

                          const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(fileName);
                          setPMForm({ ...pmForm, profile_image: urlData.publicUrl });
                          console.log('이미지 업로드 성공:', urlData.publicUrl);
                        } catch (err: any) {
                          console.error('업로드 오류:', err);
                          alert('이미지 업로드 중 오류가 발생했습니다.');
                          setPMForm({ ...pmForm, profile_image: loadingUrl });
                        }
                      }}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-2">클릭하여 사진 변경</p>
                {/* 직접 URL 입력 옵션 */}
                <div className="mt-3 w-full">
                  <input
                    type="text"
                    placeholder="또는 이미지 URL 직접 입력"
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                    value={pmForm.profile_image || ''}
                    onChange={(e) => setPMForm({ ...pmForm, profile_image: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">이름 *</label>
                <input type="text" className="w-full px-4 py-2 border rounded-lg" value={pmForm.name} onChange={(e) => setPMForm({ ...pmForm, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">이메일 * (PM 로그인 ID)</label>
                <input type="email" className="w-full px-4 py-2 border rounded-lg" value={pmForm.email} onChange={(e) => setPMForm({ ...pmForm, email: e.target.value })} placeholder="pm1@opening.run" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">연락처</label>
                <input type="tel" className="w-full px-4 py-2 border rounded-lg" value={pmForm.phone} onChange={(e) => setPMForm({ ...pmForm, phone: e.target.value })} />
              </div>

              {/* 프로필 소개 */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">프로필 소개 (PM 카드에 표시)</label>
                <textarea
                  className="w-full px-4 py-2 border rounded-lg resize-none h-20"
                  placeholder="강남구 전문 PM입니다. 카페/음식점 창업 경험 다수."
                  value={pmForm.introduction || ''}
                  onChange={(e) => setPMForm({ ...pmForm, introduction: e.target.value })}
                />
              </div>

              {/* 자동 인사 메시지 */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">자동 인사 메시지 (프로젝트 배정 시 첫 메시지)</label>
                <textarea
                  className="w-full px-4 py-2 border rounded-lg resize-none h-24"
                  placeholder="안녕하세요! 담당 매니저입니다. 창업 준비를 함께 도와드리겠습니다."
                  value={pmForm.greeting_message || ''}
                  onChange={(e) => setPMForm({ ...pmForm, greeting_message: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">고객에게 매니저 배정 시 자동으로 전송되는 첫 인사 메시지입니다.</p>
              </div>

              {/* 태그/전문분야 */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">전문분야 태그</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(pmForm.specialties || []).map((tag, idx) => (
                    <span key={idx} className="px-3 py-1 bg-brand-50 text-brand-700 text-sm rounded-full flex items-center gap-1">
                      {tag}
                      <button
                        onClick={() => setPMForm({ ...pmForm, specialties: pmForm.specialties?.filter((_, i) => i !== idx) })}
                        className="hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 px-4 py-2 border rounded-lg"
                    placeholder="태그 입력 (예: 카페, 음식점, 인테리어)"
                    value={newSpecialty}
                    onChange={(e) => setNewSpecialty(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newSpecialty.trim()) {
                        e.preventDefault();
                        setPMForm({ ...pmForm, specialties: [...(pmForm.specialties || []), newSpecialty.trim()] });
                        setNewSpecialty('');
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (newSpecialty.trim()) {
                        setPMForm({ ...pmForm, specialties: [...(pmForm.specialties || []), newSpecialty.trim()] });
                        setNewSpecialty('');
                      }
                    }}
                  >
                    추가
                  </Button>
                </div>
                <p className="text-xs text-gray-400 mt-1">Enter 또는 추가 버튼으로 태그 추가</p>
              </div>

              {/* 완료 프로젝트 수 */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">완료 프로젝트 수</label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border rounded-lg"
                  value={pmForm.completed_projects || 0}
                  onChange={(e) => setPMForm({ ...pmForm, completed_projects: Number(e.target.value) })}
                  min={0}
                />
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="pm-active" checked={pmForm.is_available ?? true} onChange={(e) => setPMForm({ ...pmForm, is_available: e.target.checked })} />
                <label htmlFor="pm-active" className="text-sm font-medium">활성화 (매칭 가능)</label>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setShowPMModal(false); setEditingPM(null); setNewSpecialty(''); }}>취소</Button>
              <Button onClick={savePM}><Save size={18} className="mr-2" />{editingPM ? '수정' : '추가'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* 모바일 하단 탭 네비게이션 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-50 pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around py-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'projects') setNewProjectAlert(false);
                }}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg min-w-[60px] relative ${
                  activeTab === tab.id
                    ? 'text-brand-600'
                    : 'text-gray-400'
                }`}
              >
                <Icon size={20} />
                <span className="text-xs font-medium">{tab.label}</span>
                {tab.id === 'projects' && newProjectAlert && (
                  <span className="absolute top-0 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
