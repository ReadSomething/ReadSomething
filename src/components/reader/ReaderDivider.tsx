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
    // Get divider background color based on theme and drag state
    const getDividerClasses = () => {
      const baseClasses = "w-1 cursor-col-resize select-none transition-colors duration-200 relative block mx-[-2px] z-10";
      
      // Check if it's a dark theme
      const isDarkTheme = theme === 'dark';
      
      if (isDragging) {
        return `${baseClasses} ${isDarkTheme ? 'bg-white/10' : 'bg-black/10'}`;
      } else {
        return `${baseClasses} ${isDarkTheme ? 'bg-white/5' : 'bg-black/5'}`;
      }
    };
    
    // Get handle classes based on theme
    const getHandleClasses = () => {
      // Check if it's a dark theme
      const isDarkTheme = theme === 'dark';
      
      return `absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[50px] w-0.5 rounded-sm ${
        isDarkTheme ? 'bg-white/15' : 'bg-black/12'
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