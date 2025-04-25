import { useState, useEffect, useCallback, useRef } from 'react';

// Define highlight color type using the new palette names
export type HighlightColor = 'beige' | 'cyan' | 'lavender' | 'olive' | 'peach';

// Color configuration with consistent values
const HIGHLIGHT_COLORS = {
  beige: {
    background: 'rgba(255,245,230,0.82)',
    solid: '#fff5e6'
  },
  cyan: {
    background: 'rgba(181,228,255,0.82)',
    solid: '#b5e4ff'
  },
  lavender: {
    background: 'rgba(220,198,255,0.82)',
    solid: '#dcc6ff'
  },
  olive: {
    background: 'rgba(222,234,181,0.82)',
    solid: '#deeab5'
  },
  peach: {
    background: 'rgba(255,204,153,0.82)',
    solid: '#ffcc99'
  }
};

// Define the position and content of the selected text
interface TextSelection {
  text: string;
  rect: DOMRect | null;
  isActive: boolean;
  highlightElement?: Element | null; // Reference to highlighted element when clicking on existing highlight
}

// Helper to generate a unique ID for each highlight
const generateHighlightId = (): string => {
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
const ensureHighlightStyles = (doc: Document): void => {
  if (doc.getElementById('readlite-highlight-styles')) return;
  
  const style = doc.createElement('style');
  style.id = 'readlite-highlight-styles';
  
  // Use hardcoded colors instead of CSS variables for compatibility
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
    .readlite-highlight-beige { background-color: ${HIGHLIGHT_COLORS.beige.background} !important; }
    .readlite-highlight-cyan { background-color: ${HIGHLIGHT_COLORS.cyan.background} !important; }
    .readlite-highlight-lavender { background-color: ${HIGHLIGHT_COLORS.lavender.background} !important; }
    .readlite-highlight-olive { background-color: ${HIGHLIGHT_COLORS.olive.background} !important; }
    .readlite-highlight-peach { background-color: ${HIGHLIGHT_COLORS.peach.background} !important; }
  `;
  
  doc.head.appendChild(style);
};

// Helper to create a highlight element
const createHighlightElement = (doc: Document, color: HighlightColor, note?: string): HTMLSpanElement => {
  const highlightSpan = doc.createElement('span');
  highlightSpan.className = `readlite-highlight readlite-highlight-${color}`;
  highlightSpan.dataset.highlightColor = color;
  highlightSpan.dataset.highlightId = generateHighlightId();
  
  // Add inline styles to ensure background color is always effective
  highlightSpan.style.cssText = `display: inline !important; white-space: inherit !important; background-color: ${HIGHLIGHT_COLORS[color].background} !important;`;
  
  if (note) {
    highlightSpan.dataset.note = note;
    highlightSpan.title = note;
  }
  
  return highlightSpan;
};

// Create a debounce function for handling frequent events
const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<F>): void => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };
};

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

  // Apply highlight strategy using execCommand (primary approach)
  const applyHighlightWithExecCommand = useCallback((
    doc: Document, 
    selection: Selection, 
    color: HighlightColor, 
    note?: string
  ): boolean => {
    try {
      // Use the background color for highlighting
      const bgColor = HIGHLIGHT_COLORS[color].background;
      
      // 为整个高亮创建一个共享的ID
      const sharedHighlightId = generateHighlightId();
      
      // Apply highlight with execCommand
      doc.execCommand('hiliteColor', false, bgColor);
      
      // After highlighting, find the highlighted elements and add our classes
      const elements = Array.from(selection.getRangeAt(0).commonAncestorContainer.parentElement?.querySelectorAll('[style*="background-color"]') || []);
      
      // Filter to just elements that were likely part of our highlight
      const highlightedElements = elements.filter(el => {
        const style = window.getComputedStyle(el);
        const elBgColor = style.backgroundColor;
        // Simple color matching (this is approximate)
        return elBgColor === bgColor || elBgColor.includes(bgColor.slice(0, -4));
      });
      
      if (highlightedElements.length === 0) return false;
      
      // Add our custom classes and data attributes to the highlighted elements
      highlightedElements.forEach(el => {
        el.classList.add('readlite-highlight', `readlite-highlight-${color}`);
        el.setAttribute('data-highlight-color', color);
        // 使用共享ID
        el.setAttribute('data-highlight-id', sharedHighlightId);
        if (note) {
          el.setAttribute('data-note', note);
          el.setAttribute('title', note);
        }
      });
      
      return true;
    } catch (error) {
      console.warn('execCommand highlight failed:', error);
      return false;
    }
  }, []);

  // Apply highlight strategy using DOM manipulation (secondary approach)
  const applyHighlightWithDomManipulation = useCallback((
    doc: Document, 
    range: Range, 
    color: HighlightColor, 
    note?: string
  ): boolean => {
    try {
      // Clone the range before manipulation
      const clonedRange = range.cloneRange();
      
      // 为整个高亮创建一个共享的ID，确保同一次操作中的所有高亮元素使用相同的ID
      const sharedHighlightId = generateHighlightId();
      
      // Create a surrounding span for the selected content
      const createSpan = () => {
        const span = doc.createElement('span');
        span.className = `readlite-highlight readlite-highlight-${color}`;
        span.dataset.highlightColor = color;
        // 使用共享ID
        span.dataset.highlightId = sharedHighlightId;
        
        // Add inline styles to ensure background color is always effective
        span.style.cssText = `display: inline !important; white-space: inherit !important; background-color: ${HIGHLIGHT_COLORS[color].background} !important;`;
        
        if (note) {
          span.dataset.note = note;
          span.title = note;
        }
        
        return span;
      };
      
      // Simple case: entirely within a single text node
      if (range.startContainer === range.endContainer && 
          range.startContainer.nodeType === Node.TEXT_NODE) {
        const highlightSpan = createSpan();
        range.surroundContents(highlightSpan);
        return true;
      }
      
      // Complex case: multiple nodes or partial nodes
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
          // Create a highlight span for this text segment - with shared ID
          const spanForNode = createSpan();
          
          // Extract content and wrap in span
          const content = nodeRange.extractContents();
          spanForNode.appendChild(content);
          nodeRange.insertNode(spanForNode);
        }
      });
      
      // Clean up any empty spans created in the process
      clearEmptyHighlightSpans(range.commonAncestorContainer);
      
      return true;
    } catch (error) {
      console.error("DOM manipulation highlight failed:", error);
      return false;
    }
  }, []);

  // Fallback highlight strategy using execCommand with setTimeout
  const applyHighlightWithFallback = useCallback((
    doc: Document, 
    selection: Selection, 
    color: HighlightColor, 
    note?: string
  ): boolean => {
    try {
      // Use solid color for better compatibility
      const execCommandColor = HIGHLIGHT_COLORS[color].solid;
      
      // 为整个高亮创建一个共享的ID
      const sharedHighlightId = generateHighlightId();
      
      // Use execCommand as a fallback
      doc.execCommand('hiliteColor', false, execCommandColor);
      
      // Try to find the recently highlighted elements
      setTimeout(() => {
        const highlighted = doc.querySelectorAll(`[style*="background-color: ${execCommandColor}"]`);
        const elements = highlighted.length > 0 
          ? highlighted 
          : doc.getSelection()?.getRangeAt(0).commonAncestorContainer.parentElement?.querySelectorAll('[style*="background-color"]') || [];
        
        Array.from(elements).forEach(node => {
          if (node.nodeName !== 'SPAN') {
            const span = doc.createElement('span');
            span.className = `readlite-highlight readlite-highlight-${color}`;
            span.dataset.highlightColor = color;
            // 使用共享ID
            span.dataset.highlightId = sharedHighlightId;
            
            // Add inline styles for consistent highlighting
            span.style.cssText = `display: inline !important; white-space: inherit !important; background-color: ${HIGHLIGHT_COLORS[color].background} !important;`;
            
            if (note) {
              span.dataset.note = note;
              span.title = note;
            }
            
            // Copy the node's content
            while (node.firstChild) span.appendChild(node.firstChild);
            node.parentNode?.replaceChild(span, node);
          } else {
            (node as HTMLElement).classList.add('readlite-highlight', `readlite-highlight-${color}`);
            // 使用共享ID
            (node as HTMLElement).dataset.highlightId = sharedHighlightId;
            if (note) {
              (node as HTMLElement).dataset.note = note;
              (node as HTMLElement).title = note;
            }
          }
        });
      }, 0);
      
      return true;
    } catch (error) {
      console.error("Fallback highlight failed:", error);
      return false;
    }
  }, []);

  // Apply highlight style to the selected text (main function using the strategies defined above)
  const applyHighlight = useCallback((color: HighlightColor, note?: string): boolean => {
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
    ensureHighlightStyles(doc);

    // Try each strategy in sequence
    
    // Strategy 1: execCommand (works in most browsers)
    if (applyHighlightWithExecCommand(doc, selection, color, note)) {
      clearSelection();
      return true;
    }
    
    // Strategy 2: DOM manipulation (more accurate but may fail in complex DOM structures)
    if (applyHighlightWithDomManipulation(doc, range, color, note)) {
      clearSelection();
      return true;
    }
    
    // Strategy 3: Fallback (less precise but handles edge cases)
    if (applyHighlightWithFallback(doc, selection, color, note)) {
      clearSelection();
      return true;
    }
    
    // If all strategies fail
    console.error('All highlighting methods failed');
    return false;
  }, [clearSelection, containerRef, applyHighlightWithExecCommand, applyHighlightWithDomManipulation, applyHighlightWithFallback]);

  // Remove highlight from text
  const removeHighlight = useCallback((element: Element): boolean => {
    if (!element || !element.parentNode) {
      console.error('Cannot remove highlight: Invalid element or missing parent');
      return false;
    }
    
    try {
      const doc = containerRef.current?.ownerDocument || document;
      const fragment = doc.createDocumentFragment();
      
      // Check if it's an actual highlight
      if (!element.classList.contains('readlite-highlight')) {
        console.warn('Attempted to remove element that is not a highlight');
        return false;
      }
      
      // Move all children out of the highlight span
      while (element.firstChild) {
        fragment.appendChild(element.firstChild);
      }
      
      // Replace the highlight span with its contents
      element.parentNode.replaceChild(fragment, element);
      
      // For debugging
      console.log('Successfully removed highlight');
      return true;
    } catch (error) {
      console.error('Failed to remove highlight:', error);
      return false;
    }
  }, [containerRef]);

  // Update note on an existing highlight
  const updateHighlightNote = useCallback((element: Element, note: string): boolean => {
    if (!element) return false;
    
    try {
      element.setAttribute('data-note', note);
      element.setAttribute('title', note);
      return true;
    } catch (error) {
      console.error('Failed to update highlight note:', error);
      return false;
    }
  }, []);

  // Change highlight color
  const changeHighlightColor = useCallback((element: Element, color: HighlightColor): boolean => {
    if (!element) return false;
    
    try {
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

  // Get all highlights in the container
  const getAllHighlights = useCallback((): Element[] => {
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
      try {
        const target = e.target as Element;
        
        // Check if the clicked element is a highlight
        const highlightElement = target.closest('.readlite-highlight');
        if (!highlightElement) return;
        
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
      } catch (error) {
        console.error('Error handling highlight click:', error);
      }
    };
    
    // Optimized selection handler with debouncing
    const handleSelectionChange = debounce(() => {
      try {
        const selection = doc.getSelection();
        
        // If there is no selection, clear it if currently active
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
        if (!rect || (rect.width === 0 && rect.height === 0)) {
          console.warn("Invalid selection rect", rect);
          return;
        }
        
        // Only update if there's an actual change to reduce renders
        const currentSelection = selectionStateRef.current;
        if (
          currentSelection.text !== selectedText || 
          !currentSelection.rect || 
          !currentSelection.isActive
        ) {
          // Update selection state
          setSelection({
            text: selectedText,
            rect,
            isActive: true
          });
        }
      } catch (e) {
        console.error("Error handling selection:", e);
      }
    }, 50); // 50ms debounce delay for smoother performance

    // Event listeners with appropriate handlers
    container.addEventListener('click', handleClick);
    container.addEventListener('mouseup', handleSelectionChange);
    container.addEventListener('touchend', handleSelectionChange);
    doc.addEventListener('selectionchange', handleSelectionChange);
    
    // Clean up event listeners
    return () => {
      container.removeEventListener('click', handleClick);
      container.removeEventListener('mouseup', handleSelectionChange);
      container.removeEventListener('touchend', handleSelectionChange);
      doc.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [containerRef]);

  // Calculate toolbar position, considering iframe context
  const calculatePosition = useCallback(() => {
    if (!selection.rect) return { top: 0, left: 0 };

    const toolbarWidth = 250;
    const toolbarHeight = 40;
    const spacing = 10;

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
  }, [selection.rect]);

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