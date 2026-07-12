import React from 'react';
import { Sparkles, LayoutDashboard, RefreshCw, BookOpen } from 'lucide-react';

export const StudioControls = ({ activeProject, updateProject, activeProjectId, handleGenerateRationale, isGeneratingRationale, rationale, t }: any) => {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold tracking-tight mb-1 text-black dark:text-white">{t('refinement_studio')}</h1>
        <p className="text-xs font-medium text-neutral-500 dark:text-zinc-400 uppercase tracking-widest">{activeProject?.name || 'No Project Selected'}</p>
      </div>

      {!activeProject ? (
        <div className="flex-1 flex items-center justify-center flex-col text-center opacity-50">
          <LayoutDashboard className="w-12 h-12 mb-4" />
          <p>{t('no_project_selected')}</p>
        </div>
      ) : (
        <>
          <div className="mb-6 space-y-4">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-neutral-500">
              <span>Project Stage</span>
              <span className="text-brand-lead">{activeProject.stage}</span>
            </div>
            <div className="flex gap-1 h-2">
              {['discovery', 'ideation', 'drafting', 'refinement', 'delivery'].map((s, i, arr) => {
                const currentIndex = arr.indexOf(activeProject.stage);
                return (
                  <div key={s} className={`flex-1 rounded-full ${i <= currentIndex ? 'bg-brand-lead' : 'bg-neutral-200 dark:bg-zinc-800'}`} />
                );
              })}
            </div>
            <div className="bg-brand-growth/20 border border-brand-growth/50 p-4 rounded-xl text-sm text-neutral-800 dark:text-zinc-200">
              <p className="font-bold mb-1 flex items-center gap-2"><Sparkles size={14} className="text-brand-lead" /> Forgel Guide</p>
              <p className="text-xs leading-relaxed mb-3">
                {activeProject.stage === 'discovery' && 'Start by providing a deep, emotional description of the brand. What is the core "why"?'}
                {activeProject.stage === 'ideation' && 'Review the AI drafts. Look for shapes that convey the story, not just literal interpretations.'}
                {activeProject.stage === 'drafting' && 'Switch to the Precision canvas to edit the raw SVG. Clean up anchor points.'}
                {activeProject.stage === 'refinement' && 'Upload mockups to see the logo in context. Refine colors.'}
                {activeProject.stage === 'delivery' && 'Generate the final Brand Guide and Sonic Philosophy.'}
              </p>
              <div className="border-t border-brand-growth/30 pt-3">
                <button 
                  onClick={handleGenerateRationale} 
                  disabled={isGeneratingRationale} 
                  className="w-full py-1.5 bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-lg text-xs font-bold hover:border-brand-lead transition-colors flex items-center justify-center gap-2"
                >
                  {isGeneratingRationale ? <RefreshCw size={14} className="animate-spin" /> : <BookOpen size={14} />}
                  Explain Design Rationale
                </button>
              </div>
            </div>
            {rationale && (
              <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-neutral-200 dark:border-zinc-800 text-xs text-neutral-600 dark:text-zinc-400 max-h-48 overflow-y-auto space-y-2">
                {rationale.split('\n').map((line, i) => <p key={i}>{line}</p>)}
              </div>
            )}
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  const stages = ['discovery', 'ideation', 'drafting', 'refinement', 'delivery'] as const;
                  const nextIdx = Math.min(stages.indexOf(activeProject.stage) + 1, 4);
                  updateProject(activeProjectId, { stage: stages[nextIdx] });
                }}
                className="w-full py-2 bg-brand-lead text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-brand-lead/90 cursor-pointer"
              >
                Advance Stage
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};
