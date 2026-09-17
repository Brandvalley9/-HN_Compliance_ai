import React from 'react';

interface ComplianceOrbProps {
  status: 'GREEN' | 'AMBER' | 'RED' | 'IDLE';
  score?: number;
  isEvaluating?: boolean;
}

export const ComplianceOrb: React.FC<ComplianceOrbProps> = ({
  status,
  score = 100,
  isEvaluating = false
}) => {
  const getDialClass = () => {
    if (isEvaluating) return 'bg-slate-700 animate-pulse';
    switch (status) {
      case 'GREEN':
        return 'dial-green';
      case 'AMBER':
        return 'dial-amber';
      case 'RED':
        return 'dial-red';
      default:
        return 'bg-gradient-to-br from-slate-700 to-slate-900 border border-white/10';
    }
  };

  const getStatusLabel = () => {
    if (isEvaluating) return 'ANALYZING';
    switch (status) {
      case 'GREEN':
        return 'COMPLIANT';
      case 'AMBER':
        return 'ACTION REQUIRED';
      case 'RED':
        return 'CRITICAL VIOLATION';
      default:
        return 'READY';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 glass-surface-elevated rounded-3xl relative overflow-hidden group">
      {/* Dynamic Specular Background Sheen */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all pointer-events-none" />

      {/* 3D Sphere Dial */}
      <div className="relative w-36 h-36 flex items-center justify-center mb-4">
        <div
          className={`w-32 h-32 dial-sphere flex items-center justify-center transition-transform duration-700 ease-out transform group-hover:scale-105 ${getDialClass()}`}
        >
          <div className="text-center">
            <span className="block text-3xl font-extrabold tracking-tight text-white drop-shadow-md">
              {isEvaluating ? '•••' : `${score}%`}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-white/80">
              Confidence
            </span>
          </div>
        </div>
      </div>

      {/* Status Pill Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/40 border border-white/10 backdrop-blur-md">
        <span
          className={`w-2 h-2 rounded-full ${
            status === 'GREEN'
              ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
              : status === 'AMBER'
              ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
              : status === 'RED'
              ? 'bg-rose-400 shadow-[0_0_8px_#fb7185]'
              : 'bg-slate-400'
          }`}
        />
        <span className="text-xs font-bold tracking-wider uppercase text-slate-200">
          {getStatusLabel()}
        </span>
      </div>
    </div>
  );
};
