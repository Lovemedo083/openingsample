import React, { useRef, useState, useEffect } from 'react';
import { PlacedItem, RoomDimensions } from '../types';
import { checkCollision, checkWallValidation, validateLayout } from '../utils/plannerUtils';
import { AlertTriangle, RotateCw, Trash2, Maximize, Lock, Move, ZoomIn, ZoomOut, Hand } from 'lucide-react';

interface Planner2DProps {
  items: PlacedItem[];
  room: RoomDimensions;
  onUpdateItems: (items: PlacedItem[]) => void;
  readOnly?: boolean;
}

const GRID_SIZE = 10; // cm

export const Planner2D: React.FC<Planner2DProps> = ({ items, room, onUpdateItems, readOnly = false }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Viewport State
  const [scale, setScale] = useState(0.5);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  
  // Interaction State
  const [isDraggingItem, setIsDraggingItem] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Handle item selection
  const handleItemClick = (e: React.MouseEvent, id: string) => {
    if (readOnly) return;
    e.stopPropagation();
    setSelectedId(id);
  };

  // Handle background click to deselect
  const handleBgClick = () => {
    setSelectedId(null);
  };

  // --- Zoom Logic ---
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoomSensitivity = 0.001;
        const delta = -e.deltaY * zoomSensitivity;
        const newScale = Math.min(Math.max(scale + delta, 0.2), 2.0);
        setScale(newScale);
    } else {
        // Pan with scroll if not zooming
        setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
    }
  };

  // --- Interaction Handlers ---

  const handlePointerDown = (e: React.PointerEvent, item?: PlacedItem) => {
    if (readOnly) return;
    
    // Middle click or Space (simulated) for Panning
    if (e.button === 1 || e.button === 2) { 
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        return;
    }

    if (item) {
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        setSelectedId(item.instanceId);
        setIsDraggingItem(true);
        setDragStart({ x: e.clientX, y: e.clientY });
    } else {
        // Allow bg click to deselect, but don't capture pointer aggressively unless panning
        // Only start pan if clicking on empty space and dragging
        e.currentTarget.setPointerCapture(e.pointerId);
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        setSelectedId(null);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (readOnly) return;
    e.preventDefault();

    if (isPanning) {
        setPan({
            x: e.clientX - panStart.x,
            y: e.clientY - panStart.y
        });
        return;
    }

    if (isDraggingItem && selectedId) {
        const deltaX = (e.clientX - dragStart.x) / scale;
        const deltaY = (e.clientY - dragStart.y) / scale;

        const updatedItems = items.map(item => {
            if (item.instanceId === selectedId) {
                // Snap to Grid
                let newX = item.x + deltaX;
                let newY = item.y + deltaY;
                
                // Simple snapping effect
                // if (Math.abs(newX % GRID_SIZE) < 2) newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
                // if (Math.abs(newY % GRID_SIZE) < 2) newY = Math.round(newY / GRID_SIZE) * GRID_SIZE;

                return { ...item, x: newX, y: newY };
            }
            return item;
        });

        // Optimization: Don't validate on every pixel move if slow, but for 2D it's fine
        onUpdateItems(updatedItems);
        
        setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDraggingItem(false);
    setIsPanning(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
    
    // Final Snap Validation on Drop
    if (selectedId) {
         const updatedItems = items.map(item => {
            if (item.instanceId === selectedId) {
                return {
                    ...item,
                    x: Math.round(item.x / GRID_SIZE) * GRID_SIZE,
                    y: Math.round(item.y / GRID_SIZE) * GRID_SIZE
                };
            }
            return item;
        });
        onUpdateItems(validateLayout(updatedItems, room));
    }
  };

  // Actions
  const rotateItem = () => {
    if (!selectedId) return;
    const updated = items.map(item => {
      if (item.instanceId === selectedId) {
        return { ...item, width: item.depth, depth: item.width, rotation: (item.rotation + 90) % 360 };
      }
      return item;
    });
    onUpdateItems(validateLayout(updated, room));
  };

  const deleteItem = () => {
    if (!selectedId) return;
    const updated = items.filter(item => item.instanceId !== selectedId);
    onUpdateItems(validateLayout(updated, room));
    setSelectedId(null);
  };

  const selectedItem = items.find(i => i.instanceId === selectedId);

  return (
    <div className="flex flex-col h-full bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-inner">
      {/* Toolbar */}
      {!readOnly && (
        <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 justify-between shadow-sm z-10">
          <div className="flex items-center gap-4">
              <span className="text-sm font-bold text-gray-700 flex items-center gap-2 min-w-[150px]">
                {selectedItem ? (
                  <><Move size={14} className="text-brand-600"/> {selectedItem.name}</>
                ) : (
                  <span className="text-gray-400 font-normal">물품 선택 / 드래그하여 이동</span>
                )}
              </span>
              <div className="h-4 w-px bg-gray-200" />
              <div className="flex items-center gap-1">
                  <button onClick={() => setScale(s => Math.max(s - 0.1, 0.2))} className="p-1 hover:bg-gray-100 rounded"><ZoomOut size={16}/></button>
                  <span className="text-xs font-mono w-10 text-center">{Math.round(scale * 100)}%</span>
                  <button onClick={() => setScale(s => Math.min(s + 0.1, 2.0))} className="p-1 hover:bg-gray-100 rounded"><ZoomIn size={16}/></button>
              </div>
          </div>
          
          <div className="flex gap-2">
             <button 
              onClick={rotateItem} 
              disabled={!selectedItem}
              className="p-1.5 text-gray-600 hover:bg-brand-50 hover:text-brand-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="90도 회전"
            >
              <RotateCw size={18} />
            </button>
            <button 
              onClick={deleteItem} 
              disabled={!selectedItem}
              className="p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="삭제"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Canvas Area */}
      <div 
        className="flex-1 overflow-hidden relative cursor-grab active:cursor-grabbing bg-slate-50/50"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerDown={(e) => handlePointerDown(e)}
        onWheel={handleWheel}
        style={{ touchAction: 'none' }} 
      >
        <div 
            className="absolute origin-top-left transition-transform duration-75 ease-out will-change-transform"
            style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`
            }}
        >
            {/* Room Container */}
            <div 
              ref={containerRef}
              className="bg-white shadow-2xl relative border-4 border-slate-800"
              style={{
                width: room.width, // Scale handled by parent transform
                height: room.depth,
                boxSizing: 'content-box'
              }}
            >
              {/* Grid Pattern */}
              <div 
                className="absolute inset-0 opacity-[0.1] pointer-events-none"
                style={{
                  backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
                  backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`
                }}
              />

              {/* Door */}
              <div 
                className="absolute bottom-[-8px] bg-white border-x-4 border-slate-800 h-2 z-10"
                style={{
                  left: room.doorX,
                  width: room.doorWidth
                }}
              >
                <div className="absolute top-2 left-0 w-full h-[30px] border-l border-b border-dashed border-slate-400 rounded-bl-full opacity-50 origin-top-left" 
                     style={{ transform: 'rotate(-45deg)' }} />
                <span className="absolute top-3 w-full text-center text-[10px] font-bold text-slate-500 scale-150 origin-top">출입문</span>
              </div>

              {/* Items */}
              {items.map(item => (
                <div
                  key={item.instanceId}
                  onPointerDown={(e) => handlePointerDown(e, item)}
                  onClick={(e) => handleItemClick(e, item.instanceId)}
                  className={`absolute flex flex-col items-center justify-center text-center p-0.5 overflow-hidden transition-shadow select-none group rounded-[2px]
                    ${item.isCollision || item.isWallViolation 
                      ? 'bg-red-100/90 border-2 border-red-500 shadow-red-200' 
                      : 'bg-brand-50/90 border border-brand-400 shadow-sm'}
                    ${selectedId === item.instanceId ? 'ring-2 ring-brand-500 z-50 shadow-xl' : 'z-20'}
                  `}
                  style={{
                    left: item.x,
                    top: item.y,
                    width: item.width,
                    height: item.depth,
                    transform: `rotate(${item.rotation}deg)`, // Rotation handled here now
                    cursor: readOnly ? 'default' : 'move'
                  }}
                >
                  <div className="pointer-events-none w-full h-full flex flex-col justify-center items-center">
                    <span className="font-bold text-[10px] leading-tight block truncate w-full px-1 text-slate-800">
                      {item.name}
                    </span>
                    
                    {(item.width > 50 && item.depth > 50) && (
                      <span className="text-[9px] text-slate-500 mt-0.5 scale-90">{item.width}x{item.depth}</span>
                    )}
                    
                    {(item.isCollision || item.isWallViolation) && (
                      <div className="absolute top-0 right-0 p-0.5 text-red-600 bg-white/80 rounded-bl">
                        <AlertTriangle size={10} strokeWidth={3} />
                      </div>
                    )}
                    
                     <div 
                       className="absolute bottom-0 left-0 w-full bg-yellow-400/30 pointer-events-none"
                       style={{ height: '3px' }}
                     />
                  </div>
                </div>
              ))}
            </div>
        </div>
        
        {/* Help Overlay */}
        <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur px-3 py-2 rounded-lg text-[10px] text-gray-500 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2"><Move size={10}/> 드래그: 이동</div>
            <div className="flex items-center gap-2"><ZoomIn size={10}/> 휠: 줌/팬</div>
            <div className="flex items-center gap-2"><RotateCw size={10}/> 클릭: 선택</div>
        </div>
      </div>
      
      {/* Footer Info */}
      <div className="bg-white border-t p-2 text-[10px] text-gray-500 flex justify-between uppercase font-mono tracking-tight z-10">
        <div>
          Room: {room.width} x {room.depth} cm
        </div>
        <div>
          Grid: {GRID_SIZE}cm | Scale: {Math.round(scale*100)}%
        </div>
      </div>
    </div>
  );
};
