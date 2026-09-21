import React from 'react';
import { ComplianceOverallStatus } from '../../types/compliance';
import { ShieldCheck, AlertTriangle, ShieldAlert } from 'lucide-react';

interface ComplianceOrbProps {
  status: ComplianceOverallStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const ComplianceOrb: React.FC<ComplianceOrbProps> = ({
  status,
  size = 'md',
  showLabel = true
}) => {
  const getOrbConfig = () => {
    switch (status) {
      case 'GREEN':
        return {
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/30',
          glow: 'shadow-[0_0_25px_rgba(16,185,129,0.25)]',
          text: 'text-emerald-700',
          indicatorBg: 'bg-emerald-500',
          icon: ShieldCheck,
          label: 'Statutory Cleared'
        };
      case 'AMBER':
        return {
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/30',
          glow: 'shadow-[0_0_25px_rgba(245,158,11,0.25)]',
          text: 'text-amber-700',
          indicatorBg: 'bg-amber-500',
          icon: AlertTriangle,
          label: 'Human Audit Required'
        };
      case 'RED':
      default:
        return {
          bg: 'bg-rose-500/10',
          border: 'border-rose-500/30',
          glow: 'shadow-[0_0_25px_rgba(244,63,94,0.25)]',
          text: 'text-rose-700',
          indicatorBg: 'bg-rose-500',
          icon: ShieldAlert,
          label: 'Direct Rule Violation'
        };
    }
  };

  const config = getOrbConfig();
  const IconComponent = config.icon;

  const sizeClasses = {
    sm: 'w-12 h-12 text-xs',
    md: 'w-20 h-20 text-sm',
    lg: 'w-28 h-28 text-base'
  };

  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div
        className={`relative rounded-full flex items-center justify-center border transition-all duration-500 ${config.bg} ${config.border} ${config.glow} ${sizeClasses[size]}`}
      >
        <div className="absolute inset-1 rounded-full border border-white/40" />
        <IconComponent className={`${iconSizes[size]} ${config.text} transition-transform duration-300 hover:scale-110`} />
        
        {/* Subtle breathing dot */}
        <span className={`absolute top-1 right-1 w-2.5 h-2.5 rounded-full ${config.indicatorBg} ring-2 ring-white animate-pulse`} />
      </div>

      {showLabel && (
        <div className="text-center">
          <span className={`text-[11px] font-bold uppercase tracking-wider block ${config.text}`}>
            {status}
          </span>
          <span className="text-[10px] text-slate-500 font-medium">
            {config.label}
          </span>
        </div>
      )}
    </div>
  );
};
