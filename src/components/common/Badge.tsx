import React from 'react';
import { getStatusColor } from '../../utils/formatters';

interface BadgeProps {
  status: string;
  label?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ status, label, size = 'sm' }) => {
  const colors = getStatusColor(status);
  const displayLabel = label || status.replace(/_/g, ' ');

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium border ${colors.bg} ${colors.text} ${colors.border} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs rounded' : 'px-2.5 py-1 text-xs rounded-md'
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {displayLabel}
    </span>
  );
};
