import React, { Suspense, useState, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows, Float } from '@react-three/drei';
import { Sun, Moon, Palette, Layers, Maximize, Minimize, Play, Pause, RotateCcw, ZoomIn, ZoomOut, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import * as THREE from 'three';
import { cn } from '../lib/utils';

interface ConceptViewerProps {
  materials: string[];
  lightingStrategy: string;
  palette: { hex: string; name: string }[];
}

const Room = ({ 
  materials, 
  palette, 
  activeMaterialIndex, 
  lightIntensity 
}: { 
  materials: string[], 
  palette: { hex: string; name: string }[],
  activeMaterialIndex: number,
  lightIntensity: number
}) => {
  // Simple mapping of material names to basic three.js materials
  const getMaterial = (index: number, name: string, color: string) => {
    const isSelected = index === activeMaterialIndex;
    const n = name.toLowerCase();
    
    let props: any = { color: color, roughness: 0.7, metalness: 0.1 };
    
    if (n.includes('madeira') || n.includes('wood')) props = { ...props, roughness: 0.8, metalness: 0.1 };
    else if (n.includes('concreto') || n.includes('concrete')) props = { ...props, roughness: 0.9, metalness: 0.05 };
    else if (n.includes('vidro') || n.includes('glass')) return <meshPhysicalMaterial color={color} transparent opacity={0.3} transmission={0.9} thickness={0.5} roughness={0.1} emissive={isSelected ? color : 'black'} emissiveIntensity={isSelected ? 0.5 : 0} />;
    else if (n.includes('metal') || n.includes('aço')) props = { ...props, roughness: 0.2, metalness: 0.8 };
    else if (n.includes('pedra') || n.includes('stone') || n.includes('mármore')) props = { ...props, roughness: 0.4, metalness: 0.1 };

    return <meshStandardMaterial {...props} emissive={isSelected ? color : 'black'} emissiveIntensity={isSelected ? 0.2 : 0} />;
  };

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
        <planeGeometry args={[12, 12]} />
        {getMaterial(0, materials[0] || 'piso', palette[0]?.hex || '#cccccc')}
      </mesh>

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 4, 0]} receiveShadow>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="#ffffff" roughness={1} />
      </mesh>

      {/* Back Wall */}
      <mesh position={[0, 1, -6]} receiveShadow>
        <boxGeometry args={[12, 6, 0.2]} />
        {getMaterial(1, materials[1] || 'parede fundo', palette[1]?.hex || '#ffffff')}
      </mesh>

      {/* Left Wall */}
      <mesh position={[-6, 1, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <boxGeometry args={[12, 6, 0.2]} />
        {getMaterial(2, materials[2] || 'parede lateral', palette[2]?.hex || '#f0f0f0')}
      </mesh>

      {/* Right Wall with "Window" opening */}
      <group position={[6, 1, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, 2, 0]} receiveShadow>
          <boxGeometry args={[12, 2, 0.2]} />
          <meshStandardMaterial color="#f0f0f0" />
        </mesh>
        <mesh position={[0, -2, 0]} receiveShadow>
          <boxGeometry args={[12, 2, 0.2]} />
          <meshStandardMaterial color="#f0f0f0" />
        </mesh>
        <mesh position={[-4, 0, 0]} receiveShadow>
          <boxGeometry args={[4, 2, 0.2]} />
          <meshStandardMaterial color="#f0f0f0" />
        </mesh>
        <mesh position={[4, 0, 0]} receiveShadow>
          <boxGeometry args={[4, 2, 0.2]} />
          <meshStandardMaterial color="#f0f0f0" />
        </mesh>
      </group>

      {/* Furniture / Elements */}
      {/* Main Table/Island */}
      <mesh position={[0, -1.25, -2]} castShadow>
        <boxGeometry args={[4, 1.5, 2]} />
        {getMaterial(3, materials[3] || 'ilha/mesa', palette[3]?.hex || '#8B4513')}
      </mesh>

      {/* Decorative Column */}
      <mesh position={[-4, 1, -4]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 6, 32]} />
        {getMaterial(4, materials[4] || 'coluna', palette[4]?.hex || '#C0C0C0')}
      </mesh>

      {/* Rug */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.99, -1]} receiveShadow>
        <planeGeometry args={[6, 4]} />
        <meshStandardMaterial color={palette[2]?.hex || '#444444'} roughness={1} />
      </mesh>

      {/* Lighting visualization */}
      <pointLight position={[0, 3.5, 0]} intensity={lightIntensity} castShadow />
      <pointLight position={[4, 3, -4]} intensity={lightIntensity * 0.5} color="#ffccaa" />
      <spotLight position={[0, 5, 5]} angle={0.5} penumbra={1} intensity={lightIntensity * 2} castShadow />
    </group>
  );
};

const CameraHandler = ({ 
  isTouring, 
  onTourComplete, 
  setActiveMaterialIndex 
}: { 
  isTouring: boolean, 
  onTourComplete: () => void,
  setActiveMaterialIndex: (index: number) => void
}) => {
  const { camera } = useThree();
  const [waypointIndex, setWaypointIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const waypoints = [
    { pos: [8, 5, 8], target: [0, 0, 0], material: -1, duration: 2 },
    { pos: [0, 1, 0], target: [0, -2, 0], material: 0, duration: 3 }, // Floor
    { pos: [0, 1, -2], target: [0, 1, -6], material: 1, duration: 3 }, // Back Wall
    { pos: [-2, 1, 0], target: [-6, 1, 0], material: 2, duration: 3 }, // Left Wall
    { pos: [2, 0, -2], target: [0, -1.25, -2], material: 3, duration: 3 }, // Table
    { pos: [-2, 1, -3], target: [-4, 1, -4], material: 4, duration: 3 }, // Column
    { pos: [8, 5, 8], target: [0, 0, 0], material: -1, duration: 2 }, // Return
  ];

  useFrame((state, delta) => {
    if (!isTouring) return;

    const currentWaypoint = waypoints[waypointIndex];
    const nextWaypoint = waypoints[(waypointIndex + 1) % waypoints.length];
    
    if (!currentWaypoint || !nextWaypoint) return;

    const step = delta / currentWaypoint.duration;
    const newProgress = progress + step;

    if (newProgress >= 1) {
      if (waypointIndex === waypoints.length - 1) {
        onTourComplete();
        setWaypointIndex(0);
        setProgress(0);
        return;
      }
      setWaypointIndex(waypointIndex + 1);
      setProgress(0);
      setActiveMaterialIndex(waypoints[waypointIndex + 1].material);
    } else {
      setProgress(newProgress);
      
      // Interpolate position
      const startPos = new THREE.Vector3(...currentWaypoint.pos);
      const endPos = new THREE.Vector3(...nextWaypoint.pos);
      camera.position.lerpVectors(startPos, endPos, newProgress);
      
      // Interpolate lookAt (simplified)
      const startTarget = new THREE.Vector3(...currentWaypoint.target);
      const endTarget = new THREE.Vector3(...nextWaypoint.target);
      const currentTarget = new THREE.Vector3().lerpVectors(startTarget, endTarget, newProgress);
      camera.lookAt(currentTarget);
    }
  });

  return null;
};

export const ConceptViewer: React.FC<ConceptViewerProps> = ({ materials, lightingStrategy, palette }) => {
  const [lightIntensity, setLightIntensity] = useState(1.5);
  const [activeMaterialIndex, setActiveMaterialIndex] = useState(-1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTouring, setIsTouring] = useState(false);
  const controlsRef = useRef<any>(null);

  const toggleTour = () => {
    setIsTouring(!isTouring);
    if (!isTouring) {
      setActiveMaterialIndex(-1);
    }
  };

  const handleZoom = (delta: number) => {
    if (controlsRef.current) {
      const controls = controlsRef.current;
      const zoomScale = 0.95;
      if (delta > 0) {
        controls.object.position.multiplyScalar(zoomScale);
      } else {
        controls.object.position.divideScalar(zoomScale);
      }
      controls.update();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTouring) return;
      if (!controlsRef.current) return;

      const controls = controlsRef.current;
      const rotateAngle = 0.1;
      const panStep = 0.5;

      switch (e.key) {
        case 'ArrowUp':
          controls.object.position.y += panStep;
          break;
        case 'ArrowDown':
          controls.object.position.y -= panStep;
          break;
        case 'ArrowLeft':
          controls.rotateLeft(rotateAngle);
          break;
        case 'ArrowRight':
          controls.rotateRight(rotateAngle);
          break;
        case '+':
        case '=':
          handleZoom(1);
          break;
        case '-':
        case '_':
          handleZoom(-1);
          break;
      }
      controls.update();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTouring]);

  return (
    <div className={cn(
      "bg-brand-paper rounded-3xl overflow-hidden border border-brand-ink/5 relative transition-all duration-500",
      isFullscreen ? "fixed inset-4 z-[100] h-auto" : "w-full aspect-video min-h-[300px] md:min-h-[400px] lg:h-[500px]"
    )}>
      {/* Controls Overlay */}
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start pointer-events-none">
        <div className="bg-white/80 dark:bg-brand-ink/80 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border border-brand-ink/5 flex items-center gap-2 pointer-events-auto">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isTouring ? "bg-emerald-500 animate-pulse" : "bg-brand-accent animate-pulse"
          )} />
          {isTouring ? "Tour Virtual Ativo" : "Exploração 3D em Tempo Real"}
        </div>

        <div className="flex flex-col gap-2 pointer-events-auto">
          <div className="bg-white/80 dark:bg-brand-ink/80 backdrop-blur-md p-2 rounded-2xl border border-brand-ink/5 flex flex-col gap-3">
            <div className="flex items-center gap-3 px-2">
              <Sun className="w-3 h-3 text-brand-accent" />
              <input 
                type="range" 
                min="0" 
                max="4" 
                step="0.1" 
                value={lightIntensity} 
                onChange={(e) => setLightIntensity(parseFloat(e.target.value))}
                className="w-24 accent-brand-accent h-1"
              />
              <Moon className="w-3 h-3 text-brand-ink/40" />
            </div>
            
            <div className="h-px bg-brand-ink/5 mx-2" />
            
            <div className="flex flex-wrap gap-1 max-w-[140px] px-1">
              {materials.slice(0, 5).map((m, i) => (
                <button
                  key={i}
                  onClick={() => setActiveMaterialIndex(activeMaterialIndex === i ? -1 : i)}
                  className={cn(
                    "px-2 py-1 rounded-lg text-[8px] font-bold uppercase tracking-tighter transition-all",
                    activeMaterialIndex === i ? "bg-brand-accent text-white" : "bg-brand-ink/5 text-brand-ink/40 hover:bg-brand-ink/10"
                  )}
                >
                  {m.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 self-end">
            <div className="bg-white/80 dark:bg-brand-ink/80 backdrop-blur-md p-1 rounded-xl border border-brand-ink/5 flex gap-1">
              <button 
                onClick={() => handleZoom(1)}
                className="p-2 text-brand-ink/60 hover:text-brand-accent transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleZoom(-1)}
                className="p-2 text-brand-ink/60 hover:text-brand-accent transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
            </div>

            <button 
              onClick={toggleTour}
              className={cn(
                "bg-white/80 dark:bg-brand-ink/80 backdrop-blur-md p-2 rounded-xl border border-brand-ink/5 transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest",
                isTouring ? "text-emerald-500 border-emerald-500/20" : "text-brand-ink/60 hover:text-brand-accent"
              )}
            >
              {isTouring ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isTouring ? "Pausar Tour" : "Iniciar Tour"}
            </button>

            <button 
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="bg-white/80 dark:bg-brand-ink/80 backdrop-blur-md p-2 rounded-xl border border-brand-ink/5 text-brand-ink/60 hover:text-brand-accent transition-colors"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
      
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[8, 5, 8]} fov={45} />
        {!isTouring && <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.05} minDistance={5} maxDistance={20} />}
        
        <CameraHandler 
          isTouring={isTouring} 
          onTourComplete={() => setIsTouring(false)} 
          setActiveMaterialIndex={setActiveMaterialIndex}
        />

        <Suspense fallback={null}>
          <Environment preset="city" />
          <Room 
            materials={materials} 
            palette={palette} 
            activeMaterialIndex={activeMaterialIndex}
            lightIntensity={lightIntensity}
          />
          <ContactShadows position={[0, -2, 0]} opacity={0.4} scale={15} blur={2.5} far={4.5} />
        </Suspense>

        <ambientLight intensity={lightIntensity * 0.3} />
      </Canvas>

      <div className="absolute bottom-4 left-4 right-4 z-10 bg-white/80 dark:bg-brand-ink/80 backdrop-blur-md p-4 rounded-2xl text-[10px] border border-brand-ink/5 flex justify-between items-center">
        <div className="max-w-[70%]">
          <p className="font-bold uppercase mb-1 text-brand-accent flex items-center gap-2">
            <Layers className="w-3 h-3" />
            Estratégia de Iluminação & Materiais
          </p>
          <p className="text-brand-ink/60 leading-relaxed italic line-clamp-2">{lightingStrategy}</p>
        </div>
        <div className="flex -space-x-2">
          {palette.map((c, i) => (
            <div key={i} className="w-6 h-6 rounded-full border-2 border-brand-paper shadow-sm" style={{ backgroundColor: c.hex }} title={c.name} />
          ))}
        </div>
      </div>
    </div>
  );
};
