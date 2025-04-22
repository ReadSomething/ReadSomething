import React from 'react';
import { CommonProps } from './types';

interface ThinkingIndicatorProps extends Pick<CommonProps, 't'> {}

/**
 * Displays a thinking animation while the AI is processing
 */
const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({ t }) => {
  return (
    <div className="self-start mx-3 my-3">
      <div className="flex items-center text-text-secondary/80">
        <span className="text-xl font-bold relative animate-blink after:content-['...'] after:absolute after:animate-dots after:overflow-hidden after:w-0">.</span>
      </div>
    </div>
  );
};

export default ThinkingIndicator; 