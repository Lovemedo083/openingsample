/**
 * Segmind SAM 3D Object API 유틸리티
 * 이미지 기반 3D 가구 에셋 생성 API 호출을 담당합니다.
 */

const API_URL = 'https://api.segmind.com/v1/sam-3d-objects';

function getApiKey(): string {
  const key = import.meta.env.VITE_SEGMIND_API_KEY;
  if (!key) {
    throw new Error('VITE_SEGMIND_API_KEY 환경변수가 설정되지 않았습니다.');
  }
  return key;
}

// --- Types ---

export interface PointCoord {
  x: number;
  y: number;
}

export interface SegmindRequest {
  image: string; // Base64 encoded image
  prompt?: string; // Object description for segmentation (optional)
  point_coords?: number[][]; // Click coordinates [[x1, y1], [x2, y2], ...]
  bounding_box?: number[]; // [x1, y1, x2, y2]
  seed?: number;
  include_artifacts?: boolean;
}

export interface SegmindResponse {
  model_glb?: string; // URL to GLB file
  gaussian_splat?: string; // URL to PLY splat file
  individual_meshes?: Array<{
    url: string;
    file_name: string;
    file_size: number;
    content_type: string;
  }>;
  status?: string;
  error?: string;
  inference_time?: number;
}

// --- API Functions ---

export interface Generate3DResult {
  glbUrl: string;
  splatUrl?: string;
  individualMeshes?: SegmindResponse['individual_meshes'];
  inferenceTime?: number;
}

/**
 * 이미지에서 3D 객체를 생성합니다. (클릭 좌표 기반)
 * @param imageBase64 Base64 인코딩된 이미지 (접두사 제외)
 * @param pointCoords 클릭 좌표 배열 [{x, y}, ...]
 * @param options 추가 옵션 (prompt, seed, includeArtifacts)
 * @returns GLB URL 및 기타 결과
 */
export async function generate3DObject(
  imageBase64: string,
  pointCoords: PointCoord[],
  options?: { prompt?: string; seed?: number; includeArtifacts?: boolean }
): Promise<Generate3DResult> {
  const { prompt, seed, includeArtifacts = false } = options || {};

  // Convert point coords to API format [[x1, y1], [x2, y2], ...]
  const pointCoordsArray = pointCoords.map(p => [Math.round(p.x), Math.round(p.y)]);

  const requestBody: SegmindRequest = {
    image: imageBase64,
    point_coords: pointCoordsArray,
    include_artifacts: includeArtifacts,
  };

  if (prompt) {
    requestBody.prompt = prompt;
  }

  if (seed !== undefined) {
    requestBody.seed = seed;
  }

  console.log(`[Segmind] POST ${API_URL}`);
  console.log(`[Segmind] Point coords:`, pointCoordsArray);
  if (prompt) console.log(`[Segmind] Prompt: ${prompt}`);

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': getApiKey(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[Segmind] Error ${response.status}:`, errorBody);
    throw new Error(`Segmind API 오류 (${response.status}): ${errorBody}`);
  }

  const result = await response.json() as SegmindResponse;
  console.log(`[Segmind] Response received:`, result);

  if (result.error) {
    throw new Error(`3D 생성 실패: ${result.error}`);
  }

  if (result.status !== 'Success' || !result.model_glb) {
    console.error(`[Segmind] Full response:`, JSON.stringify(result, null, 2));
    throw new Error(`3D 모델 생성 실패. 상태: ${result.status}`);
  }

  console.log(`[Segmind] GLB URL: ${result.model_glb}`);
  console.log(`[Segmind] Inference time: ${result.inference_time}s`);

  return {
    glbUrl: result.model_glb,
    splatUrl: result.gaussian_splat,
    individualMeshes: result.individual_meshes,
    inferenceTime: result.inference_time,
  };
}

/**
 * 파일을 Base64 문자열로 변환합니다. (data: 접두사 포함)
 */
export function fileToBase64WithPrefix(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 파일을 Base64 문자열로 변환합니다. (data: 접두사 제외)
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Base64 GLB 데이터를 Blob URL로 변환합니다.
 */
export function base64ToGLBUrl(base64: string): string {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: 'model/gltf-binary' });
  return URL.createObjectURL(blob);
}

/**
 * Base64 GLB 데이터를 다운로드 가능한 파일로 변환합니다.
 */
export function downloadGLB(base64: string, filename: string = 'model.glb'): void {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: 'model/gltf-binary' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
