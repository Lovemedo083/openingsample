import React, { useState, useRef } from 'react';
import { ConsultingBooking, OpenTaskItem, TaskDetailData, TaskCategoryGroup } from '../types';
import { OPEN_PROCESS_TASKS, OPEN_TASK_CATEGORIES } from '../constants';
import { Button, Input, Badge } from './Components';
import { 
  Check, X, ArrowRight, Settings, MapPin, Hammer, ShoppingBag, 
  ShieldCheck, Zap, Box, FileText, Bike, Wine, Upload, Trash2, File as FileIcon
} from 'lucide-react';

interface ConsultingModuleProps {
  onComplete: (booking: ConsultingBooking) => void;
  onCancel: () => void;
  initialContext?: { 
    businessType?: string; 
    region?: string;
    area?: number;
    budget?: number;
  };
  preSelectedPackageId?: string;
}

export const ConsultingModule: React.FC<ConsultingModuleProps> = ({ 
  onComplete, onCancel, initialContext, preSelectedPackageId 
}) => {
  // --- States ---
  
  // 1. Context Info (Top Bar)
  const [context, setContext] = useState({
    businessType: initialContext?.businessType || '업종 미정',
    region: initialContext?.region || '',
    area: initialContext?.area || 0,
    budget: initialContext?.budget || 0,
    targetDate: '',
  });
  const [isEditingContext, setIsEditingContext] = useState(false);

  // 2. Checklist Selection
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(
    new Set(preSelectedPackageId ? ['used_package', 'consulting'] : [])
  );
  
  // 3. Task Details (Map taskId -> Data)
  const [taskDetails, setTaskDetails] = useState<Record<string, TaskDetailData>>({});
  
  // 4. UI State: Detail Sheet
  const [activeSheetTask, setActiveSheetTask] = useState<OpenTaskItem | null>(null);

  // 5. File Upload State
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Handlers ---

  const toggleTask = (taskId: string) => {
    const next = new Set(selectedTaskIds);
    if (next.has(taskId)) {
      next.delete(taskId);
    } else {
      next.add(taskId);
    }
    setSelectedTaskIds(next);
  };

  const openDetailSheet = (task: OpenTaskItem) => {
    if (!selectedTaskIds.has(task.id)) {
        toggleTask(task.id);
    }
    setActiveSheetTask(task);
  };

  const saveTaskDetail = (taskId: string, data: Partial<TaskDetailData>) => {
    setTaskDetails(prev => ({
      ...prev,
      [taskId]: { ...prev[taskId], taskId, ...data }
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAttachedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const booking: ConsultingBooking = {
      id: `bk_${Date.now()}`,
      businessType: context.businessType,
      region: context.region,
      area: context.area,
      budget: context.budget,
      targetDate: context.targetDate,
      status: 'PENDING',
      consultantName: '배정중',
      typeLabel: '맞춤 오픈 상담',
      selectedTaskIds: Array.from(selectedTaskIds), 
      taskDetails: Object.values(taskDetails),
      date: new Date().toLocaleDateString(),
      rawFiles: attachedFiles // [New] Pass files
    };
    onComplete(booking);
  };

  // --- Icons ---
  const getIcon = (type: string) => {
    switch (type) {
      case 'hammer': return Hammer;
      case 'paint': return Hammer;
      case 'sign': return MapPin; 
      case 'sparkles': return ShieldCheck;
      case 'wifi': return Zap;
      case 'shield': return ShieldCheck;
      case 'wine': return Wine;
      case 'bike': return Bike;
      case 'map': return MapPin;
      case 'book': return FileText;
      case 'box': return Box;
      case 'user': return FileText;
      case 'cube': return Box;
      default: return Check;
    }
  };

  // --- Sub-Components ---

  const renderContextBar = () => (
    <div className="bg-slate-900 text-white p-4 sticky top-0 z-20 shadow-md">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-[10px] text-slate-400 font-bold mb-1">선택된 창업 모델</div>
          <div className="text-lg font-bold flex items-center gap-2">
            {context.businessType} 
            <button onClick={() => setIsEditingContext(!isEditingContext)} className="text-slate-400 hover:text-white">
                <Settings size={14}/>
            </button>
          </div>
          <div className="flex gap-2 mt-2 text-xs text-slate-300 flex-wrap">
            <Badge color="dark">{context.region || '지역 미정'}</Badge>
            <Badge color="dark">{context.area ? `${context.area}평` : '평수 미정'}</Badge>
            <Badge color="dark">{context.budget ? `${Number(context.budget) / 10000}만원` : '예산 미정'}</Badge>
          </div>
        </div>
        <button onClick={onCancel} className="p-1 hover:bg-slate-700 rounded-full"><X size={20}/></button>
      </div>
      
      {isEditingContext && (
          <div className="mt-4 pt-4 border-t border-slate-700 space-y-3 animate-in fade-in">
              <Input label="업종" value={context.businessType} onChange={e => setContext({...context, businessType: e.target.value})} className="bg-slate-800 border-slate-600 text-white"/>
              <div className="grid grid-cols-2 gap-2">
                  <Input label="지역" value={context.region} onChange={e => setContext({...context, region: e.target.value})} className="bg-slate-800 border-slate-600 text-white"/>
                  <Input label="평수" type="number" value={context.area} onChange={e => setContext({...context, area: Number(e.target.value)})} className="bg-slate-800 border-slate-600 text-white"/>
              </div>
              <Button size="sm" fullWidth onClick={() => setIsEditingContext(false)}>수정 완료</Button>
          </div>
      )}
    </div>
  );

  const renderDetailSheet = () => {
    if (!activeSheetTask) return null;
    const task = activeSheetTask;
    const detail = taskDetails[task.id] || {};
    
    // 항목별 특화 필드
    const renderSpecificFields = () => {
        switch(task.id) {
            case 'interior': return (
                <>
                    <label className="block text-xs font-bold text-gray-500 mb-1">공사 범위</label>
                    <div className="flex gap-2 mb-4">
                        {['전체 공사', '부분 공사', '감리만'].map(opt => (
                            <button key={opt} 
                                onClick={() => saveTaskDetail(task.id, { scope: opt })}
                                className={`flex-1 py-2 text-xs border rounded ${detail.scope === opt ? 'bg-brand-600 text-white border-brand-600' : 'bg-white'}`}
                            >{opt}</button>
                        ))}
                    </div>
                    <Input label="선호 스타일" placeholder="예: 모던, 우드, 화이트" value={detail.style || ''} onChange={e => saveTaskDetail(task.id, { style: e.target.value })} />
                </>
            );
            case '3d_link': return (
                <div className="bg-brand-50 p-3 rounded-lg mb-4">
                    <p className="text-xs text-brand-700 font-bold mb-1">📢 필수 안내</p>
                    <p className="text-xs text-brand-600">3D 인테리어 체험 링크는 작업 완료 후 <span className="underline">카카오톡 링크</span>로 발송됩니다.</p>
                </div>
            );
            default: return <p className="text-xs text-gray-400">추가 상세 설정이 필요하면 상담 시 말씀해주세요.</p>;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveSheetTask(null)} />
            <div className="bg-white w-full max-w-xl rounded-t-2xl p-5 relative z-10 animate-in slide-in-from-bottom duration-300 max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <div className="text-xs text-brand-600 font-bold mb-1">{OPEN_TASK_CATEGORIES.find(c => c.id === task.category)?.label}</div>
                        <h3 className="text-xl font-bold text-slate-900">{task.title} 상세 설정</h3>
                    </div>
                    <button onClick={() => setActiveSheetTask(null)} className="p-1 bg-gray-100 rounded-full"><X size={20}/></button>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-2">우선순위 (1택)</label>
                        <div className="flex gap-2">
                            {[
                                {k: 'COST', l: '비용 절감'}, {k: 'SPEED', l: '속도 우선'}, {k: 'QUALITY', l: '품질 우선'}
                            ].map(opt => (
                                <button key={opt.k}
                                    onClick={() => saveTaskDetail(task.id, { priority: opt.k as any })}
                                    className={`flex-1 py-3 text-sm font-bold border rounded-lg transition-colors
                                        ${detail.priority === opt.k 
                                            ? 'bg-slate-800 text-white border-slate-800' 
                                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                                >{opt.l}</button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        {renderSpecificFields()}
                    </div>

                    <div className="pt-2">
                        <Input label="특이사항 / 요청사항" value={detail.note || ''} onChange={e => saveTaskDetail(task.id, { note: e.target.value })} placeholder="예: 층고가 높아요, 엘리베이터 없어요" />
                    </div>
                </div>

                <div className="mt-8">
                    <Button fullWidth onClick={() => setActiveSheetTask(null)}>설정 저장</Button>
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 relative">
        {renderContextBar()}

        <div className="p-4 max-w-2xl mx-auto space-y-6">
            <div className="pt-2 pb-2">
                <h2 className="text-2xl font-bold text-slate-900 leading-tight">
                    오픈에 필요한 작업을<br/>선택해주세요
                </h2>
                <p className="text-sm text-gray-500 mt-2">
                    선택한 항목이 <strong>견적서</strong>와 <strong>일정표</strong>에<br/>자동으로 반영됩니다.
                </p>
            </div>

            <div className="space-y-5">
                {OPEN_TASK_CATEGORIES.map(group => {
                    const tasks = OPEN_PROCESS_TASKS.filter(t => t.category === group.id);
                    if (tasks.length === 0) return null;

                    return (
                        <div key={group.id}>
                            <h3 className="text-sm font-bold text-slate-500 mb-2 px-1 flex items-center gap-2">
                                {group.label}
                                <span className="text-[10px] font-normal text-gray-400 bg-white px-2 py-0.5 rounded-full border">
                                    {group.description}
                                </span>
                            </h3>
                            <div className="grid grid-cols-1 gap-3">
                                {tasks.map(task => {
                                    const Icon = getIcon(task.iconType);
                                    const isSelected = selectedTaskIds.has(task.id);
                                    const hasDetail = !!taskDetails[task.id];

                                    return (
                                        <div 
                                            key={task.id}
                                            className={`bg-white rounded-xl border-2 transition-all relative overflow-hidden group
                                                ${isSelected ? 'border-brand-500 bg-brand-50/30' : 'border-transparent shadow-sm'}`}
                                        >
                                            <div 
                                                className="p-4 flex items-center gap-4 cursor-pointer"
                                                onClick={() => openDetailSheet(task)}
                                            >
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors
                                                    ${isSelected ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 text-gray-400'}`}>
                                                    <Icon size={20} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`font-bold text-sm ${isSelected ? 'text-slate-900' : 'text-gray-600'}`}>
                                                            {task.title}
                                                        </span>
                                                        {task.isOpeningExclusive && (
                                                            <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold">ONLY</span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                                        {task.description}
                                                        {hasDetail && isSelected && <span className="w-1.5 h-1.5 rounded-full bg-green-500 ml-1" title="설정됨"/>}
                                                    </div>
                                                </div>
                                            </div>

                                            <button 
                                                onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }}
                                                className={`absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors z-10
                                                    ${isSelected ? 'bg-brand-500 border-brand-500 text-white' : 'bg-white border-gray-200 text-transparent hover:border-gray-400'}`}
                                            >
                                                <Check size={14} strokeWidth={3} />
                                            </button>
                                            
                                            {isSelected && !hasDetail && (
                                                <div className="absolute bottom-2 right-4 text-[10px] text-brand-600 font-bold animate-pulse pointer-events-none">
                                                    터치하여 상세 설정 &gt;
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

             {/* File Upload Section */}
             <div className="pt-6 border-t border-gray-100">
                <h3 className="text-sm font-bold text-slate-500 mb-3 px-1 flex items-center gap-2">
                    참고 자료 (도면, 현장 사진)
                    <span className="text-[10px] font-normal text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-100">
                        선택사항
                    </span>
                </h3>
                
                <div className="bg-white rounded-xl border border-dashed border-gray-300 p-4 transition-colors hover:border-brand-400 hover:bg-brand-50/10">
                    <input 
                        type="file" 
                        multiple 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={handleFileChange} 
                    />
                    
                    {attachedFiles.length === 0 ? (
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex flex-col items-center justify-center py-6 cursor-pointer"
                        >
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-2">
                                <Upload size={20} />
                            </div>
                            <span className="text-sm font-bold text-gray-600">파일 업로드하기</span>
                            <span className="text-xs text-gray-400 mt-1">도면, 현장 사진 등을 첨부해주세요</span>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {attachedFiles.map((file, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-8 h-8 bg-white rounded flex items-center justify-center border border-gray-200 text-brand-600 shrink-0">
                                            <FileIcon size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-bold text-slate-700 truncate">{file.name}</div>
                                            <div className="text-[10px] text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                                        </div>
                                    </div>
                                    <button onClick={() => removeFile(idx)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full py-3 text-xs font-bold text-brand-600 border border-brand-200 rounded-lg hover:bg-brand-50 transition-colors flex items-center justify-center gap-2"
                            >
                                <Upload size={14} /> 추가 파일 업로드
                            </button>
                        </div>
                    )}
                </div>
            </div>

        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-30 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
            <div className="max-w-2xl mx-auto flex items-center gap-4">
                <div className="flex-1">
                    <div className="text-xs text-gray-500 font-bold mb-0.5">선택 항목 {selectedTaskIds.size}개</div>
                    <div className="text-[10px] text-gray-400">견적서 v1이 자동 생성됩니다.</div>
                </div>
                <Button 
                    onClick={handleSubmit} 
                    disabled={selectedTaskIds.size === 0} 
                    className="flex-[2] h-12 text-base shadow-brand-200 shadow-lg"
                >
                    맞춤 상담 시작하기 <ArrowRight size={18} className="ml-2"/>
                </Button>
            </div>
        </div>

        {renderDetailSheet()}
    </div>
  );
};
