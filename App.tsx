import React, { useState, useEffect } from 'react';
import { 
  AppStep, 
  MainTab,
  Package, 
  ConsultingBooking,
  RoomDimensions,
  PlacedItem,
  Quote,
  User
} from './types';
import { 
  LOGISTICS_BASE_COST,
  INSTALLATION_BASE_COST
} from './constants';
import { supabase } from './utils/supabaseClient';
import { fetchConsultings, createConsulting, fetchQuotes, createQuote, uploadConsultingFile } from './utils/api'; 
import { Planner2D } from './components/Planner2D';
import { ConsultingModule } from './components/ConsultingModule';
import { validateLayout } from './utils/plannerUtils';
import { BottomNav } from './components/BottomNav';
import { Sidebar } from './components/Sidebar';
import { HomeView } from './components/HomeView';
import { MyConsultationsView } from './components/MyConsultationsView';
import { QuoteView } from './components/QuoteView';
import { MoreView } from './components/MoreView';
import { ListingsView } from './components/ListingsView';
import { FAQView } from './components/FAQView';
import { FurnitureMarketView } from './components/FurnitureMarketView';
import { ChecklistView } from './components/ChecklistView';
import { VendorListView } from './components/VendorListView';
import { SupportProgramsView } from './components/SupportProgramsView';
import { GangnamDistrictsView } from './components/GangnamDistrictsView';
import { OnboardingWizard } from './components/OnboardingWizard';
import { ProjectDashboard } from './components/ProjectDashboard';
import { ServiceJourneyView } from './components/ServiceJourneyView';
import { Button, Input } from './components/Components';
import { LoginView } from './components/LoginView';
import { AdminView } from './components/AdminView';
import { PMPortalView } from './components/PMPortalView';
import { ArrowLeft, Grid, DoorOpen, X, Loader2, Plus } from 'lucide-react';

// [수정] 기본 관리자 계정 정보 제거 (Auth Flow 도입)
const ADMIN_USER: User = {
  id: 'guest-user',
  name: '게스트',
  phone: '', 
  type: 'PHONE',
  joinedDate: new Date().toLocaleDateString()
};

function App() {
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPM, setIsPM] = useState(false);
  const [pmId, setPmId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isGuestMode, setIsGuestMode] = useState(false);

  const [currentTab, setCurrentTab] = useState<MainTab>('HOME');
  const [appMode, setAppMode] = useState<AppStep>('TAB_VIEW');

  // 프로젝트 관련 상태
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasActiveProject, setHasActiveProject] = useState(false); 

  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [consultingBookings, setConsultingBookings] = useState<ConsultingBooking[]>([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [savedQuotes, setSavedQuotes] = useState<Quote[]>([]); 
  
  const [room, setRoom] = useState<RoomDimensions>({
    width: 500, depth: 400, height: 250, doorX: 200, doorWidth: 90
  });
  const [placedItems, setPlacedItems] = useState<PlacedItem[]>([]);

  // Initial Auth Check
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      handleSession(session);
      setIsAuthChecking(false);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSession = (session: any) => {
    if (session?.user) {
      const email = session.user.email || '';
      // 관리자 체크 (admin 계정)
      if (email === 'admin@opening.run' || email === 'admin') {
        setIsAdmin(true);
      }
      setUser({
        id: session.user.id,
        name: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || '사장님',
        phone: session.user.email || '',
        type: 'KAKAO',
        joinedDate: new Date(session.user.created_at).toLocaleDateString()
      });
      setIsAuthenticated(true);
      loadUserData();
    } else {
      // Session expired or logged out
      setUser(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
    }
  };

  const loadUserData = async () => {
    try {
      const [consultings, quotes] = await Promise.all([
        fetchConsultings(),
        fetchQuotes()
      ]);
      setConsultingBookings(consultings);
      setSavedQuotes(quotes);

      // 활성 프로젝트 확인
      const { data: projects } = await supabase
        .from('startup_projects')
        .select('id, status')
        .in('status', ['DRAFT', 'PM_ASSIGNED', 'IN_PROGRESS'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (projects && projects.length > 0) {
        setActiveProjectId(projects[0].id);
        setHasActiveProject(true);
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const handleLogout = async () => {
      await supabase.auth.signOut();
      setUser(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
      setIsPM(false);
      setPmId(null);
      setIsGuestMode(false);
      setCurrentTab('HOME');
  };

  // 관리자/PM 로그인 핸들러
  const handleAdminLogin = async (email: string, password: string): Promise<boolean> => {
    // Admin 로그인 체크 (admin / epdlfflalf1!)
    if (email === 'admin' && password === 'epdlfflalf1!') {
      setIsAdmin(true);
      setIsAuthenticated(true);
      setUser({
        id: 'admin',
        name: '관리자',
        phone: '',
        type: 'KAKAO',
        joinedDate: new Date().toLocaleDateString()
      });
      return true;
    }

    // PM 로그인 체크 (pm이메일 / pm1234!)
    if (password === 'pm1234!') {
      const { data: pmData } = await supabase
        .from('project_managers')
        .select('*')
        .eq('email', email)
        .single();

      if (pmData) {
        setIsPM(true);
        setPmId(pmData.id);
        setIsAuthenticated(true);
        setUser({
          id: pmData.id,
          name: pmData.name + ' PM',
          phone: pmData.phone || '',
          type: 'KAKAO',
          joinedDate: new Date().toLocaleDateString()
        });
        return true;
      }
    }

    return false;
  };

  const handleGuestLogin = () => {
      // 게스트 모드 활성화 - DB와 완전히 격리됨
      setIsGuestMode(true);
      setUser({
        ...ADMIN_USER,
        id: `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` // 고유 세션 ID
      });
      setIsAuthenticated(true);
      // 게스트는 빈 상태로 시작 (다른 사람의 데이터 보이지 않음)
      setConsultingBookings([]);
      setSavedQuotes([]);
      setActiveProjectId(null);
      setHasActiveProject(false);
  };

  // 온보딩 완료 핸들러
  const handleOnboardingComplete = (projectId: string) => {
    setActiveProjectId(projectId);
    setHasActiveProject(true);
    setShowOnboarding(false);
    setCurrentTab('PROJECT');
  };

  // 새 프로젝트 시작
  const handleStartNewProject = () => {
    setCurrentTab('PROJECT');
  };

  // --- Actions ---

  const startPlannerFlow = (pkg: Package) => {
    setSelectedPackage(pkg);
    const initialItems: PlacedItem[] = pkg.items.map((item, idx) => ({
      ...item,
      instanceId: `${item.id}_${idx}_${Date.now()}`,
      x: 10 + (idx * 20) % 200,
      y: 10 + (Math.floor(idx / 10) * 50),
      rotation: 0,
      isCollision: false,
      isWallViolation: false,
      warnings: []
    }));
    setPlacedItems(initialItems);
    setAppMode('SPACE_INPUT');
  };

  const startConsultingFlow = (pkg?: Package) => {
    if (pkg) {
        setSelectedPackage(pkg);
    } else {
        setSelectedPackage(null); 
    }
    setAppMode('CONSULTING_WIZARD');
  };

  const handleConsultingComplete = async (booking: ConsultingBooking) => {
    try {
      const newBooking = await createConsulting(booking);
      
      // [Added] File Upload Logic
      if (booking.rawFiles && booking.rawFiles.length > 0) {
         try {
             await Promise.all(booking.rawFiles.map(file => uploadConsultingFile(newBooking.id, file)));
         } catch (uploadError) {
             console.error("파일 업로드 실패:", uploadError);
             alert("상담 신청은 완료되었으나, 일부 파일 업로드에 실패했습니다.");
         }
      }

      const updatedList = await fetchConsultings();
      setConsultingBookings(updatedList);
      setAppMode('TAB_VIEW');
      setCurrentTab('CONSULTING'); 
      alert("상담 신청이 성공적으로 접수되었습니다.");
    } catch (error) {
      console.error("상담 저장 실패:", error);
      alert("저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }
  };

  const handleSpaceSubmit = () => {
     if (room.width < 200 || room.depth < 200) {
      alert("공간이 너무 작습니다.");
      return;
    }
    setPlacedItems(prev => validateLayout(prev, room));
    setAppMode('PLANNER');
  };

  const handlePlannerNext = () => {
    if (selectedPackage) {
      const itemsCost = selectedPackage.totalPrice; 
      const itemCount = placedItems.length;

      // [수정] 동적 견적 로직 적용
      // 1. 물류비: 기본 + (5개 초과 시 개당 1만원)
      const logisticsCost = LOGISTICS_BASE_COST + (itemCount > 5 ? (itemCount - 5) * 10000 : 0);
      
      // 2. 설치비: 기본 + (물품 가액의 3%)
      const installationCost = INSTALLATION_BASE_COST + Math.floor(itemsCost * 0.03);
      
      const optionsCost = 0; 
      const discountAmount = 0;
      
      const subTotal = itemsCost + logisticsCost + installationCost + optionsCost - discountAmount;
      const vat = subTotal * 0.1;
      const total = subTotal + vat;
      
      const today = new Date();
      const validUntil = new Date(today);
      validUntil.setDate(today.getDate() + 7); 

      const newQuote: Quote = {
        id: `QT-${Date.now().toString().slice(-6)}`,
        packageId: selectedPackage.id,
        packageName: selectedPackage.name,
        
        itemsCost,
        logisticsCost,
        installationCost,
        optionsCost,
        discountAmount,
        vat,
        totalCost: total,
        deposit: total * 0.1,
        
        date: today.toLocaleDateString(),
        validUntil: validUntil.toLocaleDateString(),
        status: 'DRAFT',
        version: 1,

        scope: [
            { category: '기본 제공', items: ['선택 패키지 가구/집기 일체', '전문 물류 배송 (1톤 트럭)', '현장 설치 및 배치', '설치 후 기본 청소'], isIncluded: true },
            { category: '고객 부담(미포함)', items: ['엘리베이터 사용료', '전기 증설 공사', '기존 집기 철거/폐기', '사다리차 비용'], isIncluded: false }
        ],
        timeline: [
            { stage: '계약 확정', duration: '즉시', description: '예약금 입금 확인', status: 'PENDING' },
            { stage: '물류 배차', duration: 'D+2', description: '차량 및 설치팀 배정', status: 'PENDING' },
            { stage: '현장 설치', duration: 'D+5', description: '반입 및 조립 설치', status: 'PENDING' },
            { stage: '검수/인수', duration: 'D+5', description: '최종 확인 및 잔금 결제', status: 'PENDING' }
        ],
        requirements: [
            '설치 공간 비워두기',
            '엘리베이터 사용 승인 (관리실)',
            '주차 공간 확보 (1대)',
            '전기 콘센트 위치 확인'
        ],
        
        grade: selectedPackage.grade || 'A',
        warrantyPeriod: selectedPackage.warranty || '14일',
        
        has3D: selectedPackage.has3D,
        is3DLinkSent: false,
        consultingIncluded: false,

        layoutData: {
            room: room,           
            placedItems: placedItems 
        }
      };
      
      setQuote(newQuote);
      setAppMode('QUOTE_GEN');
    }
  };

  const handleSaveQuote = async () => {
      if(quote) {
          try {
              await createQuote(quote);
              const updatedQuotes = await fetchQuotes();
              setSavedQuotes(updatedQuotes);
              
              alert("견적이 안전하게 저장되었습니다.");
              setAppMode('TAB_VIEW');
              setCurrentTab('QUOTE');
          } catch (error) {
              console.error("견적 저장 실패:", error);
              // [수정] 에러 메시지 상세화
              alert("견적 저장에 실패했습니다. (DB 권한 오류일 수 있습니다)");
          }
      }
  }

  const handleLoadQuote = (loadedQuote: Quote) => {
    if (!loadedQuote.layoutData) {
        alert("이 견적에는 저장된 배치 정보가 없습니다.");
        return;
    }

    setRoom(loadedQuote.layoutData.room);
    setPlacedItems(loadedQuote.layoutData.placedItems);
    setQuote(loadedQuote); 
    setAppMode('PLANNER');
  };

  // 1. Loading State
  if (isAuthChecking) {
    return (
      <div className="fixed inset-0 z-[100] bg-brand-50 flex flex-col items-center justify-center text-brand-600 transition-opacity duration-500">
        <div className="flex flex-col items-center gap-4 animate-scale-in">
           <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-xl shadow-brand-100 mb-4 animate-bounce">
              <DoorOpen size={48} strokeWidth={2.5} />
           </div>
           <Loader2 className="animate-spin text-brand-400" size={32} />
        </div>
      </div>
    );
  }

  // 2. Unauthenticated State (Login View)
  if (!isAuthenticated) {
      return <LoginView onLoginSuccess={handleGuestLogin} onAdminLogin={handleAdminLogin} />;
  }

  // 3. Admin View
  if (isAdmin) {
      return <AdminView onLogout={handleLogout} />;
  }

  // 4. PM Portal View
  if (isPM && pmId) {
      return <PMPortalView pmId={pmId} onLogout={handleLogout} />;
  }

  const ModalWrapper: React.FC<{ children: React.ReactNode, title: string, onClose: () => void, maxWidth?: string }> = ({ children, title, onClose, maxWidth = 'max-w-xl' }) => (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center animate-fade-in">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
        <div className={`relative bg-white w-full ${maxWidth} h-[95vh] md:h-auto md:max-h-[85vh] md:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden flex flex-col transition-transform duration-300 transform translate-y-0 animate-slide-up`}>
             <div className="h-14 border-b flex items-center justify-between px-4 bg-white shrink-0">
                  <div className="flex items-center gap-3">
                      <button onClick={onClose} className="md:hidden"><ArrowLeft /></button>
                      <h2 className="font-bold text-lg">{title}</h2>
                  </div>
                  <button onClick={onClose} className="hidden md:block p-1 hover:bg-gray-100 rounded-full transition-colors">
                      <X size={24} className="text-gray-500" />
                  </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {children}
              </div>
        </div>
    </div>
  );

  const renderWizardContent = () => {
    switch (appMode) {
      case 'CONSULTING_WIZARD':
        return (
          <ModalWrapper title="오픈 상담 신청" onClose={() => setAppMode('TAB_VIEW')} maxWidth="max-w-2xl">
             <div className="p-4 md:p-8">
                 <ConsultingModule 
                    onComplete={handleConsultingComplete}
                    onCancel={() => setAppMode('TAB_VIEW')}
                    preSelectedPackageId={selectedPackage?.id}
                />
             </div>
          </ModalWrapper>
        );
      
      case 'SPACE_INPUT':
        return (
           <ModalWrapper title="공간 입력" onClose={() => setAppMode('TAB_VIEW')} maxWidth="max-w-lg">
              <div className="p-6 w-full">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                        <Grid size={32} />
                    </div>
                    <p className="text-slate-500 font-medium">실측 사이즈를 입력하면 3D 도면이 생성됩니다.</p>
                  </div>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                         <Input label="가로 (cm)" type="number" value={room.width} onChange={e => setRoom({...room, width: Number(e.target.value)})} />
                         <Input label="세로 (cm)" type="number" value={room.depth} onChange={e => setRoom({...room, depth: Number(e.target.value)})} />
                    </div>
                    <Input label="천장 높이 (cm)" type="number" value={room.height} onChange={e => setRoom({...room, height: Number(e.target.value)})} />
                    <Button fullWidth size="lg" onClick={handleSpaceSubmit}>3D 배치 시작</Button>
                  </div>
              </div>
           </ModalWrapper>
        );

      case 'PLANNER':
         return (
             <div className="fixed inset-0 bg-slate-100 z-50 flex flex-col md:p-6 md:bg-black/80 md:backdrop-blur-sm animate-fade-in">
                 <div className="bg-white flex-1 flex flex-col md:rounded-2xl md:shadow-2xl overflow-hidden relative">
                     <div className="bg-white h-14 border-b flex items-center justify-between px-4 shrink-0">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setAppMode('SPACE_INPUT')} className="md:hidden"><ArrowLeft /></button>
                            <button onClick={() => setAppMode('SPACE_INPUT')} className="hidden md:flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium">
                                <ArrowLeft size={20} /> 치수 재설정
                            </button>
                            <span className="font-bold hidden md:block text-slate-300">|</span>
                            <span className="font-bold text-lg">3D 배치 검증</span>
                        </div>
                        <div className="flex gap-2">
                             <Button size="sm" onClick={handlePlannerNext}>견적 생성</Button>
                             <button onClick={() => setAppMode('TAB_VIEW')} className="hidden md:block p-2 text-gray-400 hover:text-gray-600">
                                <X />
                             </button>
                        </div>
                     </div>
                     <div className="flex-1 overflow-hidden p-0 md:p-4 bg-slate-50">
                         <Planner2D items={placedItems} room={room} onUpdateItems={setPlacedItems} />
                     </div>
                 </div>
             </div>
         );

      case 'QUOTE_GEN':
          return (
             <ModalWrapper title="최종 견적서" onClose={() => setAppMode('PLANNER')} maxWidth="max-w-2xl">
                 <div className="p-4 md:p-8 max-w-2xl mx-auto w-full">
                     <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                         <div className="flex justify-between items-start mb-6 border-b pb-4">
                             <div>
                                 <h1 className="text-2xl font-bold mb-1">견적서</h1>
                                 <p className="text-sm text-gray-500">No. {quote?.id}</p>
                             </div>
                             <div className="text-right">
                                 <div className="font-bold text-brand-600">오프닝 공식 인증</div>
                                 <div className="text-xs text-gray-400">{quote?.date}</div>
                             </div>
                         </div>
                         
                         <div className="space-y-3 mb-6">
                             <div className="flex justify-between text-gray-600"><span>물품 합계 (가구/기기)</span><span>{quote?.itemsCost.toLocaleString()}원</span></div>
                             <div className="flex justify-between text-gray-600"><span>전문 물류/배송</span><span>{quote?.logisticsCost.toLocaleString()}원</span></div>
                             <div className="flex justify-between text-gray-600"><span>현장 설치비</span><span>{quote?.installationCost.toLocaleString()}원</span></div>
                             <div className="flex justify-between text-gray-600"><span>부가세 (VAT)</span><span>{quote?.vat.toLocaleString()}원</span></div>
                             <div className="flex justify-between text-xl font-bold pt-4 border-t border-gray-900 mt-4"><span>총 합계</span><span className="text-brand-700">{quote?.totalCost.toLocaleString()}원</span></div>
                         </div>
                         
                         <div className="bg-brand-50 p-4 rounded-lg mb-6 text-sm text-brand-800">
                             <p className="font-bold mb-1">💡 예약금 10% ({quote?.deposit.toLocaleString()}원) 결제 시 일정 확정</p>
                             <p className="opacity-80">잔금은 설치 완료 후 현장에서 결제 가능합니다.</p>
                         </div>

                         <div className="flex gap-3">
                             <Button variant="outline" fullWidth onClick={() => setAppMode('PLANNER')}>수정하기</Button>
                             <Button fullWidth onClick={handleSaveQuote}>견적 저장하기</Button>
                         </div>
                     </div>
                 </div>
             </ModalWrapper>
          );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-row overflow-hidden">
      
      <Sidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        className="hidden md:flex"
        hasActiveProject={hasActiveProject}
        onStartNewProject={handleStartNewProject}
        onLogout={handleLogout}
      />

      <main className="flex-1 w-full relative h-screen overflow-y-auto no-scrollbar scroll-smooth">
        <div className="w-full mx-auto bg-white min-h-screen shadow-none md:max-w-none md:bg-white pb-20 md:pb-0">
            
            {currentTab === 'HOME' && (
            <HomeView
                onPackageSelect={startPlannerFlow}
                onConsultingClick={startConsultingFlow}
                consultingBookings={consultingBookings}
                onNavigateToConsulting={() => setCurrentTab('CONSULTING')}
                hasActiveProject={hasActiveProject}
                onStartNewProject={handleStartNewProject}
                onNavigateToProject={() => setCurrentTab('PROJECT')}
            />
            )}

            {currentTab === 'CONSULTING' && (
                <MyConsultationsView 
                    bookings={consultingBookings}
                    onBookConsulting={() => startConsultingFlow()}
                />
            )}

            {currentTab === 'LISTINGS' && (
                <ListingsView
                    onPackageSelect={startPlannerFlow}
                    onConsultingClick={startConsultingFlow}
                />
            )}

            {currentTab === 'FURNITURE' && (
                <FurnitureMarketView />
            )}

            {currentTab === 'QUOTE' && (
                <QuoteView 
                    quotes={savedQuotes}
                    onConsultingClick={() => startConsultingFlow()}
                    onLoadQuote={handleLoadQuote}
                />
            )}

            {currentTab === 'FAQ' && (
                <FAQView />
            )}

            {currentTab === 'MORE' && (
                <MoreView
                    user={user}
                    onLogin={() => { /* Handled at app level now */ }}
                    onLogout={handleLogout}
                    consultingCount={consultingBookings.filter(b => b.status === 'IN_PROGRESS').length}
                    quoteCount={savedQuotes.length}
                    onNavigate={setCurrentTab}
                    hasActiveProject={hasActiveProject}
                    onStartNewProject={handleStartNewProject}
                />
            )}

            {currentTab === 'CHECKLIST' && (
                <ChecklistView />
            )}

            {currentTab === 'VENDORS' && (
                <VendorListView />
            )}

            {currentTab === 'SUPPORT' && (
                <SupportProgramsView />
            )}

            {currentTab === 'DISTRICTS' && (
                <GangnamDistrictsView />
            )}

            {currentTab === 'PROJECT' && (
                <ServiceJourneyView
                    onBack={() => setCurrentTab('HOME')}
                    isGuestMode={isGuestMode}
                />
            )}
        </div>
      </main>

      <div className="md:hidden">
          <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} hasActiveProject={hasActiveProject} />
      </div>

      {appMode !== 'TAB_VIEW' && renderWizardContent()}


    </div>
  );
}

export default App;
