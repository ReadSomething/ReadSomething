import React from 'react';
import { widthOptions } from '../../../config/ui';

interface WidthSectionProps {
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
 * Width adjustment section in the settings panel
 */
const WidthSection: React.FC<WidthSectionProps> = ({
  sectionClassName,
  titleClassName,
  colors,
  settings,
  t,
  updateSettings
}) => {
  // Change the content width
  const changeWidth = (width: number) => {
    updateSettings({ width });
  };

  return (
    <section className={sectionClassName}>
      <h3 className={titleClassName}>{t('contentWidth')}</h3>
      
      <div className="flex gap-1.5">
        {widthOptions.map(option => {
          const isActive = settings.width === option.value;
          return (
            <button
              key={option.value}
              onClick={() => changeWidth(option.value)}
              className={`flex-1 border rounded p-1.5 flex flex-col items-center cursor-pointer transition-all text-xs
                ${isActive ? 
                  `border-[${colors.highlight}] bg-[rgba(0,119,255,0.05)] text-[${colors.highlight}] font-medium` : 
                  `border-[${colors.border}] bg-transparent text-[${colors.text}]`}`}
            >
              <div className="w-full h-2.5 mb-1.5 flex justify-center">
                <div 
                  className={`bg-current rounded-sm ${
                    option.widthClass === 'narrow' ? 'w-[30%]' : 
                    option.widthClass === 'standard' ? 'w-[50%]' : 
                    'w-[70%]'
                  }`}
                />
              </div>
              <span>{t(option.label.en.toLowerCase())}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default WidthSection; 