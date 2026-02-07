import React, { useState, useEffect } from 'react';
import { MainTab, User } from './types';
import { supabase } from './utils/supabaseClient';
import { BottomNav } from './components/BottomNav';
import { LandingView } from './components/LandingView';
import { DashboardView } from './components/DashboardView';
import { ServiceJourneyView } from './components/ServiceJourneyView';
import { MyConsultationsView } from './components/MyConsultationsView';
import { MoreView } from './components/MoreView';
import { MyPageView } from './components/MyPageView';
import { AdminView } from './components/AdminView';
import { PMPortalView } from './components/PMPortalView';
import { LoginView } from './components/LoginView';
import { fetchConsultings } from './utils/api';
import { DoorOpen, Loader2 } from 'lucide-react';

function App() {
  // 화면 상태
  const [showLanding, setShowLanding] = useState(true);
  const [showLogin, setShowLogin] = useState(false);

  // Auth 상태
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPM, setIsPM] = useState(false);
  const [pmId, setPmId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // 탭 상태
  const [currentTab, setCurrentTab] = useState<MainTab>('HOME');

  // 프로젝트 상태
  const [hasActiveProject, setHasActiveProject] = useState(false);
  const [consultingBookings, setConsultingBookings] = useState<any[]>([]);

  // Auth 체크
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        handleSession(session);
        // 이미 로그인된 사용자는 랜딩 스킵
        setShowLanding(false);
      }
      setIsAuthChecking(false);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        handleSession(session);
        setShowLanding(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSession = (session: any) => {
    if (session?.user) {
      const email = session.user.email || '';
      if (email === 'admin@opening.run') {
        setIsAdmin(true);
      }
      setUser({
        id: session.user.id,
        name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '사장님',
        phone: session.user.email || '',
        type: 'KAKAO',
        joinedDate: new Date(session.user.created_at).toLocaleDateString()
      });
      setIsAuthenticated(true);
      loadUserData();
    }
  };

  // localStorage에 저장된 대기 프로젝트 생성
  const createProjectFromPending = async () => {
    const pendingStr = localStorage.getItem('pending_project_data');
    if (!pendingStr) return false;

    // 현재 로그인된 유저 ID 가져오기
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return false;

    try {
      const data = JSON.parse(pendingStr);
      const { data: newProject } = await supabase
        .from('startup_projects')
        .insert([{
          user_id: authUser.id,
          business_category: data.businessCategory,
          location_city: '서울시',
          location_district: '강남구',
          location_dong: data.dong,
          store_size: data.storeSize,
          estimated_total: data.estimatedTotal,
          current_step: 6,
          status: 'PENDING_PM',
          checklist_data: data.checklistData
        }])
        .select()
        .single();

      if (!newProject) {
        // insert 실패 — localStorage 유지해서 재시도 가능하게
        return false;
      }

      if (data.systemMessage) {
        await supabase.from('project_messages').insert({
          project_id: newProject.id,
          sender_type: 'SYSTEM',
          message: data.systemMessage
        });
      }
      if (data.pmMessage) {
        await supabase.from('project_messages').insert({
          project_id: newProject.id,
          sender_type: 'USER',
          message: data.pmMessage
        });
      }
      localStorage.removeItem('pending_project_data');
      return true;
    } catch (err) {
      console.error('Failed to create pending project:', err);
      return false;
    }
  };

  const loadUserData = async () => {
    try {
      const consultings = await fetchConsultings();
      setConsultingBookings(consultings);

      // 현재 유저의 프로젝트만 조회
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const { data: projects } = await supabase
        .from('startup_projects')
        .select('id, status')
        .eq('user_id', authUser?.id)
        .in('status', ['PENDING_PM', 'PM_ASSIGNED', 'IN_PROGRESS'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (projects && projects.length > 0) {
        setHasActiveProject(true);
      } else {
        // 기존 프로젝트 없으면 → localStorage에서 대기 프로젝트 생성
        const created = await createProjectFromPending();
        if (created) {
          setHasActiveProject(true);
        }
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('pending_project_data');
    localStorage.removeItem('push_banner_dismissed');
    sessionStorage.clear();
    setUser(null);
    setIsAuthenticated(false);
    setIsAdmin(false);
    setIsPM(false);
    setPmId(null);
    setHasActiveProject(false);
    setConsultingBookings([]);
    setCurrentTab('HOME');
    setShowLanding(true);
  };

  // 랜딩에서 "창업비용 확인하기" 클릭 → 게스트로 바로 진입
  const handleStartFromLanding = () => {
    setUser({ id: `guest-${Date.now()}`, name: '사장님', phone: '', type: 'PHONE', joinedDate: new Date().toLocaleDateString() });
    setShowLanding(false);
  };

  // PM 배정받기 클릭 (게스트) → 로그인 페이지로 이동
  const handleLoginRequired = () => {
    setShowLogin(true);
  };

  // Admin/PM 로그인 (숨김 기능)
  const handleAdminLogin = async (email: string, password: string): Promise<boolean> => {
    if (email === 'admin' && password === 'epdlfflalf1!') {
      setIsAdmin(true);
      setIsAuthenticated(true);
      setUser({ id: 'admin', name: '관리자', phone: '', type: 'KAKAO', joinedDate: new Date().toLocaleDateString() });
      setShowLanding(false);
      setShowLogin(false);
      return true;
    }
    if (password === 'pm1234!') {
      const { data: pmData } = await supabase
        .from('project_managers')
        .select('id, name, phone')
        .eq('email', email)
        .single();
      if (pmData) {
        setIsPM(true);
        setPmId(pmData.id);
        setIsAuthenticated(true);
        setUser({ id: pmData.id, name: pmData.name + ' PM', phone: pmData.phone || '', type: 'KAKAO', joinedDate: new Date().toLocaleDateString() });
        setShowLanding(false);
        setShowLogin(false);
        return true;
      }
    }
    return false;
  };

  // === 렌더링 ===

  // 1. 로딩
  if (isAuthChecking) {
    return (
      <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center text-brand-600">
        <div className="flex flex-col items-center gap-4 animate-scale-in">
          <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center shadow-lg mb-2">
            <DoorOpen size={36} strokeWidth={2.5} />
          </div>
          <Loader2 className="animate-spin text-brand-400" size={28} />
        </div>
      </div>
    );
  }

  // 2. 로그인 화면 (내 프로젝트 보기 → 로그인)
  if (showLogin) {
    return (
      <LoginView
        onLoginSuccess={() => {
          setShowLogin(false);
          setShowLanding(false);
        }}
        onGuestBrowse={() => {
          // 게스트 둘러보기 → 대시보드 바로 진입
          setUser({ id: `guest-${Date.now()}`, name: '사장님', phone: '', type: 'PHONE', joinedDate: new Date().toLocaleDateString() });
          setHasActiveProject(true);
          setShowLogin(false);
          setShowLanding(false);
        }}
        onAdminLogin={handleAdminLogin}
        onBack={() => {
          setShowLogin(false);
          setShowLanding(true);
        }}
      />
    );
  }

  // 3. 랜딩 페이지 (첫 화면 - 로그인 페이지 아님!)
  if (showLanding) {
    return (
      <LandingView
        onStart={handleStartFromLanding}
        onGoToLogin={() => { setShowLogin(true); setShowLanding(false); }}
        onAdminLogin={handleAdminLogin}
      />
    );
  }

  // 3. Admin
  if (isAdmin) {
    return <AdminView onLogout={handleLogout} />;
  }

  // 4. PM
  if (isPM && pmId) {
    return <PMPortalView pmId={pmId} onLogout={handleLogout} />;
  }

  // 5. 일반 사용자: 프로젝트 없으면 ServiceJourney, 있으면 Dashboard
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col max-w-lg mx-auto relative">
      <main className="flex-1 w-full overflow-y-auto no-scrollbar scroll-smooth pb-20">
        {currentTab === 'HOME' && (
          hasActiveProject ? (
            <DashboardView
              onNavigateToProject={() => setCurrentTab('PROJECT')}
              isGuestMode={!isAuthenticated}
              onLoginRequired={handleLoginRequired}
            />
          ) : (
            <ServiceJourneyView
              onBack={() => setShowLanding(true)}
              isGuestMode={!isAuthenticated}
              onProjectCreated={() => setHasActiveProject(true)}
              onLoginRequired={handleLoginRequired}
            />
          )
        )}

        {currentTab === 'PROJECT' && (
          <ServiceJourneyView
            onBack={() => { setCurrentTab('HOME'); setShowLanding(true); }}
            isGuestMode={!isAuthenticated}
            onProjectCreated={() => setHasActiveProject(true)}
            onLoginRequired={handleLoginRequired}
          />
        )}

        {currentTab === 'CONSULTING' && (
          <MyConsultationsView
            bookings={consultingBookings}
            onBookConsulting={() => {}}
          />
        )}

        {currentTab === 'MORE' && (
          <MoreView
            user={user}
            onLogin={() => {}}
            onLogout={handleLogout}
            consultingCount={consultingBookings.filter((b: any) => b.status === 'IN_PROGRESS').length}
            quoteCount={0}
            onNavigate={setCurrentTab as any}
            hasActiveProject={hasActiveProject}
            onStartNewProject={() => setCurrentTab('PROJECT')}
          />
        )}

        {currentTab === 'MYPAGE' && (
          <MyPageView
            user={user}
            onLogout={handleLogout}
            consultingCount={consultingBookings.filter((b: any) => b.status === 'IN_PROGRESS').length}
            quoteCount={0}
          />
        )}
      </main>

      <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />
    </div>
  );
}

export default App;
