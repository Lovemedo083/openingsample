import { supabase } from './supabaseClient';
import { ConsultingBooking, Quote, FurnitureListing } from '../types';

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

// ============ 가구 거래 API ============

// 6. 가구 매물 목록 조회
export const fetchFurnitureListings = async (category?: string): Promise<FurnitureListing[]> => {
  let query = supabase
    .from('furniture_listings')
    .select('*')
    .eq('status', 'ACTIVE')
    .order('created_at', { ascending: false });

  if (category && category !== 'ALL') {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching furniture listings:', error);
    return [];
  }

  return data.map((item: any) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    category: item.category,
    condition: item.condition,
    price: Number(item.price),
    originalPrice: item.original_price ? Number(item.original_price) : undefined,
    width: item.width,
    height: item.height,
    depth: item.depth,
    images: item.images || [],
    location: item.location,
    sellerId: item.seller_id,
    sellerName: item.seller_name,
    sellerPhone: item.seller_phone,
    status: item.status,
    views: item.views,
    likes: item.likes,
    isNegotiable: item.is_negotiable,
    isDeliveryAvailable: item.is_delivery_available,
    tags: item.tags || [],
    createdAt: item.created_at
  })) as FurnitureListing[];
};

// 7. 가구 매물 상세 조회
export const fetchFurnitureDetail = async (id: string): Promise<FurnitureListing | null> => {
  // 조회수 증가
  await supabase
    .from('furniture_listings')
    .update({ views: supabase.rpc('increment_views') })
    .eq('id', id)
    .catch(() => {});

  const { data, error } = await supabase
    .from('furniture_listings')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching furniture detail:', error);
    return null;
  }

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    category: data.category,
    condition: data.condition,
    price: Number(data.price),
    originalPrice: data.original_price ? Number(data.original_price) : undefined,
    width: data.width,
    height: data.height,
    depth: data.depth,
    images: data.images || [],
    location: data.location,
    sellerId: data.seller_id,
    sellerName: data.seller_name,
    sellerPhone: data.seller_phone,
    status: data.status,
    views: data.views,
    likes: data.likes,
    isNegotiable: data.is_negotiable,
    isDeliveryAvailable: data.is_delivery_available,
    tags: data.tags || [],
    createdAt: data.created_at
  };
};

// 8. 가구 매물 등록
export const createFurnitureListing = async (listing: Partial<FurnitureListing>): Promise<FurnitureListing> => {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('furniture_listings')
    .insert([{
      title: listing.title,
      description: listing.description,
      category: listing.category,
      condition: listing.condition,
      price: listing.price,
      original_price: listing.originalPrice,
      width: listing.width,
      height: listing.height,
      depth: listing.depth,
      images: listing.images || [],
      location: listing.location,
      seller_id: user?.id,
      seller_name: listing.sellerName,
      seller_phone: listing.sellerPhone,
      is_negotiable: listing.isNegotiable ?? true,
      is_delivery_available: listing.isDeliveryAvailable ?? false,
      tags: listing.tags || [],
      status: 'ACTIVE'
    }])
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    category: data.category,
    condition: data.condition,
    price: Number(data.price),
    originalPrice: data.original_price ? Number(data.original_price) : undefined,
    width: data.width,
    height: data.height,
    depth: data.depth,
    images: data.images || [],
    location: data.location,
    sellerId: data.seller_id,
    sellerName: data.seller_name,
    sellerPhone: data.seller_phone,
    status: data.status,
    views: data.views,
    likes: data.likes,
    isNegotiable: data.is_negotiable,
    isDeliveryAvailable: data.is_delivery_available,
    tags: data.tags || [],
    createdAt: data.created_at
  };
};

// 9. 가구 이미지 업로드
export const uploadFurnitureImage = async (file: File): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `furniture/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('uploads')
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('uploads')
    .getPublicUrl(fileName);

  return publicUrl;
};

// ============ 인증 API ============

// 10. 이메일 회원가입
export const signUpWithEmail = async (email: string, password: string, name: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
      emailRedirectTo: window.location.origin
    }
  });

  if (error) throw error;
  return data;
};

// 11. 이메일 로그인
export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
};

// ============ 결제 API ============

// 12. 결제 생성 (토스 결제 전 저장)
export const createPayment = async (paymentData: {
  orderId: string;
  furnitureListingId: string;
  amount: number;
  sellerId?: string;
}) => {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('payments')
    .insert([{
      order_id: paymentData.orderId,
      furniture_listing_id: paymentData.furnitureListingId,
      buyer_id: user?.id,
      seller_id: paymentData.sellerId,
      amount: paymentData.amount,
      status: 'PENDING'
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

// 13. 결제 완료 처리
export const completePayment = async (orderId: string, paymentKey: string) => {
  const { data, error } = await supabase
    .from('payments')
    .update({
      payment_key: paymentKey,
      status: 'COMPLETED',
      approved_at: new Date().toISOString()
    })
    .eq('order_id', orderId)
    .select()
    .single();

  if (error) throw error;

  // 가구 매물 상태를 SOLD로 변경
  if (data?.furniture_listing_id) {
    await supabase
      .from('furniture_listings')
      .update({ status: 'SOLD' })
      .eq('id', data.furniture_listing_id);
  }

  return data;
};

// 14. 결제 취소
export const cancelPayment = async (orderId: string) => {
  const { data, error } = await supabase
    .from('payments')
    .update({
      status: 'CANCELLED',
      cancelled_at: new Date().toISOString()
    })
    .eq('order_id', orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// 15. 내 결제 내역 조회
export const fetchMyPayments = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('payments')
    .select(`
      *,
      furniture_listings (title, images)
    `)
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching payments:', error);
    return [];
  }

  return data;
};
