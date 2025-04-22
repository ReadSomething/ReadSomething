/**
 * Custom event name for text selection inside shadow DOM
 */
export const SELECTION_EVENT = 'READLITE_TEXT_SELECTED';

/**
 * Injects a script into the shadow DOM to detect and relay text selection events
 * @param shadowRoot The shadow root element to inject the script into
 */
export const injectShadowDomSelectionHandler = (shadowRoot: ShadowRoot): void => {
  // Create a script element
  const script = document.createElement('script');
  script.textContent = `
    (function() {
      // Prevent adding multiple listeners
      if (window.__readliteSelectionHandlerAdded) return;
      window.__readliteSelectionHandlerAdded = true;
      
      // Function to handle text selection inside shadow DOM
      function handleShadowSelection(e) {
        const selection = window.getSelection();
        
        if (selection && !selection.isCollapsed && selection.toString().trim() !== '') {
          const text = selection.toString().trim();
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          
          // Dispatch custom event to be caught outside shadow DOM
          document.dispatchEvent(new CustomEvent('${SELECTION_EVENT}', { 
            detail: { 
              text: text,
              rect: {
                top: rect.top,
                right: rect.right,
                bottom: rect.bottom,
                left: rect.left,
                width: rect.width,
                height: rect.height
              }
            } 
          }));
        }
      }
      
      // Add mouseup listener to the document to detect selection
      document.addEventListener('mouseup', handleShadowSelection);
    })();
  `;
  
  // Append to shadow root
  shadowRoot.appendChild(script);
};

/**
 * Gets the selected text from the current selection
 * @returns The selected text or empty string if no selection
 */
export const getSelectedText = (): string => {
  const selection = window.getSelection();
  if (selection && !selection.isCollapsed) {
    return selection.toString().trim();
  }
  return '';
};

/**
 * Creates a highlighted version of the text by wrapping it in a mark element
 * @param text The text to highlight
 * @param highlightClass Optional CSS class to apply to the highlight
 * @returns HTML string with the highlighted text
 */
export const createHighlightedText = (text: string, highlightClass: string = 'readlite-highlight'): string => {
  return `<mark class="${highlightClass}">${text}</mark>`;
};

/**
 * Replace the current selection with new HTML content
 * @param html The HTML content to insert
 */
export const replaceSelectionWithHtml = (html: string): void => {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return;
  
  const range = selection.getRangeAt(0);
  range.deleteContents();
  
  const fragment = document.createRange().createContextualFragment(html);
  range.insertNode(fragment);
  selection.removeAllRanges();
}; 