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
export type TaskCategoryGroup = 'CONSTRUCTION' | 'OPERATION' | 'INFO' | 'OPENING_LITE';

export interface OpenTaskCategory {
  id: TaskCategoryGroup;
  label: string;
  description: string;
}

// --- [Updated] Task Item Definition ---
export interface OpenTaskItem {
  id: string;
  title: string;
  description: string;
  category: TaskCategoryGroup; // Grouping
  iconType: string; // Icon mapping string
  leadTime?: string; // Optional if not used everywhere
  isRequired?: boolean;
  isOpeningExclusive?: boolean; // Opening exclusive badge
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
export type MainTab = 'HOME' | 'LISTINGS' | 'QUOTE' | 'CONSULTING' | 'MORE' | 'FAQ'; // [Updated] Added FAQ

export type AppStep = 
  | 'TAB_VIEW' // Shows the main tabs
  | 'SPACE_INPUT' // Wizard Flow
  | 'PLANNER'
  | 'QUOTE_GEN'
  | 'CONSULTING_WIZARD'; // Overlay Flow
