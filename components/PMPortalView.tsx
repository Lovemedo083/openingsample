import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Button } from './Components';
import { createNotification } from './NotificationCenter';
import {
  User as UserIcon, Phone, Mail, Camera, Save, LogOut, Briefcase, MessageCircle,
  ChevronRight, Check, Clock, Loader2, Send, ArrowRight, X,
  Star, Award, MapPin, Calendar, CheckCircle, AlertTriangle,
  ClipboardList, Building2, ChevronDown, ExternalLink, AlertCircle,
  Image, Eye, EyeOff, Paperclip, Plus, Trash2, CreditCard
} from 'lucide-react';

interface PMPortalViewProps {
  pmId: string;
  onLogout: () => void;
}

interface ChecklistItemData {
  id: string;
  title: string;
  category: string;
  description?: string;
  status: 'done' | 'worry' | 'unchecked';
  estimatedCost?: { min: number; max: number; unit: string };
}

interface Project {
  id: string;
  business_category: string;
  location_dong: string;
  store_size: number;
  estimated_total: number;
  status: string;
  current_step: number;
  pm_approved_step: number;
  pm_notes: string;
  created_at: string;
  user_id: string;
  checklist_data: ChecklistItemData[];
  user_name?: string;
  user_phone?: string;
}

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
}

interface PartnerAssignment {
  id: string;
  project_id: string;
  checklist_item_id: string;
  partner_id: string;
  partner?: Partner;
  status: 'pending' | 'contacted' | 'confirmed' | 'completed';
  pm_notes: string;
  created_at: string;
}

interface Message {
  id: string;
  project_id: string;
  sender_type: 'USER' | 'PM' | 'SYSTEM';
  message: string;
  attachments?: { url: string; type: string; name: string }[];
  is_read: boolean;
  created_at: string;
}

interface PMProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  profile_image: string;
  introduction: string;
  specialties: string[];
  rating: number;
  completed_projects: number;
  is_available: boolean;
}

// PM 관리 단계 (7-12: PM 제어)
const STEP_LABELS: Record<number, string> = {
  7: '상담 시작',
  8: '비용 견적',
  9: '계약/시작',
  10: '시공 진행',
  11: '오픈 완료',
  12: '사후관리'
};

// 각 단계별 설명 및 액션
const STEP_DETAILS: Record<number, { description: string; actions: string[]; color: string }> = {
  7: { description: '매니저 배정 완료, 상담 시작', actions: ['첫 인사', '요구사항 파악'], color: 'blue' },
  8: { description: '비용 견적 및 협력업체 배정', actions: ['비용 보고서 전송', '업체 카드 전달'], color: 'purple' },
  9: { description: '계약 진행 및 시공 시작', actions: ['계약 안내', '일정 공유'], color: 'orange' },
  10: { description: '시공 및 오픈 준비 진행', actions: ['진행 상황 공유', '최종 점검'], color: 'yellow' },
  11: { description: '오픈 완료! 축하드립니다', actions: ['축하 메시지', '리뷰 요청'], color: 'green' },
  12: { description: '사후관리 및 A/S 지원', actions: ['해피콜', 'A/S 접수'], color: 'slate' },
};

// 단계별 산출물 요구사항
const STEP_REQUIREMENTS: Record<number, {
  label: string;
  requirements: { key: string; label: string; check: (msgs: any[], assigns: any[]) => boolean }[];
}> = {
  7: {
    label: '상담 시작 → 비용 견적',
    requirements: [
      { key: 'pm_msg', label: '고객에게 메시지 1회 이상 발송', check: (msgs) => msgs.some(m => m.sender_type === 'PM') },
      { key: 'user_reply', label: '고객 응답 1회 이상 확인', check: (msgs) => msgs.some(m => m.sender_type === 'USER') },
    ]
  },
  8: {
    label: '비용 견적 → 계약/시작',
    requirements: [
      { key: 'partner', label: '협력업체 1개 이상 배정', check: (_msgs, assigns) => assigns.length > 0 },
      { key: 'report', label: '비용 보고서 발송', check: (msgs) => msgs.some(m => m.sender_type === 'PM' && m.message.includes('비용 컨설팅 보고서')) },
    ]
  },
  9: {
    label: '계약/시작 → 시공 진행',
    requirements: [
      { key: 'payment', label: '고객 계약금 결제 완료 (자동 전환)', check: () => true },
    ]
  },
  10: {
    label: '시공 진행 → 오픈 완료',
    requirements: [
      { key: 'progress', label: '시공 진행상황 공유 (메시지 1회 이상)', check: (msgs) => msgs.filter(m => m.sender_type === 'PM').length >= 3 },
    ]
  },
  11: {
    label: '오픈 완료 → 사후관리',
    requirements: [
      { key: 'happy', label: '해피콜 발송', check: (msgs) => msgs.some(m => m.message.includes('해피콜')) },
    ]
  },
};

const CHECKLIST_CATEGORIES = [
  { id: 'license', label: '인허가/행정', color: 'blue' },
  { id: 'construction', label: '시설/공사', color: 'orange' },
  { id: 'equipment', label: '주방 장비', color: 'purple' },
  { id: 'operation', label: '운영 준비', color: 'green' },
];

export const PMPortalView: React.FC<PMPortalViewProps> = ({ pmId, onLogout }) => {
  const [profile, setProfile] = useState<PMProfile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<Partial<PMProfile>>({});
  const [partners, setPartners] = useState<Partner[]>([]);
  const [assignments, setAssignments] = useState<PartnerAssignment[]>([]);
  const [showPartnerModal, setShowPartnerModal] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'checklist'>('checklist');
  const [selectedChecklistCategory, setSelectedChecklistCategory] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showStepModal, setShowStepModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [customItemForm, setCustomItemForm] = useState({
    title: '',
    category: 'PLANNING',
    description: '',
  });
  // showMobileSidebar removed - mobile uses top bar instead of sidebar toggle
  const [showPaymentRequestModal, setShowPaymentRequestModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDesc, setPaymentDesc] = useState('계약금');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPMData();
  }, [pmId]);

  useEffect(() => {
    if (selectedProject) {
      loadMessages(selectedProject.id);
      loadAssignments(selectedProject.id);
      const unsubscribe = subscribeToMessages(selectedProject.id);
      return unsubscribe;
    }
  }, [selectedProject]);

  useEffect(() => {
    loadPartners();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadPMData = async () => {
    setLoading(true);

    // PM 프로필 로드 (project_managers 테이블 사용)
    const { data: pmData } = await supabase
      .from('project_managers')
      .select('*')
      .eq('id', pmId)
      .single();

    if (pmData) {
      setProfile(pmData);
      setProfileForm(pmData);
    }

    // 담당 프로젝트 로드 (신청자 정보 포함)
    const { data: projectsData } = await supabase
      .from('startup_projects')
      .select('*, profiles:user_id(name, phone, email, full_name)')
      .eq('pm_id', pmId)
      .order('created_at', { ascending: false });

    if (projectsData) {
      const enriched = projectsData.map((p: any) => ({
        ...p,
        user_name: p.profiles?.full_name || p.profiles?.name || p.profiles?.email?.split('@')[0] || null,
        user_phone: p.profiles?.phone || null,
      }));
      setProjects(enriched);
      if (enriched.length > 0 && !selectedProject) {
        setSelectedProject(enriched[0]);
      }
    }

    setLoading(false);
  };

  const loadMessages = async (projectId: string) => {
    const { data } = await supabase
      .from('project_messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at');

    if (data) {
      setMessages(data);
    }
  };

  const loadPartners = async () => {
    const { data } = await supabase
      .from('partners')
      .select('*')
      .eq('is_active', true);

    if (data) {
      setPartners(data);
    }
  };

  const loadAssignments = async (projectId: string) => {
    const { data } = await supabase
      .from('project_partner_assignments')
      .select('*, partner:partners(*)')
      .eq('project_id', projectId);

    if (data) {
      setAssignments(data);
    }
  };

  const assignPartner = async (checklistItemId: string, partnerId: string) => {
    if (!selectedProject) return;

    // 기존 배정 확인
    const existing = assignments.find(a => a.checklist_item_id === checklistItemId);

    if (existing) {
      await supabase
        .from('project_partner_assignments')
        .update({ partner_id: partnerId, status: 'pending' })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('project_partner_assignments')
        .insert({
          project_id: selectedProject.id,
          checklist_item_id: checklistItemId,
          partner_id: partnerId,
          status: 'pending'
        });
    }

    await loadAssignments(selectedProject.id);
    setShowPartnerModal(null);

    // 알림 메시지
    const partner = partners.find(p => p.id === partnerId);
    const item = selectedProject.checklist_data?.find(i => i.id === checklistItemId);
    if (partner && item) {
      await supabase.from('project_messages').insert({
        project_id: selectedProject.id,
        sender_type: 'PM',
        message: `"${item.title}" 항목에 협력업체(${partner.name})를 배정했습니다. 곧 연락드릴 예정입니다.`
      });
      loadMessages(selectedProject.id);
    }
  };

  const updateAssignmentStatus = async (assignmentId: string, status: PartnerAssignment['status']) => {
    await supabase
      .from('project_partner_assignments')
      .update({ status })
      .eq('id', assignmentId);

    if (selectedProject) {
      loadAssignments(selectedProject.id);
    }
  };

  const getPartnerForItem = (itemId: string) => {
    const assignment = assignments.find(a => a.checklist_item_id === itemId);
    return assignment;
  };

  // 커스텀 체크리스트 항목 추가
  const addCustomChecklistItem = async () => {
    if (!selectedProject || !customItemForm.title.trim()) return;

    const newItem: ChecklistItemData = {
      id: `custom_${Date.now()}`,
      title: customItemForm.title.trim(),
      category: customItemForm.category,
      description: customItemForm.description.trim() || undefined,
      status: 'unchecked',
    };

    const updatedChecklist = [...(selectedProject.checklist_data || []), newItem];

    // Optimistic update: 즉시 UI 반영
    setSelectedProject({
      ...selectedProject,
      checklist_data: updatedChecklist,
    });
    setProjects(prev =>
      prev.map(p =>
        p.id === selectedProject.id ? { ...p, checklist_data: updatedChecklist } : p
      )
    );
    setShowCustomItemModal(false);
    setCustomItemForm({ title: '', category: 'PLANNING', description: '' });

    // 서버 동기화
    const { error } = await supabase
      .from('startup_projects')
      .update({ checklist_data: updatedChecklist })
      .eq('id', selectedProject.id);

    if (error) {
      // 실패 시 롤백
      setSelectedProject({
        ...selectedProject,
        checklist_data: selectedProject.checklist_data,
      });
    }
  };

  // 커스텀 체크리스트 항목 삭제
  const deleteCustomChecklistItem = async (itemId: string) => {
    if (!selectedProject) return;

    const updatedChecklist = selectedProject.checklist_data?.filter(item => item.id !== itemId) || [];

    const { error } = await supabase
      .from('startup_projects')
      .update({ checklist_data: updatedChecklist })
      .eq('id', selectedProject.id);

    if (!error) {
      setSelectedProject({
        ...selectedProject,
        checklist_data: updatedChecklist,
      });
      setProjects(prev =>
        prev.map(p =>
          p.id === selectedProject.id ? { ...p, checklist_data: updatedChecklist } : p
        )
      );
    }
  };

  const subscribeToMessages = (projectId: string) => {
    const channel = supabase
      .channel(`pm-project-${projectId}`)
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
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedImage) || !selectedProject) return;

    setSending(true);

    let attachments: { url: string; type: string; name: string }[] | undefined;

    // 이미지 업로드 처리
    if (selectedImage) {
      setUploadingImage(true);
      const fileExt = selectedImage.name.split('.').pop();
      const fileName = `${selectedProject.id}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(fileName, selectedImage);

      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage
          .from('chat-images')
          .getPublicUrl(fileName);

        attachments = [{
          url: urlData.publicUrl,
          type: selectedImage.type,
          name: selectedImage.name
        }];
      }
      setUploadingImage(false);
    }

    await supabase.from('project_messages').insert({
      project_id: selectedProject.id,
      sender_type: 'PM',
      message: newMessage.trim() || '📷 이미지',
      attachments: attachments || null
    });

    // 앱 내 알림 생성
    if (selectedProject.user_id) {
      await createNotification({
        userId: selectedProject.user_id,
        projectId: selectedProject.id,
        type: 'NEW_MESSAGE',
        title: '새 메시지',
        message: newMessage.trim() ? (newMessage.trim().length > 50 ? newMessage.trim().slice(0, 50) + '...' : newMessage.trim()) : '📷 이미지를 보냈습니다',
      });
    }

    setNewMessage('');
    setSelectedImage(null);
    setImagePreview(null);
    setSending(false);
  };

  // 읽음 상태 토글 (PM 수동 제어)
  const toggleReadStatus = async (messageId: string, currentStatus: boolean) => {
    await supabase
      .from('project_messages')
      .update({ is_read: !currentStatus })
      .eq('id', messageId);

    if (selectedProject) {
      loadMessages(selectedProject.id);
    }
  };

  // 이미지 선택 핸들러
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('이미지는 5MB 이하만 업로드 가능합니다.');
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const cancelImageUpload = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const advanceProjectStep = async () => {
    if (!selectedProject) return;

    const nextStep = selectedProject.current_step + 1;
    if (nextStep > 12) return;

    // 산출물 요구사항 확인
    const reqs = STEP_REQUIREMENTS[selectedProject.current_step];
    if (reqs) {
      const unmet = reqs.requirements.filter(r => !r.check(messages, assignments));
      if (unmet.length > 0) {
        const labels = unmet.map(r => `- ${r.label}`).join('\n');
        if (!window.confirm(`아직 완료되지 않은 항목:\n${labels}\n\n그래도 다음 단계로 진행하시겠습니까?`)) {
          return;
        }
      }
    }

    await setProjectStep(nextStep);
  };

  // 특정 단계로 설정
  const setProjectStep = async (step: number, notify: boolean = true) => {
    if (!selectedProject) return;

    // PM은 역행 불가
    if (step < selectedProject.current_step) {
      alert('단계를 되돌리려면 관리자에게 요청해주세요.');
      return;
    }

    // 2단계 이상 점프 시 경고
    const diff = step - selectedProject.current_step;
    if (diff > 1) {
      if (!window.confirm(`${diff}단계를 건너뜁니다. 정말 진행하시겠습니까?`)) {
        return;
      }
    }

    const status = step >= 11 ? 'COMPLETED' : step >= 7 ? 'IN_PROGRESS' : 'PM_ASSIGNED';

    const { error } = await supabase
      .from('startup_projects')
      .update({
        current_step: step,
        pm_approved_step: step,
        status
      })
      .eq('id', selectedProject.id);

    if (!error) {
      if (notify) {
        const stepDetail = STEP_DETAILS[step];
        await supabase.from('project_messages').insert({
          project_id: selectedProject.id,
          sender_type: 'SYSTEM',
          message: `현재 단계: ${STEP_LABELS[step]}\n\n${stepDetail?.description || ''}\n\n담당 매니저가 진행 상황을 업데이트했습니다.`
        });
        loadMessages(selectedProject.id);
      }

      setSelectedProject({ ...selectedProject, current_step: step, pm_approved_step: step, status });
      loadPMData();
      setShowStepModal(false);
    }
  };

  // 비용 컨설팅 보고서 전송
  const sendCostReport = async () => {
    if (!selectedProject) return;

    // 체크리스트에서 도움 필요 항목들의 예상 비용 계산
    const worryItems = selectedProject.checklist_data?.filter(i => i.status === 'worry') || [];
    const assignedItems = assignments.filter(a => a.status !== 'pending');

    let reportMessage = `📊 창업 비용 컨설팅 보고서\n\n`;
    reportMessage += `${selectedProject.business_category} | 강남구 ${selectedProject.location_dong} | ${selectedProject.store_size}평\n\n`;
    reportMessage += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    // 배정된 협력업체 정보
    if (assignedItems.length > 0) {
      reportMessage += `배정된 협력업체\n\n`;
      assignedItems.forEach(item => {
        const checklistItem = selectedProject.checklist_data?.find(c => c.id === item.checklist_item_id);
        reportMessage += `• ${checklistItem?.title || item.checklist_item_id}\n`;
        reportMessage += `  └ ${item.partner?.name} (${item.partner?.price_min}~${item.partner?.price_max}${item.partner?.price_unit})\n\n`;
      });
    }

    reportMessage += `총 예상 비용: ${(selectedProject.estimated_total / 10000).toFixed(0)}만원\n\n`;
    reportMessage += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    reportMessage += `궁금한 점이 있으시면 언제든 문의해주세요.`;

    await supabase.from('project_messages').insert({
      project_id: selectedProject.id,
      sender_type: 'PM',
      message: reportMessage
    });

    loadMessages(selectedProject.id);
    setShowReportModal(false);
  };

  // 해피콜 메시지 전송
  const sendHappyCallMessage = async () => {
    if (!selectedProject) return;

    const message = `오픈 후 해피콜\n\n안녕하세요, 담당 매니저입니다.\n\n${selectedProject.business_category} 오픈 이후 운영은 잘 되고 계신가요?\n\n혹시 추가로 도움이 필요하신 부분이 있으시면 언제든 말씀해주세요.\n\n- 장비 A/S 필요하신 부분\n- 추가 인테리어/보수 필요하신 부분\n- 마케팅/홍보 지원\n- 기타 운영 관련 문의\n\n항상 응원하겠습니다.`;

    await supabase.from('project_messages').insert({
      project_id: selectedProject.id,
      sender_type: 'PM',
      message
    });

    loadMessages(selectedProject.id);
  };

  // 결제 요청 전송
  const sendPaymentRequest = async () => {
    if (!selectedProject || !paymentAmount.trim()) return;

    const amount = parseInt(paymentAmount.replace(/,/g, ''), 10);
    if (isNaN(amount) || amount <= 0) {
      alert('올바른 금액을 입력해주세요.');
      return;
    }
    if (amount > 1_000_000_000) {
      alert('결제 금액이 너무 큽니다. (최대 10억원)');
      return;
    }
    if (amount > selectedProject.estimated_total * 1.5) {
      if (!window.confirm(`요청 금액이 예상 비용(${(selectedProject.estimated_total / 10000).toFixed(0)}만원)보다 큽니다.\n계속하시겠습니까?`)) {
        return;
      }
    }

    // 기존 pending 결제 확인
    const { data: existingPending } = await supabase
      .from('payments')
      .select('id')
      .eq('furniture_listing_id', selectedProject.id)
      .eq('status', 'pending');

    if (existingPending && existingPending.length > 0) {
      if (!window.confirm('이미 대기 중인 결제 요청이 있습니다.\n기존 요청을 취소하고 새로 보내시겠습니까?')) {
        return;
      }
      // 기존 pending 결제 취소
      for (const p of existingPending) {
        await supabase.from('payments').update({ status: 'cancelled' }).eq('id', p.id);
      }
    }

    // payments 레코드 생성 (pending 상태)
    const { data: payment, error: payError } = await supabase
      .from('payments')
      .insert({
        furniture_listing_id: selectedProject.id,
        amount,
        status: 'pending',
        payment_method: 'toss',
      })
      .select()
      .single();

    if (payError || !payment) {
      alert('결제 요청 생성에 실패했습니다.');
      console.error('Payment request error:', payError);
      return;
    }

    // 결제 요청 메시지 전송
    const formattedAmount = amount.toLocaleString('ko-KR');
    await supabase.from('project_messages').insert({
      project_id: selectedProject.id,
      sender_type: 'PM',
      message: `💳 결제 요청\n\n금액: ${formattedAmount}원\n내용: ${paymentDesc}\n\n아래 결제하기 버튼을 눌러 결제를 진행해주세요.`,
      attachments: [{
        type: 'payment_request',
        url: '',
        name: paymentDesc,
        payment_id: payment.id,
        amount: amount,
      }]
    });

    // 앱 내 알림 생성
    if (selectedProject.user_id) {
      await createNotification({
        userId: selectedProject.user_id,
        projectId: selectedProject.id,
        type: 'PAYMENT_REQUEST',
        title: '결제 요청',
        message: `${formattedAmount}원 결제 요청이 도착했습니다. (${paymentDesc})`,
      });
    }

    loadMessages(selectedProject.id);
    setShowPaymentRequestModal(false);
    setPaymentAmount('');
    setPaymentDesc('계약금');
  };

  // 금액 입력 포맷팅 (1000단위 콤마)
  const handleAmountChange = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    if (numericValue) {
      setPaymentAmount(parseInt(numericValue, 10).toLocaleString('ko-KR'));
    } else {
      setPaymentAmount('');
    }
  };

  const updateProfile = async () => {
    if (!profile) return;

    const { error } = await supabase
      .from('project_managers')
      .update({
        name: profileForm.name,
        phone: profileForm.phone,
        introduction: profileForm.introduction,
        specialties: profileForm.specialties,
        is_available: profileForm.is_available
      })
      .eq('id', profile.id);

    if (!error) {
      setProfile({ ...profile, ...profileForm } as PMProfile);
      setEditingProfile(false);
    }
  };

  const uploadProfileImage = async (file: File) => {
    if (!profile) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `pm_${profile.id}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('profiles')
      .upload(fileName, file);

    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from('profiles')
        .getPublicUrl(fileName);

      await supabase
        .from('project_managers')
        .update({ profile_image: urlData.publicUrl })
        .eq('id', profile.id);

      setProfile({ ...profile, profile_image: urlData.publicUrl });
    }
  };

  // 체크리스트 아이템 필터링
  const getFilteredChecklist = () => {
    if (!selectedProject?.checklist_data) return [];

    let items = selectedProject.checklist_data;

    if (selectedChecklistCategory) {
      items = items.filter(item => item.category === selectedChecklistCategory);
    }

    return items;
  };

  // 걱정/도움 필요 항목 수
  const getWorryCount = () => {
    return selectedProject?.checklist_data?.filter(i => i.status === 'worry').length || 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-brand-600" size={40} />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-gray-100 flex flex-col md:flex-row overflow-hidden">
      {/* 모바일 상단 바 - PM 프로필 + 프로젝트 선택 */}
      <div className="md:hidden bg-white border-b shrink-0">
        {/* PM 헤더 */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <img
              src={profile?.profile_image || '/favicon-new.png'}
              alt={profile?.name}
              className="w-7 h-7 rounded-full object-cover border border-white/30"
            />
            <span className="font-bold text-sm">{profile?.name || 'PM'}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEditingProfile(true)}
              className="text-xs text-white/70 hover:text-white"
            >
              프로필 수정
            </button>
            <button
              onClick={onLogout}
              className="text-xs text-white/50 hover:text-red-300 flex items-center gap-1"
            >
              <LogOut size={12} />
            </button>
          </div>
        </div>

        {/* 프로젝트 선택 필 */}
        {projects.length > 0 && (
          <div className="flex gap-2 px-4 py-2.5 overflow-x-auto no-scrollbar bg-slate-50">
            {projects.map(project => {
              const isSelected = selectedProject?.id === project.id;
              const worryCount = project.checklist_data?.filter(i => i.status === 'worry').length || 0;
              return (
                <button
                  key={project.id}
                  onClick={() => setSelectedProject(project)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                    isSelected
                      ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 active:scale-95'
                  }`}
                >
                  {project.business_category}
                  {project.user_name ? ` · ${project.user_name}` : ''}
                  {worryCount > 0 && (
                    <span className={`ml-1 ${isSelected ? 'text-orange-200' : 'text-orange-500'}`}>
                      ⚠{worryCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 데스크톱 사이드바 - 프로필 & 프로젝트 목록 */}
      <aside className="hidden md:flex w-80 bg-white border-r flex-col">
        {/* PM 프로필 */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <img
                src={profile?.profile_image || '/favicon-new.png'}
                alt={profile?.name}
                className="w-14 h-14 rounded-full object-cover border-2 border-brand-100"
              />
              <label className="absolute bottom-0 right-0 w-6 h-6 bg-brand-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-brand-700 transition-colors">
                <Camera size={12} className="text-white" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadProfileImage(e.target.files[0])}
                />
              </label>
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-lg">{profile?.name || 'PM'}</h2>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Star size={14} className="text-yellow-500 fill-yellow-500" />
                <span>{profile?.rating || 5.0}</span>
                <span>·</span>
                <span>{profile?.completed_projects || 0}건 완료</span>
              </div>
            </div>
          </div>

          {editingProfile ? (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="이름"
                className="w-full px-3 py-2 border rounded-lg text-sm"
                value={profileForm.name || ''}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
              />
              <input
                type="tel"
                placeholder="연락처"
                className="w-full px-3 py-2 border rounded-lg text-sm"
                value={profileForm.phone || ''}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
              />
              <textarea
                placeholder="자기소개"
                className="w-full px-3 py-2 border rounded-lg text-sm resize-none h-16"
                value={profileForm.introduction || ''}
                onChange={(e) => setProfileForm({ ...profileForm, introduction: e.target.value })}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={updateProfile}>
                  <Save size={14} className="mr-1" /> 저장
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingProfile(false)}>
                  취소
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">{profile?.introduction || '자기소개를 입력하세요'}</p>
              <button
                onClick={() => setEditingProfile(true)}
                className="text-xs text-brand-600 font-bold hover:underline"
              >
                프로필 수정
              </button>
            </div>
          )}
        </div>

        {/* 프로젝트 목록 */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-2 bg-gray-50 border-b">
            <h3 className="font-bold text-sm text-gray-700">담당 프로젝트 ({projects.length})</h3>
          </div>
          {projects.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-sm">
              배정된 프로젝트가 없습니다
            </div>
          ) : (
            <div className="divide-y">
              {projects.map(project => {
                const worryItems = project.checklist_data?.filter(i => i.status === 'worry').length || 0;
                return (
                  <button
                    key={project.id}
                    onClick={() => setSelectedProject(project)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                      selectedProject?.id === project.id ? 'bg-brand-50 border-l-4 border-brand-600' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm">{project.business_category}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        project.current_step >= 8 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {STEP_LABELS[project.current_step]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      강남구 {project.location_dong} · {project.store_size}평
                    </p>
                    {worryItems > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-orange-600">
                        <AlertCircle size={12} />
                        <span>도움 필요 {worryItems}건</span>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(project.created_at).toLocaleDateString()}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 로그아웃 */}
        <div className="p-4 border-t">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2 text-gray-500 hover:text-red-600 transition-colors"
          >
            <LogOut size={18} />
            로그아웃
          </button>
        </div>
      </aside>

      {/* 메인 - 프로젝트 상세 */}
      <main className="flex-1 flex flex-col min-h-0">
        {selectedProject ? (
          <>
            {/* 프로젝트 헤더 */}
            <div className="bg-white border-b px-4 md:px-6 py-3 md:py-4 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h1 className="text-base md:text-xl font-bold truncate">
                      {selectedProject.business_category} 창업
                    </h1>
                    {selectedProject.user_name && (
                      <span className="shrink-0 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full font-bold flex items-center gap-1">
                        <UserIcon size={10} />
                        {selectedProject.user_name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs md:text-sm text-gray-500">
                    강남구 {selectedProject.location_dong} · {selectedProject.store_size}평 · 예상 {(selectedProject.estimated_total / 10000).toFixed(0)}만원
                    {selectedProject.user_phone && (
                      <a href={`tel:${selectedProject.user_phone}`} className="ml-2 text-brand-600 font-bold">
                        📞 {selectedProject.user_phone}
                      </a>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                  {getWorryCount() > 0 && (
                    <span className="hidden md:inline px-3 py-1 rounded-full text-sm font-bold bg-orange-100 text-orange-700">
                      도움 필요 {getWorryCount()}건
                    </span>
                  )}
                  <button
                    onClick={() => setShowStepModal(true)}
                    className={`px-2.5 md:px-3 py-1 rounded-full text-xs md:text-sm font-bold cursor-pointer hover:opacity-80 transition-opacity ${
                      selectedProject.current_step >= 11
                        ? 'bg-green-100 text-green-700'
                        : selectedProject.current_step >= 7
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {STEP_LABELS[selectedProject.current_step]} ▼
                  </button>
                  {selectedProject.current_step >= 7 && selectedProject.current_step < 12 && (
                    <Button onClick={advanceProjectStep} className="text-xs md:text-sm !px-2.5 md:!px-3">
                      <ArrowRight size={14} className="mr-0.5 md:mr-1" />
                      <span className="hidden md:inline">다음 단계</span>
                      <span className="md:hidden">다음</span>
                    </Button>
                  )}
                  {selectedProject.current_step === 8 && (
                    <Button onClick={() => setShowReportModal(true)} className="text-xs md:text-sm bg-purple-600 hover:bg-purple-700 !px-2.5 md:!px-3">
                      <span className="hidden md:inline">📊 비용 보고서</span>
                      <span className="md:hidden">📊</span>
                    </Button>
                  )}
                  {selectedProject.current_step >= 11 && (
                    <Button onClick={sendHappyCallMessage} className="text-xs md:text-sm bg-pink-600 hover:bg-pink-700 !px-2.5 md:!px-3">
                      <span className="hidden md:inline">📞 해피콜</span>
                      <span className="md:hidden">📞</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* 단계별 산출물 체크리스트 */}
              {selectedProject.current_step >= 7 && selectedProject.current_step < 12 && STEP_REQUIREMENTS[selectedProject.current_step] && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-xs font-bold text-amber-800 mb-2">
                    {STEP_REQUIREMENTS[selectedProject.current_step].label}
                  </p>
                  <div className="space-y-1.5">
                    {STEP_REQUIREMENTS[selectedProject.current_step].requirements.map(req => {
                      const met = req.check(messages, assignments);
                      return (
                        <div key={req.key} className="flex items-center gap-2 text-xs">
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${met ? 'bg-green-500' : 'bg-gray-300'}`}>
                            {met ? '✓' : ''}
                          </span>
                          <span className={met ? 'text-green-700' : 'text-gray-500'}>{req.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 고객 상담 조건 - 데스크톱: 상세, 모바일: 체크리스트 뱃지만 */}
              <div className="mt-2 md:mt-4 p-3 md:p-4 bg-slate-50 rounded-xl">
                {/* 데스크톱: 상세 그리드 */}
                <div className="hidden md:block">
                  <div className="flex items-center gap-2 mb-3">
                    <UserIcon size={16} className="text-brand-600" />
                    <span className="font-bold text-sm">고객 상담 조건</span>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400 text-xs mb-1">고객명</p>
                      <p className="font-bold">{selectedProject.user_name || '미입력'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs mb-1">연락처</p>
                      <p className="font-bold">{selectedProject.user_phone || '미입력'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs mb-1">업종</p>
                      <p className="font-bold">{selectedProject.business_category}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs mb-1">위치/평수</p>
                      <p className="font-bold">강남구 {selectedProject.location_dong} · {selectedProject.store_size}평</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <div className="flex gap-3 flex-wrap">
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">
                        ✓ 준비됨 {selectedProject.checklist_data?.filter(i => i.status === 'done').length || 0}건
                      </span>
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-bold">
                        ⚠ 도움 필요 {selectedProject.checklist_data?.filter(i => i.status === 'worry').length || 0}건
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-bold">
                        미확인 {selectedProject.checklist_data?.filter(i => i.status === 'unchecked').length || 0}건
                      </span>
                    </div>
                  </div>
                </div>

                {/* 모바일: 컴팩트 뱃지 */}
                <div className="md:hidden flex gap-2 flex-wrap">
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">
                    ✓ {selectedProject.checklist_data?.filter(i => i.status === 'done').length || 0}
                  </span>
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-bold">
                    ⚠ {selectedProject.checklist_data?.filter(i => i.status === 'worry').length || 0}
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-bold">
                    미확인 {selectedProject.checklist_data?.filter(i => i.status === 'unchecked').length || 0}
                  </span>
                  {selectedProject.checklist_data?.filter(i => i.status === 'worry').map(item => (
                    <span key={item.id} className="px-2 py-1 bg-orange-50 text-orange-700 rounded text-xs">
                      {item.title}
                    </span>
                  ))}
                </div>
              </div>

              {/* 탭 */}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setActiveTab('checklist')}
                  className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors ${
                    activeTab === 'checklist'
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <ClipboardList size={16} />
                  체크리스트
                  {getWorryCount() > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                      activeTab === 'checklist' ? 'bg-white/20' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {getWorryCount()}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors ${
                    activeTab === 'chat'
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <MessageCircle size={16} />
                  채팅
                </button>
              </div>
            </div>

            {/* 체크리스트 탭 */}
            {activeTab === 'checklist' && (
              <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
                {/* 카테고리 필터 */}
                <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
                  <button
                    onClick={() => setSelectedChecklistCategory(null)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shrink-0 ${
                      !selectedChecklistCategory
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    전체
                  </button>
                  <button
                    onClick={() => setSelectedChecklistCategory('worry')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors shrink-0 ${
                      selectedChecklistCategory === 'worry'
                        ? 'bg-orange-600 text-white'
                        : 'bg-white text-orange-600 border border-orange-200 hover:bg-orange-50'
                    }`}
                  >
                    <AlertCircle size={14} />
                    도움 필요
                  </button>
                  {CHECKLIST_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedChecklistCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shrink-0 ${
                        selectedChecklistCategory === cat.id
                          ? 'bg-slate-900 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* 체크리스트 아이템 */}
                <div className="space-y-3">
                  {(selectedChecklistCategory === 'worry'
                    ? selectedProject.checklist_data?.filter(i => i.status === 'worry')
                    : getFilteredChecklist()
                  )?.map(item => {
                    const assignment = getPartnerForItem(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`bg-white rounded-xl border p-4 ${
                          item.status === 'worry' ? 'border-orange-300 bg-orange-50/50' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {item.status === 'done' && (
                                <CheckCircle size={18} className="text-green-600" />
                              )}
                              {item.status === 'worry' && (
                                <AlertCircle size={18} className="text-orange-600" />
                              )}
                              {item.status === 'unchecked' && (
                                <div className="w-4.5 h-4.5 border-2 border-gray-300 rounded" />
                              )}
                              <h3 className="font-bold">{item.title}</h3>
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                                {CHECKLIST_CATEGORIES.find(c => c.id === item.category)?.label || item.category}
                              </span>
                              {item.id.startsWith('custom_') && (
                                <>
                                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                                    커스텀
                                  </span>
                                  <button
                                    onClick={() => deleteCustomChecklistItem(item.id)}
                                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                    title="항목 삭제"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-sm text-gray-500 ml-6 mb-2">{item.description}</p>
                            )}
                            {item.estimatedCost && (
                              <p className="text-sm text-gray-600 ml-6">
                                예상 비용: {item.estimatedCost.min}~{item.estimatedCost.max}{item.estimatedCost.unit}
                              </p>
                            )}
                          </div>

                          {/* 파트너 배정 */}
                          <div className="flex items-center gap-2">
                            {assignment?.partner ? (
                              <div className="text-right">
                                <div className="flex items-center gap-2">
                                  <div className="text-sm">
                                    <p className="font-bold text-brand-700">{assignment.partner.name}</p>
                                    <p className="text-xs text-gray-500">{assignment.partner.contact_phone}</p>
                                  </div>
                                  <select
                                    value={assignment.status}
                                    onChange={(e) => updateAssignmentStatus(assignment.id, e.target.value as any)}
                                    className="px-2 py-1 border rounded text-xs"
                                  >
                                    <option value="pending">대기중</option>
                                    <option value="contacted">연락완료</option>
                                    <option value="confirmed">확정</option>
                                    <option value="completed">완료</option>
                                  </select>
                                </div>
                                <button
                                  onClick={() => setShowPartnerModal(item.id)}
                                  className="text-xs text-brand-600 hover:underline mt-1"
                                >
                                  업체 변경
                                </button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => setShowPartnerModal(item.id)}
                              >
                                <Building2 size={14} className="mr-1" />
                                업체 배정
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {getFilteredChecklist().length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                      <ClipboardList size={48} className="mx-auto mb-4 opacity-50" />
                      <p>체크리스트 항목이 없습니다</p>
                    </div>
                  )}

                  {/* 커스텀 항목 추가 버튼 */}
                  <button
                    onClick={() => setShowCustomItemModal(true)}
                    className="w-full mt-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-brand-500 hover:text-brand-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus size={18} />
                    특이 케이스 항목 추가
                  </button>
                </div>
              </div>
            )}

            {/* 채팅 탭 */}
            {activeTab === 'chat' && (
              <>
                <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 space-y-3">
                  {messages.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
                      <p>메시지가 없습니다</p>
                      <p className="text-sm">고객에게 먼저 인사를 건네보세요</p>
                    </div>
                  ) : (
                    messages.map(msg => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_type === 'PM' ? 'justify-end' : 'justify-start'}`}
                      >
                        {/* 고객 메시지에 읽음 토글 버튼 */}
                        {msg.sender_type === 'USER' && (
                          <button
                            onClick={() => toggleReadStatus(msg.id, msg.is_read)}
                            className={`mr-2 p-1.5 rounded-full self-end mb-1 transition-colors ${
                              msg.is_read
                                ? 'bg-brand-100 text-brand-600 hover:bg-brand-200'
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                            }`}
                            title={msg.is_read ? '읽음 표시 해제' : '읽음 표시'}
                          >
                            {msg.is_read ? <Eye size={14} /> : <EyeOff size={14} />}
                          </button>
                        )}
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                            msg.sender_type === 'PM'
                              ? 'bg-brand-600 text-white rounded-br-md'
                              : msg.sender_type === 'USER'
                                ? 'bg-white border shadow-sm rounded-bl-md'
                                : 'bg-gray-200 text-gray-600 text-sm'
                          }`}
                        >
                          {msg.sender_type === 'USER' && (
                            <p className="text-xs text-gray-400 font-bold mb-1">고객</p>
                          )}
                          {/* 이미지 첨부파일 표시 */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mb-2">
                              {msg.attachments.map((att, idx) => (
                                <img
                                  key={idx}
                                  src={att.url}
                                  alt={att.name}
                                  className="max-w-full rounded-lg cursor-pointer hover:opacity-90"
                                  onClick={() => window.open(att.url, '_blank')}
                                />
                              ))}
                            </div>
                          )}
                          {msg.message !== '📷 이미지' && (
                            <p className="whitespace-pre-wrap text-sm">{msg.message}</p>
                          )}
                          <div className={`flex items-center gap-2 mt-1 ${
                            msg.sender_type === 'PM' ? 'text-white/70' : 'text-gray-400'
                          }`}>
                            <span className="text-[10px]">
                              {new Date(msg.created_at).toLocaleTimeString('ko-KR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {msg.sender_type === 'USER' && msg.is_read && (
                              <span className="text-[10px] text-brand-500 font-bold">읽음</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* 이미지 미리보기 */}
                {imagePreview && (
                  <div className="bg-gray-100 border-t p-3">
                    <div className="relative inline-block">
                      <img src={imagePreview} alt="미리보기" className="h-20 rounded-lg" />
                      <button
                        onClick={cancelImageUpload}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* 메시지 입력 */}
                <div className="bg-white border-t p-4">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? <Loader2 className="animate-spin" size={20} /> : <Image size={20} className="text-gray-500" />}
                    </button>
                    <button
                      onClick={() => setShowPaymentRequestModal(true)}
                      className="p-3 bg-orange-100 rounded-xl hover:bg-orange-200 transition-colors"
                      title="결제 요청 보내기"
                    >
                      <CreditCard size={20} className="text-orange-500" />
                    </button>
                    <input
                      type="text"
                      placeholder="메시지를 입력하세요..."
                      className="flex-1 px-4 py-3 bg-gray-100 rounded-xl"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    />
                    <Button onClick={sendMessage} disabled={sending || (!newMessage.trim() && !selectedImage)}>
                      {sending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Briefcase size={48} className="mx-auto mb-4 opacity-50" />
              <p>프로젝트를 선택하세요</p>
            </div>
          </div>
        )}
      </main>

      {/* 파트너 배정 모달 */}
      {showPartnerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden m-4">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">협력 업체 배정</h2>
              <button
                onClick={() => setShowPartnerModal(null)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {partners.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Building2 size={48} className="mx-auto mb-4 opacity-50" />
                  <p>등록된 협력 업체가 없습니다</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {partners.map(partner => (
                    <div
                      key={partner.id}
                      className="border rounded-xl p-4 hover:border-brand-300 hover:bg-brand-50/50 cursor-pointer transition-colors"
                      onClick={() => assignPartner(showPartnerModal, partner.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold">{partner.name}</h3>
                          <p className="text-sm text-gray-500">{partner.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            <span>{partner.subcategory || partner.category}</span>
                            <span>·</span>
                            <span>{partner.price_min}~{partner.price_max}{partner.price_unit}</span>
                            <span>·</span>
                            <span>{partner.contact_phone}</span>
                          </div>
                        </div>
                        <ChevronRight className="text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 커스텀 체크리스트 항목 추가 모달 */}
      {showCustomItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden m-4">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">특이 케이스 항목 추가</h2>
              <button
                onClick={() => {
                  setShowCustomItemModal(false);
                  setCustomItemForm({ title: '', category: 'PLANNING', description: '' });
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">항목명 *</label>
                <input
                  type="text"
                  value={customItemForm.title}
                  onChange={(e) => setCustomItemForm({ ...customItemForm, title: e.target.value })}
                  placeholder="예: 특수 환기 시스템 설치"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">카테고리</label>
                <select
                  value={customItemForm.category}
                  onChange={(e) => setCustomItemForm({ ...customItemForm, category: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                >
                  {CHECKLIST_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">설명 (선택)</label>
                <textarea
                  value={customItemForm.description}
                  onChange={(e) => setCustomItemForm({ ...customItemForm, description: e.target.value })}
                  placeholder="추가 설명이 필요한 경우 입력하세요"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none h-24"
                />
              </div>
              <Button
                fullWidth
                onClick={addCustomChecklistItem}
                disabled={!customItemForm.title.trim()}
              >
                <Plus size={18} className="mr-2" />
                항목 추가
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 단계 선택 모달 */}
      {showStepModal && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden m-4">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">진행 단계 설정</h2>
              <button
                onClick={() => setShowStepModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <p className="text-sm text-gray-500 mb-4">단계를 선택하면 고객에게 알림이 전송됩니다.</p>
              <div className="space-y-2">
                {[7, 8, 9, 10, 11, 12].map(step => (
                  <button
                    key={step}
                    onClick={() => setProjectStep(step)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-colors ${
                      selectedProject.current_step === step
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-gray-200 hover:border-brand-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold">{step - 6}단계: {STEP_LABELS[step]}</p>
                        <p className="text-sm text-gray-500">{STEP_DETAILS[step]?.description}</p>
                      </div>
                      {selectedProject.current_step === step && (
                        <Check className="text-brand-600" size={20} />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 비용 보고서 전송 모달 */}
      {showReportModal && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden m-4">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">📊 비용 컨설팅 보고서</h2>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="font-bold mb-2">{selectedProject.business_category} 창업</p>
                <p className="text-sm text-gray-600">강남구 {selectedProject.location_dong} · {selectedProject.store_size}평</p>
                <p className="text-2xl font-black text-brand-600 mt-2">
                  예상 {(selectedProject.estimated_total / 10000).toFixed(0)}만원
                </p>
              </div>

              {assignments.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-bold text-gray-700 mb-2">배정된 협력업체</p>
                  <div className="space-y-2">
                    {assignments.map(a => (
                      <div key={a.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                        <span>{a.partner?.name}</span>
                        <span className="text-gray-500">{a.partner?.price_min}~{a.partner?.price_max}{a.partner?.price_unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-sm text-gray-500 mb-4">
                위 내용을 고객에게 채팅으로 전송합니다.
              </p>

              <div className="flex gap-3">
                <Button onClick={() => setShowReportModal(false)} className="flex-1 bg-gray-200 text-gray-700 hover:bg-gray-300">
                  취소
                </Button>
                <Button onClick={sendCostReport} className="flex-1">
                  <Send size={18} className="mr-2" />
                  전송하기
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 결제 요청 모달 */}
      {showPaymentRequestModal && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden m-4">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">💳 결제 요청 보내기</h2>
              <button
                onClick={() => {
                  setShowPaymentRequestModal(false);
                  setPaymentAmount('');
                  setPaymentDesc('계약금');
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">프로젝트</p>
                <p className="font-bold">{selectedProject.business_category} · {selectedProject.location_dong} · {selectedProject.store_size}평</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">결제 금액 (원) *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={paymentAmount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="예: 5,000,000"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg font-bold"
                />
                {paymentAmount && (
                  <p className="text-xs text-gray-400 mt-1">
                    {parseInt(paymentAmount.replace(/,/g, ''), 10) >= 10000
                      ? `${(parseInt(paymentAmount.replace(/,/g, ''), 10) / 10000).toFixed(0)}만원`
                      : `${paymentAmount}원`
                    }
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">결제 내용</label>
                <input
                  type="text"
                  value={paymentDesc}
                  onChange={(e) => setPaymentDesc(e.target.value)}
                  placeholder="예: 계약금, 중도금, 잔금"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <p className="text-xs text-orange-700">
                  고객 채팅에 결제 요청이 전송됩니다.<br/>
                  고객이 결제하기 버튼을 누르면 토스페이로 결제가 진행됩니다.
                </p>
              </div>

              <Button
                fullWidth
                onClick={sendPaymentRequest}
                disabled={!paymentAmount.trim()}
                className="bg-orange-500 hover:bg-orange-600"
              >
                <CreditCard size={18} className="mr-2" />
                결제 요청 보내기
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
