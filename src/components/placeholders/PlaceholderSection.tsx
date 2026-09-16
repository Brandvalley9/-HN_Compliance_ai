import React from 'react';
import { LucideIcon, Layers } from 'lucide-react';

interface PlaceholderSectionProps {
  id: string;
  title: string;
  subtitle: string;
  icon?: LucideIcon;
  plannedStage?: string;
  heightClass?: string;
}

export const PlaceholderSection: React.FC<PlaceholderSectionProps> = ({
  id,
  title,
  subtitle,
  icon: Icon = Layers,
  plannedStage = 'Stage 2',
  heightClass = 'min-h-[160px]'
}) => {
  return (
    <div
      id={id}
      className={`relative w-full rounded-xl border border-dashed border-slate-300 bg-white/70 p-6 flex flex-col justify-center items-center text-center transition-all hover:border-slate-400 hover:bg-white ${heightClass}`}
    >
      <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 mb-3 shadow-2xs">
        <Icon className="w-5 h-5" />
      </div>

      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-sm font-semibold text-slate-800 tracking-tight">
          {title}
        </h3>
        <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
          {plannedStage}
        </span>
      </div>

      <p className="text-xs text-slate-600 max-w-md leading-relaxed">
        {subtitle}
      </p>
    </div>
  );
};
