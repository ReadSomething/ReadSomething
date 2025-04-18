/**
 * Extracts article content from a webpage
 * Using Mozilla's Readability algorithm and DOMPurify for sanitization
 */
import { Readability } from '@mozilla/readability';
import DOMPurify from 'dompurify';
import { franc } from 'franc-min';
import { normalizeLanguageCode } from './language';

import { createLogger } from "~/utils/logger";

// Create a logger for this module
const logger = createLogger('parser');


// --- Constants ---

// DOMPurify configuration (Whitelist approach)
const SANITIZE_CONFIG = {
  // Keep only semantic and structural tags necessary for reading content
  ALLOWED_TAGS: [
    'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
    'img', 'a', 
    'ul', 'ol', 'li', 
    'blockquote', 'pre', 'code', 
    'figure', 'figcaption', 
    'strong', 'em', 'b', 'i', 'u', 'strike', 'sub', 'sup', 
    'br', 'hr',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td'
  ],
  // Keep only essential attributes + those added by the hook
  ALLOWED_ATTR: [
    'href', // for <a>
    'src', 'alt', 'loading', 'title', // for <img> (title is optional but common)
    'target', 'rel', // for <a> (added by hook)
    'start', // for <ol>
    'colspan', 'rowspan', // for <td>, <th>
    'scope', // for <th>
    'lang'  // for language tagging
    // Note: 'class', 'id', 'style', and event handlers are implicitly forbidden
  ],
  // Explicitly disallow all data-* attributes
  ALLOW_DATA_ATTR: false, 
  // FORBID_TAGS and FORBID_ATTR are removed as ALLOWED_* provide the whitelist
};

// Selectors used by getArticleDate to find publication dates heuristically
const DATE_SELECTORS = [
  'time[datetime]', // Prefer <time> elements with datetime attribute
  'meta[property="article:published_time"]', // Common meta tag
  'meta[name="pubdate"]', 
  'meta[name="date"]',
  '[itemprop="datePublished"]', // Schema.org
  '.published', '.pubdate', '.date', '.time', '.timestamp', '.post-date' // Common class names
];

// --- Types ---

// Define the structure of the object returned by this parser
export interface Article {
  title: string;
  content: string;      // Sanitized HTML content
  textContent?: string; // Plain text content
  length?: number;     // Article length in characters
  excerpt?: string;    // Short excerpt/description
  byline?: string;     // Author metadata (often same as author)
  siteName?: string;
  dir?: string;        // Content direction (e.g., 'ltr')
  language?: string;   // Detected language code (ISO 639-1)
  date?: string;       // Formatted publication date (YYYY-MM-DD) if found
  // Note: We explicitly map byline to author in parseArticle if needed
}

// --- Functions ---

/**
 * Detects the primary language of a text snippet.
 * @param text Text content to analyze.
 * @returns Normalized language code (ISO 639-1) or 'und' if detection fails.
 */
export const detectLanguage = (text: string): string => {
  if (!text) return 'en';
  // Use a reasonable sample size for performance and accuracy
  const sampleText = text.slice(0, 1500);
  const detectedCode = franc(sampleText, { minLength: 3 }); // Use franc options if needed
  // Normalize the detected code (e.g., 'eng' -> 'en')
  return normalizeLanguageCode(detectedCode);
};

/**
 * Extracts the main article content from a Document using Readability,
 * sanitizes it, detects language, and attempts to find the publication date.
 * @param doc The original Document object.
 * @returns A Promise resolving to the processed Article object or null if parsing fails.
 */
export const parseArticle = async (doc: Document): Promise<Article | null> => {
  logger.info("Starting article parsing.");
  try {
    const documentClone = doc.cloneNode(true) as Document;
    
    logger.info("Running Readability...");
    const reader = new Readability(documentClone);
    const readabilityResult = reader.parse(); // Store the result
    
    if (!readabilityResult) {
      logger.warn("Readability failed to parse article content.");
      return null;
    }
    logger.info(`Readability extracted content titled: "${readabilityResult.title}"`);
    
    // --- Log HTML before sanitization ---
    logger.info(`HTML content BEFORE sanitization (first 500 chars):`, readabilityResult.content?.substring(0, 500)); // Log a sample

    // --- Sanitization Hook --- 
    // This hook runs *after* the main sanitization pass.
    // It modifies attributes on ALLOWED tags (img, a) to add safe,
    // functional attributes (target, rel, loading, alt).
    // It does NOT allow new tags or attributes that were initially forbidden.
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      // Add target="_blank" and rel="noopener noreferrer" to external links
      if (node.tagName === 'A' && node.getAttribute('href')?.startsWith('http')) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
      // Add lazy loading and default alt text to images
      if (node.tagName === 'IMG') {
        node.setAttribute('loading', 'lazy');
        if (!node.getAttribute('alt')) { // Only add alt if it's missing
           node.setAttribute('alt', 'Image');
        }
      }
    });

    // Sanitize the extracted HTML content
    logger.info("Sanitizing HTML content with config:", SANITIZE_CONFIG); // Log config used
    // Use content from readabilityResult
    const sanitizedContent = DOMPurify.sanitize(readabilityResult.content || '', SANITIZE_CONFIG);
    
    // --- Log HTML after sanitization ---
    logger.info(`HTML content AFTER sanitization (first 500 chars):`, sanitizedContent.substring(0, 500)); // Log a sample

    // Detect language from text content
    logger.info("Detecting language...");
    // Use textContent from readabilityResult
    const language = detectLanguage(readabilityResult.textContent || '');
    logger.info(`Detected language: ${language}`);
        
    // Attempt to find and format publication date
    const publicationDate = getArticleDate(documentClone);
    logger.info(`Found date: ${publicationDate || 'None'}`);

    // Construct the final Article object using fields from readabilityResult
    const finalArticle: Article = {
      title: readabilityResult.title || "",
      content: sanitizedContent,
      textContent: readabilityResult.textContent || undefined,
      length: readabilityResult.length || undefined,
      excerpt: readabilityResult.excerpt || undefined,
      byline: readabilityResult.byline || undefined, // Keep original byline if needed elsewhere
      siteName: readabilityResult.siteName || undefined,
      dir: readabilityResult.dir || undefined,
      language: language, 
      date: publicationDate, 
    };

    // Remove the hook after use if DOMPurify allows (or manage hooks globally if needed)
    // DOMPurify.removeHook('afterSanitizeAttributes'); 

    logger.info("Parsing complete.");
    return finalArticle;

  } catch (error) {
    logger.error("Error during article parsing pipeline:", error);
    return null;
  }
};

/**
 * Attempts to extract and format the publication date from a document.
 * Uses various heuristics (time tags, meta tags, common selectors).
 * @param doc The Document to search within.
 * @returns Formatted date string (YYYY-MM-DD) or undefined if not found/parsable.
 */
function getArticleDate(doc: Document): string | undefined {
  for (const selector of DATE_SELECTORS) {
    const element = doc.querySelector(selector);
    let dateString: string | null = null;

    if (element) {
      if (element.tagName === 'META') {
        dateString = element.getAttribute('content');
      } else if (element.tagName === 'TIME') {
        dateString = element.getAttribute('datetime');
      } 
      // If still no dateString, try textContent for other selectors
      if (!dateString) {
          dateString = element.textContent;
      }
    }

    if (dateString) {
      try {
        const date = new Date(dateString.trim());
        // Check if the parsed date is valid before formatting
        if (!isNaN(date.getTime())) {
          return formatDate(date); // Format valid dates
        }
      } catch (e) {
        // Ignore parsing errors for this selector and try the next
        logger.warn(`Could not parse date string "${dateString}" from selector "${selector}"`);
      }
    }
  }
  
  return undefined; // No valid date found
}

/**
 * Formats a Date object into a standard YYYY-MM-DD string.
 * Returns an empty string if the date is invalid.
 */
function formatDate(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    logger.warn(`formatDate received an invalid date object.`);
    return ''; // Return empty string for invalid dates
  }
  
  try {
    // Use toISOString for a guaranteed locale-independent YYYY-MM-DD format
    return date.toISOString().split('T')[0];
  } catch (error) {
    logger.error(`Error formatting date object:`, error);
    // Fallback to a simple format if toISOString fails unexpectedly
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
} 