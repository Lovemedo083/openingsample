import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, Loader2, Sparkles, RotateCcw, ChevronDown, ChevronUp, CheckCircle2, Download, Box, Save, MousePointer, Trash2 } from 'lucide-react';
import { Button } from './Components';
import { generate3DObject, fileToBase64, PointCoord } from '../utils/segmindApi';
import { GLBViewer3D } from './GLBViewer3D';
import { supabase } from '../utils/supabaseClient';

// --- Types ---

type Step = 'UPLOAD' | 'SELECT' | 'GENERATING' | 'RESULT';

interface UploadedImage {
  file: File;
  preview: string;
  naturalWidth: number;
  naturalHeight: number;
}

interface ClickPoint {
  // 이미지 원본 좌표 (API 전송용)
  imageX: number;
  imageY: number;
  // 화면 표시용 비율 좌표 (0~1)
  ratioX: number;
  ratioY: number;
}

interface FurnitureAsset {
  id?: string;
  name: string;
  clickPoints: ClickPoint[];
  glbUrl: string;
  splatUrl?: string;
  thumbnailUrl: string;
  createdAt: Date;
  inferenceTime?: number;
}

// --- Component ---

export const Furniture3DView: React.FC = () => {
  // State
  const [step, setStep] = useState<Step>('UPLOAD');
  const [image, setImage] = useState<UploadedImage | null>(null);
  const [clickPoints, setClickPoints] = useState<ClickPoint[]>([]);
  const [assetName, setAssetName] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [seed, setSeed] = useState<number | undefined>(undefined);
  const [prompt, setPrompt] = useState(''); // Optional text hint

  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Result State
  const [generatedAsset, setGeneratedAsset] = useState<FurnitureAsset | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // --- Handlers ---

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    // Revoke previous preview URL
    if (image) {
      URL.revokeObjectURL(image.preview);
    }

    // Get natural dimensions
    const preview = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setImage({
        file,
        preview,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
      });
      setStep('SELECT');
      setClickPoints([]);
      setError(null);
    };
    img.src = preview;

    // Auto-fill asset name from filename
    if (!assetName) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setAssetName(nameWithoutExt);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [image, assetName]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    if (image) {
      URL.revokeObjectURL(image.preview);
    }

    const preview = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setImage({
        file,
        preview,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
      });
      setStep('SELECT');
      setClickPoints([]);
      setError(null);
    };
    img.src = preview;

    if (!assetName) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setAssetName(nameWithoutExt);
    }
  }, [image, assetName]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleImageClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!image || !imageContainerRef.current) return;

    const container = imageContainerRef.current;
    const rect = container.getBoundingClientRect();

    // 클릭 위치 (컨테이너 내부 좌표)
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // 비율 좌표 (0~1)
    const ratioX = clickX / rect.width;
    const ratioY = clickY / rect.height;

    // 이미지 원본 좌표 계산
    const imageX = ratioX * image.naturalWidth;
    const imageY = ratioY * image.naturalHeight;

    const newPoint: ClickPoint = {
      imageX,
      imageY,
      ratioX,
      ratioY,
    };

    setClickPoints(prev => [...prev, newPoint]);
    setError(null);
  }, [image]);

  const handleRemovePoint = useCallback((index: number) => {
    setClickPoints(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleClearPoints = useCallback(() => {
    setClickPoints([]);
  }, []);

  const handleGenerate = async () => {
    if (!image) {
      setError('가구 사진을 업로드해주세요.');
      return;
    }

    if (clickPoints.length === 0) {
      setError('3D로 변환할 물체를 이미지에서 클릭해주세요.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setStep('GENERATING');
    setProgressMessage('이미지를 처리하고 있습니다...');
    setSaveSuccess(false);

    try {
      setProgressMessage('이미지를 인코딩하고 있습니다...');
      const imageBase64 = await fileToBase64(image.file);

      // Convert click points to API format
      const pointCoords: PointCoord[] = clickPoints.map(p => ({
        x: p.imageX,
        y: p.imageY,
      }));

      setProgressMessage('SAM 3D API로 3D 모델을 생성하고 있습니다...');
      const result = await generate3DObject(imageBase64, pointCoords, {
        prompt: prompt || undefined,
        seed,
        includeArtifacts: false,
      });

      setProgressMessage('3D 모델을 렌더링하고 있습니다...');

      const asset: FurnitureAsset = {
        name: assetName || '가구 에셋',
        clickPoints,
        glbUrl: result.glbUrl,
        splatUrl: result.splatUrl,
        thumbnailUrl: image.preview,
        createdAt: new Date(),
        inferenceTime: result.inferenceTime,
      };

      setGeneratedAsset(asset);
      setStep('RESULT');
    } catch (err) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setError(message);
      setStep('SELECT');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToDatabase = async () => {
    if (!generatedAsset) return;

    setIsSaving(true);
    setError(null);

    try {
      // Save metadata to database (furniture_assets table)
      // GLB URL is already hosted by Segmind, so we just save the reference
      const { data: insertData, error: insertError } = await supabase
        .from('furniture_assets')
        .insert({
          name: generatedAsset.name,
          glb_url: generatedAsset.glbUrl,
          splat_url: generatedAsset.splatUrl,
          thumbnail_url: generatedAsset.thumbnailUrl,
          created_at: generatedAsset.createdAt.toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        // Table might not exist - log and show partial success
        console.warn('[Furniture3D] DB insert error (table may not exist):', insertError);
        setSaveSuccess(true);
        return;
      }

      setGeneratedAsset(prev => prev ? { ...prev, id: insertData.id } : null);
      setSaveSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = () => {
    if (!generatedAsset) return;
    // Open GLB URL in new tab for download
    window.open(generatedAsset.glbUrl, '_blank');
  };

  const handleReset = () => {
    if (image) {
      URL.revokeObjectURL(image.preview);
    }
    // Note: glbUrl is now an external URL from Segmind, not a blob URL
    setImage(null);
    setClickPoints([]);
    setPrompt('');
    setAssetName('');
    setGeneratedAsset(null);
    setError(null);
    setStep('UPLOAD');
    setIsGenerating(false);
    setProgressMessage('');
    setShowDebug(false);
    setSaveSuccess(false);
  };

  const handleBackToSelect = () => {
    setStep('SELECT');
    setError(null);
  };

  // --- Render ---

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center">
              <Box size={18} />
            </div>
            <h1 className="font-bold text-lg">3D 가구 에셋 생성</h1>
          </div>
          {step !== 'UPLOAD' && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors"
            >
              <RotateCcw size={16} />
              처음으로
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* ── UPLOAD Step ── */}
        {step === 'UPLOAD' && (
          <div className="space-y-6 animate-fade-in">
            {/* Guide */}
            <div className="bg-brand-50 rounded-xl p-4 border border-brand-100">
              <p className="text-sm text-brand-800 font-medium mb-1">
                가구 또는 기자재 사진을 업로드해주세요.
              </p>
              <p className="text-xs text-brand-600">
                업로드 후 이미지에서 3D로 변환할 물체를 클릭하여 선택합니다.
              </p>
            </div>

            {/* Upload Area */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer
                hover:border-brand-400 hover:bg-brand-50/30 transition-all duration-200 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-brand-100 transition-colors">
                <Upload size={28} className="text-gray-400 group-hover:text-brand-600 transition-colors" />
              </div>
              <p className="font-semibold text-gray-700 mb-1">가구/기자재 사진을 드래그하거나 클릭하여 업로드</p>
              <p className="text-sm text-gray-400">JPG, PNG 지원</p>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
        )}

        {/* ── SELECT Step ── */}
        {step === 'SELECT' && image && (
          <div className="space-y-6 animate-fade-in">
            {/* Guide */}
            <div className="bg-brand-50 rounded-xl p-4 border border-brand-100">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MousePointer size={16} className="text-brand-700" />
                </div>
                <div>
                  <p className="text-sm text-brand-800 font-medium mb-1">
                    3D로 변환할 물체를 클릭해주세요
                  </p>
                  <p className="text-xs text-brand-600">
                    이미지에서 원하는 물체의 중심 부분을 클릭하세요. 여러 번 클릭하면 더 정확하게 인식됩니다.
                  </p>
                </div>
              </div>
            </div>

            {/* Clickable Image Area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">
                  클릭 포인트: {clickPoints.length}개
                </p>
                {clickPoints.length > 0 && (
                  <button
                    onClick={handleClearPoints}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium"
                  >
                    <Trash2 size={12} />
                    전체 삭제
                  </button>
                )}
              </div>

              <div
                ref={imageContainerRef}
                onClick={handleImageClick}
                className="relative rounded-xl overflow-hidden border-2 border-gray-200 cursor-crosshair bg-gray-100 select-none"
                style={{ touchAction: 'none' }}
              >
                <img
                  src={image.preview}
                  alt="업로드된 이미지"
                  className="w-full h-auto pointer-events-none"
                  draggable={false}
                />

                {/* Click Point Markers */}
                {clickPoints.map((point, index) => (
                  <div
                    key={index}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
                    style={{
                      left: `${point.ratioX * 100}%`,
                      top: `${point.ratioY * 100}%`,
                    }}
                  >
                    {/* Outer ring */}
                    <div className="w-8 h-8 rounded-full border-2 border-brand-600 bg-brand-600/20 flex items-center justify-center">
                      {/* Inner dot */}
                      <div className="w-3 h-3 rounded-full bg-brand-600" />
                    </div>
                    {/* Point number */}
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-brand-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {index + 1}
                    </div>
                    {/* Remove button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemovePoint(index);
                      }}
                      className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center
                        opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}

                {/* Click instruction overlay (when no points) */}
                {clickPoints.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                    <div className="bg-white/90 rounded-lg px-4 py-2 text-sm font-medium text-gray-700">
                      이미지를 클릭하여 물체 선택
                    </div>
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-400">
                * 클릭 포인트 위에 마우스를 올리면 삭제 버튼이 나타납니다.
              </p>
            </div>

            {/* Asset Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                에셋 이름
              </label>
              <input
                type="text"
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                placeholder="예: 원목 책상, 사무용 의자"
                className="block w-full rounded-lg border border-gray-300 shadow-sm text-gray-900 placeholder-gray-400
                  focus:border-brand-500 focus:ring-brand-500 sm:text-sm py-2.5 px-3 transition-colors"
              />
            </div>

            {/* Advanced Options */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <span>고급 설정</span>
                {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {showAdvanced && (
                <div className="px-4 pb-4 space-y-4 border-t border-gray-100">
                  <div className="pt-3">
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      텍스트 힌트 (선택)
                    </label>
                    <input
                      type="text"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="예: chair, desk, lamp"
                      className="block w-full rounded-lg border border-gray-300 shadow-sm text-gray-900 placeholder-gray-400
                        focus:border-brand-500 focus:ring-brand-500 sm:text-sm py-2.5 px-3 transition-colors"
                    />
                    <p className="mt-1.5 text-xs text-gray-400">
                      물체를 설명하는 영어 단어를 입력하면 인식 정확도가 높아질 수 있습니다.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      시드 값 (선택)
                    </label>
                    <input
                      type="number"
                      value={seed || ''}
                      onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="랜덤"
                      className="block w-full rounded-lg border border-gray-300 shadow-sm text-gray-900 placeholder-gray-400
                        focus:border-brand-500 focus:ring-brand-500 sm:text-sm py-2.5 px-3 transition-colors"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                다른 사진
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                fullWidth
                size="lg"
                onClick={handleGenerate}
                disabled={clickPoints.length === 0}
              >
                <Sparkles size={18} className="mr-2" />
                3D 에셋 생성하기
              </Button>
            </div>
          </div>
        )}

        {/* ── GENERATING Step ── */}
        {step === 'GENERATING' && (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
            <div className="w-20 h-20 bg-brand-50 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-brand-100">
              <Loader2 size={40} className="text-brand-600 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">3D 에셋 생성 중</h2>
            <p className="text-sm text-gray-500 text-center max-w-sm mb-2">
              {progressMessage}
            </p>
            <p className="text-xs text-gray-400 mb-8">
              선택된 포인트: {clickPoints.length}개
            </p>

            {image && (
              <div className="relative w-48 h-48 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                <img
                  src={image.preview}
                  alt="원본 이미지"
                  className="w-full h-full object-contain bg-gray-100"
                />
                {/* Show click points on thumbnail */}
                {clickPoints.map((point, index) => (
                  <div
                    key={index}
                    className="absolute w-3 h-3 bg-brand-600 rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${point.ratioX * 100}%`,
                      top: `${point.ratioY * 100}%`,
                    }}
                  />
                ))}
              </div>
            )}

            <button
              onClick={handleReset}
              className="mt-8 text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors"
            >
              취소
            </button>
          </div>
        )}

        {/* ── RESULT Step ── */}
        {step === 'RESULT' && generatedAsset && (
          <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={28} />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">3D 에셋 생성 완료</h2>
              <p className="text-sm font-medium text-brand-600">{generatedAsset.name}</p>
            </div>

            {/* 3D GLB Viewer */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700">3D 뷰어</p>
              <GLBViewer3D glbUrl={generatedAsset.glbUrl} />
            </div>

            {/* Original Image with Points */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700">원본 이미지</p>
              <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                <img
                  src={generatedAsset.thumbnailUrl}
                  alt="원본 이미지"
                  className="w-full max-h-64 object-contain bg-gray-100"
                />
                {/* Show click points */}
                {generatedAsset.clickPoints.map((point, index) => (
                  <div
                    key={index}
                    className="absolute w-4 h-4 bg-brand-600 rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
                    style={{
                      left: `${point.ratioX * 100}%`,
                      top: `${point.ratioY * 100}%`,
                    }}
                  >
                    <span className="text-[8px] text-white font-bold">{index + 1}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400">
                선택된 포인트 {generatedAsset.clickPoints.length}개
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Save Success */}
            {saveSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 flex items-center gap-2">
                <CheckCircle2 size={16} />
                데이터베이스에 저장되었습니다.
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  fullWidth
                  onClick={handleDownload}
                >
                  <Download size={16} className="mr-2" />
                  GLB 다운로드
                </Button>
                <Button
                  fullWidth
                  onClick={handleSaveToDatabase}
                  disabled={isSaving || saveSuccess}
                >
                  {isSaving ? (
                    <Loader2 size={16} className="mr-2 animate-spin" />
                  ) : (
                    <Save size={16} className="mr-2" />
                  )}
                  {saveSuccess ? '저장 완료' : 'DB에 저장'}
                </Button>
              </div>
              <Button variant="outline" fullWidth onClick={handleReset}>
                <RotateCcw size={16} className="mr-2" />
                다시 만들기
              </Button>
            </div>

            {/* Debug Data */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <span>에셋 정보 (디버그)</span>
                {showDebug ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {showDebug && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <pre className="mt-3 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify({
                      id: generatedAsset.id,
                      name: generatedAsset.name,
                      clickPoints: generatedAsset.clickPoints.map(p => ({
                        imageCoords: [Math.round(p.imageX), Math.round(p.imageY)],
                        ratio: [p.ratioX.toFixed(3), p.ratioY.toFixed(3)],
                      })),
                      glbUrl: generatedAsset.glbUrl,
                      splatUrl: generatedAsset.splatUrl,
                      inferenceTime: generatedAsset.inferenceTime,
                      createdAt: generatedAsset.createdAt.toISOString(),
                    }, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
