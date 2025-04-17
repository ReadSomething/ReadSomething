import React, { useEffect, useState } from 'react';
import { CommonProps } from './types';

interface ThinkingIndicatorProps extends Pick<CommonProps, 't'> {}

const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({ t }) => {
  const [dots, setDots] = useState('.');
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '.' : prev + '.');
    }, 500);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="self-start mx-3 my-3 flex">
      <span className="text-[var(--readlite-text-secondary)] text-xl font-bold leading-none">
        {dots}
      </span>
    </div>
  );
};

export default ThinkingIndicator; 