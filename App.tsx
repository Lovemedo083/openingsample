import React, { useState } from 'react';
import {
  AppStep,
  MainTab,
  Package,
  ConsultingBooking,
  RoomDimensions,
  PlacedItem,
  Quote
} from './types';
import { createConsulting, createQuote, uploadConsultingFile, fetchConsultings, fetchQuotes } from './utils/api';
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
import { Button, Input } from './components/Components';
import { LoginView } from './components/LoginView';
import { ArrowLeft, Grid, DoorOpen, X, Loader2 } from 'lucide-react';

//--------------------------   로직 분리   --------------------------/// 
// ModalWrapper   : UI 모달 분리 
// calculateQuote : 견적 계산 로직 분리 
// useAppAuth     : 인증 상태 관리, 로그인/로그아웃, 초기 데이터 로딩 로직 분리 
//-----------------------------------------------------------------/// 
import { ModalWrapper } from './components/ModalWrapper';
import { calculateQuote } from './utils/quoteUtils';
import { useAppAuth } from './hooks/useAppAuth';

function App() {
  // 1. Auth & Data Hook
  const {
    user,
    isAuthenticated,
    isAuthChecking,
    consultingBookings,
    savedQuotes,
    setConsultingBookings,
    setSavedQuotes,
    handleLogout,
    handleGuestLogin
  } = useAppAuth();

  const [currentTab, setCurrentTab] = useState<MainTab>('HOME');
  const [appMode, setAppMode] = useState<AppStep>('TAB_VIEW');

  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);

  const [room, setRoom] = useState<RoomDimensions>({
    width: 500, depth: 400, height: 250, doorX: 200, doorWidth: 90
  });
  const [placedItems, setPlacedItems] = useState<PlacedItem[]>([]);

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
      // [Refactored] Use utility function
      const newQuote = calculateQuote(selectedPackage, placedItems, room);
      setQuote(newQuote);
      setAppMode('QUOTE_GEN');
    }
  };

  const handleSaveQuote = async () => {
    if (quote) {
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
    return <LoginView onLoginSuccess={handleGuestLogin} />;
  }

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
                  <Input label="가로 (cm)" type="number" value={room.width} onChange={e => setRoom({ ...room, width: Number(e.target.value) })} />
                  <Input label="세로 (cm)" type="number" value={room.depth} onChange={e => setRoom({ ...room, depth: Number(e.target.value) })} />
                </div>
                <Input label="천장 높이 (cm)" type="number" value={room.height} onChange={e => setRoom({ ...room, height: Number(e.target.value) })} />
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

      <Sidebar currentTab={currentTab} onTabChange={setCurrentTab} className="hidden md:flex" />

      <main className="flex-1 w-full relative h-screen overflow-y-auto no-scrollbar scroll-smooth">
        <div className="w-full mx-auto bg-white min-h-screen shadow-none md:max-w-none md:bg-white pb-20 md:pb-0">

          {currentTab === 'HOME' && (
            <HomeView
              onPackageSelect={startPlannerFlow}
              onConsultingClick={startConsultingFlow}
              consultingBookings={consultingBookings}
              onNavigateToConsulting={() => setCurrentTab('CONSULTING')}
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
            />
          )}
        </div>
      </main>

      <div className="md:hidden">
        <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />
      </div>

      {appMode !== 'TAB_VIEW' && renderWizardContent()}

    </div>
  );
}

export default App;
