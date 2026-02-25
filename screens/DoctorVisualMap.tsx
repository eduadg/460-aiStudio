
import React, { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { UrgentCase } from '../types';
import { NeuralIcon } from '../components/icons';

interface DoctorVisualMapProps {
    onSelectPatient: (patientId: string) => void;
}

interface Node {
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    image?: string;
    label: string;
    isParent?: boolean;
    parentId?: string;
    z: number; // Depth scale factor
}

const DoctorVisualMap: React.FC<DoctorVisualMapProps> = ({ onSelectPatient }) => {
    const [nodes, setNodes] = useState<Node[]>([]);
    
    // Refs for animation loop performance
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<number>(0);
    const nodesRef = useRef<Node[]>([]);
    
    // Camera System
    const cameraRef = useRef({ x: 0, y: 0, zoom: 0.6 });
    const targetCameraRef = useRef({ x: 0, y: 0, zoom: 0.6 });
    
    // Interaction State
    const isDraggingRef = useRef(false);
    const isPinchingRef = useRef(false);
    const lastMouseRef = useRef({ x: 0, y: 0 });
    const lastPinchDistRef = useRef(0);

    // --- 1. DATA LOADING ---
    useEffect(() => {
        const loadPatients = async () => {
            const data = await api.getUrgentCases();
            generateNodes(data);
        };
        loadPatients();
    }, []);

    const generateNodes = (realPatients: UrgentCase[]) => {
        const newNodes: Node[] = [];
        const width = window.innerWidth;
        const height = window.innerHeight;

        realPatients.forEach((p, i) => {
            const angle = (i / realPatients.length) * Math.PI * 2;
            const radius = 100 + Math.random() * 80;

            newNodes.push({
                id: p.id,
                x: width / 2 + Math.cos(angle) * radius,
                y: height / 2 + Math.sin(angle) * radius,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: 90,
                color: p.status === 'online' ? '#10b981' : '#f59e0b',
                image: p.avatarUrl,
                label: p.name,
                isParent: true,
                z: 1.0
            });
        });

        nodesRef.current = newNodes;
        setNodes(newNodes);
    };

    // --- 2. INTERACTION HANDLERS ---
    
    // Helper para distância entre dois dedos
    const getTouchDistance = (touches: any) => {
        return Math.hypot(
            touches[0].clientX - touches[1].clientX,
            touches[0].clientY - touches[1].clientY
        );
    };

    // Helper para centro entre dois dedos
    const getTouchCenter = (touches: any) => {
        return {
            x: (touches[0].clientX + touches[1].clientX) / 2,
            y: (touches[0].clientY + touches[1].clientY) / 2
        };
    };

    const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        
        const zoomSensitivity = 0.001;
        const delta = -e.deltaY * zoomSensitivity;
        
        const currentZoom = targetCameraRef.current.zoom;
        const newZoom = Math.min(Math.max(currentZoom + delta, 0.2), 3.0);
        
        // Zoom towards mouse logic
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const mx = e.clientX - rect.left - cx;
        const my = e.clientY - rect.top - cy;

        const dx = mx * (1/newZoom - 1/currentZoom);
        const dy = my * (1/newZoom - 1/currentZoom);

        targetCameraRef.current.x += dx;
        targetCameraRef.current.y += dy;
        targetCameraRef.current.zoom = newZoom;
    };

    const handleStartDrag = (clientX: number, clientY: number) => {
        isDraggingRef.current = true;
        lastMouseRef.current = { x: clientX, y: clientY };
        if (containerRef.current) containerRef.current.style.cursor = 'grabbing';
    };

    const handleMoveDrag = (clientX: number, clientY: number) => {
        if (!isDraggingRef.current || isPinchingRef.current) return;
        
        const dx = clientX - lastMouseRef.current.x;
        const dy = clientY - lastMouseRef.current.y;
        
        targetCameraRef.current.x += dx / targetCameraRef.current.zoom;
        targetCameraRef.current.y += dy / targetCameraRef.current.zoom;
        
        lastMouseRef.current = { x: clientX, y: clientY };
    };

    const handleEndDrag = () => {
        isDraggingRef.current = false;
        isPinchingRef.current = false;
        if (containerRef.current) containerRef.current.style.cursor = 'grab';
    };

    // Mouse Events
    const onMouseDown = (e: React.MouseEvent) => handleStartDrag(e.clientX, e.clientY);
    const onMouseMove = (e: MouseEvent) => handleMoveDrag(e.clientX, e.clientY);
    const onMouseUp = () => handleEndDrag();
    
    // Touch Events (Updated for Pinch)
    const onTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            isPinchingRef.current = true;
            isDraggingRef.current = false; // Disable drag when pinching
            lastPinchDistRef.current = getTouchDistance(e.touches);
        } else if (e.touches.length === 1) {
            handleStartDrag(e.touches[0].clientX, e.touches[0].clientY);
        }
    };

    const onTouchMove = (e: TouchEvent) => {
        e.preventDefault(); 
        
        if (e.touches.length === 2) {
            // Logic Pinch-to-Zoom
            const dist = getTouchDistance(e.touches);
            const center = getTouchCenter(e.touches);
            
            // Calculate scale factor
            const currentZoom = targetCameraRef.current.zoom;
            // Sensibilidade do pinch
            const delta = (dist - lastPinchDistRef.current) * 0.005; 
            const newZoom = Math.min(Math.max(currentZoom + delta, 0.2), 3.0);

            // Zoom towards pinch center logic
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
                const cx = rect.width / 2;
                const cy = rect.height / 2;
                const mx = center.x - rect.left - cx;
                const my = center.y - rect.top - cy;

                const dx = mx * (1/newZoom - 1/currentZoom);
                const dy = my * (1/newZoom - 1/currentZoom);

                targetCameraRef.current.x += dx;
                targetCameraRef.current.y += dy;
            }

            targetCameraRef.current.zoom = newZoom;
            lastPinchDistRef.current = dist;

        } else if (e.touches.length === 1 && !isPinchingRef.current) {
            // Logic Pan (Arrastar)
            handleMoveDrag(e.touches[0].clientX, e.touches[0].clientY);
        }
    };

    useEffect(() => {
        const container = containerRef.current;
        if(!container) return;

        container.addEventListener('wheel', handleWheel, { passive: false });
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        container.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onMouseUp);

        return () => {
            container.removeEventListener('wheel', handleWheel);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            container.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onMouseUp);
        };
    }, []);

    // --- 3. PHYSICS & RENDER LOOP ---
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const updateFrame = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            const cx = width / 2;
            const cy = height / 2;

            canvas.width = width;
            canvas.height = height;
            ctx.clearRect(0, 0, width, height);

            // Interpolate Camera (Smooth Damping)
            const damping = 0.12; // Slightly snappier
            cameraRef.current.x += (targetCameraRef.current.x - cameraRef.current.x) * damping;
            cameraRef.current.y += (targetCameraRef.current.y - cameraRef.current.y) * damping;
            cameraRef.current.zoom += (targetCameraRef.current.zoom - cameraRef.current.zoom) * damping;

            const { x: camX, y: camY, zoom } = cameraRef.current;

            // Update Physics
            nodesRef.current.forEach(node => {
                // 1. Center Gravity (Gentler)
                const gravity = 0.0005;
                node.vx += (cx - node.x) * gravity;
                node.vy += (cy - node.y) * gravity;

                // 2. Repulsion (Spacing)
                nodesRef.current.forEach(other => {
                    if (node === other) return;
                    const dx = node.x - other.x;
                    const dy = node.y - other.y;
                    const dist = Math.sqrt(dx*dx + dy*dy) || 0.1;
                    
                    const spacing = (node.size/2 + other.size/2) + 20; 
                    
                    if (dist < spacing) {
                        const force = (spacing - dist) * 0.08; // Softer collision
                        node.vx += (dx / dist) * force;
                        node.vy += (dy / dist) * force;
                    }
                });

                // Apply Velocity
                node.vx *= 0.92; // Less friction for "floaty" feel
                node.vy *= 0.92;
                node.x += node.vx;
                node.y += node.vy;

                // DOM Updates
                const el = document.getElementById(`node-${node.id}`);
                if (el) {
                    const screenX = cx + (node.x - cx + camX) * zoom;
                    const screenY = cy + (node.y - cy + camY) * zoom;
                    
                    if (screenX < -150 || screenX > width + 150 || screenY < -150 || screenY > height + 150) {
                        el.style.display = 'none';
                    } else {
                        el.style.display = 'block';
                        const scale = zoom;
                        el.style.transform = `translate3d(${screenX - node.size/2}px, ${screenY - node.size/2}px, 0) scale(${scale})`;
                        el.style.zIndex = Math.floor(node.z * 100).toString();
                        
                        const labelEl = el.querySelector('.node-label') as HTMLElement;
                        if (labelEl) {
                            labelEl.style.opacity = zoom > 0.5 ? '1' : '0';
                        }
                    }
                }
            });

            animationRef.current = requestAnimationFrame(updateFrame);
        };

        updateFrame();
        return () => { if(animationRef.current) cancelAnimationFrame(animationRef.current); };
    }, [nodes]);

    return (
        <div 
            ref={containerRef}
            className="fixed inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900 via-purple-950 to-black overflow-hidden cursor-grab active:cursor-grabbing"
            style={{ touchAction: 'none' }} // Crucial para o browser não fazer zoom nativo
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
        >
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>

            <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

            {/* Nodes */}
            <div className="absolute inset-0 pointer-events-none">
                {nodes.map(node => (
                    <div
                        key={node.id}
                        id={`node-${node.id}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!isDraggingRef.current) onSelectPatient(node.id);
                        }}
                        className="absolute rounded-full shadow-[0_0_30px_rgba(0,0,0,0.5)] border-2 border-indigo-400/30 hover:border-purple-400 transition-colors duration-300 pointer-events-auto cursor-pointer group overflow-visible"
                        style={{
                            width: node.size,
                            height: node.size,
                            backgroundColor: '#1e1b4b',
                            willChange: 'transform'
                        }}
                    >
                         {/* Image or Initials */}
                        <div className="w-full h-full rounded-full overflow-hidden relative flex items-center justify-center bg-slate-800">
                            {node.image ? (
                                <img src={node.image} alt={node.label} className="w-full h-full object-cover pointer-events-none" />
                            ) : (
                                <span className="text-white font-bold text-lg pointer-events-none select-none">
                                    {node.label.split(' ').map(n=>n[0]).slice(0,2).join('')}
                                </span>
                            )}
                            {/* Status Dot */}
                            <div className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${node.color === '#10b981' ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                        </div>
                        
                        {/* Label */}
                        <div className="node-label absolute -bottom-8 left-1/2 -translate-x-1/2 text-white text-[11px] font-bold text-center bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full whitespace-nowrap pointer-events-none transition-opacity duration-300 shadow-sm border border-white/10">
                             {node.label}
                        </div>
                    </div>
                ))}
            </div>

            {/* Search Bar */}
            <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 w-11/12 max-w-sm pointer-events-auto z-50">
                 <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-full flex items-center p-1.5 shadow-2xl">
                        <div className="p-2 bg-purple-600 rounded-full text-white">
                             <NeuralIcon className="w-5 h-5" />
                        </div>
                        <input 
                            type="text" 
                            placeholder="Descrever uma memória..." 
                            className="bg-transparent border-none focus:ring-0 text-white placeholder-slate-400 flex-1 ml-3 text-sm font-medium outline-none"
                            onMouseDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            </div>
            
            <div className="absolute top-6 right-6 text-white/30 text-[10px] font-mono pointer-events-none tracking-widest uppercase">
                Interactive Map v2.1
            </div>
        </div>
    );
};

export default DoctorVisualMap;
