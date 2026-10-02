import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
      <div className="p-3 mb-3 bg-slate-800/80 rounded-xl text-slate-400">
        <Icon className="w-8 h-8" />
      </div>
      <h4 className="text-base font-medium text-slate-200">{title}</h4>
      <p className="max-w-sm mt-1 text-xs text-slate-400">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-3.5 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-700/50 rounded-lg hover:bg-emerald-900/50 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
