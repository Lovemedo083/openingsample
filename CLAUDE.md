# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Opening (오프닝)** — A Korean startup equipment/furniture trading platform with 2D layout validation. Users browse packages, arrange furniture in a 2D planner with collision detection, generate cost quotes, and book consulting sessions.

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build (vite build)
npm run preview      # Preview production build
```

No test runner or linter is currently configured. TypeScript checking can be run via `npx tsc --noEmit`.

## Tech Stack

- **Frontend:** React 19 + TypeScript, Vite 6, Tailwind CSS (CDN)
- **Backend:** Supabase (PostgreSQL, Auth, File Storage)
- **Icons:** lucide-react | **Charts:** recharts

## Architecture

**Single-page app with tab-based navigation** — `App.tsx` is the central orchestrator holding all top-level state and rendering views based on the active tab.

### State & Auth
- `hooks/useAppAuth.ts` — Custom hook managing authentication state, session persistence, and initial data loading (consultings, quotes). Returns user state and data to `App.tsx`.
- Auth uses Supabase Auth with guest login fallback.

### Key User Flows

1. **Planner → Quote:** Select package → Enter space dimensions → Place items in `Planner2D` (2D top-down view) → Auto-generate quote → Save to Supabase
2. **Consulting:** Category/task selection → File upload → Booking confirmation → Track in "My Consultations"

### Component Structure
- `components/` — One file per view/feature. Views are rendered by `App.tsx` based on `activeTab` state.
- `Planner2D.tsx` — 2D furniture placement canvas with drag-and-drop. Uses `plannerUtils.ts` for collision detection, wall boundary checks, and clearance validation.
- `ConsultingModule.tsx` — Multi-step consulting booking wizard with file upload support.
- `Components.tsx` — Shared UI primitives (Button, Input, Card, etc.).
- `ModalWrapper.tsx` — Glassmorphism modal overlay used for planner and consulting flows.

### Utilities
- `utils/plannerUtils.ts` — Layout validation: collision detection between items, wall boundary enforcement, clearance checks.
- `utils/quoteUtils.ts` — Cost calculation: base item cost + per-item logistics + installation (3% of items) + VAT.
- `utils/api.ts` — Supabase CRUD operations for consultings and quotes, plus file upload to `uploads` storage bucket.
- `utils/supabaseClient.ts` — Supabase client singleton initialized from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars.

### Data & Config
- `types.ts` — All TypeScript interfaces and enums (Tab, Package, ConsultingBooking, PlacedItem, etc.).
- `constants.ts` — Business category tree, task definitions (6 categories × 20+ tasks), and pricing constants.

## Styling

- Tailwind CSS loaded via CDN with custom color extensions (blue palette brand colors).
- `index.css` defines CSS variables for brand colors and glassmorphism effects.
- Mobile-first responsive: `BottomNav` for mobile, `Sidebar` for desktop.
- Font: Noto Sans KR.

## Supabase Tables

- `consultings` — Booking records (user_id, business_type, region, area, budget, target_date, status, selected_task_ids, task_details, files)
- `quotes` — Generated quotes with item/logistics/installation costs and layout data

## Environment

Requires `.env` with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_MARBLE_API_KEY`. All UI text is in Korean.

---

## 진행 상황 (2026-02-02)

### 완료된 작업: 3D 공간 스캐닝 기능 구현

`refactor/app-structure` 브랜치에 World Labs Marble API 기반 3D 공간 스캐닝 기능을 구현했습니다.

#### 새로 추가된 파일
- `components/Scanner3DView.tsx` — 3D 스캐닝 메인 컴포넌트
  - 다중 이미지 업로드 (드래그 & 드롭)
  - 기준 이미지 선택
  - 인테리어 스타일 텍스트 프롬프트
  - 모델 품질 선택 (mini/plus)
  - 생성 진행 상태 + 타임아웃 처리
  - 결과: 썸네일, 파노라마, AI 설명, World Labs 뷰어 링크, 3D Splat 뷰어
- `components/SplatViewer3D.tsx` — Spark.js 기반 Gaussian Splat 3D 뷰어
  - .spz 파일 브라우저 내 인터랙티브 렌더링
  - 마우스 드래그 회전, 스크롤 줌, 전체화면
  - 100k/500k/Full 해상도 전환
- `utils/marbleApi.ts` — Marble API 유틸리티
  - `generateWorld()` — 이미지 + 텍스트로 3D 공간 생성
  - `pollUntilDone()` — 생성 완료까지 폴링 (5분 타임아웃)
  - `proxyCdnUrl()` — CDN URL을 dev proxy 경로로 변환
- `scanner.html` / `scanner.tsx` — 독립 진입점

#### Vite 설정 변경 (`vite.config.ts`)
- `/api/marble` → `api.worldlabs.ai/marble/v1` 프록시 (API 호출)
- `/cdn/marble` → `cdn.marble.worldlabs.ai` 프록시 (SPZ 파일 로드, CORS 우회)
- multi-page 빌드 설정 (index.html, scanner.html)

#### 의존성 추가 (`package.json`)
- `three` — Three.js
- `@sparkjsdev/spark` — Gaussian Splat 렌더러
- `@types/three` — (devDependencies)

### 테스트 방법
```bash
cd C:/Axolotl/Opening
npm install
npm run dev
# 브라우저에서 http://localhost:3000/scanner.html 접속
```

### Git 브랜치 상태
- `main` — revert 상태 (3D 기능 미포함)
- `refactor/app-structure` — 3D 스캐닝 기능 포함 (이 브랜치에서 개발 진행)

### 다음 작업 (TODO)
- [ ] `Opening/` 로컬 폴더 삭제 (node_modules 때문에 삭제 안됨 — 터미널/에디터 닫고 삭제)
- [ ] 루트에서 `npm install` 후 개발 환경 정상 동작 확인
- [ ] 3D 기능을 기존 Opening 서비스에 통합 (현재는 독립 컴포넌트)
- [ ] 3D_feature.md의 "3D 가구" 기능 구현 (SAM 3D Object)
- [ ] main 브랜치에 최종 merge
