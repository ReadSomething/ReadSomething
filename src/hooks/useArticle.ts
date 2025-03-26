import { useCallback } from "react"
import { parseArticle } from "../utils/parser"

/**
 * Hook for extracting article content from a web page
 * Provides clean API for getting article content
 */
export const useArticle = () => {
  /**
   * Extract article content from the current page
   * @returns Promise that resolves to article data or null if extraction fails
   */
  const extractArticle = useCallback(async () => {
    try {
      // Get the current document
      const doc = window.parent.document

      // Try to parse the article from the page
      const article = await parseArticle(doc)
      
      if (!article || !article.content) {
        console.warn("Failed to extract article content")
        return null
      }
      
      return article
    } catch (error) {
      console.error("Error extracting article:", error)
      return null
    }
  }, [])

  return { extractArticle }
} 