import React from 'react';
import { Tag } from '../types';

interface TagChipProps {
  tag: Tag;
  size?: 'sm' | 'md' | 'lg';
  showRemove?: boolean;
  onRemove?: () => void;
  className?: string;
}

export const TagChip = ({ tag, size = 'md', showRemove, onRemove, className = '' }: TagChipProps) => {
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses[size]} ${className}`}
      style={{
        backgroundColor: `${tag.color}20`,
        color: tag.color,
        border: `1px solid ${tag.color}40`,
      }}
    >
      #{tag.name}
      {showRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className="hover:opacity-70 transition-opacity"
        >
          &times;
        </button>
      )}
    </span>
  );
};
