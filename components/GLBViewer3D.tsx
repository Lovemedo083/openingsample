import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Loader2, Maximize2, Minimize2 } from 'lucide-react';

interface GLBViewer3DProps {
  glbUrl: string;
  className?: string;
}

export const GLBViewer3D: React.FC<GLBViewer3DProps> = ({ glbUrl, className = '' }) => {
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
    scene.background = new THREE.Color(0xf8fafc);

    // Camera
    const width = container.clientWidth;
    const height = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(3, 2, 3);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);

    // Ground plane (subtle)
    const groundGeometry = new THREE.PlaneGeometry(10, 10);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.8,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid helper
    const gridHelper = new THREE.GridHelper(10, 20, 0xcbd5e1, 0xe2e8f0);
    scene.add(gridHelper);

    // Mouse orbit controls
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;
    let rotationX = 0.5;
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
      rotationX = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, rotationX));
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

    // Load GLB
    const loader = new GLTFLoader();

    const loadModel = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        loader.load(
          glbUrl,
          (gltf) => {
            const model = gltf.scene;

            // Center and scale model
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            model.position.sub(center);
            model.position.y += size.y / 2;

            // Scale to fit
            const maxDim = Math.max(size.x, size.y, size.z);
            if (maxDim > 2) {
              const scale = 2 / maxDim;
              model.scale.setScalar(scale);
            }

            // Enable shadows
            model.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });

            pivot.add(model);
            setIsLoading(false);
          },
          undefined,
          (error) => {
            console.error('[GLBViewer] Load error:', error);
            setLoadError('GLB 파일을 로드할 수 없습니다.');
            setIsLoading(false);
          }
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'GLB 파일을 로드할 수 없습니다.';
        console.error('[GLBViewer] Load error:', err);
        setLoadError(msg);
        setIsLoading(false);
      }
    };

    loadModel();

    // Animation Loop
    const animate = () => {
      camera.position.set(
        distance * Math.sin(rotationY) * Math.cos(rotationX),
        distance * Math.sin(rotationX),
        distance * Math.cos(rotationY) * Math.cos(rotationX)
      );
      camera.lookAt(0, 0.5, 0);

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
      while (pivot.children.length > 0) {
        pivot.remove(pivot.children[0]);
      }
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      rendererRef.current = null;
    };
  }, [glbUrl]);

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
    <div className={`relative rounded-xl overflow-hidden border border-gray-200 bg-slate-50 ${className}`}>
      <div
        ref={containerRef}
        className="w-full"
        style={{ height: isFullscreen ? '100vh' : '400px' }}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/90">
          <Loader2 size={32} className="text-brand-600 animate-spin mb-3" />
          <p className="text-sm text-gray-600">3D 모델을 로드하고 있습니다...</p>
        </div>
      )}

      {/* Error Overlay */}
      {loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/90 px-4">
          <p className="text-sm text-red-500 text-center">{loadError}</p>
        </div>
      )}

      {/* Controls */}
      {!isLoading && !loadError && (
        <>
          <button
            onClick={toggleFullscreen}
            className="absolute top-3 right-3 w-8 h-8 bg-white/80 text-gray-700 rounded-lg flex items-center justify-center
              hover:bg-white transition-colors shadow-sm"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <div className="absolute bottom-3 left-3 text-[10px] text-gray-500 bg-white/80 px-2 py-1 rounded shadow-sm">
            드래그: 회전 · 스크롤: 줌
          </div>
        </>
      )}
    </div>
  );
};
