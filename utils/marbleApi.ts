/**
 * World Labs Marble API 유틸리티
 * 이미지 기반 3D 공간 스캐닝 API 호출을 담당합니다.
 */

// 개발 환경: Vite proxy(/api/marble → api.worldlabs.ai/marble/v1)
// 프로덕션 환경: 직접 호출 (서버 사이드 프록시 필요)
const API_BASE_URL = import.meta.env.DEV
  ? '/api/marble'
  : 'https://api.worldlabs.ai/marble/v1';

const CDN_ORIGIN = 'https://cdn.marble.worldlabs.ai';

/**
 * CDN URL을 개발 환경에서는 프록시 경로로 변환합니다.
 * 프로덕션 환경에서는 원본 URL을 그대로 반환합니다.
 */
export function proxyCdnUrl(url: string): string {
  if (import.meta.env.DEV && url.startsWith(CDN_ORIGIN)) {
    return url.replace(CDN_ORIGIN, '/cdn/marble');
  }
  return url;
}

function getApiKey(): string {
  const key = import.meta.env.VITE_MARBLE_API_KEY;
  if (!key) {
    throw new Error('VITE_MARBLE_API_KEY 환경변수가 설정되지 않았습니다.');
  }
  return key;
}

async function apiFetch<T>(path: string, method: string = 'GET', body?: unknown): Promise<T> {
  const url = `${API_BASE_URL}/${path}`;
  const headers: Record<string, string> = {
    'WLT-Api-Key': getApiKey(),
    'Content-Type': 'application/json',
  };

  console.log(`[Marble] ${method} ${url}`);

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error(`[Marble] Error ${res.status}:`, errorBody);
    throw new Error(`Marble API 오류 (${res.status}): ${errorBody}`);
  }

  const text = await res.text();
  const parsed = text ? JSON.parse(text) : ({} as T);
  console.log(`[Marble] Response:`, parsed);
  return parsed;
}

// --- Types ---

export type MarbleModel = 'Marble 0.1-mini' | 'Marble 0.1-plus';

export interface MarbleWorldPrompt {
  type: 'image' | 'text';
  text_prompt?: string | null;
  disable_recaption?: boolean;
  image_prompt?: {
    source: 'data_base64';
    data_base64: string;
  } | null;
}

export interface MarbleGenerateRequest {
  world_prompt: MarbleWorldPrompt;
  model: MarbleModel;
  seed?: number | null;
}

export interface MarbleOperation {
  operation_id: string;
  done?: boolean;
  response?: {
    world_id: string;
  };
  error?: {
    code?: number;
    message?: string;
  };
  [key: string]: unknown;
}

export interface MarbleWorldAssets {
  mesh?: {
    collider_mesh_url?: string | null;
  };
  imagery?: {
    pano_url?: string;
  };
  splats?: {
    spz_urls?: {
      '100k'?: string;
      '500k'?: string;
      full_res?: string;
    };
  };
  thumbnail_url?: string;
  caption?: string;
}

export interface MarbleWorld {
  world_id: string;
  display_name?: string;
  assets?: MarbleWorldAssets;
  world_marble_url?: string;
  model?: string;
  created_at?: string;
  [key: string]: unknown;
}

// --- API Functions ---

export async function generateWorld(
  imageBase64: string | null,
  textPrompt: string,
  options?: { draft?: boolean; seed?: number | null; autoEnhance?: boolean }
): Promise<string> {
  const { draft = true, seed = null, autoEnhance = true } = options || {};

  const worldPrompt: MarbleWorldPrompt = {
    type: imageBase64 ? 'image' : 'text',
    text_prompt: textPrompt || null,
    disable_recaption: !autoEnhance,
    image_prompt: imageBase64
      ? { source: 'data_base64', data_base64: imageBase64 }
      : null,
  };

  const result = await apiFetch<{ operation_id: string }>('worlds:generate', 'POST', {
    world_prompt: worldPrompt,
    model: draft ? 'Marble 0.1-mini' : 'Marble 0.1-plus',
    seed,
  });

  return result.operation_id;
}

export async function getOperation(operationId: string): Promise<MarbleOperation> {
  return apiFetch<MarbleOperation>(`operations/${operationId}`);
}

export async function getWorld(worldId: string): Promise<MarbleWorld> {
  return apiFetch<MarbleWorld>(`worlds/${worldId}`);
}

/**
 * 파일을 Base64 문자열로 변환합니다.
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // data:image/...;base64, 접두사 제거
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const POLL_TIMEOUT_MS = 5 * 60 * 1000; // 5분 타임아웃

/**
 * 생성 완료까지 폴링합니다.
 * onProgress 콜백으로 진행 상태를 전달합니다.
 */
export async function pollUntilDone(
  operationId: string,
  onProgress?: (op: MarbleOperation) => void,
  intervalMs: number = 5000
): Promise<MarbleWorld> {
  const startTime = Date.now();
  let pollCount = 0;

  while (true) {
    // 타임아웃 체크
    if (Date.now() - startTime > POLL_TIMEOUT_MS) {
      throw new Error('3D 생성 시간이 초과되었습니다 (5분). 다시 시도해주세요.');
    }

    pollCount++;
    const operation = await getOperation(operationId);
    console.log(`[Marble] Poll #${pollCount}:`, operation);
    onProgress?.(operation);

    // 완료 + 성공
    if (operation.done && operation.response?.world_id) {
      const world = await getWorld(operation.response.world_id);
      return world;
    }

    // 완료 + 에러 (world_id 없이 done인 경우)
    if (operation.done) {
      const errMsg = operation.error?.message || JSON.stringify(operation);
      throw new Error(`3D 생성 실패: ${errMsg}`);
    }

    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
}
