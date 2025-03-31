/**
 * Model configuration for ReadLite
 * Defines available models and their display names
 */

// Unified model list for use across the application
export const MODELS = [
  { value: 'claude-3-7-sonnet-latest', label: 'Claude 3.7 Sonnet' },
  { value: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet' }
] as const;

// Model options type derived from models array
export type ModelOption = typeof MODELS[number]['value'];

// Default model
export const DEFAULT_MODEL: ModelOption = MODELS[0].value;

/**
 * Helper function to get model display name
 */
export function getModelLabel(model: ModelOption): string {
  const foundModel = MODELS.find(m => m.value === model);
  return foundModel ? foundModel.label : model;
} 