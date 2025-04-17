import React, { forwardRef } from 'react';

interface ReaderDividerProps {
  theme: 'light' | 'dark' | 'sepia' | 'paper';
  isDragging: boolean;
  onDragStart: (e: React.MouseEvent) => void;
}

/**
 * Resizable divider component between reader and AI panels
 */
const ReaderDivider = forwardRef<HTMLDivElement, ReaderDividerProps>(
  ({ theme, isDragging, onDragStart }, ref) => {
    // Get divider background color based on theme and drag state
    const getDividerClasses = () => {
      const baseClasses = "w-1 cursor-col-resize select-none transition-colors duration-200 relative block mx-[-2px] z-10";
      
      if (isDragging) {
        return `${baseClasses} ${theme === 'dark' ? 'bg-white/10' : 'bg-black/10'}`;
      } else {
        return `${baseClasses} ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'}`;
      }
    };
    
    // Get handle classes based on theme
    const getHandleClasses = () => {
      return `absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[50px] w-0.5 rounded-sm ${
        theme === 'dark' ? 'bg-white/15' : 'bg-black/12'
      }`;
    };

    return (
      <div 
        ref={ref}
        className={getDividerClasses()}
        onMouseDown={onDragStart}
      >
        {/* Vertical drag handle line */}
        <div className={getHandleClasses()} />
      </div>
    );
  }
);

ReaderDivider.displayName = 'ReaderDivider';

export default ReaderDivider; 