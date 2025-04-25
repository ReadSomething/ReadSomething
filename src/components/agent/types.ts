import { Model } from '../../types/api';

// Update CommonProps to only include translation function
export interface CommonProps {
  t: (key: string) => string;
}

// Message interface
export interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: number;
  thinking?: boolean;
  error?: boolean;
  contextType?: ContextType; // Track which context was used
  reference?: string; // Store reference text for quotes/selections
}

// Available context types
export type ContextType = 'screen' | 'article' | 'selection';

// Re-export Model type for convenience
export type { Model }; 