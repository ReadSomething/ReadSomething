import React from 'react';
import { ModelOption, MODELS, getModelLabel } from '../config/model';

interface ModelSelectorProps {
  selectedModel: ModelOption;
  onChange: (model: ModelOption) => void;
}

/**
 * Minimalist model selector component
 */
const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModel, onChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value as ModelOption;
    onChange(newValue);
  };

  return (
    <div className="model-selector" style={{
      display: 'flex',
      alignItems: 'center',
      position: 'relative',
      fontSize: '12px',
      fontWeight: 500,
    }}>
      <select
        value={selectedModel}
        onChange={handleChange}
        aria-label="Select model"
        style={{
          appearance: 'none',
          background: 'transparent',
          border: '1px solid #e0e0e0',
          borderRadius: '4px',
          padding: '6px 24px 6px 10px',
          fontSize: '12px',
          cursor: 'pointer',
          color: '#333',
          outline: 'none',
          width: 'auto',
          fontFamily: 'inherit'
        }}
      >
        {MODELS.map((model) => (
          <option key={model.value} value={model.value}>
            {model.label}
          </option>
        ))}
      </select>
      <div style={{
        position: 'absolute',
        right: '8px',
        pointerEvents: 'none'
      }}>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 1L5 5L9 1" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
};

export default ModelSelector; 