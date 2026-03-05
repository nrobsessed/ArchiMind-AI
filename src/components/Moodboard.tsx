import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Text, Transformer, Rect, Group } from 'react-konva';
import { 
  Upload, 
  Type, 
  Trash2, 
  Download, 
  MousePointer2, 
  Move, 
  Plus, 
  Sparkles, 
  Loader2, 
  Maximize,
  RotateCcw,
  Grid,
  RotateCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface MoodboardItem {
  id: string;
  type: 'image' | 'text' | 'gallery';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  src?: string;
  images?: string[]; // For gallery type
  text?: string;
  fontSize?: number;
  fill?: string;
}

export const Moodboard: React.FC = () => {
  const [items, setItems] = useState<MoodboardItem[]>([]);
  const [history, setHistory] = useState<MoodboardItem[][]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<'select' | 'text'>('select');
  const [showGoldenRatio, setShowGoldenRatio] = useState(false);
  const [loading, setLoading] = useState(false);
  const stageRef = useRef<any>(null);
  const trRef = useRef<any>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedItem = items.find(i => i.id === selectedId);

  const updateItems = (newItems: MoodboardItem[]) => {
    setHistory(prev => [...prev.slice(-19), items]); // Keep last 20 states
    setItems(newItems);
  };

  const undo = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setItems(prev);
      setHistory(history.slice(0, -1));
      setSelectedId(null);
    }
  };

  const updateSelectedItem = (attrs: Partial<MoodboardItem>) => {
    if (selectedId) {
      updateItems(items.map(item => item.id === selectedId ? { ...item, ...attrs } : item));
    }
  };

  const templates = [
    { name: 'Minimalista', items: [
      { id: 't1', type: 'text', x: 50, y: 50, width: 300, height: 50, rotation: 0, text: 'CONCEITO MINIMALISTA', fontSize: 32, fill: '#0a0a0a' },
      { id: 't2', type: 'text', x: 50, y: 110, width: 400, height: 30, rotation: 0, text: 'Menos é mais. Foco na pureza das formas e na luz.', fontSize: 14, fill: '#666' }
    ]},
    { name: 'Industrial', items: [
      { id: 'i1', type: 'text', x: 50, y: 50, width: 300, height: 50, rotation: 0, text: 'ESTILO INDUSTRIAL', fontSize: 32, fill: '#2d2d2d' },
      { id: 'i2', type: 'text', x: 50, y: 110, width: 400, height: 30, rotation: 0, text: 'Texturas brutas, concreto e metais aparentes.', fontSize: 14, fill: '#444' }
    ]}
  ];

  const applyTemplate = (templateItems: any[]) => {
    updateItems([...items, ...templateItems.map(item => ({ ...item, id: Date.now() + Math.random().toString() }))]);
  };

  const autoLayout = () => {
    const padding = 40;
    const cols = Math.ceil(Math.sqrt(items.length));
    const cellW = (containerSize.width - padding * 2) / cols;
    const cellH = (containerSize.height - padding * 2) / Math.ceil(items.length / cols);

    const newItems = items.map((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      
      // Calculate aspect ratio to maintain it
      const ratio = item.width / item.height;
      let targetW = cellW - padding;
      let targetH = targetW / ratio;

      if (targetH > cellH - padding) {
        targetH = cellH - padding;
        targetW = targetH * ratio;
      }

      return {
        ...item,
        x: padding + col * cellW + (cellW - padding - targetW) / 2,
        y: padding + row * cellH + (cellH - padding - targetH) / 2,
        width: targetW,
        height: targetH,
        rotation: 0
      };
    });
    updateItems(newItems);
  };

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const imagePromises = Array.from(files).map(file => {
        return new Promise<MoodboardItem>((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
              const width = img.width > 200 ? 200 : img.width;
              const height = width * (img.height / img.width);
              resolve({
                id: Math.random().toString(36).substr(2, 9),
                type: 'image',
                x: Math.random() * (containerSize.width - 200),
                y: Math.random() * (containerSize.height - 200),
                width,
                height,
                rotation: 0,
                src: img.src
              });
            };
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(imagePromises).then(newItems => {
        updateItems([...items, ...newItems]);
      });
    }
  };

  const addText = () => {
    const newItem: MoodboardItem = {
      id: Date.now().toString(),
      type: 'text',
      x: 100,
      y: 100,
      width: 200,
      height: 50,
      rotation: 0,
      text: 'Novo Conceito',
      fontSize: 24,
      fill: '#0a0a0a'
    };
    updateItems([...items, newItem]);
    setSelectedId(newItem.id);
  };

  const handleExport = () => {
    const uri = stageRef.current.toDataURL();
    const link = document.createElement('a');
    link.download = 'moodboard-archimind.png';
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const checkDeselect = (e: any) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      setSelectedId(null);
    }
  };

  const removeItem = () => {
    if (selectedId) {
      updateItems(items.filter(item => item.id !== selectedId));
      setSelectedId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-brand-paper">
      <header className="p-4 md:p-8 border-b border-brand-ink/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-brand-paper/50 backdrop-blur-md sticky top-0 z-20">
        <div>
          <h2 className="text-2xl md:text-4xl font-display font-bold tracking-tighter text-brand-ink">Moodboard <span className="text-brand-accent">Criativo</span></h2>
          <p className="text-[10px] md:text-xs text-brand-ink/40 uppercase tracking-widest font-bold mt-1">Visualize a alma do seu projeto</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={handleExport}
            className="flex-1 sm:flex-none px-4 md:px-6 py-2 md:py-3 bg-brand-ink text-brand-paper rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-brand-accent transition-all shadow-xl shadow-brand-ink/10"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Toolbar */}
        <aside className="w-full md:w-20 border-b md:border-b-0 md:border-r border-brand-ink/5 flex md:flex-col items-center justify-center md:justify-start py-4 md:py-8 gap-4 md:gap-6 bg-brand-paper/30 backdrop-blur-sm z-10">
          <div className="flex md:flex-col gap-2">
            <button 
              onClick={() => setTool('select')}
              className={cn(
                "w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all",
                tool === 'select' ? "bg-brand-accent text-white shadow-lg shadow-brand-accent/20" : "hover:bg-brand-ink/5 text-brand-ink/40"
              )}
              title="Selecionar"
            >
              <MousePointer2 className="w-5 h-5" />
            </button>
            <button 
              onClick={addText}
              className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center hover:bg-brand-ink/5 text-brand-ink/40 transition-all"
              title="Adicionar Texto"
            >
              <Type className="w-5 h-5" />
            </button>
            <label className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center hover:bg-brand-ink/5 text-brand-ink/40 transition-all cursor-pointer" title="Upload Imagem">
              <Upload className="w-5 h-5" />
              <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*" />
            </label>
            <button 
              onClick={() => setShowGoldenRatio(!showGoldenRatio)}
              className={cn(
                "w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all",
                showGoldenRatio ? "bg-brand-secondary text-white shadow-lg" : "hover:bg-brand-ink/5 text-brand-ink/40"
              )}
              title="Proporção Áurea"
            >
              <Maximize className="w-5 h-5" />
            </button>
          </div>

          <div className="md:mt-auto flex md:flex-col gap-2">
            <button 
              onClick={() => updateItems([])}
              className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center hover:bg-rose-500 hover:text-white text-brand-ink/20 transition-all"
              title="Limpar Tudo"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button 
              onClick={undo}
              disabled={history.length === 0}
              className={cn(
                "w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all",
                history.length === 0 ? "opacity-20 cursor-not-allowed" : "hover:bg-brand-ink/5 text-brand-ink/40"
              )}
              title="Desfazer (Undo)"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button 
              onClick={autoLayout}
              disabled={items.length === 0}
              className={cn(
                "w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all",
                items.length === 0 ? "opacity-20 cursor-not-allowed" : "hover:bg-brand-ink/5 text-brand-ink/40"
              )}
              title="Layout Automático"
            >
              <Grid className="w-5 h-5" />
            </button>
          </div>
        </aside>

        {/* Templates & Properties Panel */}
        <aside className="w-64 border-r border-brand-ink/5 bg-brand-paper/20 backdrop-blur-md p-6 overflow-y-auto hidden xl:block">
          {selectedItem ? (
            <div className="space-y-8">
              <h3 className="text-[10px] uppercase tracking-widest font-bold text-brand-accent mb-6">Propriedades do Elemento</h3>
              
              <div className="space-y-4">
                {selectedItem.type === 'text' && (
                  <div className="space-y-2">
                    <label className="text-[9px] uppercase tracking-widest font-bold text-brand-ink/40">Conteúdo</label>
                    <textarea 
                      value={selectedItem.text}
                      onChange={(e) => updateSelectedItem({ text: e.target.value })}
                      className="w-full bg-brand-paper border border-brand-ink/5 rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand-accent text-brand-ink"
                      rows={3}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[9px] uppercase tracking-widest font-bold text-brand-ink/40 flex justify-between">
                    Rotação <span>{selectedItem.rotation}°</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <RotateCw className="w-3 h-3 text-brand-ink/20" />
                    <input 
                      type="range" 
                      min="0" 
                      max="360" 
                      value={selectedItem.rotation}
                      onChange={(e) => updateSelectedItem({ rotation: parseInt(e.target.value) })}
                      className="w-full accent-brand-accent"
                    />
                  </div>
                </div>

                {selectedItem.type === 'text' && (
                  <div className="space-y-2">
                    <label className="text-[9px] uppercase tracking-widest font-bold text-brand-ink/40">Tamanho da Fonte</label>
                    <input 
                      type="range" 
                      min="8" 
                      max="120" 
                      value={selectedItem.fontSize}
                      onChange={(e) => updateSelectedItem({ fontSize: parseInt(e.target.value) })}
                      className="w-full accent-brand-accent"
                    />
                  </div>
                )}

                {selectedItem.type === 'text' && (
                  <div className="space-y-2">
                    <label className="text-[9px] uppercase tracking-widest font-bold text-brand-ink/40">Cor</label>
                    <div className="flex flex-wrap gap-2">
                      {['#0a0a0a', '#ffffff', '#F27D26', '#5A5A40', '#8E9299', '#4a4a4a'].map(color => (
                        <button
                          key={color}
                          onClick={() => updateSelectedItem({ fill: color })}
                          className={cn(
                            "w-6 h-6 rounded-full border border-brand-ink/10",
                            selectedItem.fill === color && "ring-2 ring-brand-accent ring-offset-2"
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button 
                onClick={removeItem}
                className="w-full py-3 bg-rose-500/10 text-rose-500 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all"
              >
                Remover Elemento
              </button>
            </div>
          ) : (
            <>
              <h3 className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40 mb-6">Templates Rápidos</h3>
              <div className="space-y-4">
                {templates.map((t) => (
                  <button
                    key={t.name}
                    onClick={() => applyTemplate(t.items)}
                    className="w-full p-4 rounded-2xl border border-brand-ink/5 hover:border-brand-accent transition-all text-left group bg-brand-paper"
                  >
                    <p className="text-xs font-bold uppercase tracking-widest group-hover:text-brand-accent transition-colors text-brand-ink">{t.name}</p>
                    <p className="text-[10px] text-brand-ink/40 mt-1">Clique para aplicar</p>
                  </button>
                ))}
              </div>

              <div className="mt-12 p-6 rounded-2xl bg-brand-accent/5 border border-brand-accent/10">
                <Sparkles className="w-5 h-5 text-brand-accent mb-3" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-accent mb-2">Dica de UX</p>
                <p className="text-[10px] leading-relaxed text-brand-ink/60 italic">
                  "Use o moodboard para alinhar a expectativa estética com o cliente antes de iniciar o 3D."
                </p>
              </div>
            </>
          )}
        </aside>

        {/* Canvas Area */}
        <div ref={containerRef} className="flex-1 relative bg-[#f0f0f0] dark:bg-brand-ink/10 overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:20px_20px]" />
          
          <Stage
            width={containerSize.width}
            height={containerSize.height}
            onMouseDown={checkDeselect}
            onTouchStart={checkDeselect}
            ref={stageRef}
            className="cursor-crosshair"
          >
            <Layer>
              {items.map((item) => (
                <MoodboardElement 
                  key={item.id} 
                  item={item} 
                  isSelected={item.id === selectedId}
                  onSelect={() => setSelectedId(item.id)}
                  onChange={(newAttrs: any) => {
                    const newItems = items.map(i => i.id === item.id ? { ...i, ...newAttrs } : i);
                    updateItems(newItems);
                  }}
                />
              ))}
            </Layer>
          </Stage>

          {showGoldenRatio && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="w-full h-full border-2 border-brand-secondary/20 rounded-lg relative">
                <div className="absolute top-0 left-0 w-[61.8%] h-full border-r border-brand-secondary/20" />
                <div className="absolute top-0 left-0 w-full h-[61.8%] border-b border-brand-secondary/20" />
                <div className="absolute bottom-0 right-0 w-[38.2%] h-[38.2%] border-l border-t border-brand-secondary/20" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-5">
                   <svg viewBox="0 0 100 100" className="w-full h-full">
                     <path d="M0,100 A100,100 0 0,1 100,0" fill="none" stroke="currentColor" strokeWidth="0.5" />
                   </svg>
                </div>
              </div>
            </div>
          )}

          {items.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="w-24 h-24 bg-brand-accent/5 rounded-full flex items-center justify-center mb-6">
                <Plus className="w-10 h-10 text-brand-accent/20" />
              </div>
              <p className="text-brand-ink/20 font-display text-2xl font-bold">Arraste imagens ou adicione textos</p>
              <p className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/10 mt-2">Crie a narrativa visual do seu projeto</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MoodboardElement = ({ item, isSelected, onSelect, onChange }: any) => {
  const shapeRef = useRef<any>(null);
  const trRef = useRef<any>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [galleryImages, setGalleryImages] = useState<HTMLImageElement[]>([]);

  useEffect(() => {
    if (item.type === 'image' && item.src) {
      const img = new Image();
      img.src = item.src;
      img.onload = () => setImage(img);
    } else if (item.type === 'gallery' && item.images) {
      const promises = item.images.map((src: string) => {
        return new Promise<HTMLImageElement>((resolve) => {
          const img = new Image();
          img.src = src;
          img.onload = () => resolve(img);
        });
      });
      Promise.all(promises).then(setGalleryImages);
    }
  }, [item.src, item.images, item.type]);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  const handleTransformEnd = () => {
    const node = shapeRef.current;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    node.scaleX(1);
    node.scaleY(1);

    onChange({
      x: node.x(),
      y: node.y(),
      width: Math.max(5, node.width() * scaleX),
      height: Math.max(5, node.height() * scaleY),
      rotation: node.rotation(),
    });
  };

  if (item.type === 'image') {
    return (
      <>
        <KonvaImage
          image={image || undefined}
          onClick={onSelect}
          onTap={onSelect}
          ref={shapeRef}
          {...item}
          draggable
          onDragEnd={(e) => {
            onChange({
              x: e.target.x(),
              y: e.target.y(),
            });
          }}
          onTransformEnd={handleTransformEnd}
        />
        {isSelected && (
          <Transformer
            ref={trRef}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 5 || newBox.height < 5) {
                return oldBox;
              }
              return newBox;
            }}
          />
        )}
      </>
    );
  }

  if (item.type === 'gallery') {
    return (
      <Group
        onClick={onSelect}
        onTap={onSelect}
        ref={shapeRef}
        {...item}
        draggable
        onDragEnd={(e) => {
          onChange({
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onTransformEnd={handleTransformEnd}
      >
        <Rect
          width={item.width}
          height={item.height}
          fill="transparent"
          stroke={isSelected ? '#F27D26' : 'transparent'}
          strokeWidth={1}
        />
        {galleryImages.map((img, i) => {
          const cols = Math.ceil(Math.sqrt(galleryImages.length));
          const rows = Math.ceil(galleryImages.length / cols);
          const cellW = item.width / cols;
          const cellH = item.height / rows;
          const x = (i % cols) * cellW;
          const y = Math.floor(i / cols) * cellH;
          
          return (
            <KonvaImage
              key={i}
              image={img}
              x={x}
              y={y}
              width={cellW}
              height={cellH}
              listening={false}
            />
          );
        })}
        {isSelected && (
          <Transformer
            ref={trRef}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 5 || newBox.height < 5) {
                return oldBox;
              }
              return newBox;
            }}
          />
        )}
      </Group>
    );
  }

  return (
    <>
      <Text
        text={item.text}
        onClick={onSelect}
        onTap={onSelect}
        ref={shapeRef}
        {...item}
        draggable
        fontFamily="Space Grotesk"
        fontStyle="bold"
        onDragEnd={(e) => {
          onChange({
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onTransformEnd={handleTransformEnd}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top-center', 'bottom-center', 'middle-left', 'middle-right']}
          boundBoxFunc={(oldBox, newBox) => {
            newBox.width = Math.max(30, newBox.width);
            newBox.height = Math.max(10, newBox.height);
            return newBox;
          }}
        />
      )}
    </>
  );
};
