import React from 'react';
import { spacingOptions } from '../../../config/ui';
import { createLogger } from "../../../utils/logger";

// Create a logger for this module
const logger = createLogger('settings');


interface SpacingSectionProps {
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
 * Line spacing section in the settings panel
 */
const SpacingSection: React.FC<SpacingSectionProps> = ({
  sectionClassName,
  titleClassName,
  colors,
  settings,
  t,
  updateSettings
}) => {
  // Change the line spacing
  const changeSpacing = (spacing: string) => {
    const option = spacingOptions.find(opt => opt.value === spacing);
    if (option) {
      logger.info(`[Settings] Changing spacing to: ${spacing} (lineHeight: ${option.lineHeight})`);
      updateSettings({ 
        spacing,
        lineHeight: option.lineHeight
      });
    }
  };

  return (
    <section className={sectionClassName}>
      <h3 className={titleClassName}>{t('lineSpacing')}</h3>
      
      <div className="flex gap-1.5">
        {spacingOptions.map(option => {
          const isActive = settings.spacing === option.value;
          const spacingHeight = option.value === 'tight' ? '4px' : option.value === 'normal' ? '7px' : '10px';
          
          return (
            <button
              key={option.value}
              onClick={() => changeSpacing(option.value)}
              className={`flex-1 border rounded p-1.5 flex flex-col items-center cursor-pointer transition-all text-xs
                ${isActive ? 
                  `border-[${colors.highlight}] bg-[rgba(0,119,255,0.05)] text-[${colors.highlight}] font-medium` : 
                  `border-[${colors.border}] bg-transparent text-[${colors.text}]`}`}
            >
              {/* Spacing visualization */}
              <div className="flex flex-col w-full mb-1 items-center">
                <div className="w-10 h-[3px] bg-current rounded-sm" />
                <div style={{ height: spacingHeight }} />
                <div className="w-10 h-[3px] bg-current rounded-sm" />
                <div style={{ height: spacingHeight }} />
                <div className="w-10 h-[3px] bg-current rounded-sm" />
              </div>
              
              {/* Label */}
              <span>{t(option.spacingClass || option.value)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default SpacingSection; 