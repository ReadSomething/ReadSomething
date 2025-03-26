/**
 * Extracts article content from a webpage
 * Using Mozilla's Readability algorithm and DOMPurify for sanitization
 */
import { Readability } from '@mozilla/readability';
import DOMPurify from 'dompurify';
import { franc } from 'franc-min';

// Article data structure
export interface Article {
  title: string;
  content: string;
  author?: string;
  date?: string;
  siteName?: string;
  textContent?: string; // Plain text content
  excerpt?: string;    // Short excerpt/description
  length?: number;     // Article length in characters
  byline?: string;     // Author metadata
  dir?: string;        // Content direction
  language?: string;   // Detected language code
}

// Language detection helper
export const detectLanguage = (text: string): string => {
  // Use a reasonable sample size to improve accuracy and performance
  const sampleText = text.slice(0, 1000);
  return franc(sampleText);
};

/**
 * Parse article from a document
 * @param doc - The document to parse
 * @returns Promise that resolves to article data
 */
export const parseArticle = async (doc: Document): Promise<Article | null> => {
  try {
    // Clone the document to avoid modifying the original
    const documentClone = doc.cloneNode(true) as Document;
    
    // Use Readability to extract the article content
    const reader = new Readability(documentClone);
    const article = reader.parse();
    
    if (!article) {
      console.warn("Readability couldn't extract article content");
      return null;
    }
    
    // Sanitize the content using DOMPurify to prevent XSS
    const sanitizedContent = DOMPurify.sanitize(article.content || '', {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'object', 'embed'],
      FORBID_ATTR: ['style']
    });
    
    // Allow safe image sources and links
    DOMPurify.addHook('afterSanitizeAttributes', function(node) {
      // Fix URLs for images and links
      if ('src' in node || 'href' in node) {
        // Allow http and https 
        if (node.getAttribute('href')?.startsWith('http')) {
          node.setAttribute('target', '_blank');
          node.setAttribute('rel', 'noopener noreferrer');
        }
        
        // Add other safe attributes as needed
        if (node.tagName === 'IMG') {
          node.setAttribute('loading', 'lazy');
          node.setAttribute('alt', node.getAttribute('alt') || 'Image');
        }
      }
    });

    // Detect article language
    const language = detectLanguage(article.textContent || '');
        
    // Return cleaned article data
    return {
      title: article.title || "",
      content: sanitizedContent,
      textContent: article.textContent || "",
      excerpt: article.excerpt || undefined,
      length: article.length || undefined,
      author: article.byline || undefined,
      byline: article.byline || undefined,
      date: article.siteName ? undefined : getArticleDate(documentClone),
      siteName: article.siteName || undefined,
      dir: article.dir || undefined,
      language: language
    };
  } catch (error) {
    console.error("Error parsing article:", error);
    return null;
  }
};

/**
 * Extract publication date from document if not provided by Readability
 */
function getArticleDate(doc: Document): string | undefined {
  // Try time element
  const timeEl = doc.querySelector('time');
  if (timeEl && timeEl.getAttribute('datetime')) {
    return formatDate(new Date(timeEl.getAttribute('datetime')!));
  }
  
  // Try meta tags
  const metaDate = doc.querySelector('meta[property="article:published_time"]');
  if (metaDate && metaDate.getAttribute('content')) {
    return formatDate(new Date(metaDate.getAttribute('content')!));
  }
  
  // Try common date selectors
  const dateSelectors = [
    '.date', '.time', '.published', '.pubdate', '.timestamp',
    '.post-date', '[itemprop="datePublished"]'
  ];
  
  for (const selector of dateSelectors) {
    const element = doc.querySelector(selector);
    if (element?.textContent) {
      return element.textContent.trim();
    }
  }
  
  return undefined;
}

/**
 * Format a date object into a readable string
 */
function formatDate(date: Date): string {
  if (isNaN(date.getTime())) {
    return '';
  }
  
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  } catch {
    return date.toLocaleDateString();
  }
} 