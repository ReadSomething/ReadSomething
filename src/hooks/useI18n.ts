import { useI18n as useI18nContext } from '../context/I18nContext'

// Re-export the hook for backward compatibility and ease of use
export const useI18n = useI18nContext

// Export types from the context for convenience
export type { SupportedLanguage } from '../utils/i18n'