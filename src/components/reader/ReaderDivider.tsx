import React, { forwardRef } from 'react';
import { ThemeType } from '../../config/theme';

interface ReaderDividerProps {
  theme: ThemeType;
  isDragging: boolean;
  onDragStart: (e: React.MouseEvent) => void;
}

/**
 * Resizable divider component between reader and AI panels
 */
const ReaderDivider = forwardRef<HTMLDivElement, ReaderDividerProps>(
  ({ theme, isDragging, onDragStart }, ref) => {
    return (
      <div 
        ref={ref}
        className={`w-1 cursor-col-resize select-none relative block mx-[-2px] z-10 transition-colors duration-200
          ${isDragging ? 'bg-accent/10' : 'bg-border/40'}`}
        onMouseDown={onDragStart}
      >
        {/* Vertical drag handle line */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[50px] w-0.5 rounded-sm bg-border" />
      </div>
    );
  }
);

ReaderDivider.displayName = 'ReaderDivider';

export default ReaderDivider; 