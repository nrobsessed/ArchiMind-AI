import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Zap, 
  Palette, 
  Lightbulb, 
  Layout, 
  ArrowRight, 
  Loader2, 
  Check, 
  Download, 
  History, 
  Image as ImageIcon, 
  Trash2, 
  Save, 
  ChevronLeft, 
  ChevronRight, 
  Camera, 
  PenTool, 
  Brush, 
  Box, 
  Film, 
  Maximize2, 
  FileText, 
  ChevronDown,
  Leaf,
  Triangle,
  Wind,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { generateVisualConcept, generateSuggestedPrompt } from '../services/aiService';

interface ConceptLabProps {
  onSaveToGallery?: (imageUrl: string) => void;
  projectContext?: string;
  dwgFiles?: { name: string; size: string }[];
  onDwgUpload?: (files: { name: string; size: string }[]) => void;
  onDwgDelete?: (index: number) => void;
}

export const ConceptLab: React.FC<ConceptLabProps> = ({ 
  onSaveToGallery, 
  projectContext,
  dwgFiles = [],
  onDwgUpload,
  onDwgDelete
}) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [isGeneratingSuggestedPrompt, setIsGeneratingSuggestedPrompt] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'lighting' | 'materials' | 'layout' | 'colors' | 'topography' | 'neuroscience'>('lighting');
  const [selectedStyle, setSelectedStyle] = useState('Photorealistic');
  
  // Category specific states
  const [lightingStyle, setLightingStyle] = useState('Natural');
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [spaceObjective, setSpaceObjective] = useState('Relaxar');
  const [colorEmotion, setColorEmotion] = useState('Calmante');
  const [terrainType, setTerrainType] = useState('Montanhoso');
  const [neuroscienceGoal, setNeuroscienceGoal] = useState('Foco');
  const [includeDimensions, setIncludeDimensions] = useState(true);
  const [nonLinearWalls, setNonLinearWalls] = useState(true);
  const dwgInputRef = useRef<HTMLInputElement>(null);

  const materialOptions = [
    { id: 'Madeira', label: 'Madeira', img: 'https://picsum.photos/seed/wood-texture/200/200' },
    { id: 'Metal', label: 'Metal', img: 'https://picsum.photos/seed/metal-texture/200/200' },
    { id: 'Pedra', label: 'Pedra', img: 'https://picsum.photos/seed/stone-texture/200/200' },
    { id: 'Tecido', label: 'Tecido', img: 'https://picsum.photos/seed/fabric-texture/200/200' },
    { id: 'Vidro', label: 'Vidro', img: 'https://picsum.photos/seed/glass-texture/200/200' },
    { id: 'Concreto', label: 'Concreto', img: 'https://picsum.photos/seed/concrete-texture/200/200' },
    { id: 'Cerâmica', label: 'Cerâmica', img: 'https://picsum.photos/seed/ceramic-texture/200/200' },
    { id: 'Palha', label: 'Palha', img: 'https://picsum.photos/seed/straw-texture/200/200' }
  ];

  const [history, setHistory] = useState<{
    url: string, 
    category: string, 
    prompt: string,
    lightingStyle?: string,
    selectedMaterials?: string[],
    spaceObjective?: string,
    colorEmotion?: string
  }[]>([]);
  const [promptHistory, setPromptHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem('archimind_prompt_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [materialRef, setMaterialRef] = useState<string | null>(null);
  const [showPromptHistory, setShowPromptHistory] = useState(false);

  useEffect(() => {
    localStorage.setItem('archimind_prompt_history', JSON.stringify(promptHistory));
  }, [promptHistory]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const styles = [
    { id: 'Photorealistic', label: 'Photorealistic', icon: <Camera className="w-4 h-4" /> },
    { id: 'Architectural Sketch', label: 'Architectural Sketch', icon: <PenTool className="w-4 h-4" /> },
    { id: 'Watercolor', label: 'Watercolor', icon: <Brush className="w-4 h-4" /> },
    { id: '3D Render', label: '3D Render', icon: <Box className="w-4 h-4" /> },
    { id: 'Cinematic', label: 'Cinematic', icon: <Film className="w-4 h-4" /> },
    { id: 'Minimalist Line Art', label: 'Minimalist Line Art', icon: <Maximize2 className="w-4 h-4" /> },
    { id: 'Blueprint', label: 'Blueprint', icon: <FileText className="w-4 h-4" /> },
    { id: 'Acabamentos Naturais', label: 'Acabamentos Naturais', icon: <Leaf className="w-4 h-4" /> },
    { id: 'Geometria Pura', label: 'Geometria Pura', icon: <Triangle className="w-4 h-4" /> },
    { id: 'Minimalismo Escandinavo', label: 'Minimalismo Escandinavo', icon: <Wind className="w-4 h-4" /> }
  ];

  const [showStyleDropdown, setShowStyleDropdown] = useState(false);

  const categories = [
    { id: 'lighting', label: 'Iluminação', icon: <Lightbulb className="w-4 h-4" />, description: 'Estratégias de luz natural e artificial' },
    { id: 'materials', label: 'Materiais', icon: <Palette className="w-4 h-4" />, description: 'Texturas, revestimentos e acabamentos' },
    { id: 'layout', label: 'Layout', icon: <Layout className="w-4 h-4" />, description: 'Distribuição espacial e fluxos' },
    { id: 'colors', label: 'Cores', icon: <Zap className="w-4 h-4" />, description: 'Paletas e psicologia cromática' },
    { id: 'topography', label: 'Topografia', icon: <Maximize2 className="w-4 h-4" />, description: 'Integração com o terreno e cotas' },
    { id: 'neuroscience', label: 'Neuroarquitetura', icon: <Sparkles className="w-4 h-4" />, description: 'Impacto cognitivo e bem-estar' },
  ];

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (result) {
      onSaveToGallery?.(result);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    try {
      const styleInstruction = `Style: ${selectedStyle}.`;
      const materialInstruction = materialRef ? " Match the visual style of the provided material reference." : "";
      
      let categoryContext = "";
      if (activeCategory === 'lighting') categoryContext = `Lighting Style: ${lightingStyle}.`;
      if (activeCategory === 'layout') categoryContext = `Space Objective: ${spaceObjective}. Suggest layout optimized for this objective.`;
      if (activeCategory === 'colors') categoryContext = `Color Palette Theme: ${colorEmotion}.`;
      if (activeCategory === 'topography') {
        const cotaIdeal = terrainType === 'Montanhoso' ? 'Cota +15.00m' : terrainType === 'Declive' ? 'Cota -5.00m' : 'Cota 0.00m';
        categoryContext = `Terrain Type: ${terrainType}. Focus on how the building integrates with the topography. Recommended Ideal Elevation (Cota Ideal): ${cotaIdeal}.`;
      }
      if (activeCategory === 'neuroscience') categoryContext = `Neuroarchitecture Goal: ${neuroscienceGoal}. Focus on visual elements that promote this cognitive state (e.g., specific lighting, geometry, biophilia).`;

      const realismContext = `${includeDimensions ? "Include technical wall dimensions (cotas) and annotations." : ""} ${nonLinearWalls ? "Incorporate non-linear or organic floor plan geometry." : "Standard orthogonal floor plan."}`;

      let materialContext = "";
      if (selectedMaterials.length > 0) {
        materialContext = ` Materials to combine and showcase: ${selectedMaterials.join(', ')}. Create a harmonious and sophisticated blend of these specific materials in the architectural render.`;
      }

      const visual = await generateVisualConcept(`Architectural concept for ${activeCategory}: ${prompt}. ${categoryContext}${materialContext} ${realismContext} ${styleInstruction}${materialInstruction} High quality, professional render.`);
      
      setResult(visual);
      setHistory(prev => [{
        url: visual, 
        category: activeCategory, 
        prompt: prompt,
        lightingStyle,
        selectedMaterials: [...selectedMaterials],
        spaceObjective,
        colorEmotion
      }, ...prev].slice(0, 10));
      if (!promptHistory.includes(prompt)) {
        setPromptHistory(prev => [prompt, ...prev].slice(0, 20));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMaterialRef(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDwgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files).map(f => ({
        name: f.name,
        size: (f.size / 1024).toFixed(1) + ' KB'
      }));
      onDwgUpload?.(newFiles);
    }
  };

  const handleGenerateSuggestedPrompt = async () => {
    setIsGeneratingSuggestedPrompt(true);
    try {
      const suggestedPrompt = await generateSuggestedPrompt(activeCategory, projectContext || "Projeto de arquitetura residencial de luxo");
      setPrompt(suggestedPrompt);
    } catch (error) {
      console.error("Erro ao gerar prompt sugerido:", error);
    } finally {
      setIsGeneratingSuggestedPrompt(false);
    }
  };

  return (
    <div className="space-y-8 md:space-y-12 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-brand-accent rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-brand-accent/20">
            <Zap className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl md:text-5xl font-display font-bold tracking-tighter dark:text-dark-ink">Laboratório de <span className="text-brand-accent">Conceitos</span></h2>
            <p className="text-[8px] md:text-[10px] text-brand-ink/40 dark:text-dark-ink/40 uppercase tracking-widest font-bold mt-1">Experimentação rápida com ArchiMind AI</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-1 space-y-4 md:space-y-6">
          {/* Category Selector */}
          <div className="glass-card p-4 md:p-6 rounded-[24px] md:rounded-[32px] space-y-4 md:space-y-6">
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/30 dark:text-dark-ink/30">Selecione a Categoria</h3>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 md:gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id as any)}
                  className={cn(
                    "w-full flex items-center gap-2 md:gap-4 p-2 md:p-4 rounded-xl md:rounded-2xl transition-all duration-300 text-left group",
                    activeCategory === cat.id 
                      ? "bg-brand-ink dark:bg-brand-accent text-brand-paper dark:text-white shadow-xl" 
                      : "hover:bg-brand-ink/5 dark:hover:bg-white/5 text-brand-ink/60 dark:text-dark-ink/60"
                  )}
                >
                  <div className={cn(
                    "w-6 h-6 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center transition-colors shrink-0",
                    activeCategory === cat.id ? "bg-white/10" : "bg-brand-ink/5 dark:bg-white/5"
                  )}>
                    {cat.icon}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[8px] md:text-xs font-bold uppercase tracking-widest truncate">{cat.label}</p>
                    <p className="text-[8px] md:text-[10px] opacity-40 truncate hidden md:block">{cat.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Style & Prompt */}
          <div className="glass-card p-4 md:p-6 rounded-[24px] md:rounded-[32px] space-y-4 md:space-y-6">
            {/* Active Materials Indicator (if not in materials category) */}
            {activeCategory !== 'materials' && selectedMaterials.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/30 dark:text-dark-ink/30">Materiais Ativos</h3>
                  <button 
                    onClick={() => setSelectedMaterials([])}
                    className="text-[8px] text-rose-500 font-bold uppercase tracking-widest"
                  >
                    Limpar
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedMaterials.map(m => {
                    const option = materialOptions.find(opt => opt.id === m);
                    return (
                      <div key={m} className="w-8 h-8 rounded-lg overflow-hidden border border-brand-accent/20 shadow-sm" title={m}>
                        <img src={option?.img} alt={m} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Category Specific Selectors */}
            {activeCategory === 'lighting' && (
              <div className="space-y-4">
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/30 dark:text-dark-ink/30">Estilo de Iluminação</h3>
                <div className="grid grid-cols-2 gap-2">
                  {['Natural', 'Artificial', 'Ambiente', 'Destaque'].map(s => (
                    <button
                      key={s}
                      onClick={() => setLightingStyle(s)}
                      className={cn(
                        "px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                        lightingStyle === s 
                          ? "bg-brand-accent text-white" 
                          : "bg-brand-paper dark:bg-white/5 border border-brand-ink/5 dark:border-white/5 text-brand-ink/40 dark:text-dark-ink/40"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeCategory === 'materials' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/30 dark:text-dark-ink/30">Moodboard de Materiais</h3>
                  {selectedMaterials.length > 0 && (
                    <button 
                      onClick={() => setSelectedMaterials([])}
                      className="text-[8px] text-rose-500 font-bold uppercase tracking-widest hover:underline"
                    >
                      Limpar Tudo
                    </button>
                  )}
                </div>

                {/* Selected Materials Moodboard */}
                <div className="flex flex-wrap gap-2 min-h-[60px] p-3 bg-brand-ink/5 dark:bg-white/5 rounded-2xl border border-dashed border-brand-ink/10 dark:border-white/10">
                  {selectedMaterials.length === 0 ? (
                    <p className="text-[8px] text-brand-ink/30 dark:text-dark-ink/30 uppercase tracking-widest m-auto">Nenhum material selecionado</p>
                  ) : (
                    <AnimatePresence>
                      {selectedMaterials.map(m => {
                        const option = materialOptions.find(opt => opt.id === m);
                        return (
                          <motion.div
                            key={m}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="relative group"
                          >
                            <div className="w-12 h-12 rounded-xl overflow-hidden border border-brand-accent/20 shadow-sm">
                              <img src={option?.img} alt={m} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                            <button 
                              onClick={() => setSelectedMaterials(selectedMaterials.filter(item => item !== m))}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            >
                              <X className="w-2 h-2" />
                            </button>
                            <p className="text-[6px] font-bold uppercase tracking-tighter text-center mt-1 dark:text-dark-ink/60">{m}</p>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {materialOptions.map(t => (
                    <button
                      key={t.id}
                      onClick={() => {
                        if (selectedMaterials.includes(t.id)) {
                          setSelectedMaterials(selectedMaterials.filter(m => m !== t.id));
                        } else {
                          setSelectedMaterials([...selectedMaterials, t.id]);
                        }
                      }}
                      className={cn(
                        "group relative aspect-square rounded-2xl overflow-hidden border-2 transition-all duration-300",
                        selectedMaterials.includes(t.id) 
                          ? "border-brand-accent ring-2 ring-brand-accent/20" 
                          : "border-transparent hover:border-brand-accent/30"
                      )}
                    >
                      <img src={t.img} alt={t.label} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
                      <div className={cn(
                        "absolute inset-0 flex flex-col items-center justify-center transition-all duration-300",
                        selectedMaterials.includes(t.id) 
                          ? "bg-brand-accent/40" 
                          : "bg-brand-ink/40 group-hover:bg-brand-ink/20"
                      )}>
                        <p className="text-[10px] font-bold text-white uppercase tracking-widest drop-shadow-md">{t.label}</p>
                        {selectedMaterials.includes(t.id) && (
                          <div className="mt-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-lg">
                            <Check className="w-3 h-3 text-brand-accent" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeCategory === 'layout' && (
              <div className="space-y-4">
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/30 dark:text-dark-ink/30">Objetivo do Espaço</h3>
                <div className="grid grid-cols-3 gap-2">
                  {['Relaxar', 'Trabalhar', 'Convivir'].map(o => (
                    <button
                      key={o}
                      onClick={() => setSpaceObjective(o)}
                      className={cn(
                        "px-2 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                        spaceObjective === o 
                          ? "bg-brand-accent text-white" 
                          : "bg-brand-paper dark:bg-white/5 border border-brand-ink/5 dark:border-white/5 text-brand-ink/40 dark:text-dark-ink/40"
                      )}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeCategory === 'colors' && (
              <div className="space-y-4">
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/30 dark:text-dark-ink/30">Sugestões de Paletas</h3>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { 
                      name: 'Calmante', 
                      colors: [
                        { hex: '#E5E7EB', name: 'Gelo' }, 
                        { hex: '#D1D5DB', name: 'Cinza' }, 
                        { hex: '#93C5FD', name: 'Céu' }, 
                        { hex: '#BFDBFE', name: 'Brisa' }
                      ], 
                      desc: 'Tons pastéis, azuis suaves e cinzas claros.' 
                    },
                    { 
                      name: 'Energizante', 
                      colors: [
                        { hex: '#FCD34D', name: 'Sol' }, 
                        { hex: '#F87171', name: 'Coral' }, 
                        { hex: '#FBBF24', name: 'Âmbar' }, 
                        { hex: '#EF4444', name: 'Fogo' }
                      ], 
                      desc: 'Amarelos vibrantes, laranjas e vermelhos quentes.' 
                    },
                    { 
                      name: 'Luxuosa', 
                      colors: [
                        { hex: '#111827', name: 'Noite' }, 
                        { hex: '#374151', name: 'Grafite' }, 
                        { hex: '#D4AF37', name: 'Ouro' }, 
                        { hex: '#9CA3AF', name: 'Prata' }
                      ], 
                      desc: 'Preto profundo, dourado, carvão e bronze.' 
                    }
                  ].map(e => (
                    <button
                      key={e.name}
                      onClick={() => setColorEmotion(e.name)}
                      className={cn(
                        "p-4 rounded-2xl transition-all duration-300 text-left border flex flex-col gap-3",
                        colorEmotion === e.name 
                          ? "bg-brand-accent/10 border-brand-accent shadow-sm" 
                          : "bg-brand-paper dark:bg-white/5 border-brand-ink/5 dark:border-white/5 hover:border-brand-accent/30"
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={cn("text-[10px] font-bold uppercase tracking-widest", colorEmotion === e.name ? "text-brand-accent" : "text-brand-ink/60 dark:text-dark-ink/60")}>
                          Paleta {e.name}
                        </span>
                        {colorEmotion === e.name && <Check className="w-3 h-3 text-brand-accent" />}
                      </div>
                      <div className="flex gap-2 h-14">
                        {e.colors.map((c, idx) => (
                          <div 
                            key={idx} 
                            className="flex-1 flex flex-col gap-1.5"
                          >
                            <div 
                              className="w-full h-7 rounded-lg shadow-sm border border-black/5" 
                              style={{ backgroundColor: c.hex }}
                            />
                            <div className="flex flex-col items-center leading-none">
                              <span className="text-[7px] text-brand-ink/80 dark:text-dark-ink/80 font-bold uppercase tracking-tighter truncate w-full text-center">{c.name}</span>
                              <span className="text-[6px] text-brand-ink/50 dark:text-dark-ink/50 font-mono">{c.hex}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[8px] opacity-60 dark:text-dark-ink/60 leading-tight">{e.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/30 dark:text-dark-ink/30">Estilo Visual</h3>
              </div>
              
              <div className="relative">
                <button
                  onClick={() => setShowStyleDropdown(!showStyleDropdown)}
                  className="w-full bg-brand-paper dark:bg-white/5 border border-brand-ink/5 dark:border-white/5 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-accent/20 dark:text-dark-ink flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    {styles.find(s => s.id === selectedStyle)?.icon}
                    <span>{selectedStyle}</span>
                  </div>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", showStyleDropdown && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {showStyleDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-brand-ink border border-brand-ink/10 rounded-xl shadow-2xl z-30 overflow-hidden"
                    >
                      {styles.map((style) => (
                        <button
                          key={style.id}
                          onClick={() => { setSelectedStyle(style.id); setShowStyleDropdown(false); }}
                          className={cn(
                            "w-full px-4 py-3 text-left text-xs hover:bg-brand-ink/5 dark:hover:bg-white/5 transition-colors flex items-center gap-3",
                            selectedStyle === style.id ? "text-brand-accent bg-brand-accent/5" : "dark:text-dark-ink"
                          )}
                        >
                          {style.icon}
                          <span className="font-medium">{style.label}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {activeCategory === 'materials' && (
              <div className="space-y-4">
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/30 dark:text-dark-ink/30">Referência de Material</h3>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-video rounded-2xl border-2 border-dashed border-brand-ink/10 dark:border-white/10 flex flex-col items-center justify-center cursor-pointer hover:border-brand-accent/40 transition-all overflow-hidden relative"
                >
                  {materialRef ? (
                    <>
                      <img src={materialRef} className="w-full h-full object-cover" alt="Material Ref" />
                      <div className="absolute inset-0 bg-brand-ink/40 dark:bg-brand-ink/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <p className="text-white text-[10px] font-bold uppercase tracking-widest">Trocar Imagem</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-6 h-6 text-brand-ink/20 dark:text-dark-ink/20 mb-2" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-brand-ink/40 dark:text-dark-ink/40">Upload Referência</p>
                    </>
                  )}
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                </div>
                {materialRef && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setMaterialRef(null); }}
                    className="text-[10px] text-rose-500 font-bold uppercase tracking-widest flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Remover
                  </button>
                )}
              </div>
            )}

            {activeCategory === 'topography' && (
              <div className="space-y-4">
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/30 dark:text-dark-ink/30">Tipo de Terreno</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'Montanhoso', label: 'Montanhoso', desc: 'Grandes desníveis' },
                    { id: 'Plano', label: 'Plano', desc: 'Nível constante' },
                    { id: 'Aclive', label: 'Aclive', desc: 'Subida frontal' },
                    { id: 'Declive', label: 'Declive', desc: 'Descida frontal' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTerrainType(t.id)}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all",
                        terrainType === t.id 
                          ? "bg-brand-secondary/10 border-brand-secondary text-brand-secondary" 
                          : "bg-brand-paper dark:bg-white/5 border-brand-ink/5 dark:border-white/5 hover:border-brand-secondary/30 dark:text-dark-ink"
                      )}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-widest">{t.label}</p>
                      <p className="text-[8px] opacity-60 dark:text-dark-ink/60 leading-tight">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeCategory === 'neuroscience' && (
              <div className="space-y-4">
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/30 dark:text-dark-ink/30">Objetivo Cognitivo</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'Foco', label: 'Foco', desc: 'Concentração e produtividade' },
                    { id: 'Criatividade', label: 'Criatividade', desc: 'Inovação e pensamento livre' },
                    { id: 'Relaxamento', label: 'Relaxamento', desc: 'Redução de stress e calma' },
                    { id: 'Interação Social', label: 'Interação Social', desc: 'Conexão e convívio' }
                  ].map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setNeuroscienceGoal(g.id)}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all",
                        neuroscienceGoal === g.id 
                          ? "bg-brand-accent/10 border-brand-accent text-brand-accent" 
                          : "bg-brand-paper dark:bg-white/5 border-brand-ink/5 dark:border-white/5 hover:border-brand-accent/30 dark:text-dark-ink"
                      )}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-widest">{g.label}</p>
                      <p className="text-[8px] opacity-60 dark:text-dark-ink/60 leading-tight">{g.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/30 dark:text-dark-ink/30">Projeto Técnico (.DWG)</h3>
              <div 
                onClick={() => dwgInputRef.current?.click()}
                className="p-4 rounded-2xl border-2 border-dashed border-brand-ink/10 dark:border-white/10 flex items-center gap-3 cursor-pointer hover:border-brand-accent/40 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-ink/5 dark:bg-white/5 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-brand-ink/40 dark:text-dark-ink/40" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-brand-ink/60 dark:text-dark-ink/60">Upload DWG</p>
                  <p className="text-[8px] text-brand-ink/30 dark:text-dark-ink/30 uppercase tracking-widest">Plantas e Cortes Técnicos</p>
                </div>
                <input 
                  type="file" 
                  ref={dwgInputRef} 
                  onChange={handleDwgUpload} 
                  className="hidden" 
                  accept=".dwg" 
                  multiple 
                />
              </div>
              {dwgFiles.length > 0 && (
                <div className="space-y-2">
                  {dwgFiles.map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-brand-ink/5 dark:bg-white/5 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3 h-3 text-brand-accent" />
                        <span className="text-[9px] font-bold text-brand-ink/60 dark:text-dark-ink/60 truncate max-w-[120px]">{f.name}</span>
                      </div>
                      <button 
                        onClick={() => onDwgDelete?.(i)}
                        className="text-rose-500 hover:text-rose-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/30 dark:text-dark-ink/30">Realismo & Precisão</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setIncludeDimensions(!includeDimensions)}
                  className={cn(
                    "p-3 rounded-xl border text-left transition-all",
                    includeDimensions 
                      ? "bg-brand-accent/10 border-brand-accent text-brand-accent" 
                      : "bg-brand-paper dark:bg-white/5 border-brand-ink/5 dark:border-white/5 hover:border-brand-accent/30 dark:text-dark-ink"
                  )}
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest">Incluir Cotas</p>
                  <p className="text-[8px] opacity-60 dark:text-dark-ink/60 leading-tight">Exibir dimensões de parede</p>
                </button>
                <button
                  onClick={() => setNonLinearWalls(!nonLinearWalls)}
                  className={cn(
                    "p-3 rounded-xl border text-left transition-all",
                    nonLinearWalls 
                      ? "bg-brand-accent/10 border-brand-accent text-brand-accent" 
                      : "bg-brand-paper dark:bg-white/5 border-brand-ink/5 dark:border-white/5 hover:border-brand-accent/30 dark:text-dark-ink"
                  )}
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest">Paredes Orgânicas</p>
                  <p className="text-[8px] opacity-60 dark:text-dark-ink/60 leading-tight">Geometria não linear</p>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/30 dark:text-dark-ink/30">O que deseja explorar?</h3>
                <div className="flex gap-3">
                  <button 
                    onClick={handleGenerateSuggestedPrompt}
                    disabled={isGeneratingSuggestedPrompt}
                    className="text-[10px] text-brand-accent font-bold uppercase tracking-widest flex items-center gap-1 hover:underline disabled:opacity-50"
                  >
                    {isGeneratingSuggestedPrompt ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Gerar Prompt Sugerido
                  </button>
                  {promptHistory.length > 0 && (
                    <button 
                      onClick={() => setShowPromptHistory(!showPromptHistory)}
                      className="text-[10px] text-brand-accent font-bold uppercase tracking-widest flex items-center gap-1"
                    >
                      <History className="w-3 h-3" /> Histórico
                    </button>
                  )}
                </div>
              </div>
              
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ex: Uma sala de estar com iluminação zenital e materiais naturais..."
                  className="w-full bg-brand-paper dark:bg-white/5 border border-brand-ink/5 dark:border-white/5 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-brand-accent/20 transition-all resize-none text-sm dark:text-dark-ink"
                  rows={4}
                />
                
                <AnimatePresence>
                  {showPromptHistory && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-brand-ink border border-brand-ink/10 rounded-2xl shadow-2xl z-20 overflow-hidden max-h-[300px] overflow-y-auto"
                    >
                      <div className="p-3 border-b border-brand-ink/5 dark:border-white/5 flex justify-between items-center bg-brand-paper dark:bg-white/5">
                        <span className="text-[8px] font-bold uppercase tracking-widest text-brand-ink/40">Prompts Recentes</span>
                        <button 
                          onClick={() => { setPromptHistory([]); setShowPromptHistory(false); }}
                          className="text-[8px] text-rose-500 font-bold uppercase tracking-widest hover:underline"
                        >
                          Limpar Tudo
                        </button>
                      </div>
                      {promptHistory.map((h, i) => (
                        <button
                          key={i}
                          onClick={() => { setPrompt(h); setShowPromptHistory(false); }}
                          className="w-full p-4 text-left text-xs hover:bg-brand-ink/5 dark:hover:bg-white/5 transition-colors border-b border-brand-ink/5 dark:border-white/5 last:border-0 dark:text-dark-ink group flex items-start gap-3"
                        >
                          <div className="w-5 h-5 rounded-lg bg-brand-ink/5 dark:bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-brand-accent/10 group-hover:text-brand-accent transition-colors">
                            <History className="w-3 h-3" />
                          </div>
                          <span className="line-clamp-2">{h}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || !prompt}
              className="w-full bg-brand-accent text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-brand-ink transition-all disabled:opacity-50 shadow-xl shadow-brand-accent/20"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Gerar Visualização
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card p-4 rounded-[48px] aspect-video relative overflow-hidden group"
              >
                <img src={result} className="w-full h-full object-cover rounded-[36px]" alt="Concept" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-brand-ink/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <button className="bg-white text-brand-ink px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-brand-accent hover:text-white transition-all">
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button 
                    onClick={handleSave}
                    className={cn(
                      "px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all",
                      saved ? "bg-emerald-500 text-white" : "bg-brand-accent text-white hover:bg-brand-ink"
                    )}
                  >
                    {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    {saved ? 'Salvo!' : 'Salvar na Galeria'}
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="glass-card rounded-[48px] aspect-video flex flex-col items-center justify-center text-center p-8 md:p-12 border-dashed border-2 dark:border-white/10">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-brand-accent/5 rounded-full flex items-center justify-center mb-6">
                  <Sparkles className="w-8 h-8 text-brand-accent/20" />
                </div>
                <h3 className="text-xl md:text-2xl font-display font-bold mb-2 tracking-tight dark:text-dark-ink">Aguardando sua inspiração</h3>
                <p className="text-brand-ink/40 dark:text-dark-ink/40 max-w-xs mx-auto text-[10px] md:text-xs leading-relaxed">
                  Descreva um conceito e deixe a ArchiMind AI transformar suas palavras em visualizações arquitetônicas.
                </p>
              </div>
            )}
          </AnimatePresence>

          {/* History Carousel */}
          {history.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/30 dark:text-dark-ink/30">Iterações Anteriores</h3>
                <p className="text-[10px] text-brand-ink/40 dark:text-dark-ink/40">{history.length} visualizações geradas</p>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {history.map((item, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setResult(item.url);
                      setActiveCategory(item.category as any);
                      setPrompt(item.prompt);
                      if (item.lightingStyle) setLightingStyle(item.lightingStyle);
                      if (item.selectedMaterials !== undefined) setSelectedMaterials(item.selectedMaterials);
                      if (item.spaceObjective) setSpaceObjective(item.spaceObjective);
                      if (item.colorEmotion) setColorEmotion(item.colorEmotion);
                    }}
                    className={cn(
                      "w-32 md:w-48 aspect-video rounded-2xl overflow-hidden shrink-0 border-2 transition-all relative group",
                      result === item.url ? "border-brand-accent shadow-lg shadow-brand-accent/20" : "border-transparent opacity-60 hover:opacity-100"
                    )}
                  >
                    <img src={item.url} className="w-full h-full object-cover" alt={`History ${i}`} referrerPolicy="no-referrer" />
                    <div className="absolute top-2 left-2 bg-brand-ink/60 backdrop-blur-md p-1.5 rounded-lg text-white">
                      {categories.find(c => c.id === item.category)?.icon}
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
