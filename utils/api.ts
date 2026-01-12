import { supabase } from './supabaseClient';
import { ConsultingBooking, Quote } from '../types';

// 1. 상담 내역 불러오기 (files 컬럼 포함)
export const fetchConsultings = async (): Promise<ConsultingBooking[]> => {
  const { data, error } = await supabase
    .from('consultings')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching consultings:', error);
    return [];
  }

  // DB 데이터 -> 앱 데이터 타입 변환
  return data.map((item: any) => ({
    id: item.id,
    businessType: item.business_type,
    region: item.region,
    area: item.area,
    budget: item.budget,
    targetDate: item.target_date,
    status: item.status,
    consultantName: '김오픈 프로', // 임시 고정
    typeLabel: '맞춤 오픈 상담',
    selectedTaskIds: item.selected_task_ids || [],
    taskDetails: item.task_details || [],
    files: item.files || [], 
    date: new Date(item.created_at).toLocaleDateString(),
  })) as ConsultingBooking[];
};

// 2. 상담 신청하기 (저장) - [수정] 로그인 체크 완화
export const createConsulting = async (booking: ConsultingBooking) => {
  const { data: { user } } = await supabase.auth.getUser();
  // 사용자가 없으면 'admin-test-id' 사용
  const userId = user ? user.id : 'admin-test-id';

  const { data, error } = await supabase
    .from('consultings')
    .insert([
      {
        user_id: userId,
        business_type: booking.businessType,
        region: booking.region,
        area: booking.area,
        budget: booking.budget,
        target_date: booking.targetDate,
        status: 'PENDING',
        selected_task_ids: booking.selectedTaskIds,
        task_details: booking.taskDetails,
        files: [] // 초기 파일은 빈 배열
      }
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

// 3. 파일 업로드 함수 (Storage + DB Update)
export const uploadConsultingFile = async (consultingId: string, file: File) => {
    // A. Storage에 파일 업로드
    const fileExt = file.name.split('.').pop();
    // 파일명 중복 방지를 위해 timestamp 추가
    const fileName = `${consultingId}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
        .from('uploads') // 'uploads' 버킷 사용
        .upload(fileName, file);

    if (uploadError) throw uploadError;

    // B. 업로드된 파일의 공개 URL 가져오기
    const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(fileName);

    // C. DB 업데이트 (기존 파일 목록에 추가)
    // 먼저 현재 파일 목록을 가져옵니다.
    const { data: currentData, error: fetchError } = await supabase
        .from('consultings')
        .select('files')
        .eq('id', consultingId)
        .single();
    
    if (fetchError) throw fetchError;

    const newFile = { 
        name: file.name, 
        url: publicUrl, 
        status: 'UPLOADED',
        uploadedAt: new Date().toISOString()
    };
    
    const updatedFiles = [...(currentData.files || []), newFile];

    // DB에 저장
    const { error: updateError } = await supabase
        .from('consultings')
        .update({ files: updatedFiles })
        .eq('id', consultingId);

    if (updateError) throw updateError;

    return updatedFiles;
};

// 4. 견적서 목록 불러오기 (layoutData 매핑 추가)
export const fetchQuotes = async (): Promise<Quote[]> => {
  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching quotes:', error);
    return [];
  }

  return data.map((item: any) => ({
    id: item.id,
    packageId: item.package_id,
    packageName: item.package_name,
    
    itemsCost: item.items_cost,
    logisticsCost: item.logistics_cost,
    installationCost: item.installation_cost,
    optionsCost: item.options_cost,
    discountAmount: item.discount_amount,
    vat: item.vat,
    totalCost: item.total_cost,
    deposit: item.deposit,
    
    date: new Date(item.created_at).toLocaleDateString(),
    validUntil: item.valid_until,
    status: item.status,
    version: item.version,
    
    scope: item.scope || [],
    timeline: item.timeline || [],
    requirements: item.requirements || [],
    
    grade: item.grade,
    warrantyPeriod: item.warranty_period,
    
    has3D: item.has_3d,
    is3DLinkSent: item.is_3d_link_sent,
    consultingIncluded: item.consulting_included,

    // [수정] 3D 배치 데이터 매핑
    layoutData: item.layout_data || null
  })) as Quote[];
};

// 5. 견적서 저장하기 (layout_data 저장 추가) - [수정] 로그인 체크 완화
export const createQuote = async (quote: Quote) => {
  const { data: { user } } = await supabase.auth.getUser();
  // 사용자가 없으면 'admin-test-id' 사용
  const userId = user ? user.id : 'admin-test-id';

  const { data, error } = await supabase
    .from('quotes')
    .insert([
      {
        id: quote.id, // 앱에서 생성한 QT-XXXX ID 사용
        user_id: userId,
        package_id: quote.packageId,
        package_name: quote.packageName,
        
        items_cost: quote.itemsCost,
        logistics_cost: quote.logisticsCost,
        installation_cost: quote.installationCost,
        options_cost: quote.optionsCost,
        discount_amount: quote.discountAmount,
        vat: quote.vat,
        total_cost: quote.totalCost,
        deposit: quote.deposit,
        
        valid_until: quote.validUntil,
        status: quote.status,
        version: quote.version,
        
        scope: quote.scope,
        timeline: quote.timeline,
        requirements: quote.requirements,
        
        grade: quote.grade,
        warranty_period: quote.warrantyPeriod,
        
        has_3d: quote.has3D,
        is_3d_link_sent: quote.is3DLinkSent,
        consulting_included: quote.consultingIncluded,

        // [수정] 3D 배치 데이터 저장
        layout_data: quote.layoutData
      }
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};
