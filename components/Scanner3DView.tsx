import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Loader2, Image, Sparkles, RotateCcw, ChevronDown, ChevronUp, CheckCircle2, ExternalLink, Box } from 'lucide-react';
import { Button } from './Components';
import { generateWorld, fileToBase64, pollUntilDone, proxyCdnUrl, MarbleWorld, MarbleOperation } from '../utils/marbleApi';
import { SplatViewer3D } from './SplatViewer3D';

// --- Types ---

type ScanStep = 'UPLOAD' | 'GENERATING' | 'RESULT';
type ModelQuality = 'draft' | 'plus';
type SplatQuality = '100k' | '500k' | 'full_res';

interface UploadedImage {
  file: File;
  preview: string;
}

// --- Component ---

export const Scanner3DView: React.FC = () => {
  // State
  const [step, setStep] = useState<ScanStep>('UPLOAD');
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [selectedImageIdx, setSelectedImageIdx] = useState<number>(0);
  const [textPrompt, setTextPrompt] = useState('');
  const [modelQuality, setModelQuality] = useState<ModelQuality>('draft');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [pollCount, setPollCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Result State
  const [worldResult, setWorldResult] = useState<MarbleWorld | null>(null);
  const [splatQuality, setSplatQuality] = useState<SplatQuality>('100k');
  const [showDebug, setShowDebug] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);

  // --- Handlers ---

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: UploadedImage[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      newImages.push({
        file,
        preview: URL.createObjectURL(file),
      });
    }

    setImages(prev => {
      const updated = [...prev, ...newImages];
      if (prev.length === 0 && updated.length > 0) {
        setSelectedImageIdx(0);
      }
      return updated;
    });
    setError(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleRemoveImage = useCallback((index: number) => {
    setImages(prev => {
      const removed = prev[index];
      URL.revokeObjectURL(removed.preview);
      const updated = prev.filter((_, i) => i !== index);
      return updated;
    });
    setSelectedImageIdx(prev => {
      if (index === prev) return 0;
      if (index < prev) return prev - 1;
      return prev;
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files) return;

    const newImages: UploadedImage[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      newImages.push({
        file,
        preview: URL.createObjectURL(file),
      });
    }

    setImages(prev => {
      const updated = [...prev, ...newImages];
      if (prev.length === 0 && updated.length > 0) {
        setSelectedImageIdx(0);
      }
      return updated;
    });
    setError(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleGenerate = async () => {
    if (images.length === 0 && !textPrompt.trim()) {
      setError('공간 사진을 업로드하거나 텍스트 프롬프트를 입력해주세요.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setStep('GENERATING');
    setProgressMessage('이미지를 처리하고 있습니다...');
    abortRef.current = false;

    try {
      let imageBase64: string | null = null;
      if (images.length > 0) {
        setProgressMessage('선택된 이미지를 인코딩하고 있습니다...');
        imageBase64 = await fileToBase64(images[selectedImageIdx].file);
      }

      if (abortRef.current) return;

      setProgressMessage('3D 공간을 생성하고 있습니다...');
      const operationId = await generateWorld(imageBase64, textPrompt, {
        draft: modelQuality === 'draft',
      });

      if (abortRef.current) return;

      setProgressMessage('World Labs 서버에서 3D 공간을 렌더링하고 있습니다...');
      setPollCount(0);
      const world = await pollUntilDone(operationId, (op: MarbleOperation) => {
        if (abortRef.current) throw new Error('ABORT');
        setPollCount(prev => prev + 1);
        if (!op.done) {
          setProgressMessage(`3D 공간을 렌더링하고 있습니다... (서버 처리 중)`);
        }
      });

      if (abortRef.current) return;

      setWorldResult(world);
      setStep('RESULT');
    } catch (err) {
      if (abortRef.current) return;
      const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setError(message);
      setStep('UPLOAD');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    abortRef.current = true;
    images.forEach(img => URL.revokeObjectURL(img.preview));
    setImages([]);
    setSelectedImageIdx(0);
    setTextPrompt('');
    setWorldResult(null);
    setError(null);
    setStep('UPLOAD');
    setIsGenerating(false);
    setProgressMessage('');
    setShowDebug(false);
  };

  // --- Render ---

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center">
              <Camera size={18} />
            </div>
            <h1 className="font-bold text-lg">3D 공간 스캐닝</h1>
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
                공간 사진을 여러 장 업로드하고, 원하는 인테리어 스타일을 텍스트로 설명해보세요.
              </p>
              <p className="text-xs text-brand-600">
                AI가 사진을 기반으로 3D 공간을 생성하고, 텍스트 프롬프트에 맞춰 인테리어를 꾸며줍니다.
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
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-brand-100 transition-colors">
                <Upload size={28} className="text-gray-400 group-hover:text-brand-600 transition-colors" />
              </div>
              <p className="font-semibold text-gray-700 mb-1">공간 사진을 드래그하거나 클릭하여 업로드</p>
              <p className="text-sm text-gray-400">JPG, PNG 지원 · 여러 장 업로드 가능</p>
            </div>

            {/* Image Previews with Selection */}
            {images.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700">
                  업로드된 사진 ({images.length}장)
                  <span className="font-normal text-gray-400 ml-2">— 기준 이미지를 선택하세요</span>
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      onClick={(e) => { e.stopPropagation(); setSelectedImageIdx(idx); }}
                      className={`relative group rounded-xl overflow-hidden border-2 aspect-square cursor-pointer transition-all ${
                        idx === selectedImageIdx
                          ? 'border-brand-600 ring-4 ring-brand-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={img.preview}
                        alt={`공간 사진 ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {/* Remove Button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemoveImage(idx); }}
                        className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center
                          opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                      {/* Selected Badge */}
                      {idx === selectedImageIdx && (
                        <div className="absolute bottom-0 left-0 right-0 bg-brand-600/90 text-white text-[10px] font-bold text-center py-1 flex items-center justify-center gap-1">
                          <CheckCircle2 size={10} />
                          기준 이미지
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400">
                  * 선택된 기준 이미지가 3D 생성의 주 입력으로 사용됩니다. 클릭하여 변경할 수 있습니다.
                </p>
              </div>
            )}

            {/* Text Prompt for Interior */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                인테리어 스타일 설명
              </label>
              <textarea
                value={textPrompt}
                onChange={(e) => setTextPrompt(e.target.value)}
                placeholder="예: 따뜻한 우드톤 카페 인테리어, 넓은 창문으로 자연광이 들어오는 공간, 아늑한 좌석 배치"
                rows={3}
                className="block w-full rounded-lg border border-gray-300 shadow-sm text-gray-900 placeholder-gray-400
                  focus:border-brand-500 focus:ring-brand-500 sm:text-sm py-2.5 px-3 transition-colors resize-none"
              />
              <p className="mt-1.5 text-xs text-gray-400">
                공간 사진과 함께 원하는 인테리어 분위기를 설명하면 더 정확한 결과를 얻을 수 있습니다.
              </p>
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
                <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
                  <div className="pt-3">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">모델 품질</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setModelQuality('draft')}
                        className={`p-3 rounded-lg border text-sm font-medium text-left transition-all ${
                          modelQuality === 'draft'
                            ? 'border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-100'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-bold mb-0.5">빠른 생성</div>
                        <div className="text-xs opacity-70">Marble 0.1-mini</div>
                      </button>
                      <button
                        onClick={() => setModelQuality('plus')}
                        className={`p-3 rounded-lg border text-sm font-medium text-left transition-all ${
                          modelQuality === 'plus'
                            ? 'border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-100'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-bold mb-0.5">고품질</div>
                        <div className="text-xs opacity-70">Marble 0.1-plus</div>
                      </button>
                    </div>
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

            {/* Generate Button */}
            <Button
              fullWidth
              size="lg"
              onClick={handleGenerate}
              disabled={images.length === 0 && !textPrompt.trim()}
            >
              <Sparkles size={18} className="mr-2" />
              3D 공간 생성하기
            </Button>
          </div>
        )}

        {/* ── GENERATING Step ── */}
        {step === 'GENERATING' && (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
            <div className="w-20 h-20 bg-brand-50 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-brand-100">
              <Loader2 size={40} className="text-brand-600 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">3D 공간 생성 중</h2>
            <p className="text-sm text-gray-500 text-center max-w-sm mb-2">
              {progressMessage}
            </p>
            {pollCount > 0 && (
              <p className="text-xs text-gray-400 mb-8">
                서버 확인 {pollCount}회 · 약 {pollCount * 5}초 경과
              </p>
            )}

            {images.length > 0 && (
              <div className="w-48 h-48 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                <img
                  src={images[selectedImageIdx].preview}
                  alt="기준 이미지"
                  className="w-full h-full object-cover"
                />
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
        {step === 'RESULT' && worldResult && (
          <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={28} />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">3D 공간 생성 완료</h2>
              {worldResult.display_name && (
                <p className="text-sm font-medium text-brand-600 mb-1">{worldResult.display_name}</p>
              )}
              <p className="text-xs text-gray-400">
                {worldResult.model} · {worldResult.world_id}
              </p>
            </div>

            {/* 3D Splat Viewer */}
            {worldResult.assets?.splats?.spz_urls && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">3D 뷰어</p>
                  <div className="flex gap-1">
                    {(Object.keys(worldResult.assets.splats.spz_urls) as SplatQuality[]).map((q) => (
                      <button
                        key={q}
                        onClick={() => setSplatQuality(q)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                          splatQuality === q
                            ? 'bg-brand-600 text-white'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {q === 'full_res' ? 'Full' : q}
                      </button>
                    ))}
                  </div>
                </div>
                <SplatViewer3D
                  spzUrl={proxyCdnUrl(worldResult.assets.splats.spz_urls[splatQuality] || Object.values(worldResult.assets.splats.spz_urls)[0]!)}
                />
              </div>
            )}

            {/* Thumbnail */}
            {worldResult.assets?.thumbnail_url && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">썸네일</p>
                <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                  <img
                    src={proxyCdnUrl(worldResult.assets.thumbnail_url)}
                    alt="3D 공간 썸네일"
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* Panorama */}
            {worldResult.assets?.imagery?.pano_url && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">파노라마 이미지</p>
                <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                  <img
                    src={proxyCdnUrl(worldResult.assets.imagery.pano_url)}
                    alt="360° 파노라마"
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* Caption */}
            {worldResult.assets?.caption && (
              <div className="bg-brand-50 rounded-xl p-4 border border-brand-100">
                <p className="text-xs font-semibold text-brand-700 mb-1">AI 공간 설명</p>
                <p className="text-sm text-brand-800 leading-relaxed">{worldResult.assets.caption}</p>
              </div>
            )}

            {/* World Labs 3D Viewer Link */}
            {worldResult.world_marble_url && (
              <a
                href={worldResult.world_marble_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-brand-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center group-hover:bg-brand-100 transition-colors">
                    <Box size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">3D 뷰어에서 보기</p>
                    <p className="text-xs text-gray-400">World Labs에서 인터랙티브 3D 공간 확인</p>
                  </div>
                </div>
                <ExternalLink size={16} className="text-gray-400 group-hover:text-brand-600 transition-colors" />
              </a>
            )}

            {/* Splat Files Info */}
            {worldResult.assets?.splats?.spz_urls && (
              <div className="border border-gray-200 rounded-xl p-4 space-y-2">
                <p className="text-sm font-semibold text-gray-700">3D Gaussian Splat 파일</p>
                <div className="space-y-1.5">
                  {Object.entries(worldResult.assets.splats.spz_urls).map(([quality, url]) => (
                    <a
                      key={quality}
                      href={proxyCdnUrl(url as string)}
                      download
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      <span className="text-gray-600">
                        {quality === 'full_res' ? '원본 (Full)' : quality}
                        <span className="ml-2 text-xs text-gray-400">.spz</span>
                      </span>
                      <span className="text-brand-600 text-xs font-medium">다운로드</span>
                    </a>
                  ))}
                </div>
                <p className="text-xs text-gray-400 pt-1">
                  * Three.js 등 3D 렌더러에서 Gaussian Splatting으로 렌더링할 수 있습니다.
                </p>
              </div>
            )}

            {/* Debug Data */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <span>응답 데이터 (디버그)</span>
                {showDebug ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {showDebug && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <pre className="mt-3 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(worldResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" fullWidth onClick={handleReset}>
                <RotateCcw size={16} className="mr-2" />
                다시 스캔하기
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
