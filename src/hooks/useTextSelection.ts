import { useState, useEffect, useCallback, useRef } from 'react';
import { themeTokens } from '../config/theme';

// Define highlight color type using the new palette names
export type HighlightColor = 'beige' | 'cyan' | 'lavender' | 'olive' | 'peach';

// Define the position and content of the selected text
interface TextSelection {
  text: string;
  rect: DOMRect | null;
  isActive: boolean;
  highlightElement?: Element | null; // Reference to highlighted element when clicking on existing highlight
}

// Hook for using text selection - Updated type definition to accommodate any HTMLElement type
export function useTextSelection<T extends HTMLElement>(containerRef: React.RefObject<T | null>) {
  // Store selected text information
  const [selection, setSelection] = useState<TextSelection>({
    text: '',
    rect: null,
    isActive: false
  });
  
  // Use ref to track the latest selection state to avoid closure issues
  const selectionStateRef = useRef(selection);
  
  // Update ref when state changes
  useEffect(() => {
    selectionStateRef.current = selection;
  }, [selection]);

  // Clear the selected text
  const clearSelection = useCallback(() => {
    // Use the selection object from the iframe document if applicable
    try {
      const doc = containerRef.current?.ownerDocument || document;
      doc.getSelection()?.removeAllRanges();
    } catch (e) {
      console.error('Failed to clear selection:', e);
      // Fallback to default behavior
      window.getSelection()?.removeAllRanges();
    }
    
    setSelection({
      text: '',
      rect: null,
      isActive: false
    });
  }, [containerRef]);

  // Apply highlight style to the selected text
  const applyHighlight = useCallback((color: HighlightColor, note?: string) => {
    // Get the correct document and window objects
    const doc = containerRef.current?.ownerDocument || document;
    const selection = doc.getSelection();
    
    if (!selection || selection.rangeCount === 0) return false;

    const range = selection.getRangeAt(0);
    if (range.collapsed) return false;
    
    // Check if the selection is just whitespace or empty
    const text = range.toString().trim();
    if (!text) return false;

    // Add highlight styles to the document if not already present
    ensureHighlightStyles(doc, color);

    // Determine background color based on selected color
    const bgColor = (() => {
      switch(color) {
        case 'beige': return 'rgba(246,240,225,0.82)';
        case 'cyan': return 'rgba(220,240,255,0.82)';
        case 'lavender': return 'rgba(235,231,250,0.82)';
        case 'olive': return 'rgba(232,245,225,0.82)';
        case 'peach': return 'rgba(255,239,231,0.82)';
        default: return 'rgba(246,240,225,0.82)';
      }
    })();

    try {
      // Try the execCommand approach first (works in some browsers)
      if (doc.execCommand) {
        try {
          // We use execCommand which is technically deprecated but still works in many browsers
          doc.execCommand('hiliteColor', false, bgColor);
          
          // After highlighting, we need to find the highlighted elements and add our classes
          // This is because execCommand doesn't let us add classes directly
          const elements = Array.from(selection.getRangeAt(0).commonAncestorContainer.parentElement?.querySelectorAll('[style*="background-color"]') || []);
          
          // Filter to just elements that were likely part of our highlight (those with our specific color)
          const highlightedElements = elements.filter(el => {
            const style = window.getComputedStyle(el);
            const elBgColor = style.backgroundColor;
            // Simple color matching (this is approximate)
            return elBgColor === bgColor || elBgColor.includes(bgColor.slice(0, -4));
          });
          
          if (highlightedElements.length > 0) {
            // Add our custom classes and data attributes to the highlighted elements
            highlightedElements.forEach(el => {
              el.classList.add('readlite-highlight', `readlite-highlight-${color}`);
              el.setAttribute('data-highlight-color', color);
              el.setAttribute('data-highlight-id', generateHighlightId());
              if (note) {
                el.setAttribute('data-note', note);
                el.setAttribute('title', note);
              }
            });
            
            return true;
          }
        } catch (execError) {
          console.log('execCommand failed, falling back to DOM manipulation', execError);
        }
      }
      
      // Clone the range before manipulation
      const clonedRange = range.cloneRange();
      
      // Create a surrounding span for all of the selected content
      const highlightSpan = doc.createElement('span');
      highlightSpan.className = `readlite-highlight readlite-highlight-${color}`;
      highlightSpan.dataset.highlightColor = color;
      highlightSpan.dataset.highlightId = generateHighlightId();
      
      // 添加直接的内联样式，确保背景色始终有效
      highlightSpan.style.cssText = `display: inline !important; white-space: inherit !important; background-color: ${bgColor} !important;`;
      
      // Simple case: entirely within a single text node
      if (range.startContainer === range.endContainer && 
          range.startContainer.nodeType === Node.TEXT_NODE) {
        try {
          range.surroundContents(highlightSpan);
          clearSelection();
          return true;
        } catch (e) {
          console.error("Simple highlight failed:", e);
          // Fall through to the complex case if this fails
        }
      }
      
      // Complex case: try a safer approach by finding and wrapping each text node separately
      console.log("Complex selection detected, using safe approach");
      
      try {
        // Get all nodes in the selection range
        const nodes = getAllTextNodesInRange(range, doc);
        
        if (nodes.length === 0) {
          console.warn("No text nodes found in selection");
          return false;
        }
        
        // Process nodes in reverse to avoid changing positions
        nodes.reverse().forEach((textNode) => {
          const nodeRange = doc.createRange();
          
          // Determine if this is the start or end node
          const isStartNode = textNode === range.startContainer;
          const isEndNode = textNode === range.endContainer;
          
          // Set appropriate start and end points
          nodeRange.setStart(textNode, isStartNode ? range.startOffset : 0);
          nodeRange.setEnd(textNode, isEndNode ? range.endOffset : textNode.length);
          
          // Only highlight if there's content
          if (nodeRange.toString().trim()) {
            try {
              // Create a highlight span for this text segment
              const spanForNode = highlightSpan.cloneNode() as HTMLElement;
              
              // Extract content and wrap in span
              const content = nodeRange.extractContents();
              spanForNode.appendChild(content);
              nodeRange.insertNode(spanForNode);
            } catch (nodeError) {
              console.error("Error highlighting node:", nodeError);
            }
          }
        });
        
        // Clean up any empty spans created in the process
        clearEmptyHighlightSpans(range.commonAncestorContainer);
        
        clearSelection();
        return true;
        
      } catch (complexError) {
        console.error("Complex highlighting failed:", complexError);
        
        // Last resort fallback - try using execCommand for browser-native highlighting
        // This avoids DOM structure issues but may not work in all browsers
        try {
          // Add a style tag for our highlight class if needed
          ensureHighlightStyles(doc, color);
          
          // 注意：execCommand无法直接使用CSS变量，所以我们需要计算实际颜色
          // 这里使用一个近似的固定颜色值
          const execCommandColor = (() => {
            switch(color) {
              case 'beige': return '#f5e9d7';
              case 'cyan': return '#d6edff';
              case 'lavender': return '#e6e0f3';
              case 'olive': return '#e2efd9';
              case 'peach': return '#ffe6dc';
              default: return '#f5e9d7';
            }
          })();
          
          // Use execCommand as a fallback (may be deprecated in some browsers)
          doc.execCommand('hiliteColor', false, execCommandColor);
          
          // Wrap the highlighted content with our class
          setTimeout(() => {
            // 尝试找到刚刚高亮的元素
            const highlighted = doc.querySelectorAll(`[style*="background-color: ${execCommandColor}"]`);
            if (highlighted.length === 0) {
              // 如果没找到精确匹配，使用不太精确的匹配
              const allHighlighted = doc.getSelection()?.getRangeAt(0).commonAncestorContainer.parentElement?.querySelectorAll('[style*="background-color"]');
              if (allHighlighted && allHighlighted.length > 0) {
                Array.from(allHighlighted).forEach(node => {
                  if (node.nodeName !== 'SPAN') {
                    const span = doc.createElement('span');
                    span.className = `readlite-highlight readlite-highlight-${color}`;
                    span.dataset.highlightId = generateHighlightId();
                    if (note) {
                      span.dataset.note = note;
                      span.title = note;
                    }
                    // Copy the node's content
                    while (node.firstChild) span.appendChild(node.firstChild);
                    node.parentNode?.replaceChild(span, node);
                  } else {
                    (node as HTMLElement).classList.add(`readlite-highlight`);
                    (node as HTMLElement).classList.add(`readlite-highlight-${color}`);
                    (node as HTMLElement).dataset.highlightId = generateHighlightId();
                    if (note) {
                      (node as HTMLElement).dataset.note = note;
                      (node as HTMLElement).title = note;
                    }
                  }
                });
              }
            } else {
              highlighted.forEach(node => {
                if (node.nodeName !== 'SPAN') {
                  const span = doc.createElement('span');
                  span.className = `readlite-highlight readlite-highlight-${color}`;
                  span.dataset.highlightId = generateHighlightId();
                  if (note) {
                    span.dataset.note = note;
                    span.title = note;
                  }
                  // Copy the node's content
                  while (node.firstChild) span.appendChild(node.firstChild);
                  node.parentNode?.replaceChild(span, node);
                } else {
                  (node as HTMLElement).classList.add(`readlite-highlight`);
                  (node as HTMLElement).classList.add(`readlite-highlight-${color}`);
                  (node as HTMLElement).dataset.highlightId = generateHighlightId();
                  if (note) {
                    (node as HTMLElement).dataset.note = note;
                    (node as HTMLElement).title = note;
                  }
                }
              });
            }
          }, 0);
          
          clearSelection();
          return true;
        } catch (fallbackError) {
          console.error("All highlighting methods failed:", fallbackError);
          return false;
        }
      }
    } catch (error) {
      console.error('Failed to apply highlight:', error);
      return false;
    }
  }, [clearSelection, containerRef]);

  // Remove highlight from text
  const removeHighlight = useCallback((element: Element) => {
    try {
      if (!element || !element.parentNode) return false;
      
      const doc = containerRef.current?.ownerDocument || document;
      const fragment = doc.createDocumentFragment();
      
      // Move all children out of the highlight span
      while (element.firstChild) {
        fragment.appendChild(element.firstChild);
      }
      
      // Replace the highlight span with its contents
      element.parentNode.replaceChild(fragment, element);
      return true;
    } catch (error) {
      console.error('Failed to remove highlight:', error);
      return false;
    }
  }, [containerRef]);

  // Update note on an existing highlight
  const updateHighlightNote = useCallback((element: Element, note: string) => {
    try {
      if (!element) return false;
      
      element.setAttribute('data-note', note);
      element.setAttribute('title', note);
      return true;
    } catch (error) {
      console.error('Failed to update highlight note:', error);
      return false;
    }
  }, []);

  // Change highlight color
  const changeHighlightColor = useCallback((element: Element, color: HighlightColor) => {
    try {
      if (!element) return false;
      
      // Remove all color classes
      element.classList.remove(
        'readlite-highlight-beige',
        'readlite-highlight-cyan',
        'readlite-highlight-lavender',
        'readlite-highlight-olive',
        'readlite-highlight-peach'
      );
      
      // Add the new color class
      element.classList.add(`readlite-highlight-${color}`);
      element.setAttribute('data-highlight-color', color);
      return true;
    } catch (error) {
      console.error('Failed to change highlight color:', error);
      return false;
    }
  }, []);

  // Generate a unique ID for each highlight
  const generateHighlightId = () => {
    return `highlight-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  };

  // Helper function to find all text nodes within a range
  const getAllTextNodesInRange = (range: Range, doc: Document): Text[] => {
    // Get the common ancestor container
    const container = range.commonAncestorContainer;
    
    // Function to check if a node is at least partially in the range
    const nodeInRange = (node: Node): boolean => {
      if (node.nodeType !== Node.TEXT_NODE) return false;
      
      const nodeRange = doc.createRange();
      nodeRange.selectNodeContents(node);
      
      // Check if this node intersects with the selection range
      return range.compareBoundaryPoints(Range.END_TO_START, nodeRange) <= 0 &&
             range.compareBoundaryPoints(Range.START_TO_END, nodeRange) >= 0;
    };
    
    // Function to collect all text nodes in the container
    const collectTextNodes = (node: Node, textNodes: Text[]) => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (nodeInRange(node) && node.textContent && node.textContent.trim()) {
          textNodes.push(node as Text);
        }
      } else {
        // Recurse into child nodes
        for (let i = 0; i < node.childNodes.length; i++) {
          collectTextNodes(node.childNodes[i], textNodes);
        }
      }
    };
    
    const textNodes: Text[] = [];
    collectTextNodes(container, textNodes);
    return textNodes;
  };

  // Helper to clean up any empty highlight spans
  const clearEmptyHighlightSpans = (container: Node): void => {
    if (container.nodeType === Node.ELEMENT_NODE) {
      const emptySpans = (container as Element).querySelectorAll('span.readlite-highlight:empty');
      emptySpans.forEach(span => span.parentNode?.removeChild(span));
      
      // Also remove spans that only contain whitespace
      const spans = (container as Element).querySelectorAll('span.readlite-highlight');
      spans.forEach(span => {
        if (!span.textContent || !span.textContent.trim()) {
          span.parentNode?.removeChild(span);
        }
      });
    }
  };

  // Helper to ensure highlight styles are in the document
  const ensureHighlightStyles = (doc: Document, color: HighlightColor): void => {
    if (!doc.getElementById('readlite-highlight-styles')) {
      const style = doc.createElement('style');
      style.id = 'readlite-highlight-styles';
      
      // 使用硬编码颜色而不是CSS变量，确保兼容性
      style.textContent = `
        .readlite-highlight {
          display: inline !important;
          white-space: inherit !important;
          box-decoration-break: clone;
          -webkit-box-decoration-break: clone;
          border-radius: 2px;
          padding: 1px 0;
          margin: 0 -1px;
          cursor: pointer;
          transition: background-color 0.2s ease;
          position: relative;
          text-decoration: none !important;
        }
        .readlite-highlight-beige { background-color: rgba(246,240,225,0.82) !important; }
        .readlite-highlight-cyan { background-color: rgba(220,240,255,0.82) !important; }
        .readlite-highlight-lavender { background-color: rgba(235,231,250,0.82) !important; }
        .readlite-highlight-olive { background-color: rgba(232,245,225,0.82) !important; }
        .readlite-highlight-peach { background-color: rgba(255,239,231,0.82) !important; }
      `;
      doc.head.appendChild(style);
    }
  };

  // Helper to get the color value for a highlight color (from CSS variables)
  const getHighlightColor = (color: HighlightColor): string => {
    return `var(--readlite-highlight-${color})`;
  };

  // Get all highlights in the container
  const getAllHighlights = useCallback(() => {
    try {
      const container = containerRef.current;
      if (!container) return [];
      
      const doc = container.ownerDocument || document;
      const highlights = doc.querySelectorAll('.readlite-highlight');
      
      return Array.from(highlights);
    } catch (error) {
      console.error('Failed to get highlights:', error);
      return [];
    }
  }, [containerRef]);

  // Listen for text selection events
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    // Get the correct document and window objects
    const doc = container.ownerDocument || document;
    
    // Check if click is on a highlight element
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;
      
      // Check if the clicked element is a highlight
      const highlightElement = target.closest('.readlite-highlight');
      if (highlightElement) {
        const rect = highlightElement.getBoundingClientRect();
        
        // Create a selection object for the highlight
        setSelection({
          text: highlightElement.textContent || '',
          rect,
          isActive: true,
          highlightElement
        });
        
        // Prevent default selection
        e.preventDefault();
      }
    };
    
    // Simplified selection handler function to reduce complexity
    const handleSelectionChange = () => {
      requestAnimationFrame(() => { // Use requestAnimationFrame to prevent frequent updates
        try {
          const selection = doc.getSelection();
          
          // If there is no selection, clear it
          if (!selection || selection.rangeCount === 0 || selection.toString().trim() === '') {
            if (selectionStateRef.current.isActive) {
              setSelection({
                text: '',
                rect: null,
                isActive: false
              });
            }
            return;
          }
          
          // Get selected text
          const selectedText = selection.toString().trim();
          if (!selectedText) return;
          
          // Get the position of the selected area
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          
          // Check if rect is valid
          if (!rect || rect.width === 0 && rect.height === 0) {
            console.warn("Invalid selection rect", rect);
            return;
          }
          
          // Update selection state
          setSelection({
            text: selectedText,
            rect,
            isActive: true
          });
        } catch (e) {
          console.error("Error handling selection:", e);
        }
      });
    };

    // Use a simpler event listening mechanism
    const handleMouseUp = () => {
      handleSelectionChange();
    };
    
    // Immediately check if there is a current selection
    handleSelectionChange();
    
    // Add event listeners
    container.addEventListener('click', handleClick);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('touchend', handleMouseUp);
    doc.addEventListener('selectionchange', handleSelectionChange);
    
    return () => {
      container.removeEventListener('click', handleClick);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('touchend', handleMouseUp);
      doc.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [containerRef]);

  // Calculate toolbar position, considering iframe context
  const calculatePosition = () => {
    if (!selection.rect) return { top: 0, left: 0 };

    const toolbarWidth = 250;
    const toolbarHeight = 40;
    const spacing = 10;

    // Get iframe position offset - not needed if running directly inside the iframe
    // This code is only needed when positioning relative to the parent window
    /*
    let iframeRect = { top: 0, left: 0 };
    try {
      if (window !== window.parent) {
        // If we are in an iframe
        const iframe = window.frameElement;
        if (iframe) {
          const rect = iframe.getBoundingClientRect();
          iframeRect = { top: rect.top, left: rect.left };
        }
      }
    } catch (e) {
      // Cross-origin iframe will throw security error, ignore
      console.warn('Failed to get iframe position:', e);
    }
    */

    // Calculate initial position (bottom right)
    let left = selection.rect.right;
    let top = selection.rect.bottom + spacing;
    
    // Screen boundary checks
    if (left + toolbarWidth > window.innerWidth) {
      left = window.innerWidth - toolbarWidth - spacing;
    }
    
    if (top + toolbarHeight > window.innerHeight) {
      top = selection.rect.top - toolbarHeight - spacing;
    }
    
    return { top, left };
  };

  return {
    selection,
    clearSelection,
    applyHighlight,
    removeHighlight,
    updateHighlightNote,
    changeHighlightColor,
    getAllHighlights,
    calculatePosition
  };
} 