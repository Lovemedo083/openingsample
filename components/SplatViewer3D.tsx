import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { SplatMesh } from '@sparkjsdev/spark';
import { Loader2, Maximize2, Minimize2 } from 'lucide-react';

interface SplatViewer3DProps {
  spzUrl: string;
  className?: string;
}

export const SplatViewer3D: React.FC<SplatViewer3DProps> = ({ spzUrl, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationIdRef = useRef<number>(0);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    // Camera
    const width = container.clientWidth;
    const height = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 0, 5);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Mouse orbit controls (간단 구현)
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;
    let rotationX = 0;
    let rotationY = 0;
    let distance = 5;

    const pivot = new THREE.Group();
    scene.add(pivot);

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
      container.style.cursor = 'grabbing';
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      rotationY += dx * 0.005;
      rotationX += dy * 0.005;
      rotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotationX));
      prevX = e.clientX;
      prevY = e.clientY;
    };
    const onPointerUp = () => {
      isDragging = false;
      container.style.cursor = 'grab';
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      distance += e.deltaY * 0.005;
      distance = Math.max(1, Math.min(20, distance));
    };

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointerleave', onPointerUp);
    container.addEventListener('wheel', onWheel, { passive: false });
    container.style.cursor = 'grab';

    // Load Splat
    let splatMesh: SplatMesh | null = null;

    const loadSplat = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        splatMesh = new SplatMesh({ url: spzUrl });
        // SplatMesh 초기 회전 보정 (RUB → Y-up)
        splatMesh.quaternion.set(1, 0, 0, 0);
        pivot.add(splatMesh);

        setIsLoading(false);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'SPZ 파일을 로드할 수 없습니다.';
        console.error('[SplatViewer] Load error:', err);
        setLoadError(msg);
        setIsLoading(false);
      }
    };

    loadSplat();

    // Animation Loop
    const animate = () => {
      camera.position.set(
        distance * Math.sin(rotationY) * Math.cos(rotationX),
        distance * Math.sin(rotationX),
        distance * Math.cos(rotationY) * Math.cos(rotationX)
      );
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      animationIdRef.current = requestAnimationFrame(animate);
    };
    animate();

    // Resize
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationIdRef.current);
      resizeObserver.disconnect();
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointerleave', onPointerUp);
      container.removeEventListener('wheel', onWheel);
      if (splatMesh) {
        pivot.remove(splatMesh);
        splatMesh.dispose();
      }
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      rendererRef.current = null;
    };
  }, [spzUrl]);

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  return (
    <div className={`relative rounded-xl overflow-hidden border border-gray-200 bg-[#1a1a2e] ${className}`}>
      <div
        ref={containerRef}
        className="w-full"
        style={{ height: isFullscreen ? '100vh' : '400px' }}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1a2e]/90">
          <Loader2 size={32} className="text-brand-400 animate-spin mb-3" />
          <p className="text-sm text-gray-300">3D Splat을 로드하고 있습니다...</p>
        </div>
      )}

      {/* Error Overlay */}
      {loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1a2e]/90 px-4">
          <p className="text-sm text-red-400 text-center">{loadError}</p>
        </div>
      )}

      {/* Controls */}
      {!isLoading && !loadError && (
        <>
          <button
            onClick={toggleFullscreen}
            className="absolute top-3 right-3 w-8 h-8 bg-black/50 text-white rounded-lg flex items-center justify-center
              hover:bg-black/70 transition-colors"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <div className="absolute bottom-3 left-3 text-[10px] text-gray-400 bg-black/40 px-2 py-1 rounded">
            드래그: 회전 · 스크롤: 줌
          </div>
        </>
      )}
    </div>
  );
};
