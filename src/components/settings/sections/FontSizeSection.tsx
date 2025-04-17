import React from 'react';

interface FontSizeSectionProps {
  sectionClassName: string;
  titleClassName: string;
  colors: {
    bg: string;
    text: string;
    border: string;
    highlight: string;
    buttonBg: string;
    buttonText: string;
  };
  settings: any;
  t: (key: string) => string;
  updateSettings: (settings: any) => void;
}

/**
 * Font size adjustment section in the settings panel
 */
const FontSizeSection: React.FC<FontSizeSectionProps> = ({
  sectionClassName,
  titleClassName,
  colors,
  settings,
  t,
  updateSettings
}) => {
  return (
    <section className={sectionClassName}>
      <h3 className={titleClassName}>{t('fontSize')}</h3>
      
      {/* Font size slider with A indicators */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs w-5 text-center font-medium opacity-70">A</span>
        <input 
          type="range" 
          min="12" 
          max="24" 
          step="1"
          value={settings.fontSize}
          onChange={(e) => {
            const size = parseInt(e.target.value);
            // Update global font size
            updateSettings({ fontSize: size });
          }}
          className="flex-1 mx-2 cursor-pointer h-4 sm:h-3"
          style={{ accentColor: colors.highlight }}
        />
        <span className="text-base w-5 text-center font-medium opacity-70">A</span>
      </div>
    
      {/* Current size indicator */}
      <div className="text-center mb-1 text-xs font-medium opacity-80" style={{ color: colors.highlight }}>
        {t('currentSize')}: {settings.fontSize}px
      </div>
      
      {/* Size indicators */}
      <div className="flex justify-between px-3 text-[10px] opacity-50">
        <span>12</span>
        <span>16</span>
        <span>20</span>
        <span>24</span>
      </div>
    </section>
  );
};

export default FontSizeSection; 