import React, { useState, useEffect } from 'react';
import { Modal } from "./ui/Modal";
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Check, X, Layers, Info, Eye, EyeOff, Sliders, RefreshCw } from 'lucide-react';
import { vectorizeImage } from '../utils/vectorizer';

interface VectorizePreviewModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onAccept: (svg: string, nodes: any[]) => void;
}

interface Variant {
  key: 'low' | 'medium' | 'high';
  name: string;
  desc: string;
  tolerance: number;
  svg: string;
  nodes: any[];
  pathCount: number;
  pointCount: number;
}

export const VectorizePreviewModal: React.FC<VectorizePreviewModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onAccept
}) => {
  const [loading, setLoading] = useState(true);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [selectedVariantKey, setSelectedVariantKey] = useState<'low' | 'medium' | 'high'>('medium');
  const [showOverlay, setShowOverlay] = useState(true);
  const [overlayOpacity, setOverlayOpacity] = useState(0.4);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !imageSrc) return;

    const generateVariants = async () => {
      setLoading(true);
      setError(null);
      try {
        const specs = [
          { key: 'low' as const, name: 'High Detail', desc: 'Preserves raw organic contours with high vertex fidelity.', tolerance: 0.4 },
          { key: 'medium' as const, name: 'Balanced', desc: 'Excellent compromise between structural geometry and performance.', tolerance: 1.2 },
          { key: 'high' as const, name: 'Ultra Clean', desc: 'Highly simplified paths. Ideal for rapid, lightweight renderings.', tolerance: 2.8 }
        ];

        const results = await Promise.all(
          specs.map(async (spec) => {
            const { svg, nodes } = await vectorizeImage(imageSrc, spec.tolerance);
            
            // Calculate point count
            let totalPoints = 0;
            nodes.forEach(n => {
              const d = n.props?.pathData || '';
              totalPoints += (d.match(/[MLHVCSQTAZ]/gi) || []).length;
            });

            return {
              ...spec,
              svg,
              nodes,
              pathCount: nodes.length,
              pointCount: totalPoints
            };
          })
        );

        setVariants(results);
        setSelectedVariantKey('medium');
      } catch (err: any) {
        console.error('Vectorization preview failed:', err);
        setError(err.message || 'Failed to analyze and vectorize the selected asset.');
      } finally {
        setLoading(false);
      }
    };

    generateVariants();
  }, [isOpen, imageSrc]);

  if (!isOpen) return null;

  const activeVariant = variants.find(v => v.key === selectedVariantKey);

  return (
    <Modal isOpen={isOpen} onClose={onClose} titleId="vectorize-title" className="max-w-4xl max-h-[90dvh]" hideCloseButton={true}>
<div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 bg-zinc-900/50 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-500/10 rounded-xl text-teal-400">
                <Sparkles size={22} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-display text-white">R2V Vectorize Studio</h3>
                <p className="text-xs text-zinc-400">Interactive multi-variant raster-to-vector preview</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
              id="r2v-modal-close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Main Area */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-6 min-h-[300px]">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 gap-4">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-teal-500/25 border-t-teal-400 rounded-full animate-spin"></div>
                  <RefreshCw size={24} className="absolute inset-0 m-auto text-teal-400 animate-pulse" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-zinc-200">Deconstructing Bitmap Contours...</p>
                  <p className="text-xs text-zinc-500 mt-1">Generating Low, Medium, and High path-simplification variants.</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3">
                <div className="p-3 bg-red-500/10 text-red-400 rounded-full">
                  <Info size={32} />
                </div>
                <p className="text-sm font-semibold text-zinc-200">Vectorization Interrupted</p>
                <p className="text-xs text-red-400 max-w-md">{error}</p>
                <button
                  onClick={onClose}
                  className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm transition-colors"
                >
                  Close Window
                </button>
              </div>
            ) : (
              <>
                {/* Left: Viewport */}
                <div className="flex-1 flex flex-col gap-4 bg-zinc-950 p-4 rounded-2xl border border-zinc-800/80 relative min-h-[250px] justify-center items-center overflow-hidden group">
                  <div className="absolute top-3 left-3 z-10 px-2 py-1 bg-zinc-900/90 text-[10px] text-zinc-400 rounded border border-zinc-800">
                    Live Vector Overlay Canvas
                  </div>

                  {/* Render Canvas */}
                  <div className="relative w-full max-w-[280px] aspect-square flex items-center justify-center">
                    {/* 1. Underlying original bitmap template (for comparison) */}
                    {showOverlay && (
                      <img
                        src={imageSrc}
                        referrerPolicy="no-referrer"
                        alt="Original Backdrop"
                        style={{ opacity: overlayOpacity }}
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity duration-200 select-none"
                      />
                    )}

                    {/* 2. Top-layered SVG vector shapes */}
                    {activeVariant && (
                      <div
                        className="absolute inset-0 w-full h-full flex items-center justify-center"
                        dangerouslySetInnerHTML={{ __html: activeVariant.svg }}
                      />
                    )}
                  </div>

                  {/* Slider & Overlay Controllers */}
                  <div className="w-full bg-zinc-900/90 p-3 rounded-xl border border-zinc-800 flex items-center justify-between gap-4 z-10">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowOverlay(!showOverlay)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          showOverlay ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' : 'bg-zinc-800 text-zinc-400'
                        }`}
                        title="Toggle Background Raster Overlay"
                        id="r2v-overlay-toggle"
                      >
                        {showOverlay ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                      <span className="text-[11px] text-zinc-300 font-medium">Bitmap Reference</span>
                    </div>

                    {showOverlay && (
                      <div className="flex items-center gap-2 flex-1 max-w-[150px]">
                        <Sliders size={12} className="text-zinc-500" />
                        <input
                          type="range"
                          min="0.1"
                          max="0.9"
                          step="0.05"
                          value={overlayOpacity}
                          onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                          className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
                          title="Reference Image Opacity"
                        />
                        <span className="text-[10px] text-zinc-500 w-6 text-right font-mono">
                          {Math.round(overlayOpacity * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Variants Selection Panel */}
                <div className="w-full md:w-[320px] flex flex-col gap-4">
                  <h4 className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">Select Level of Detail</h4>
                  <div className="flex flex-col gap-3">
                    {variants.map((v) => {
                      const isSelected = selectedVariantKey === v.key;
                      return (
                        <button
                          key={v.key}
                          onClick={() => setSelectedVariantKey(v.key)}
                          className={`w-full text-left p-4 rounded-xl border transition-all ${
                            isSelected
                              ? 'bg-teal-500/10 border-teal-500/80 shadow-md shadow-teal-500/5'
                              : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800/50 hover:border-zinc-700'
                          }`}
                          id={`r2v-variant-${v.key}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-bold text-white flex items-center gap-2">
                              {v.name}
                              {v.key === 'medium' && (
                                <span className="px-1.5 py-0.5 bg-teal-500/20 text-teal-400 text-[9px] font-bold rounded uppercase tracking-wider">
                                  Ideal
                                </span>
                              )}
                            </span>
                            <div
                              className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center ${
                                isSelected ? 'border-teal-400 bg-teal-400 text-zinc-950' : 'border-zinc-700'
                              }`}
                            >
                              {isSelected && <Check size={11} strokeWidth={3} />}
                            </div>
                          </div>
                          <p className="text-xs text-zinc-400 leading-normal mb-3">{v.desc}</p>
                          
                          {/* Stats Grid */}
                          <div className="grid grid-cols-2 gap-2 bg-zinc-950/40 p-2 rounded-lg border border-zinc-800/40 text-[10px] text-zinc-400 font-mono">
                            <div>
                              Paths: <span className="text-zinc-200 font-semibold font-sans">{v.pathCount}</span>
                            </div>
                            <div>
                              Bezier Nodes: <span className="text-zinc-200 font-semibold font-sans">{v.pointCount}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Informational Footer */}
                  <div className="p-3 bg-zinc-900/20 rounded-xl border border-zinc-800 flex gap-2 items-start mt-2">
                    <Info size={14} className="text-teal-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-zinc-400 leading-normal">
                      Every trace automatically embeds a lightweight <strong className="text-teal-300">provenance log</strong> inside the vector scene graph, allowing easy undo operations.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer Actions */}
          {!loading && !error && (
            <div className="px-6 py-4 bg-zinc-900/50 border-t border-zinc-800 flex items-center justify-between gap-4">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors border border-zinc-800 hover:border-zinc-700 rounded-xl bg-zinc-900"
                id="r2v-cancel"
              >
                Reject & Keep Original
              </button>

              <button
                onClick={() => {
                  if (activeVariant) {
                    onAccept(activeVariant.svg, activeVariant.nodes);
                  }
                }}
                className="px-5 py-2.5 bg-teal-400 hover:bg-teal-500 text-zinc-950 text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-teal-400/15 active:scale-95 transition-all"
                id="r2v-accept"
              >
                <Check size={15} strokeWidth={3} />
                Accept & Inject Vectors
              </button>
            </div>
          )}
        </div>
    </Modal>
  );
};
