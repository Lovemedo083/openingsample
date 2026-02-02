// Business Types
export enum BusinessType {
  CAFE = 'CAFE',
  CHICKEN = 'CHICKEN',
  BAKERY = 'BAKERY',
  PUB = 'PUB',
  DELIVERY = 'DELIVERY',
  RETAIL = 'RETAIL',
  BEAUTY = 'BEAUTY',
  EDUCATION = 'EDUCATION',
  FITNESS = 'FITNESS',
  ENTERTAINMENT = 'ENTERTAINMENT',
  OTHER = 'OTHER'
}

// Item Grade
export enum ItemGrade {
  A = 'A', // Like New
  B = 'B', // Good
  C = 'C', // Usable
}

// Requirements for utilities
export interface UtilityReq {
  electric: boolean; // Needs power
  water: boolean;    // Needs plumbing
  gas: boolean;      // Needs gas
  vent: boolean;     // Needs ventilation
}

// An individual item (product)
export interface Product {
  id: string;
  name: string;
  category: string;
  width: number; // cm
  depth: number; // cm
  height: number; // cm
  price: number; // KRW
  grade: ItemGrade;
  utility: UtilityReq;
  image: string; // URL
  clearance: { // Required extra space cm
    front: number;
    side: number;
  };
}

export type ListingSource = 'USER' | 'OPENING'; // User Generated vs Platform Certified

// User Interface
export interface User {
  id: string;
  name: string;
  phone: string;
  type: 'KAKAO' | 'PHONE';
  joinedDate: string;
}

// A package of items
export interface Package {
  id: string;
  source: ListingSource; // New field to distinguish source
  name: string;
  description: string;
  businessType: BusinessType | string;
  image: string; // Main thumbnail image
  items: Product[];
  totalPrice: number;
  location: string;
  leadTimeDays: number;
  has3D: boolean;
  badges: string[];
  
  // Specific to User Listings (Closure/Transfer)
  deadline?: string; // e.g., "7일 내", "30일"
  hopePrice?: number; // Used for User Listings instead of standardized TotalPrice
  tags?: string[]; // For filtering in Home View (e.g., 'kitchen', 'quick')

  // Specific to Opening Packages
  grade?: string; // Overall Grade (A, B)
  warranty?: string; // e.g., "30일", "6개월"
  
  deposit?: number; // Optional rent deposit
  monthlyRent?: number; // Optional monthly rent
  discountRate?: number;
  newPriceEstimate?: number;
}

// Filter State for Listings
export interface FilterState {
  budgetRange: [number, number]; // 0 to 100,000,000+
  areaRange: [number, number]; // 0 to 100+ pyung
  leadTime: 'ALL' | '7DAYS' | '14DAYS';
  has3D: boolean;
  grade: ItemGrade[]; // Selected grades
  services: string[]; // 'INSTALL', 'DEMOLITION', 'CLEANING'
}

// Room Dimensions
export interface RoomDimensions {
  width: number; // cm
  depth: number; // cm
  height: number; // cm
  doorX: number; // location of door on bottom wall
  doorWidth: number;
}

// Placed Item in the Planner
export interface PlacedItem extends Product {
  instanceId: string;
  x: number; // cm from left
  y: number; // cm from top
  rotation: number; // degrees
  isCollision: boolean;
  isWallViolation: boolean;
  warnings: string[];
}

// --- Quote Related Types (Updated) ---

export type QuoteStatus = 'DRAFT' | 'REVIEWING' | 'CONFIRMED' | 'COMPLETED' | 'EXPIRED';

// Timeline Item for Quote
export interface TimelineItem {
  stage: string;
  duration: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE';
}

// Scope Item for Quote (Included/Excluded)
export interface ScopeItem {
    category: string;
    items: string[];
    isIncluded: boolean; // true: 포함, false: 미포함(별도)
}

// Quote structure
export interface Quote {
  id: string;
  packageId: string;
  packageName: string; // 패키지명 표시용
  
  // Cost Breakdown
  itemsCost: number;
  logisticsCost: number;
  installationCost: number;
  optionsCost: number; // 옵션 비용
  discountAmount: number; // 할인
  vat: number;
  totalCost: number;
  deposit: number; // 10%

  // Metadata
  date: string;
  validUntil: string; // 만료일
  status: QuoteStatus; // 상태
  version: number; // 버전

  // Details for View
  scope: ScopeItem[]; // 포함/미포함 범위
  timeline: TimelineItem[]; // 일정표
  requirements: string[]; // 사용자 준비물
  
  // CS & Warranty
  grade: string;
  warrantyPeriod: string;
  
  // 3D & Consulting
  has3D: boolean;
  is3DLinkSent: boolean;
  consultingIncluded: boolean;

  // [New] 3D Layout Data (Storage for Planner state)
  layoutData?: {
    room: RoomDimensions;
    placedItems: PlacedItem[];
  };
}

// Consulting Types
export interface ConsultingOption {
  id: string;
  title: string;
  durationMin: number;
  price: number;
  description: string;
  isOnline: boolean;
}

// --- [Updated] Task Categories ---
export type TaskCategoryGroup = 'PLANNING' | 'LOCATION' | 'PERMIT' | 'CONSTRUCTION' | 'EQUIPMENT' | 'SYSTEM' | 'OPERATION' | 'MARKETING';

export interface OpenTaskCategory {
  id: TaskCategoryGroup;
  label: string;
  description: string;
}

// 업종 타입 (체크리스트 필터링용)
export type BusinessCategoryType =
  | 'ALL'           // 공통 (모든 업종)
  | 'FOOD'          // 음식점/식당
  | 'CAFE'          // 카페/커피
  | 'RETAIL'        // 소매/유통
  | 'BEAUTY'        // 미용 (헤어, 네일, 피부)
  | 'FITNESS'       // 헬스/필라테스
  | 'EDUCATION'     // 학원/교육
  | 'ENTERTAINMENT' // PC방/오락시설
  | 'HOTEL'         // 호텔/숙박시설
  | 'OFFICE'        // 사무실
  | 'OTHER';        // 기타

// --- [Updated] Task Item Definition ---
export interface OpenTaskItem {
  id: string;
  title: string;
  description: string;
  category: TaskCategoryGroup; // Grouping
  iconType: string; // Icon mapping string
  applicableTo: BusinessCategoryType[]; // 적용 업종 (ALL이면 모든 업종)
  leadTime?: string; // Optional if not used everywhere
  isRequired?: boolean;
  isOpeningExclusive?: boolean; // Opening exclusive badge
  isCustom?: boolean; // PM이 추가한 커스텀 항목 여부
}

// --- [New] Task Detail Form Data ---
export interface TaskDetailData {
  taskId: string;
  // Common fields
  startDate?: string;
  priority?: 'COST' | 'SPEED' | 'QUALITY';
  note?: string;
  // Flexible fields
  [key: string]: any; 
}

// --- [Updated] Consulting Booking ---
export interface ConsultingBooking {
  id: string;
  // Context Info
  businessType: string; // Major/Middle/Minor string
  region?: string;
  area?: number;
  budget?: number | string; // Allow string for flexibility or number
  targetDate?: string;
  
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  consultantName: string;
  typeLabel: string;
  
  // Selection & Details
  selectedTaskIds: string[];
  taskDetails?: TaskDetailData[]; // Details per task
  
  // [Added] File Attachments
  files?: { name: string; url: string; status: string; uploadedAt?: string }[];
  rawFiles?: File[]; // [New] For upload handling

  date: string; // Booking date
  timeSlot?: string;
  
  // Legacy compatibility if needed
  optionId?: string;
}

// Category Tree Structure
export interface CategoryNode {
  id: string;
  label: string;
  icon?: any; // For UI
  children?: CategoryNode[];
}

// Navigation Types
export type MainTab = 'HOME' | 'LISTINGS' | 'FURNITURE' | 'QUOTE' | 'CONSULTING' | 'MORE' | 'FAQ' | 'CHECKLIST' | 'VENDORS' | 'SUPPORT' | 'DISTRICTS' | 'PROJECT' | 'ONBOARDING' | '3D_INTERIOR' | 'PROFILE';

// 창업 프로젝트 상태
export type ProjectStatus = 'DRAFT' | 'PM_ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

// 창업 프로젝트
export interface StartupProject {
  id: string;
  business_category: string;
  business_detail?: string;
  location_city: string;
  location_district: string;
  location_dong: string;
  store_size: number;
  store_floor: string;
  budget_total?: number;
  budget_own?: number;
  budget_loan?: number;
  estimated_total: number;
  status: ProjectStatus;
  pm_id?: string;
  created_at: string;
  pm?: {
    id: string;
    name: string;
    phone: string;
    profile_image: string;
    introduction: string;
    rating: number;
  };
}

// 가구 매물 상태
export type FurnitureCondition = 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR';
export type FurnitureStatus = 'ACTIVE' | 'RESERVED' | 'SOLD' | 'DELETED';

// 가구 거래 매물
export interface FurnitureListing {
  id: string;
  title: string;
  description: string;
  category: string;
  condition: FurnitureCondition;
  price: number;
  originalPrice?: number;
  width?: number;
  height?: number;
  depth?: number;
  images: string[];
  location: string;
  sellerId?: string;
  sellerName: string;
  sellerPhone: string;
  status: FurnitureStatus;
  views: number;
  likes: number;
  isNegotiable: boolean;
  isDeliveryAvailable: boolean;
  tags: string[];
  createdAt: string;
}

// 결제 정보
export interface PaymentInfo {
  orderId: string;
  orderName: string;
  amount: number;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  furnitureId?: string;
}

export type AppStep = 
  | 'TAB_VIEW' // Shows the main tabs
  | 'SPACE_INPUT' // Wizard Flow
  | 'PLANNER'
  | 'QUOTE_GEN'
  | 'CONSULTING_WIZARD'; // Overlay Flow
