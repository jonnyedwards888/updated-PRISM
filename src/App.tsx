import React, { useState, useRef, useEffect, useMemo, memo, useCallback } from 'react';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import Editor from '@monaco-editor/react';
import SplitPane from 'react-split-pane';
import './App.css';
import './CodeViewer.css';
import { IconLibrary } from './components/IconLibrary';
import { enhancePromptWithPremiumDesignV3 } from './lib/premiumDesignSystemV3';

// Declare Lucide for TypeScript
declare global {
  interface Window {
    lucide?: {
      createIcons: () => void;
    };
    Prism?: {
      highlightAll: () => void;
      highlightElement: (element: Element) => void;
    };
  }
}

interface GeneratedResult {
  code: string;
  prompt: string;
  timestamp: number;
  id: string;
}

interface StyleEdit {
  selector: string;
  property: string;
  value: string;
  timestamp: number;
}

interface SavedDesign {
  id: string;
  prompt: string;
  code: string;
  timestamp: number;
  thumbnail?: string;
  edits?: StyleEdit[]; // Track all style edits made by user
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: number;
  designId?: string;
}

// New interfaces for live editing functionality
// Simple interfaces for the new edit mode
interface SelectedElement {
  element: HTMLElement;
  selector: string;
}

interface EditableProperties {
  [key: string]: string;
}

interface EditorWorkspaceProps {
  generatedResult: any;
  editedCode: string;
  onCodeChange: (code: string) => void;
  onSave: () => void;
  editMode: boolean;
  onToggleEditMode: () => void;
  onElementSelect: (element: SelectedElement | null) => void;
}

interface ProjectViewProps {
  generatedResult: any;
  editedCode: string;
  onCodeChange: (code: string) => void;
  onSave: () => void;
  editMode: boolean;
  onToggleEditMode: () => void;
  onElementSelect: (element: SelectedElement | null) => void;
}

const getElementSelector = (element: HTMLElement): string => {
  if (element.id) return `#${element.id}`;
  if (element.className && typeof element.className === 'string') {
    return `.${element.className.split(' ')[0]}`;
  }
  return element.tagName.toLowerCase();
};

interface InlineEditState {
  element: HTMLElement;
  originalText: string;
  isEditing: boolean;
}

const LivePreview = memo(({ generatedResult, editMode, onElementSelect, className, viewport, refreshKey, currentProject, appliedProjectId }: {
  generatedResult: GeneratedResult | null;
  editMode: boolean;
  onElementSelect: (element: SelectedElement | null) => void;
  className: string;
  viewport?: 'desktop' | 'tablet' | 'mobile';
  refreshKey?: number;
  currentProject?: SavedDesign | null;
  appliedProjectId?: React.MutableRefObject<string | null>;
}) => {
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [inlineEdit, setInlineEdit] = useState<InlineEditState | null>(null);

  // The viewport styling is now handled at the editor-container level

  // Check if an element is editable text
  const isTextElement = (element: HTMLElement): boolean => {
    const tagName = element.tagName.toLowerCase();
    const textTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'div', 'a', 'button', 'label'];
    return textTags.includes(tagName) && 
           element.children.length === 0 && 
           Boolean(element.textContent) && 
           (element.textContent?.trim().length || 0) > 0;
  };

  // Start inline editing
  const startInlineEdit = useCallback((element: HTMLElement) => {
    const originalText = element.textContent || '';
    console.log(`[Inline Edit] Starting edit for: "${originalText}"`);
    
    setInlineEdit({
      element,
      originalText,
      isEditing: true
    });

    // Create inline editor
    const editor = document.createElement('div');
    editor.contentEditable = 'true';
    editor.className = 'prism-inline-editor';
    editor.textContent = originalText;
    
    // Copy styles from original element
    const computedStyle = window.getComputedStyle(element);
    editor.style.fontSize = computedStyle.fontSize;
    editor.style.fontWeight = computedStyle.fontWeight;
    editor.style.fontFamily = computedStyle.fontFamily;
    editor.style.color = computedStyle.color;
    editor.style.lineHeight = computedStyle.lineHeight;
    editor.style.textAlign = computedStyle.textAlign;
    editor.style.padding = computedStyle.padding;
    editor.style.margin = computedStyle.margin;
    editor.style.width = '100%';
    editor.style.minHeight = computedStyle.height;
    editor.style.border = '2px solid #3B82F6';
    editor.style.borderRadius = '4px';
    editor.style.outline = 'none';
    editor.style.background = 'rgba(59, 130, 246, 0.05)';
    
    // Handle editing completion
    const finishEdit = (save: boolean) => {
      if (save && editor.textContent !== originalText) {
        element.textContent = editor.textContent || '';
        console.log(`[Inline Edit] Saved new text: "${element.textContent}"`);
      } else {
        console.log(`[Inline Edit] Edit cancelled or no changes`);
      }
      
      // Replace editor with original element
      if (editor.parentNode) {
        editor.parentNode.replaceChild(element, editor);
      }
      
      setInlineEdit(null);
    };

    // Event listeners for editing
    editor.addEventListener('blur', () => finishEdit(true));
    editor.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        finishEdit(true);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        finishEdit(false);
      }
    });

    // Replace element with editor
    element.parentNode?.replaceChild(editor, element);
    
    // Focus and select all text
    editor.focus();
    const range = document.createRange();
    range.selectNodeContents(editor);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    
  }, []);

  const loadPreviewContent = useCallback(() => {
    if (!previewContainerRef.current || !generatedResult || !editMode) {
      return;
    }
    
    // Don't reload content if there's already content and we have a selection
    // This prevents clearing the selection during editing
    const hasContent = previewContainerRef.current.querySelector('[data-step1-content]');
    const hasSelection = previewContainerRef.current.querySelector('.step1-selected');
    if (hasContent && hasSelection) {
      console.log('🎯 Skipping content reload - preserving selection during editing');
      return;
    }
    
    const fullHtml = generatedResult.code;
    console.log('🔍 [DEBUG] Original HTML content:', fullHtml.substring(0, 200) + '...');
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(fullHtml, 'text/html');
    console.log('🔍 [DEBUG] Parsed document body:', doc.body?.innerHTML?.substring(0, 200) + '...');
    
    // Clean up any malformed HTML fragments that might appear
    const bodyContent = doc.body ? doc.body.innerHTML : '';
    
    // Debug HTML parsing
    console.log('🔍 [Prism] Parsing HTML content...');
    if (!doc.body) {
      console.warn('⚠️ [Prism] No body element found in generated HTML');
    }
    
    // Remove any stray text nodes or fragments that might leak
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = bodyContent;
    
    // Remove any text nodes that are just whitespace or fragments
    const walker = document.createTreeWalker(
      tempDiv,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }
    
    textNodes.forEach(textNode => {
      const text = textNode.textContent?.trim() || '';
      // Remove standalone HTML fragments, tags, or unwanted text snippets
      // BUT preserve emojis and icons
      const isEmoji = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(text);
      
      if (!isEmoji && text.length < 50 && (
        text.includes('<') || 
        text.includes('html') || 
        text.includes('<!') ||
        text.includes('/>') ||
        text.includes('&lt;') ||
        text.includes('&gt;') ||
        text === '' ||
        text === 'html' ||
        text === 'HTML' ||
        text.toLowerCase() === 'html' ||
        text.includes('...html') || // Catch ellipsis + html patterns
        text.includes('html...') || // Catch html + ellipsis patterns
        text.startsWith('...') && text.includes('html') || // Any ellipsis starting with html
        text.endsWith('...') && text.includes('html') || // Any ellipsis ending with html
        /^[<>\/\s]*$/.test(text) ||
        /^html$/i.test(text) ||
        /^\.{3}html$/i.test(text) || // Exactly "...html"
        /^html\.{3}$/i.test(text) || // Exactly "html..."
        text.match(/^[\s\n\r\t]*$/) || // Remove whitespace-only nodes
        text.match(/^[^a-zA-Z0-9\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]*$/u) // Remove nodes with only special characters but preserve emojis
      )) {
        console.log(`🧹 [Prism] Removing unwanted text node: "${text}"`);
        textNode.remove();
      }
    });
    
    const cleanBodyContent = tempDiv.innerHTML;
    console.log('🔍 [DEBUG] Clean body content after filtering:', cleanBodyContent.substring(0, 200) + '...');
    
    const styleElements = doc.querySelectorAll('style');
    let extractedCss = '';
    console.log('🎨 [DEBUG] Found', styleElements.length, 'style elements');
    styleElements.forEach((style, index) => {
      console.log(`🎨 [DEBUG] Style ${index + 1}:`, style.innerHTML.substring(0, 200) + '...');
      extractedCss += style.innerHTML + '\n';
    });
    console.log('🎨 [DEBUG] Total extracted CSS length:', extractedCss.length);
    
    previewContainerRef.current.innerHTML = '';
    
    const scopedCss = extractedCss.replace(/body/g, '[data-prism-preview-container]');
    console.log('🎨 [DEBUG] Scoped CSS (first 300 chars):', scopedCss.substring(0, 300) + '...');
    console.log('🔍 [DEBUG] Final HTML being inserted:', cleanBodyContent.substring(0, 300) + '...');

    // Add essential resets for edge-to-edge content
    const resetCss = `
      [data-prism-preview-container] {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        height: 100% !important;
        overflow-x: hidden !important;
        box-sizing: border-box !important;
      }
      [data-prism-preview-container] * {
        box-sizing: border-box;
      }
    `;

    if (scopedCss.trim() || resetCss) {
      const styleElement = document.createElement('style');
      if (styleElement) {
        const finalCss = scopedCss + resetCss;
        styleElement.innerHTML = finalCss;
        styleElement.setAttribute('data-step1-styles', 'true');
        previewContainerRef.current.appendChild(styleElement);
        console.log('🎨 [DEBUG] Applied final CSS to style element, length:', finalCss.length);
        console.log('🎨 [DEBUG] Style element added to container');
      }
    }
    
    const contentWrapper = document.createElement('div');
    contentWrapper.innerHTML = cleanBodyContent;
    contentWrapper.setAttribute('data-step1-content', 'true');
    contentWrapper.setAttribute('data-generated-content', 'true');
    contentWrapper.setAttribute('data-prism-preview-container', 'true');
    previewContainerRef.current.appendChild(contentWrapper);
    
    console.log('🎨 [DEBUG] Container background after setup:', window.getComputedStyle(previewContainerRef.current).background);
    console.log('🎨 [DEBUG] ContentWrapper background:', window.getComputedStyle(contentWrapper).background);
    
    // Initialize Lucide icons and debug images
    setTimeout(() => {
      // Initialize Lucide icons
      if ((window as any).lucide) {
        console.log('🎨 [Prism] Initializing Lucide icons...');
        (window as any).lucide.createIcons();
      } else {
        console.log('⚠️ [Prism] Lucide not loaded, loading CDN...');
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/lucide@latest/dist/umd/lucide.js';
        script.onload = () => {
          console.log('✅ [Prism] Lucide loaded, initializing icons...');
          if ((window as any).lucide) {
            (window as any).lucide.createIcons();
          }
        };
        document.head.appendChild(script);
      }

      // Debug and fix image loading issues
      const images = contentWrapper.querySelectorAll('img');
      console.log(`🖼️ [Prism] Found ${images.length} images in generated content`);
      
      images.forEach((img, index) => {
        const originalSrc = img.getAttribute('src') || '';
        console.log(`🖼️ [Prism] Image ${index + 1}: ${originalSrc}`);
        
        // Check for common placeholder services and replace them
        if (originalSrc.includes('placeholder.com') || 
            originalSrc.includes('via.placeholder.com') ||
            originalSrc.includes('placehold.it') ||
            originalSrc.includes('dummyimage.com')) {
          
          console.log(`⚠️ [Prism] Replacing placeholder image: ${originalSrc}`);
          
          // Extract dimensions if possible
          const width = img.getAttribute('width') || img.style.width || '400';
          const height = img.getAttribute('height') || img.style.height || '300';
          const cleanWidth = width.toString().replace('px', '');
          const cleanHeight = height.toString().replace('px', '');
          
          // Replace with Picsum
          const newSrc = `https://picsum.photos/${cleanWidth}/${cleanHeight}?random=${index + Date.now()}`;
          img.setAttribute('src', newSrc);
          console.log(`✅ [Prism] Replaced with: ${newSrc}`);
        }
        
        // Add error handling for all images
        img.addEventListener('error', () => {
          console.error(`❌ [Prism] Image failed to load: ${img.src}`);
          // Fallback to a simple colored div
          const fallback = document.createElement('div');
          fallback.style.width = img.style.width || '400px';
          fallback.style.height = img.style.height || '300px';
          fallback.style.backgroundColor = '#f3f4f6';
          fallback.style.display = 'flex';
          fallback.style.alignItems = 'center';
          fallback.style.justifyContent = 'center';
          fallback.style.color = '#6b7280';
          fallback.style.fontSize = '14px';
          fallback.textContent = 'Image unavailable';
          fallback.className = img.className;
          img.parentNode?.replaceChild(fallback, img);
        });
        
        img.addEventListener('load', () => {
          console.log(`✅ [Prism] Image loaded successfully: ${img.src}`);
        });
      });
    }, 100);
    
    // Only select elements within the actual generated content, not workspace UI
    const contentElements = contentWrapper.querySelectorAll('*:not(script):not(style)');
    
    contentElements.forEach(element => {
      const htmlElement = element as HTMLElement;
      
      // Skip elements that should not be selectable
      if (htmlElement.hasAttribute('data-step1-styles') || 
          htmlElement.hasAttribute('data-step1-content') ||
          htmlElement.closest('.workspace-header') ||
          htmlElement.closest('.workspace-sidebar') ||
          htmlElement.closest('.properties-panel')) {
        return;
      }
      
      // Ensure element starts with clean styling
      htmlElement.style.outline = '';
      htmlElement.style.outlineOffset = '';
      htmlElement.classList.remove('step1-selected');
      htmlElement.classList.remove('step1-selected-gradient-text');
      // Clean up stored CSS variables
      htmlElement.style.removeProperty('--original-background');
      htmlElement.style.removeProperty('--original-background-clip');
      htmlElement.style.removeProperty('--original-text-fill-color');
      
      // Set initial cursor state for all elements
      if (isTextElement(htmlElement)) {
        htmlElement.style.cursor = 'text';
        htmlElement.title = 'Double-click to edit text';
      } else {
        htmlElement.style.cursor = 'pointer';
      }
      
      // Single click for selection
      htmlElement.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        
        // Don't trigger selection if we're in inline edit mode
        if (inlineEdit?.isEditing) {
          return;
        }
        
        // Additional check: don't trigger selection if properties panel is open
        const propertiesPanel = document.querySelector('.properties-panel');
        if (propertiesPanel) {
          console.log('🎯 Properties panel is open, skipping element selection');
          return;
        }
        
        // Additional check: don't trigger selection if we're in the editor container
        const editorContainer = document.querySelector('.editor-container');
        if (editorContainer && editorContainer.contains(event.target as Node)) {
          console.log('🎯 Click inside editor container, checking if it\'s the panel');
          
          // Check if the click target is inside the properties panel
          let currentTarget: Node | null = event.target as Node;
          while (currentTarget && currentTarget !== editorContainer) {
            if (currentTarget instanceof Element && currentTarget.classList.contains('properties-panel')) {
              console.log('🎯 Click is inside properties panel, skipping element selection');
              return;
            }
            currentTarget = currentTarget.parentNode;
          }
        }
        
        // Clear previous selections
        previewContainerRef.current?.querySelectorAll('.step1-selected').forEach(el => {
          el.classList.remove('step1-selected');
          el.classList.remove('step1-selected-gradient-text');
          // Clean up stored CSS variables
          (el as HTMLElement).style.removeProperty('--original-background');
          (el as HTMLElement).style.removeProperty('--original-background-clip');
          (el as HTMLElement).style.removeProperty('--original-text-fill-color');
        });
        
        // Check if this element uses gradient text
        const computedStyle = window.getComputedStyle(htmlElement);
        const backgroundClip = computedStyle.backgroundClip || computedStyle.webkitBackgroundClip;
        const textFillColor = computedStyle.webkitTextFillColor;
        const background = computedStyle.background;
        const color = computedStyle.color;
        
        const hasGradientText = (
          backgroundClip === 'text' || 
          textFillColor === 'transparent' ||
          (color === 'transparent' && background.includes('gradient')) ||
          background.includes('linear-gradient') && (color === 'transparent' || textFillColor === 'transparent')
        );
        
        console.log(`[Gradient Detection] Element:`, htmlElement);
        console.log(`[Gradient Detection] backgroundClip: '${backgroundClip}'`);
        console.log(`[Gradient Detection] textFillColor: '${textFillColor}'`);
        console.log(`[Gradient Detection] color: '${color}'`);
        console.log(`[Gradient Detection] background: '${background}'`);
        console.log(`[Gradient Detection] hasGradientText: ${hasGradientText}`);
        
        htmlElement.classList.add('step1-selected');
        
        // Add special class for gradient text elements to preserve their background
        if (hasGradientText) {
          htmlElement.classList.add('step1-selected-gradient-text');
          // Store the original gradient background to preserve it
          htmlElement.style.setProperty('--original-background', background);
          htmlElement.style.setProperty('--original-background-clip', backgroundClip);
          htmlElement.style.setProperty('--original-text-fill-color', textFillColor);
          console.log(`[Gradient Detection] Added gradient text class and stored original styles`);
        }
        
        const selector = getElementSelector(htmlElement);
        onElementSelect({
          element: htmlElement,
          selector
        });
      });

      // Double click for inline text editing
      if (isTextElement(htmlElement)) {
        htmlElement.addEventListener('dblclick', (event) => {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation(); // Stop any other event handlers
          
          // Prevent any animations or transitions temporarily
          const originalTransition = htmlElement.style.transition;
          const originalAnimation = htmlElement.style.animation;
          htmlElement.style.transition = 'none';
          htmlElement.style.animation = 'none';
          
          console.log(`[Inline Edit] Double-clicked text element: "${htmlElement.textContent}"`);
          startInlineEdit(htmlElement);
          
          // Restore transitions after a delay
          setTimeout(() => {
            htmlElement.style.transition = originalTransition;
            htmlElement.style.animation = originalAnimation;
          }, 100);
        });
      }
      
      htmlElement.addEventListener('mouseenter', () => {
        if (!htmlElement.classList.contains('step1-selected')) {
          // Only show subtle hover effect on actual hover, not persistent
          htmlElement.style.outline = '1px solid rgba(59, 130, 246, 0.3)';
          htmlElement.style.outlineOffset = '1px';
          // Ensure pointer cursor is shown consistently
          if (!isTextElement(htmlElement)) {
            htmlElement.style.cursor = 'pointer';
          }
        }
      });
      
      htmlElement.addEventListener('mouseleave', () => {
        if (!htmlElement.classList.contains('step1-selected')) {
          htmlElement.style.outline = '';
          htmlElement.style.outlineOffset = '';
          // Maintain appropriate cursor based on element type
          if (isTextElement(htmlElement)) {
            htmlElement.style.cursor = 'text';
          } else {
            htmlElement.style.cursor = 'pointer';
          }
        }
      });
    });
    
    
  }, [generatedResult, editMode, onElementSelect, inlineEdit, isTextElement, startInlineEdit]);

  // Only load content when entering edit mode for the first time
  useEffect(() => {
    if (editMode && generatedResult && previewContainerRef.current) {
      // Only load if we don't have content yet
      if (!previewContainerRef.current.querySelector('[data-step1-content]')) {
        setTimeout(() => {
          loadPreviewContent();
        }, 100);
      }
    }
  }, [editMode, generatedResult, loadPreviewContent]);

  // Simple edit persistence - save and apply immediately
  const addStyleEdit = useCallback((selector: string, property: string, value: string) => {
    if (!currentProject?.id) return;

    // Save to localStorage immediately
    const key = `edits-${currentProject.id}`;
    const existing = localStorage.getItem(key);
    let edits = existing ? JSON.parse(existing) : [];
    
    // Remove any existing edit for this selector+property
    edits = edits.filter((e: any) => !(e.selector === selector && e.property === property));
    
    // Add new edit
    edits.push({ selector, property, value, timestamp: Date.now() });
    localStorage.setItem(key, JSON.stringify(edits));

    // Apply immediately to DOM
    const contentWrapper = previewContainerRef.current?.querySelector('[data-step1-content]');
    if (contentWrapper) {
      const elements = contentWrapper.querySelectorAll(selector);
      elements.forEach(element => {
        if (element instanceof HTMLElement) {
          if (property === 'textContent') {
            element.textContent = value;
          } else {
            element.style.setProperty(property, value, 'important');
          }
        }
      });
    }
  }, [currentProject?.id]);

  // Load and apply saved edits when project loads
  useEffect(() => {
    if (!currentProject?.id) return;
    
    const key = `edits-${currentProject.id}`;
    const saved = localStorage.getItem(key);
    
    if (saved) {
      setTimeout(() => {
        const contentWrapper = previewContainerRef.current?.querySelector('[data-step1-content]');
        if (contentWrapper) {
          const edits = JSON.parse(saved);
          edits.forEach((edit: any) => {
            const elements = contentWrapper.querySelectorAll(edit.selector);
            elements.forEach(element => {
              if (element instanceof HTMLElement) {
                if (edit.property === 'textContent') {
                  element.textContent = edit.value;
                } else {
                  element.style.setProperty(edit.property, edit.value, 'important');
                }
              }
            });
          });
        }
      }, 100);
    }
  }, [currentProject?.id, refreshKey]);

  // Function to insert icon into preview
  const insertIcon = useCallback((iconName: string, iconSvg: string) => {
    const contentWrapper = previewContainerRef.current?.querySelector('[data-step1-content]');
    if (!contentWrapper) return;

    // Create icon element
    const iconElement = document.createElement('div');
    iconElement.className = 'prism-inserted-icon';
    iconElement.innerHTML = iconSvg;
    iconElement.style.cssText = `
      display: inline-block;
      width: 24px;
      height: 24px;
      color: currentColor;
      cursor: pointer;
      margin: 8px;
      transition: all 0.2s ease;
    `;
    iconElement.setAttribute('data-icon-name', iconName);
    iconElement.setAttribute('data-prism-icon', 'true');

    // Style the SVG inside
    const svg = iconElement.querySelector('svg');
    if (svg) {
      svg.style.cssText = `
        width: 100%;
        height: 100%;
        stroke: currentColor;
        fill: none;
      `;
    }

    // Find a good insertion point (try to insert at the beginning of the first container)
    const firstContainer = contentWrapper.querySelector('div, section, main, header') || contentWrapper;
    if (firstContainer.firstChild) {
      firstContainer.insertBefore(iconElement, firstContainer.firstChild);
    } else {
      firstContainer.appendChild(iconElement);
    }

    // Make the icon selectable like other elements
    iconElement.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      
      // Clear previous selections
      previewContainerRef.current?.querySelectorAll('.step1-selected').forEach(el => {
        el.classList.remove('step1-selected');
      });
      
      iconElement.classList.add('step1-selected');
      const selector = `[data-icon-name="${iconName}"]`;
      onElementSelect({
        element: iconElement,
        selector
      });
    });

    iconElement.addEventListener('mouseenter', () => {
      if (!iconElement.classList.contains('step1-selected')) {
        iconElement.style.outline = '1px solid rgba(59, 130, 246, 0.3)';
        iconElement.style.outlineOffset = '1px';
      }
    });
    
    iconElement.addEventListener('mouseleave', () => {
      if (!iconElement.classList.contains('step1-selected')) {
        iconElement.style.outline = '';
        iconElement.style.outlineOffset = '';
      }
    });

    console.log(`[Icon Insert] Added ${iconName} icon to preview`);
  }, [onElementSelect]);
  
  return (
    <div 
      ref={previewContainerRef}
      className={className}
      data-prism-preview-container
      style={{ 
        width: '100%', 
        height: '100%', 
        minHeight: '100%',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        position: 'relative',
        background: 'transparent',
      }}
    />
  );
});
LivePreview.displayName = 'LivePreview';

const rgbToHex = (colorStr: string): string => {
  console.log(`[rgbToHex] Input: '${colorStr}'`);
  
  if (!colorStr || colorStr === 'transparent' || colorStr.trim() === '') {
    console.log(`[rgbToHex] Transparent or empty, returning fallback.`);
    return '#000000';
  }
  
  if (colorStr.startsWith('#')) {
    console.log(`[rgbToHex] Is already hex, returning as is.`);
    return colorStr;
  }

  let rgb = colorStr;
  if (!rgb.startsWith('rgb')) {
    const temp = document.createElement('div');
    temp.style.color = colorStr;
    document.body.appendChild(temp);
    rgb = window.getComputedStyle(temp).color;
    document.body.removeChild(temp);
    console.log(`[rgbToHex] Converted color name '${colorStr}' to '${rgb}'`);
  }

  const result = rgb.match(/\d+/g);
  if (!result || result.length < 3) {
    console.log(`[rgbToHex] Could not parse RGB values from '${rgb}', returning fallback.`);
    return '#000000';
  }

  const hex = "#" + result.slice(0, 3).map(x => {
    const hexPart = parseInt(x, 10).toString(16);
    return hexPart.length === 1 ? "0" + hexPart : hexPart;
  }).join('');
  
  console.log(`[rgbToHex] Output: '${hex}'`);
  return hex;
};

const propertyOptions: { [key: string]: string[] } = {
  fontWeight: ['100', '200', '300', '400', '500', '600', '700', '800', '900', 'normal', 'bold'],
  fontFamily: ['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui'],
  fontSize: ['12px', '14px', '16px', '18px', '20px', '24px', '30px', '36px', '48px', '60px', '72px'],
};

const generateThumbnail = (htmlContent: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.width = '1200px';
    iframe.style.height = '750px';
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    document.body.appendChild(iframe);

    iframe.srcdoc = htmlContent;

    iframe.onload = () => {
      if (iframe.contentWindow) {
        html2canvas(iframe.contentWindow.document.body, {
          useCORS: true,
        }).then(canvas => {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8); // Use jpeg for smaller file size
          document.body.removeChild(iframe);
          resolve(dataUrl);
        }).catch(err => {
          document.body.removeChild(iframe);
          reject(err);
        });
      } else {
        document.body.removeChild(iframe);
        reject('Iframe content window not available');
      }
    };
  });
};

const PropertiesPanel = ({ selectedElement, onClose, addStyleEdit, generateSelectorForElement, panelInteractionRef }: { 
  selectedElement: SelectedElement | null; 
  onClose: () => void;
  addStyleEdit?: (selector: string, property: string, value: string) => void;
  generateSelectorForElement?: (element: HTMLElement) => string;
  panelInteractionRef?: React.MutableRefObject<boolean>;
}) => {
  const [properties, setProperties] = useState<EditableProperties>({});

  // 🎯 PANEL FIX: Prevent clicks inside panel from bubbling up and closing the panel
  const handlePanelClick = useCallback((event: React.MouseEvent) => {
    // Stop event from bubbling up to parent elements that might close the panel
    event.stopPropagation();
    console.log('🎯 Panel click captured and stopped from bubbling');
  }, []);

  // 🎯 PANEL FIX: Additional event blocking for all panel interactions
  const handlePanelEvent = useCallback((event: React.SyntheticEvent) => {
    event.stopPropagation();
    // Flag this as a panel interaction to prevent outside click handler from closing
    if (panelInteractionRef) {
      panelInteractionRef.current = true;
    }
    console.log('🎯 Panel event blocked:', event.type);
  }, [panelInteractionRef]);

  // 🎯 PANEL FIX: Comprehensive event blocking for mousedown events specifically
  const handlePanelMouseDown = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    // Flag this as a panel interaction to prevent outside click handler from closing
    if (panelInteractionRef) {
      panelInteractionRef.current = true;
    }
    console.log('🎯 Panel mousedown blocked and flagged as interaction');
  }, [panelInteractionRef]);

  const editablePropsList = useMemo(() => [
    'color', 'backgroundColor', 'fontSize', 'fontWeight', 'fontFamily', 
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    'borderRadius', 'border', 'width', 'height'
  ], []);

  // Check if this is a page-level element that should have page background editing
  const isPageLevelElement = (element: HTMLElement): boolean => {
    const tagName = element.tagName.toLowerCase();
    const hasPageLevelClass = element.classList.contains('hero') || 
                              element.classList.contains('main') || 
                              element.classList.contains('container') ||
                              element.classList.contains('page') ||
                              element.classList.contains('content');
    
    return tagName === 'body' || 
           tagName === 'main' || 
           hasPageLevelClass ||
           (tagName === 'section' && element.parentElement?.tagName.toLowerCase() === 'body') ||
           (tagName === 'div' && element.parentElement?.tagName.toLowerCase() === 'body');
  };

  useEffect(() => {
    if (selectedElement) {
      console.log('--- New Element Selected ---', selectedElement.element);
      const computedStyle = window.getComputedStyle(selectedElement.element);
      
      console.log('--- Key Computed Styles for Gradient Detection ---');
      const keyProps = ['color', 'background', 'background-image', 'background-clip', '-webkit-background-clip', '-webkit-text-fill-color'];
      keyProps.forEach(prop => {
        const value = computedStyle.getPropertyValue(prop);
        console.log(`[Key Style] ${prop}: '${value}'`);
      });
      console.log('--- End of Key Computed Styles ---');

      const initialProperties: EditableProperties = {};
      
      // Special handling for page-level elements
      const isPageLevel = isPageLevelElement(selectedElement.element);
      if (isPageLevel) {
        console.log(`[Page Background] Detected page-level element: ${selectedElement.element.tagName}`);
        
        // Try to get the actual page background from various sources
        const containerElement = selectedElement.element.closest('[data-prism-preview-container]') as HTMLElement;
        let pageBackgroundColor = '';
        
        if (containerElement) {
          // Check container background
          const containerStyle = window.getComputedStyle(containerElement);
          pageBackgroundColor = containerStyle.backgroundColor;
          console.log(`[Page Background] Container background: '${pageBackgroundColor}'`);
          
          // If transparent, check for background styles in document
          if (pageBackgroundColor === 'rgba(0, 0, 0, 0)' || pageBackgroundColor === 'transparent') {
            // Look for body styles in the document
            const bodyElements = containerElement.querySelectorAll('body, [style*="background"]');
            bodyElements.forEach(el => {
              const style = window.getComputedStyle(el as HTMLElement);
              if (style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent') {
                pageBackgroundColor = style.backgroundColor;
                console.log(`[Page Background] Found body background: '${pageBackgroundColor}'`);
              }
            });
          }
        }
        
        // Add page background as a special property
        if (pageBackgroundColor && pageBackgroundColor !== 'rgba(0, 0, 0, 0)' && pageBackgroundColor !== 'transparent') {
          initialProperties.pageBackground = pageBackgroundColor;
        } else {
          initialProperties.pageBackground = '#1a1a2e'; // Default dark background
        }
        
        console.log(`[Page Background] Final page background: '${initialProperties.pageBackground}'`);
      }
      
      editablePropsList.forEach(prop => {
        const cssProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
        let value = computedStyle.getPropertyValue(cssProp).trim();
        
        // Special handling for gradient text elements
        if (prop === 'color') {
          const backgroundClip = computedStyle.backgroundClip || computedStyle.webkitBackgroundClip;
          const textFillColor = computedStyle.webkitTextFillColor;
          
          console.log(`[Style Fetch] Checking color property:`);
          console.log(`[Style Fetch] - color: '${value}'`);
          console.log(`[Style Fetch] - backgroundClip: '${backgroundClip}'`);
          console.log(`[Style Fetch] - textFillColor: '${textFillColor}'`);
          
          // Check if this is gradient text based on multiple conditions
          const isTransparentText = value === 'transparent' || value === 'rgba(0, 0, 0, 0)' || textFillColor === 'transparent' || textFillColor === 'rgba(0, 0, 0, 0)';
          const hasTextClip = backgroundClip === 'text';
          
          console.log(`[Style Fetch] - isTransparentText: ${isTransparentText}`);
          console.log(`[Style Fetch] - hasTextClip: ${hasTextClip}`);
          
          if (isTransparentText || hasTextClip) {
            // This might be gradient text, try to get the original gradient
            // Check if we stored the original background during selection
            const originalBackground = selectedElement.element.style.getPropertyValue('--original-background');
            const background = originalBackground || computedStyle.background;
            const backgroundImage = computedStyle.backgroundImage;
            
            console.log(`[Style Fetch] Detected potential gradient text`);
            console.log(`[Style Fetch] - originalBackground: '${originalBackground}'`);
            console.log(`[Style Fetch] - background: '${background}'`);
            console.log(`[Style Fetch] - backgroundImage: '${backgroundImage}'`);
            
            // Check both background and backgroundImage properties
            const gradientSource = backgroundImage.includes('gradient') ? backgroundImage : background;
            
            if (gradientSource && gradientSource.includes('gradient')) {
              console.log(`[Style Fetch] Found gradient source: '${gradientSource}'`);
              
              // Extract ALL colors from the gradient, not just the first one
              const patterns = [
                // RGB/RGBA colors
                /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/g,
                // Hex colors (6 and 3 digit)  
                /#([0-9a-fA-F]{6})/g,
                /#([0-9a-fA-F]{3})/g,
                // HSL colors
                /hsla?\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*(?:,\s*([\d.]+))?\s*\)/g
              ];
              
              let allColors: string[] = [];
              
              for (const pattern of patterns) {
                const matches = Array.from(gradientSource.matchAll(pattern));
                if (matches.length > 0) {
                  allColors = matches.map(match => match[0]);
                  console.log(`[Style Fetch] Found ${allColors.length} colors:`, allColors);
                  break;
                }
              }
              
              if (allColors.length > 0) {
                // Store all colors for gradient editing - use a special format
                value = JSON.stringify({ type: 'gradient', colors: allColors, original: gradientSource });
                console.log(`[Style Fetch] Successfully extracted gradient colors: ${allColors.join(', ')}`);
              } else {
                // Use a representative gradient color
                value = '#A855F7'; // Purple for gradients
                console.log(`[Style Fetch] Using fallback gradient color: '${value}'`);
              }
            } else {
              console.log(`[Style Fetch] No gradient found in background properties`);
              // Keep the original color value if no gradient detected
            }
          }
        }
        
        initialProperties[prop] = value;
        console.log(`[Style Fetch] ${cssProp}: '${value}'`);
      });

      if (selectedElement.element.children.length === 0 && selectedElement.element.textContent) {
        initialProperties.textContent = selectedElement.element.textContent;
        console.log(`[Style Fetch] textContent: '${initialProperties.textContent}'`);
      }
      
      console.log('[Style Fetch] All initial properties:', initialProperties);
      setProperties(initialProperties);
    }
  }, [selectedElement, editablePropsList]);

  const handlePropertyChange = (property: string, value: string) => {
    if (!selectedElement) return;
    
    console.log(`[Style Set] Property: '${property}', Value: '${value}'`);
    setProperties(prev => ({ ...prev, [property]: value }));

    // 🎯 EDIT PERSISTENCE: Generate selector and track the edit
    let selector = '';
    if (generateSelectorForElement) {
      selector = generateSelectorForElement(selectedElement.element);
      console.log(`🎯 Generated selector for edit tracking: ${selector}`);
    }

    if (property === 'textContent') {
      selectedElement.element.textContent = value;
      if (addStyleEdit && selector) {
        addStyleEdit(selector, property, value);
      }
    } else if (property === 'pageBackground') {
      // Handle page background changes
      console.log(`[Page Background] Setting page background to: '${value}'`);
      
      // Find the preview container and apply background
      const containerElement = selectedElement.element.closest('[data-prism-preview-container]') as HTMLElement;
      if (containerElement) {
        containerElement.style.setProperty('background-color', value, 'important');
        containerElement.style.setProperty('background', value, 'important');
        console.log(`[Page Background] Applied to container: '${value}'`);
      }
      
      // Also try to apply to the selected element if it's a main container
      const tagName = selectedElement.element.tagName.toLowerCase();
      const hasPageLevelClass = selectedElement.element.classList.contains('hero') || 
                                selectedElement.element.classList.contains('main') || 
                                selectedElement.element.classList.contains('container');
      const isPageLevel = tagName === 'body' || tagName === 'main' || hasPageLevelClass ||
                         (tagName === 'section' && selectedElement.element.parentElement?.tagName.toLowerCase() === 'body');
      
      if (isPageLevel) {
        selectedElement.element.style.setProperty('background-color', value, 'important');
        selectedElement.element.style.setProperty('background', value, 'important');
        console.log(`[Page Background] Applied to selected element: '${value}'`);
      }
      
      if (addStyleEdit && selector) {
        addStyleEdit(selector, property, value);
      }
      
    } else if (property === 'color') {
      // Check if this is a gradient color update
      try {
        const gradientData = JSON.parse(value);
        if (gradientData.type === 'gradient' && gradientData.colors) {
          console.log(`[Style Set] Updating gradient with colors:`, gradientData.colors);
          
          // Reconstruct the CSS gradient from the colors
          const colorStops = gradientData.colors.map((color: string, index: number) => {
            const percentage = gradientData.colors.length > 1 ? (index / (gradientData.colors.length - 1)) * 100 : 0;
            return `${color} ${percentage}%`;
          }).join(', ');
          
          const newGradient = `linear-gradient(135deg, ${colorStops})`;
          console.log(`[Style Set] Applying new gradient: ${newGradient}`);
          
          // Apply the gradient to the element
          selectedElement.element.style.setProperty('background', newGradient, 'important');
          selectedElement.element.style.setProperty('background-clip', 'text', 'important');
          selectedElement.element.style.setProperty('-webkit-background-clip', 'text', 'important');
          selectedElement.element.style.setProperty('-webkit-text-fill-color', 'transparent', 'important');
          selectedElement.element.style.setProperty('color', 'transparent', 'important');
          
          // Update the stored original background
          selectedElement.element.style.setProperty('--original-background', newGradient);
          
          // Track the gradient edit with the full gradient value
          if (addStyleEdit && selector) {
            addStyleEdit(selector, 'background', newGradient);
          }
          
          console.log(`[Style Set] Applied gradient background to element`);
          return;
        }
      } catch (e) {
        // Not JSON, handle as regular color
      }
      
      // Regular color handling
      const cssProp = property.replace(/([A-Z])/g, '-$1').toLowerCase();
      selectedElement.element.style.setProperty(cssProp, value, 'important');
      if (addStyleEdit && selector) {
        addStyleEdit(selector, cssProp, value);
      }
      console.log(`[Style Set] Applied '${cssProp}: ${value} !important' to element.`);
    } else {
      const cssProp = property.replace(/([A-Z])/g, '-$1').toLowerCase();
      selectedElement.element.style.setProperty(cssProp, value, 'important');
      if (addStyleEdit && selector) {
        addStyleEdit(selector, cssProp, value);
      }
      console.log(`[Style Set] Applied '${cssProp}: ${value} !important' to element.`);
    }
  };
  
  if (!selectedElement) {
    return null;
  }
  
  const { element } = selectedElement;

  return (
    <div 
      className="properties-panel" 
      onClick={handlePanelClick}
      onMouseDown={handlePanelMouseDown}
      onMouseUp={handlePanelEvent}
      onPointerDown={handlePanelEvent}
      onPointerUp={handlePanelEvent}
      onTouchStart={handlePanelEvent}
      onTouchEnd={handlePanelEvent}
      onKeyDown={handlePanelEvent}
      onKeyUp={handlePanelEvent}
      onFocus={handlePanelEvent}
      style={{ 
        pointerEvents: 'auto',
        position: 'absolute',
        top: '80px',
        right: '20px',
        zIndex: 10000
      }}
    >
      <div className="properties-header">
        <h3>Edit Element</h3>
        <button onClick={onClose} className="close-button">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6"x2="18" y2="18"></line></svg>
        </button>
      </div>
      <div className="element-info">
        <span className="element-tag">{element.tagName.toLowerCase()}</span>
        {element.className && typeof element.className === 'string' && element.className.split(' ').map(c => c && <span key={c} className="element-class">.{c}</span>)}
        {element.id && <span className="element-id">#{element.id}</span>}
      </div>
      
      {/* Page Settings Section - Always Visible */}
      <div className="properties-list" style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.08)', paddingBottom: '16px', marginBottom: '0' }}>
        <div className="background-effects-section">
          <label className="property-label">🎨 Page Settings</label>
          
          {/* Page Background Color */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', color: '#6b7280', display: 'block', marginBottom: '8px' }}>
              Background Color
            </label>
            <div className="property-input-group">
              <input
                type="color"
                className="color-input"
                defaultValue="#1a1a2e"
                onChange={(e) => {
                  const container = document.querySelector('[data-prism-preview-container]');
                  if (container) {
                    (container as HTMLElement).style.background = e.target.value;
                  }
                }}
              />
              <input
                type="text"
                className="text-input"
                defaultValue="#1a1a2e"
                placeholder="#1a1a2e"
                onChange={(e) => {
                  const container = document.querySelector('[data-prism-preview-container]');
                  if (container) {
                    (container as HTMLElement).style.background = e.target.value;
                  }
                }}
              />
            </div>
          </div>
          
          {/* Grain Effect Toggle */}
          <div className="grain-control">
            <div 
              className={`grain-toggle ${document.querySelector('[data-prism-grain-effect="true"]') ? 'active' : ''}`}
              onClick={() => {
                const container = document.querySelector('[data-prism-preview-container]');
                if (container) {
                  const currentValue = container.getAttribute('data-prism-grain-effect');
                  container.setAttribute('data-prism-grain-effect', currentValue === 'true' ? 'false' : 'true');
                  // Force re-render
                  setProperties({...properties});
                }
              }}
            >
              <div className="grain-toggle-knob"></div>
            </div>
            <span className="grain-label">Grain Texture</span>
          </div>
          
          {/* Grain Intensity Slider */}
          <div className="grain-slider-control" style={{ 
            display: document.querySelector('[data-prism-grain-effect="true"]') ? 'block' : 'none' 
          }}>
            <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
              Intensity: <span id="grain-intensity-value">3%</span>
            </label>
            <input
              type="range"
              className="grain-slider"
              min="1"
              max="10"
              defaultValue="3"
              onChange={(e) => {
                const intensity = parseInt(e.target.value) / 100;
                const style = document.createElement('style');
                style.id = 'prism-grain-intensity';
                const existingStyle = document.getElementById('prism-grain-intensity');
                if (existingStyle) existingStyle.remove();
                style.textContent = `[data-prism-grain-effect="true"]::before { opacity: ${intensity} !important; }`;
                document.head.appendChild(style);
                const display = document.getElementById('grain-intensity-value');
                if (display) display.textContent = e.target.value + '%';
              }}
            />
          </div>
        </div>
      </div>
      
      {/* Element Properties */}
      <div className="properties-list">
        
        {Object.entries(properties)
          .sort(([a], [b]) => {
            // Prioritize pageBackground at the very top
            if (a === 'pageBackground') return -1;
            if (b === 'pageBackground') return 1;
            // Then textContent
            if (a === 'textContent') return -1;
            if (b === 'textContent') return 1;
            // Then color properties
            if (a === 'color') return -1;
            if (b === 'color') return 1;
            return 0;
          })
          .map(([prop, value]) => {
          const options = propertyOptions[prop as keyof typeof propertyOptions];
          return (
            <div key={prop} className="property-item" data-property={prop}>
              <label className="property-label">
                {prop === 'textContent' ? '✏️ Text Content' : 
                 prop === 'pageBackground' ? '🎨 Page Background' : 
                 prop.replace(/([A-Z])/g, ' $1')}
              </label>
              {prop === 'pageBackground' ? (
                <div className="page-background-editor">
                  <div className="property-input-group">
                    <input
                      type="color"
                      className="color-input page-background-input"
                      value={rgbToHex(value)}
                      onChange={(e) => handlePropertyChange(prop, e.target.value)}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (panelInteractionRef) panelInteractionRef.current = true;
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        if (panelInteractionRef) panelInteractionRef.current = true;
                      }}
                      onFocus={(e) => {
                        e.stopPropagation();
                        if (panelInteractionRef) panelInteractionRef.current = true;
                      }}
                    />
                    <input
                      type="text"
                  className="text-input"
                  value={value}
                  onChange={(e) => handlePropertyChange(prop, e.target.value)}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (panelInteractionRef) panelInteractionRef.current = true;
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        if (panelInteractionRef) panelInteractionRef.current = true;
                      }}
                      onFocus={(e) => {
                        e.stopPropagation();
                        if (panelInteractionRef) panelInteractionRef.current = true;
                      }}
                      placeholder="Enter color (hex, rgb, or name)"
                    />
                  </div>
                  <div className="page-background-hint">
                    🌈 This changes the background color of the entire page
                  </div>
                </div>
              ) : prop === 'textContent' ? (
                <div className="text-content-editor">
                  <textarea
                    className="text-input text-content-input"
                    value={value}
                    onChange={(e) => handlePropertyChange(prop, e.target.value)}
                    onClick={(e) => { e.stopPropagation(); if (panelInteractionRef) panelInteractionRef.current = true; }}
                    onMouseDown={(e) => { e.stopPropagation(); if (panelInteractionRef) panelInteractionRef.current = true; }}
                    onFocus={(e) => { e.stopPropagation(); if (panelInteractionRef) panelInteractionRef.current = true; }}
                    placeholder="Enter your text here..."
                    rows={3}
                  />
                  <div className="text-content-hint">
                    💡 Tip: You can also double-click text directly on the preview to edit it inline
                  </div>
                </div>
              ) : options ? (
              <div className="property-input-group">
                <select
                  className="select-input"
                  value={value}
                  onChange={(e) => handlePropertyChange(prop, e.target.value)}
                  onClick={(e) => { e.stopPropagation(); if (panelInteractionRef) panelInteractionRef.current = true; }}
                  onMouseDown={(e) => { e.stopPropagation(); if (panelInteractionRef) panelInteractionRef.current = true; }}
                  onFocus={(e) => { e.stopPropagation(); if (panelInteractionRef) panelInteractionRef.current = true; }}
                >
                  {options.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="property-input-group">
                {prop.toLowerCase().includes('color') && (() => {
                  // Check if this is gradient color data
                  let gradientData = null;
                  try {
                    const parsed = JSON.parse(value);
                    if (parsed.type === 'gradient' && parsed.colors) {
                      gradientData = parsed;
                    }
                  } catch (e) {
                    // Not JSON, regular color
                  }
                  
                  return (
                    <div className="advanced-color-editor">
                      {/* Color Type Toggle */}
                      <div className="color-type-toggle">
                        <button 
                          className={`color-type-btn ${!gradientData ? 'active' : ''}`}
                          onClick={() => {
                            if (gradientData) {
                              // Convert to solid color
                              handlePropertyChange(prop, gradientData.colors[0] || '#000000');
                            }
                          }}
                          style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px 0 0 4px',
                            background: !gradientData ? '#3b82f6' : '#f9fafb',
                            color: !gradientData ? 'white' : '#374151',
                            cursor: 'pointer'
                          }}
                        >
                          Solid
                        </button>
                        <button 
                          className={`color-type-btn ${gradientData ? 'active' : ''}`}
                          onClick={() => {
                            if (!gradientData) {
                              // Convert to gradient
                              const currentColor = value || '#000000';
                              const newGradient = {
                                type: 'gradient',
                                direction: 'to right',
                                colors: [currentColor, '#ffffff']
                              };
                              handlePropertyChange(prop, JSON.stringify(newGradient));
                            }
                          }}
                          style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            border: '1px solid #d1d5db',
                            borderLeft: 'none',
                            borderRadius: '0 4px 4px 0',
                            background: gradientData ? '#3b82f6' : '#f9fafb',
                            color: gradientData ? 'white' : '#374151',
                            cursor: 'pointer'
                          }}
                        >
                          Gradient
                        </button>
                      </div>
                      
                      {gradientData ? (
                        // Gradient editor
                        <div className="gradient-color-editor">
                          <div className="gradient-direction-selector" style={{ marginBottom: '8px' }}>
                            <label style={{ fontSize: '12px', color: '#6b7280' }}>Direction:</label>
                            <select
                              value={gradientData.direction || 'to right'}
                              onChange={(e) => {
                                const newGradientData = { ...gradientData, direction: e.target.value };
                                handlePropertyChange(prop, JSON.stringify(newGradientData));
                              }}
                              style={{
                                marginLeft: '8px',
                                padding: '2px 6px',
                                fontSize: '12px',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px'
                              }}
                            >
                              <option value="to right">Left to Right</option>
                              <option value="to left">Right to Left</option>
                              <option value="to bottom">Top to Bottom</option>
                              <option value="to top">Bottom to Top</option>
                              <option value="45deg">Diagonal ↗</option>
                              <option value="135deg">Diagonal ↘</option>
                            </select>
                          </div>
                          <div className="gradient-colors-label" style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>Colors:</div>
                          {gradientData.colors.map((color: string, index: number) => (
                            <div key={index} className="gradient-color-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                              <span className="gradient-color-index" style={{ fontSize: '12px', color: '#6b7280', width: '12px' }}>{index + 1}</span>
                              <input
                                type="color"
                                className="color-input gradient-color-input"
                                value={rgbToHex(color)}
                                onChange={(e) => {
                                  const newColors = [...gradientData.colors];
                                  newColors[index] = e.target.value;
                                  const newGradientData = { ...gradientData, colors: newColors };
                                  handlePropertyChange(prop, JSON.stringify(newGradientData));
                                }}
                                onClick={(e) => { e.stopPropagation(); if (panelInteractionRef) panelInteractionRef.current = true; }}
                                onMouseDown={(e) => { e.stopPropagation(); if (panelInteractionRef) panelInteractionRef.current = true; }}
                                onFocus={(e) => { e.stopPropagation(); if (panelInteractionRef) panelInteractionRef.current = true; }}
                                style={{ width: '32px', height: '24px' }}
                              />
                              <span className="gradient-color-value" style={{ fontSize: '12px', color: '#374151', flex: 1 }}>{color}</span>
                              {gradientData.colors.length > 2 && (
                                <button
                                  onClick={() => {
                                    const newColors = gradientData.colors.filter((_, i) => i !== index);
                                    const newGradientData = { ...gradientData, colors: newColors };
                                    handlePropertyChange(prop, JSON.stringify(newGradientData));
                                  }}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#ef4444',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    padding: '2px'
                                  }}
                                  title="Remove color"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          ))}
                          {gradientData.colors.length < 5 && (
                            <button
                              onClick={() => {
                                const newColors = [...gradientData.colors, '#ffffff'];
                                const newGradientData = { ...gradientData, colors: newColors };
                                handlePropertyChange(prop, JSON.stringify(newGradientData));
                              }}
                              style={{
                                width: '100%',
                                padding: '6px',
                                fontSize: '12px',
                                border: '1px dashed #d1d5db',
                                borderRadius: '4px',
                                background: 'transparent',
                                color: '#6b7280',
                                cursor: 'pointer',
                                marginTop: '4px'
                              }}
                            >
                              + Add Color
                            </button>
                          )}
                        </div>
                      ) : (
                        // Regular single color picker
                        <input
                          type="color"
                          className="color-input"
                          value={rgbToHex(value)}
                          onChange={(e) => handlePropertyChange(prop, e.target.value)}
                          onClick={(e) => { e.stopPropagation(); if (panelInteractionRef) panelInteractionRef.current = true; }}
                          onMouseDown={(e) => { e.stopPropagation(); if (panelInteractionRef) panelInteractionRef.current = true; }}
                          onFocus={(e) => { e.stopPropagation(); if (panelInteractionRef) panelInteractionRef.current = true; }}
                          style={{ width: '100%', height: '32px' }}
                        />
                      )}
                    </div>
                  );
                })()}
                <input
                  type="text"
                  className="text-input"
                  value={(() => {
                    // Show user-friendly text for gradients
                    try {
                      const parsed = JSON.parse(value);
                      if (parsed.type === 'gradient' && parsed.colors) {
                        return `Gradient: ${parsed.colors.length} colors`;
                      }
                    } catch (e) {
                      // Not JSON, show regular value
                    }
                    return value;
                  })()}
                  onChange={(e) => handlePropertyChange(prop, e.target.value)}
                  onClick={(e) => { e.stopPropagation(); if (panelInteractionRef) panelInteractionRef.current = true; }}
                  onMouseDown={(e) => { e.stopPropagation(); if (panelInteractionRef) panelInteractionRef.current = true; }}
                  onFocus={(e) => { e.stopPropagation(); if (panelInteractionRef) panelInteractionRef.current = true; }}
                />
              </div>
            )}
            </div>
          )
        })}
        
        {/* Advanced Typography Controls */}
        {element.tagName.toLowerCase() === 'h1' || element.tagName.toLowerCase() === 'h2' || 
         element.tagName.toLowerCase() === 'h3' || element.tagName.toLowerCase() === 'p' || 
         element.tagName.toLowerCase() === 'span' || element.tagName.toLowerCase() === 'a' ? (
          <div className="property-section">
            <h4 className="section-title">Advanced Typography</h4>
            
            {/* Text Shadow Editor */}
            <div className="property-item">
              <label className="property-label">✨ Text Shadow</label>
              <div className="text-shadow-editor">
                <div className="text-shadow-controls">
                  <div className="shadow-control-row">
                    <label style={{ fontSize: '12px', color: '#6b7280', width: '60px' }}>X Offset:</label>
                    <input
                      type="range"
                      min="-20"
                      max="20"
                      defaultValue="2"
                      onChange={(e) => {
                        const xOffset = e.target.value;
                        const yOffset = (e.target.parentElement?.parentElement?.querySelector('input[data-shadow="y"]') as HTMLInputElement)?.value || '2';
                        const blur = (e.target.parentElement?.parentElement?.querySelector('input[data-shadow="blur"]') as HTMLInputElement)?.value || '4';
                        const color = (e.target.parentElement?.parentElement?.querySelector('input[data-shadow="color"]') as HTMLInputElement)?.value || '#000000';
                        const shadowValue = `${xOffset}px ${yOffset}px ${blur}px ${color}`;
                        addStyleEdit?.(generateSelectorForElement?.(element) || '', 'text-shadow', shadowValue);
                      }}
                      style={{ flex: 1, marginLeft: '8px' }}
                    />
                    <span style={{ fontSize: '12px', color: '#374151', width: '30px', textAlign: 'right' }}>2px</span>
                  </div>
                  
                  <div className="shadow-control-row">
                    <label style={{ fontSize: '12px', color: '#6b7280', width: '60px' }}>Y Offset:</label>
                    <input
                      type="range"
                      min="-20"
                      max="20"
                      defaultValue="2"
                      data-shadow="y"
                      onChange={(e) => {
                        const yOffset = e.target.value;
                        const xOffset = (e.target.parentElement?.parentElement?.querySelector('input:not([data-shadow])') as HTMLInputElement)?.value || '2';
                        const blur = (e.target.parentElement?.parentElement?.querySelector('input[data-shadow="blur"]') as HTMLInputElement)?.value || '4';
                        const color = (e.target.parentElement?.parentElement?.querySelector('input[data-shadow="color"]') as HTMLInputElement)?.value || '#000000';
                        const shadowValue = `${xOffset}px ${yOffset}px ${blur}px ${color}`;
                        addStyleEdit?.(generateSelectorForElement?.(element) || '', 'text-shadow', shadowValue);
                        // Update display
                        const display = e.target.parentElement?.querySelector('span');
                        if (display) display.textContent = `${yOffset}px`;
                      }}
                      style={{ flex: 1, marginLeft: '8px' }}
                    />
                    <span style={{ fontSize: '12px', color: '#374151', width: '30px', textAlign: 'right' }}>2px</span>
                  </div>
                  
                  <div className="shadow-control-row">
                    <label style={{ fontSize: '12px', color: '#6b7280', width: '60px' }}>Blur:</label>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      defaultValue="4"
                      data-shadow="blur"
                      onChange={(e) => {
                        const blur = e.target.value;
                        const xOffset = (e.target.parentElement?.parentElement?.querySelector('input:not([data-shadow])') as HTMLInputElement)?.value || '2';
                        const yOffset = (e.target.parentElement?.parentElement?.querySelector('input[data-shadow="y"]') as HTMLInputElement)?.value || '2';
                        const color = (e.target.parentElement?.parentElement?.querySelector('input[data-shadow="color"]') as HTMLInputElement)?.value || '#000000';
                        const shadowValue = `${xOffset}px ${yOffset}px ${blur}px ${color}`;
                        addStyleEdit?.(generateSelectorForElement?.(element) || '', 'text-shadow', shadowValue);
                        // Update display
                        const display = e.target.parentElement?.querySelector('span');
                        if (display) display.textContent = `${blur}px`;
                      }}
                      style={{ flex: 1, marginLeft: '8px' }}
                    />
                    <span style={{ fontSize: '12px', color: '#374151', width: '30px', textAlign: 'right' }}>4px</span>
                  </div>
                  
                  <div className="shadow-control-row">
                    <label style={{ fontSize: '12px', color: '#6b7280', width: '60px' }}>Color:</label>
                    <input
                      type="color"
                      defaultValue="#000000"
                      data-shadow="color"
                      onChange={(e) => {
                        const color = e.target.value;
                        const xOffset = (e.target.parentElement?.parentElement?.querySelector('input:not([data-shadow])') as HTMLInputElement)?.value || '2';
                        const yOffset = (e.target.parentElement?.parentElement?.querySelector('input[data-shadow="y"]') as HTMLInputElement)?.value || '2';
                        const blur = (e.target.parentElement?.parentElement?.querySelector('input[data-shadow="blur"]') as HTMLInputElement)?.value || '4';
                        const shadowValue = `${xOffset}px ${yOffset}px ${blur}px ${color}`;
                        addStyleEdit?.(generateSelectorForElement?.(element) || '', 'text-shadow', shadowValue);
                      }}
                      style={{ marginLeft: '8px', width: '40px', height: '24px' }}
                    />
                  </div>
                </div>
                
                <div style={{ marginTop: '8px' }}>
                  <button
                    onClick={() => {
                      addStyleEdit?.(generateSelectorForElement?.(element) || '', 'text-shadow', 'none');
                    }}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      background: '#f9fafb',
                      color: '#374151',
                      cursor: 'pointer'
                    }}
                  >
                    Remove Shadow
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        
        {/* Element Presets Section */}
        {(element.tagName.toLowerCase() === 'div' || element.tagName.toLowerCase() === 'button' || 
          element.tagName.toLowerCase() === 'section' || element.tagName.toLowerCase() === 'article') ? (
          <div className="property-section">
            <h4 className="section-title">Element Presets</h4>
            
            {/* Glassmorphism Preset */}
            <div className="property-item">
              <button
                onClick={() => {
                  const selector = generateSelectorForElement?.(element) || '';
                  addStyleEdit?.(selector, 'backdrop-filter', 'blur(10px)');
                  addStyleEdit?.(selector, 'background', 'rgba(255, 255, 255, 0.25)');
                  addStyleEdit?.(selector, 'border', '1px solid rgba(255, 255, 255, 0.18)');
                  addStyleEdit?.(selector, 'border-radius', '16px');
                  addStyleEdit?.(selector, 'box-shadow', '0 8px 32px 0 rgba(31, 38, 135, 0.37)');
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.2))',
                  backdropFilter: 'blur(10px)',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'transform 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                🪟 Apply Glassmorphism
              </button>
            </div>
            
            {/* Advanced Border Controls */}
            <div className="property-item">
              <label className="property-label">🔲 Advanced Border Radius</label>
              <div className="border-radius-editor">
                <div className="border-radius-grid">
                  <div className="corner-control">
                    <label style={{ fontSize: '11px', color: '#6b7280' }}>Top Left</label>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      defaultValue="0"
                      onChange={(e) => {
                        const topLeft = e.target.value;
                        const topRight = (e.target.parentElement?.parentElement?.querySelector('input[data-corner="top-right"]') as HTMLInputElement)?.value || '0';
                        const bottomRight = (e.target.parentElement?.parentElement?.querySelector('input[data-corner="bottom-right"]') as HTMLInputElement)?.value || '0';
                        const bottomLeft = (e.target.parentElement?.parentElement?.querySelector('input[data-corner="bottom-left"]') as HTMLInputElement)?.value || '0';
                        const borderRadius = `${topLeft}px ${topRight}px ${bottomRight}px ${bottomLeft}px`;
                        addStyleEdit?.(generateSelectorForElement?.(element) || '', 'border-radius', borderRadius);
                        // Update display
                        const display = e.target.nextElementSibling;
                        if (display) display.textContent = `${topLeft}px`;
                      }}
                      style={{ width: '100%', marginTop: '4px' }}
                    />
                    <span style={{ fontSize: '10px', color: '#374151' }}>0px</span>
                  </div>
                  
                  <div className="corner-control">
                    <label style={{ fontSize: '11px', color: '#6b7280' }}>Top Right</label>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      defaultValue="0"
                      data-corner="top-right"
                      onChange={(e) => {
                        const topRight = e.target.value;
                        const topLeft = (e.target.parentElement?.parentElement?.querySelector('input:not([data-corner])') as HTMLInputElement)?.value || '0';
                        const bottomRight = (e.target.parentElement?.parentElement?.querySelector('input[data-corner="bottom-right"]') as HTMLInputElement)?.value || '0';
                        const bottomLeft = (e.target.parentElement?.parentElement?.querySelector('input[data-corner="bottom-left"]') as HTMLInputElement)?.value || '0';
                        const borderRadius = `${topLeft}px ${topRight}px ${bottomRight}px ${bottomLeft}px`;
                        addStyleEdit?.(generateSelectorForElement?.(element) || '', 'border-radius', borderRadius);
                        // Update display
                        const display = e.target.nextElementSibling;
                        if (display) display.textContent = `${topRight}px`;
                      }}
                      style={{ width: '100%', marginTop: '4px' }}
                    />
                    <span style={{ fontSize: '10px', color: '#374151' }}>0px</span>
                  </div>
                  
                  <div className="corner-control">
                    <label style={{ fontSize: '11px', color: '#6b7280' }}>Bottom Right</label>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      defaultValue="0"
                      data-corner="bottom-right"
                      onChange={(e) => {
                        const bottomRight = e.target.value;
                        const topLeft = (e.target.parentElement?.parentElement?.querySelector('input:not([data-corner])') as HTMLInputElement)?.value || '0';
                        const topRight = (e.target.parentElement?.parentElement?.querySelector('input[data-corner="top-right"]') as HTMLInputElement)?.value || '0';
                        const bottomLeft = (e.target.parentElement?.parentElement?.querySelector('input[data-corner="bottom-left"]') as HTMLInputElement)?.value || '0';
                        const borderRadius = `${topLeft}px ${topRight}px ${bottomRight}px ${bottomLeft}px`;
                        addStyleEdit?.(generateSelectorForElement?.(element) || '', 'border-radius', borderRadius);
                        // Update display
                        const display = e.target.nextElementSibling;
                        if (display) display.textContent = `${bottomRight}px`;
                      }}
                      style={{ width: '100%', marginTop: '4px' }}
                    />
                    <span style={{ fontSize: '10px', color: '#374151' }}>0px</span>
                  </div>
                  
                  <div className="corner-control">
                    <label style={{ fontSize: '11px', color: '#6b7280' }}>Bottom Left</label>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      defaultValue="0"
                      data-corner="bottom-left"
                      onChange={(e) => {
                        const bottomLeft = e.target.value;
                        const topLeft = (e.target.parentElement?.parentElement?.querySelector('input:not([data-corner])') as HTMLInputElement)?.value || '0';
                        const topRight = (e.target.parentElement?.parentElement?.querySelector('input[data-corner="top-right"]') as HTMLInputElement)?.value || '0';
                        const bottomRight = (e.target.parentElement?.parentElement?.querySelector('input[data-corner="bottom-right"]') as HTMLInputElement)?.value || '0';
                        const borderRadius = `${topLeft}px ${topRight}px ${bottomRight}px ${bottomLeft}px`;
                        addStyleEdit?.(generateSelectorForElement?.(element) || '', 'border-radius', borderRadius);
                        // Update display
                        const display = e.target.nextElementSibling;
                        if (display) display.textContent = `${bottomLeft}px`;
                      }}
                      style={{ width: '100%', marginTop: '4px' }}
                    />
                    <span style={{ fontSize: '10px', color: '#374151' }}>0px</span>
                  </div>
                </div>
                
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      const selector = generateSelectorForElement?.(element) || '';
                      addStyleEdit?.(selector, 'border-radius', '8px');
                    }}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      fontSize: '11px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      background: '#f9fafb',
                      color: '#374151',
                      cursor: 'pointer'
                    }}
                  >
                    Rounded
                  </button>
                  <button
                    onClick={() => {
                      const selector = generateSelectorForElement?.(element) || '';
                      addStyleEdit?.(selector, 'border-radius', '50%');
                    }}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      fontSize: '11px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      background: '#f9fafb',
                      color: '#374151',
                      cursor: 'pointer'
                    }}
                  >
                    Circle
                  </button>
                  <button
                    onClick={() => {
                      const selector = generateSelectorForElement?.(element) || '';
                      addStyleEdit?.(selector, 'border-radius', '0');
                    }}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      fontSize: '11px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      background: '#f9fafb',
                      color: '#374151',
                      cursor: 'pointer'
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
            
            {/* Advanced Box Shadow Editor */}
            <div className="property-item">
              <label className="property-label">🌟 Advanced Box Shadow</label>
              <div className="box-shadow-editor">
                <div className="shadow-presets" style={{ marginBottom: '12px', display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      const selector = generateSelectorForElement?.(element) || '';
                      addStyleEdit?.(selector, 'box-shadow', '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)');
                    }}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      fontSize: '11px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      background: '#f9fafb',
                      color: '#374151',
                      cursor: 'pointer'
                    }}
                  >
                    Subtle
                  </button>
                  <button
                    onClick={() => {
                      const selector = generateSelectorForElement?.(element) || '';
                      addStyleEdit?.(selector, 'box-shadow', '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)');
                    }}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      fontSize: '11px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      background: '#f9fafb',
                      color: '#374151',
                      cursor: 'pointer'
                    }}
                  >
                    Medium
                  </button>
                  <button
                    onClick={() => {
                      const selector = generateSelectorForElement?.(element) || '';
                      addStyleEdit?.(selector, 'box-shadow', '0 25px 50px -12px rgba(0, 0, 0, 0.25)');
                    }}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      fontSize: '11px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      background: '#f9fafb',
                      color: '#374151',
                      cursor: 'pointer'
                    }}
                  >
                    Large
                  </button>
                  <button
                    onClick={() => {
                      const selector = generateSelectorForElement?.(element) || '';
                      addStyleEdit?.(selector, 'box-shadow', 'none');
                    }}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      fontSize: '11px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      background: '#f9fafb',
                      color: '#374151',
                      cursor: 'pointer'
                    }}
                  >
                    None
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

// CodeViewer component with Monaco Editor for rich syntax highlighting and live editing
const CodeViewer = memo(({ generatedResult, selectedFile, onFileSelect, onCodeChange }: {
  generatedResult: GeneratedResult | null;
  selectedFile: string;
  onFileSelect: (file: string) => void;
  onCodeChange: (filePath: string, newCode: string) => void;
}) => {
  const [fileContents, setFileContents] = useState<Record<string, string>>({});

  // File structure for a typical React app
  const fileStructure = [
    { path: 'public/index.html', type: 'file', language: 'html' },
    { path: 'src/App.tsx', type: 'file', language: 'typescript' },
    { path: 'src/App.css', type: 'file', language: 'css' },
    { path: 'src/index.tsx', type: 'file', language: 'typescript' },
    { path: 'package.json', type: 'file', language: 'json' },
    { path: 'tsconfig.json', type: 'file', language: 'json' }
  ];

  // Initialize file contents
  useEffect(() => {
    const initialContents: Record<string, string> = {
      'public/index.html': '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="utf-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1" />\n  <title>React App</title>\n</head>\n<body>\n  <div id="root"></div>\n</body>\n</html>',
      'src/App.tsx': generatedResult?.code || '',
      'src/App.css': '/* App styles extracted from generated code */\n.App {\n  text-align: center;\n}\n\n/* Additional styles would be extracted here */',
      'src/index.tsx': 'import React from \'react\';\nimport ReactDOM from \'react-dom/client\';\nimport \'./App.css\';\nimport App from \'./App\';\n\nconst root = ReactDOM.createRoot(\n  document.getElementById(\'root\') as HTMLElement\n);\nroot.render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);',
      'package.json': '{\n  "name": "react-app",\n  "version": "0.1.0",\n  "private": true,\n  "dependencies": {\n    "react": "^18.2.0",\n    "react-dom": "^18.2.0",\n    "typescript": "^4.9.5"\n  },\n  "scripts": {\n    "start": "react-scripts start",\n    "build": "react-scripts build"\n  }\n}',
      'tsconfig.json': '{\n  "compilerOptions": {\n    "target": "es5",\n    "lib": ["dom", "dom.iterable", "es6"],\n    "allowJs": true,\n    "skipLibCheck": true,\n    "esModuleInterop": true,\n    "allowSyntheticDefaultImports": true,\n    "strict": true,\n    "forceConsistentCasingInFileNames": true,\n    "moduleResolution": "node",\n    "resolveJsonModule": true,\n    "isolatedModules": true,\n    "noEmit": true,\n    "jsx": "react-jsx"\n  },\n  "include": ["src"]\n}'
    };
    setFileContents(initialContents);
  }, [generatedResult]);

  const getFileContent = (filePath: string): string => {
    return fileContents[filePath] || '';
  };

  const getFileLanguage = (filePath: string): string => {
    const file = fileStructure.find(f => f.path === filePath);
    return file?.language || 'text';
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setFileContents(prev => ({
        ...prev,
        [selectedFile]: value
      }));
      
      // Notify parent component of code changes for live preview updates
      onCodeChange(selectedFile, value);
    }
  };

  const renderFileTree = () => {
    const folders = new Set<string>();
    fileStructure.forEach(file => {
      const parts = file.path.split('/');
      for (let i = 1; i < parts.length; i++) {
        folders.add(parts.slice(0, i).join('/'));
      }
    });

    const sortedFolders = Array.from(folders).sort();
    const files = fileStructure.filter(f => f.type === 'file').sort((a, b) => a.path.localeCompare(b.path));

    return (
      <div className="file-tree">
        {sortedFolders.map(folder => (
          <div key={folder} className="file-tree-folder">
            📁 {folder.split('/').pop()}
          </div>
        ))}
        {files.map(file => (
          <div 
            key={file.path} 
            className={`file-tree-item ${selectedFile === file.path ? 'selected' : ''}`}
            onClick={() => onFileSelect(file.path)}
          >
            📄 {file.path.split('/').pop()}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="code-viewer">
      <div className="code-viewer-sidebar">
        <div className="code-viewer-header">
          <h3>File Explorer</h3>
        </div>
        {renderFileTree()}
      </div>
      <div className="code-viewer-main">
        <div className="code-viewer-header">
          <h3>{selectedFile}</h3>
        </div>
        <div className="code-viewer-content">
          <Editor
            height="100%"
            language={getFileLanguage(selectedFile)}
            value={getFileContent(selectedFile)}
            onChange={handleEditorChange}
            theme="vs-dark"
            beforeMount={(monaco) => {
              // Define a custom Dracula-inspired theme
              monaco.editor.defineTheme('dracula', {
                base: 'vs-dark',
                inherit: true,
                rules: [
                  { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
                  { token: 'keyword', foreground: 'ff79c6' },
                  { token: 'operator', foreground: 'ff79c6' },
                  { token: 'namespace', foreground: 'f8f8f2' },
                  { token: 'type', foreground: '8be9fd' },
                  { token: 'struct', foreground: '8be9fd' },
                  { token: 'class', foreground: '8be9fd' },
                  { token: 'interface', foreground: '8be9fd' },
                  { token: 'parameter', foreground: 'ffb86c' },
                  { token: 'variable', foreground: 'f8f8f2' },
                  { token: 'variable.predefined', foreground: 'bd93f9' },
                  { token: 'constant', foreground: 'bd93f9' },
                  { token: 'function', foreground: '50fa7b' },
                  { token: 'string', foreground: 'f1fa8c' },
                  { token: 'number', foreground: 'bd93f9' },
                  { token: 'regexp', foreground: 'f1fa8c' },
                  { token: 'delimiter', foreground: 'f8f8f2' },
                  { token: 'tag', foreground: 'ff79c6' },
                  { token: 'attribute.name', foreground: '50fa7b' },
                  { token: 'attribute.value', foreground: 'f1fa8c' },
                  { token: 'key', foreground: '8be9fd' },
                  { token: 'value', foreground: 'f1fa8c' },
                  { token: 'value.number', foreground: 'bd93f9' },
                  { token: 'value.boolean', foreground: 'bd93f9' },
                  { token: 'value.null', foreground: 'bd93f9' },
                  { token: 'value.undefined', foreground: 'bd93f9' },
                ],
                colors: {
                  'editor.background': '#282a36',
                  'editor.foreground': '#f8f8f2',
                  'editorLineNumber.foreground': '#6272a4',
                  'editorLineNumber.activeForeground': '#f8f8f2',
                  'editor.selectionBackground': '#44475a',
                  'editor.selectionHighlightBackground': '#424450',
                  'editor.findMatchBackground': '#50fa7b50',
                  'editor.findMatchHighlightBackground': '#f1fa8c50',
                  'editorCursor.foreground': '#f8f8f2',
                  'editor.lineHighlightBackground': '#44475a50',
                  'editorIndentGuide.background': '#44475a',
                  'editorIndentGuide.activeBackground': '#6272a4',
                  'editor.wordHighlightBackground': '#8be9fd50',
                  'editor.wordHighlightStrongBackground': '#50fa7b50',
                  'editorBracketMatch.background': '#ff79c650',
                  'editorBracketMatch.border': '#ff79c6',
                }
              });
              monaco.editor.setTheme('dracula');
            }}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: 'Fira Code, Consolas, Monaco, monospace',
              lineNumbers: 'on',
              roundedSelection: false,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              insertSpaces: true,
              wordWrap: 'on',
              contextmenu: true,
              selectOnLineNumbers: true,
              glyphMargin: false,
              folding: true,
              foldingHighlight: true,
              showFoldingControls: 'always',
              bracketPairColorization: { enabled: true },
              guides: {
                bracketPairs: true,
                indentation: true
              },
              smoothScrolling: true,
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: true,
              renderWhitespace: 'selection',
              renderControlCharacters: false,
              fontLigatures: true,
              suggest: {
                showKeywords: true,
                showSnippets: true,
                showFunctions: true,
                showConstructors: true,
                showFields: true,
                showVariables: true,
                showClasses: true,
                showStructs: true,
                showInterfaces: true,
                showModules: true,
                showProperties: true,
                showEvents: true,
                showOperators: true,
                showUnits: true,
                showValues: true,
                showConstants: true,
                showEnums: true,
                showEnumMembers: true,
                showColors: true,
                showFiles: true,
                showReferences: true,
                showFolders: true,
                showTypeParameters: true,
              }
            }}
          />
        </div>
      </div>
    </div>
  );
});

const LiveEditor = ({ generatedResult, editedCode, editMode, onToggleEditMode, currentViewport, refreshKey, currentProject, addStyleEdit, generateSelectorForElement, appliedProjectId }: {
  generatedResult: GeneratedResult | null;
  editedCode: string;
  editMode: boolean;
  onToggleEditMode: () => void;
  currentViewport?: 'desktop' | 'tablet' | 'mobile';
  refreshKey?: number;
  currentProject?: SavedDesign | null;
  addStyleEdit?: (selector: string, property: string, value: string) => void;
  generateSelectorForElement?: (element: HTMLElement) => string;
  appliedProjectId?: React.MutableRefObject<string | null>;
}) => {
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const panelInteractionRef = useRef<boolean>(false);

  const handleElementSelect = useCallback((element: SelectedElement | null) => {
    setSelectedElement(element);
  }, []);
  
  const handleClosePanel = useCallback(() => {
    setSelectedElement(null);
  }, []);

  // 🎯 PANEL FIX: Handle clicks outside the properties panel to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if this event was flagged as a panel interaction
      if (panelInteractionRef.current) {
        console.log('🎯 Panel interaction detected - keeping panel open');
        panelInteractionRef.current = false; // Reset flag
        return;
      }

      // Only close if panel is open and click is outside both the panel and preview area
      if (selectedElement && editorRef.current) {
        const target = event.target as Node;
        // Keep panel open if current focus is inside the panel
        const activeEl = document.activeElement as Element | null;
        if (activeEl && (activeEl.classList.contains('properties-panel') || activeEl.closest('.properties-panel')) ) {
          console.log('🎯 Focus inside properties panel - keeping panel open');
          return;
        }
        
        // More robust check: traverse up the DOM tree to see if we're inside the panel
        let isInsidePanel = false;
        let isInsidePreview = false;
        let currentElement: Node | null = target;
        
        console.log('🎯 Click outside check - target:', target);
        
        while (currentElement && currentElement !== document.body) {
          if (currentElement instanceof Element) {
            console.log('🎯 Checking element:', currentElement.tagName, currentElement.className);
            
            // Check if we're inside the properties panel or any of its child elements
            if (currentElement.classList.contains('properties-panel') ||
                currentElement.closest('.properties-panel') ||
                // Also check for specific panel control classes
                currentElement.classList.contains('color-input') ||
                currentElement.classList.contains('text-input') ||
                currentElement.classList.contains('select-input') ||
                currentElement.classList.contains('property-item') ||
                currentElement.classList.contains('property-input-group') ||
                currentElement.classList.contains('gradient-color-editor') ||
                currentElement.classList.contains('page-background-editor') ||
                currentElement.classList.contains('text-content-editor')) {
              isInsidePanel = true;
              console.log('🎯 Found properties-panel or panel control - keeping panel open');
              break;
            }
            
            // Check if we're inside the preview container
            if (currentElement.classList.contains('preview-container') || 
                currentElement.hasAttribute('data-prism-preview-container')) {
              isInsidePreview = true;
              console.log('🎯 Found preview container - keeping panel open');
              break;
            }
          }
          currentElement = currentElement.parentNode;
        }
        
        // Don't close if clicking inside panel or preview area
        if (isInsidePanel) {
          console.log('🎯 Click inside panel - keeping panel open');
          return;
        }
        
        if (isInsidePreview) {
          console.log('🎯 Click inside preview - keeping panel open');
          return;
        }
        
        // Click is outside both panel and preview - close the panel
        console.log('🎯 Click outside panel and preview - closing panel');
        setSelectedElement(null);
      }
    };

    if (selectedElement) {
      // Use bubble phase so React event handlers can run first and call stopPropagation
      document.addEventListener('mousedown', handleClickOutside, false);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside, false);
      };
    }
  }, [selectedElement]);

  // Clear selection when exiting edit mode
  useEffect(() => {
    if (!editMode) {
      setSelectedElement(null);
      // Clear any visual selection indicators only within preview containers
      const previewContainers = document.querySelectorAll('[data-prism-preview-container]');
      previewContainers.forEach(container => {
        const existingSelected = container.querySelectorAll('.step1-selected');
        existingSelected.forEach(el => {
          el.classList.remove('step1-selected');
          el.classList.remove('step1-selected-gradient-text');
          (el as HTMLElement).style.outline = '';
          (el as HTMLElement).style.outlineOffset = '';
          // Clean up stored CSS variables
          (el as HTMLElement).style.removeProperty('--original-background');
          (el as HTMLElement).style.removeProperty('--original-background-clip');
          (el as HTMLElement).style.removeProperty('--original-text-fill-color');
        });
      });
    }
  }, [editMode]);

  // Panel resize handlers will be in the main App component

  return (
    <div 
      ref={editorRef} 
      className={`editor-container viewport-${currentViewport || 'desktop'}`}
      style={{
        width: '100%',
        height: '100%',
        margin: 0,
        padding: 0,
        border: 'none'
      }}
    >
      {/* Main Preview Content - Full Width */}
      <div 
        className="preview-container" 
        style={{ 
          width: '100%',
          height: '100%',
          position: 'relative',
          backgroundColor: editMode ? 'transparent' : '#fff',
          overflow: editMode ? 'auto' : 'hidden',
          margin: 0,
          padding: 0,
          border: 'none'
        }}
      >
        {editMode ? (
          <LivePreview
            generatedResult={generatedResult}
            editMode={editMode}
            onElementSelect={handleElementSelect}
            className="clean-preview-container"
            viewport={currentViewport}
            refreshKey={refreshKey}
            currentProject={currentProject}
            appliedProjectId={appliedProjectId}
          />
        ) : (
          <iframe
            srcDoc={(() => {
              let content = editedCode || (generatedResult ? generatedResult.code : '');
              
              // Remove markdown code block wrappers if present
              if (content.startsWith('```html')) {
                content = content.replace(/^```html\s*/, '').replace(/\s*```$/, '');
              } else if (content.startsWith('```')) {
                content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
              }
              
              console.log('🔍 [DEBUG] Iframe srcDoc content (cleaned):', content.substring(0, 300) + '...');
              return content;
            })()}
            title="Generated Interface Preview"
            className="preview-iframe"
            sandbox="allow-scripts allow-same-origin"
          />
        )}
      </div>
      
      {editMode && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            pointerEvents: 'none',
            zIndex: 9999
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <PropertiesPanel 
            selectedElement={selectedElement}
            onClose={handleClosePanel}
            addStyleEdit={addStyleEdit}
            generateSelectorForElement={generateSelectorForElement}
            panelInteractionRef={panelInteractionRef}
          />
        </div>
      )}
    </div>
  );
};

// Landing Page Component - Refactored for State Isolation
const LandingPage = ({
  savedDesigns,
  isLoading,
  selectedModel,
  onModelChange,
  onSubmit,
  onOpenProject,
  onDeleteDesign,
  formatTimestamp,
  error,
  generationMode,
  onGenerationModeChange
}: {
  savedDesigns: SavedDesign[];
  isLoading: boolean;
  selectedModel: 'claude-3-5-haiku' | 'claude-4';
  onModelChange: (model: 'claude-3-5-haiku' | 'claude-4') => void;
  onSubmit: (prompt: string, useVariants: boolean) => void;
  onOpenProject: (design: SavedDesign) => void;
  onDeleteDesign: (id: string) => void;
  formatTimestamp: (timestamp: number) => string;
  error: string | null;
  generationMode: 'single' | 'variants';
  onGenerationModeChange: (mode: 'single' | 'variants') => void;
}) => {
  const [inputPrompt, setInputPrompt] = useState('');

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim()) return;
    onSubmit(inputPrompt, generationMode === 'variants');
  };

  return (
    <div className="landing-page">
      <div className="hero">
        <h1 className="hero-title">
          Build something <span className="highlight">Visual</span>
        </h1>
        <p className="hero-subtitle">
          Create beautiful web interfaces by describing what you want - then edit visually or in code
        </p>
        
        <form onSubmit={handleFormSubmit} className="prompt-form">
          <div className="unified-prompt-container">
            <div className="prompt-options">
              <div className="model-selector">
                <label htmlFor="model-select">AI Model:</label>
                <select
                  id="model-select"
                  value={selectedModel}
                  onChange={(e) => onModelChange(e.target.value as 'claude-3-5-haiku' | 'claude-4')}
                  className="model-dropdown"
                  disabled={isLoading}
                >
                  <option value="claude-4">Claude 4 (Default - Best Quality)</option>
                  <option value="claude-3-5-haiku">Claude 3.5 Haiku (Cheapest - Fast)</option>
                </select>
              </div>
              
              <div className="generation-mode-selector">
                <label htmlFor="generation-mode-select">Generation:</label>
                <select
                  id="generation-mode-select"
                  value={generationMode}
                  onChange={(e) => onGenerationModeChange(e.target.value as 'single' | 'variants')}
                  className="generation-mode-dropdown"
                  disabled={isLoading}
                >
                  <option value="single">Single Design</option>
                  <option value="variants">2 Variants (A/B)</option>
                </select>
              </div>
            </div>

            <div className="prompt-input-area">
              <textarea
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="Ask Prism to create a landing page for my..."
                className="prompt-input"
                disabled={isLoading}
                autoFocus
                rows={1}
              />
              
              <button 
                type="submit"
                className={`submit-button ${isLoading ? 'loading' : ''}`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="loading-spinner"></div>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14"></path>
                    <path d="m12 5 7 7-7 7"></path>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div className="error-message">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            {error}
          </div>
        )}

        {/* This section is now removed to avoid redundancy with the "Your Projects" area */}
      </div>

      {savedDesigns.length > 0 && (
        <div className="workspace-container">
          <div className="saved-designs">
            <div className="projects-header">
              <h3 className="projects-title">Your Projects</h3>
              <div className="projects-controls">
                <input type="text" placeholder="Search projects..." className="search-input" />
                <select className="sort-dropdown">
                  <option>Newest first</option>
                  <option>Oldest first</option>
                  <option>Last edited</option>
                </select>
              </div>
            </div>
            
            <div className="designs-grid">
              {savedDesigns.map((design) => (
                <div key={design.id} className="design-card clickable" onClick={() => onOpenProject(design)}>
                  <div className="design-preview">
                    {design.thumbnail ? (
                      <img src={design.thumbnail} alt={`Preview of ${design.prompt}`} className="design-thumbnail" />
                    ) : (
                      <div className="thumbnail-placeholder">No preview available</div>
                    )}
                  </div>
                  <div className="design-info">
                    <h4 className="design-title">{design.prompt.substring(0, 50)}{design.prompt.length > 50 ? '...' : ''}</h4>
                    <div className="design-footer">
                      <span className="design-date">{formatTimestamp(design.timestamp)}</span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteDesign(design.id);
                        }}
                        className="delete-btn"
                        title="Delete this design"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3,6 5,6 21,6"></polyline>
                          <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'project' | 'editor-workspace'>('landing');
  const [currentProject, setCurrentProject] = useState<SavedDesign | null>(null);
  
  // Debug currentProject changes
  useEffect(() => {
    console.log('🎯 currentProject changed:', currentProject?.id || 'null');
  }, [currentProject]);
  const [prompt, setPrompt] = useState('');
  const [inputPrompt, setInputPrompt] = useState(''); // Separate state for input field
  const [selectedModel, setSelectedModel] = useState<'claude-3-5-haiku' | 'claude-4'>('claude-4');
  const [generationMode, setGenerationMode] = useState<'single' | 'variants'>('single');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPresetsPanelOpen, setIsPresetsPanelOpen] = useState(false);
  const [grainIntensity, setGrainIntensity] = useState(0);
  const [vignetteIntensity, setVignetteIntensity] = useState(0);
  const [colorFilter, setColorFilter] = useState('none');
  const [isIconLibraryOpen, setIsIconLibraryOpen] = useState(false);
  const [isAddElementMenuOpen, setIsAddElementMenuOpen] = useState(false);
  
  // Ref to track which project has had its edits applied to prevent duplicate applications
  const appliedProjectId = useRef<string | null>(null);
  const [generatedResult, setGeneratedResult] = useState<GeneratedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editedCode, setEditedCode] = useState<string>('');
  const [savedDesigns, setSavedDesigns] = useState<SavedDesign[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [viewTransition, setViewTransition] = useState(false);
  
  // Design Variants Feature
  const [showVariantSelector, setShowVariantSelector] = useState(false);
  const [variantA, setVariantA] = useState<GeneratedResult | null>(null);
  const [variantB, setVariantB] = useState<GeneratedResult | null>(null);
  const [generatingVariants, setGeneratingVariants] = useState(false);
  
  // Simple state for new edit mode
  const [editMode, setEditMode] = useState(false); 
  const [codeViewMode, setCodeViewMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [currentViewport, setCurrentViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [selectedFile, setSelectedFile] = useState('src/App.tsx');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>(''); 
  const [refreshKey, setRefreshKey] = useState<number>(0);
  
  // Generation key to force component remount on new generation
  const [generationKey, setGenerationKey] = useState<number>(0);
  // react-split-pane handles all resizing logic

  // Handle escape key for fullscreen mode
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'auto';
    };
  }, [isFullscreen]);
  
  // Effect to save edits on unmount or when the project changes
  useEffect(() => {
    const saveEdits = () => {
      if (currentProject && currentProjectEditsRef.current.length > 0) {
        const savedDesignsRaw = localStorage.getItem('prism-saved-designs');
        if (savedDesignsRaw) {
          try {
            const designs = JSON.parse(savedDesignsRaw);
            const designIndex = designs.findIndex((d: SavedDesign) => d.id === currentProject.id);
            if (designIndex !== -1) {
              const hasChanges = JSON.stringify(designs[designIndex].edits) !== JSON.stringify(currentProjectEditsRef.current);
              if (hasChanges) {
                console.log('Finalizing edits before unmount/project change...');
                designs[designIndex].edits = currentProjectEditsRef.current;
                designs[designIndex].timestamp = Date.now();
                localStorage.setItem('prism-saved-designs', JSON.stringify(designs));
              }
            }
          } catch (error) {
            console.error('Failed to save edits on exit:', error);
          }
        }
      }
    };

    // Save on navigating away from the page
    window.addEventListener('beforeunload', saveEdits);

    return () => {
      // Cleanup: save edits and remove listener
      saveEdits();
      window.removeEventListener('beforeunload', saveEdits);
    };
  }, [currentProject]);

  // Refs for edit persistence
  const currentProjectEditsRef = useRef<StyleEdit[]>([]);

  // Refs to track overlay elements and prevent re-renders
  const blurOverlayRef = useRef<HTMLElement | null>(null);
  const vignetteOverlayRef = useRef<HTMLElement | null>(null);

  // Refs to store current values without triggering re-renders
  const backgroundBlurRef = useRef(0);
  const vignetteIntensityRef = useRef(0);
  const vignetteEnabledRef = useRef(false);

  // Simple grain handler that applies CSS filter directly to preview container
  const handleGrainChange = useCallback((intensity: number) => {
    setGrainIntensity(intensity);
    console.log('🎬 Grain change:', intensity);
    
    // Find the preview container
    const previewContainer = document.querySelector('[data-prism-preview-container]') as HTMLElement;
    const previewIframe = document.querySelector('.preview-iframe') as HTMLIFrameElement;
    
    // Calculate grain opacity (0-100 -> 0-0.15)
    const grainOpacity = (intensity / 100) * 0.15;
    
    if (previewContainer) {
      if (intensity === 0) {
        previewContainer.style.removeProperty('--grain-opacity');
        previewContainer.classList.remove('grain-effect');
      } else {
        previewContainer.style.setProperty('--grain-opacity', grainOpacity.toString());
        previewContainer.classList.add('grain-effect');
      }
    }
    
    if (previewIframe && previewIframe.contentDocument) {
      const targetDoc = previewIframe.contentDocument;
      const bodyElement = targetDoc.body || targetDoc.documentElement;
      
      if (intensity === 0) {
        bodyElement.style.removeProperty('--grain-opacity');
        bodyElement.classList.remove('grain-effect');
      } else {
        bodyElement.style.setProperty('--grain-opacity', grainOpacity.toString());
        bodyElement.classList.add('grain-effect');
      }
    }
  }, []);

  const handleVignetteChange = useCallback((intensity: number) => {
    vignetteIntensityRef.current = intensity;
    console.log('🌅 Vignette change:', intensity);
    
    const previewIframe = document.querySelector('.preview-iframe, iframe[title="Generated Interface Preview"]') as HTMLIFrameElement;
    const livePreview = document.querySelector('.clean-preview-container');
    
    // Calculate vignette strength (0-100 -> 0-0.8)
    const vignetteStrength = (intensity / 100) * 0.8;
    
    if (intensity === 0) {
      // Remove vignette overlay when intensity is 0
      if (vignetteOverlayRef.current) {
        vignetteOverlayRef.current.remove();
        vignetteOverlayRef.current = null;
      }
      const existingOverlay = document.getElementById('prism-vignette-overlay-live');
      if (existingOverlay) existingOverlay.remove();
      return;
    }
    
    if (previewIframe && previewIframe.contentDocument) {
      const targetDoc = previewIframe.contentDocument;
      
      let vignetteOverlay = targetDoc.getElementById('prism-vignette-overlay') as HTMLElement;
      if (!vignetteOverlay) {
        vignetteOverlay = targetDoc.createElement('div');
        vignetteOverlay.id = 'prism-vignette-overlay';
        vignetteOverlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          box-shadow: inset 0 0 ${Math.round(200 * vignetteStrength)}px ${Math.round(100 * vignetteStrength)}px rgba(0, 0, 0, ${vignetteStrength});
          z-index: 9997;
        `;
        (targetDoc.body || targetDoc.documentElement).appendChild(vignetteOverlay);
        vignetteOverlayRef.current = vignetteOverlay;
        console.log('🌅 Created vignette overlay in iframe');
      } else {
        vignetteOverlay.style.boxShadow = `inset 0 0 ${Math.round(200 * vignetteStrength)}px ${Math.round(100 * vignetteStrength)}px rgba(0, 0, 0, ${vignetteStrength})`;
        vignetteOverlayRef.current = vignetteOverlay;
        console.log('🌅 Updated vignette overlay intensity:', vignetteStrength);
      }
    } else if (livePreview) {
      let vignetteOverlay = document.getElementById('prism-vignette-overlay-live') as HTMLElement;
      if (!vignetteOverlay) {
        vignetteOverlay = document.createElement('div');
        vignetteOverlay.id = 'prism-vignette-overlay-live';
        vignetteOverlay.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          box-shadow: inset 0 0 ${Math.round(200 * vignetteStrength)}px ${Math.round(100 * vignetteStrength)}px rgba(0, 0, 0, ${vignetteStrength});
          z-index: 9997;
        `;
        livePreview.appendChild(vignetteOverlay);
        vignetteOverlayRef.current = vignetteOverlay;
        console.log('🌅 Created vignette overlay in live preview');
      } else {
        vignetteOverlay.style.boxShadow = `inset 0 0 ${Math.round(200 * vignetteStrength)}px ${Math.round(100 * vignetteStrength)}px rgba(0, 0, 0, ${vignetteStrength})`;
        vignetteOverlayRef.current = vignetteOverlay;
        console.log('🌅 Updated vignette overlay intensity:', vignetteStrength);
      }
    } else {
      console.log('🌅 No preview container found');
    }
  }, []);

  const handleBackgroundBlurChange = useCallback((intensity: number) => {
    backgroundBlurRef.current = intensity;
    // DO NOT call setBackgroundBlur to avoid re-renders
    
    // Find the preview iframe
    const previewIframe = document.querySelector('.preview-iframe, iframe[title="Generated Interface Preview"]') as HTMLIFrameElement;
    const livePreview = document.querySelector('.clean-preview-container');
    
    // Calculate blur based on intensity (0-100 -> 0-10px)
    const blurAmount = (intensity / 100) * 10;
    
    if (previewIframe && previewIframe.contentDocument) {
      const targetDoc = previewIframe.contentDocument;
      let blurOverlay = blurOverlayRef.current || targetDoc.getElementById('prism-blur-overlay') as HTMLElement;
      
      if (intensity > 0) {
        if (!blurOverlay) {
          blurOverlay = targetDoc.createElement('div');
          blurOverlay.id = 'prism-blur-overlay';
          blurOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9998;
          `;
          (targetDoc.body || targetDoc.documentElement).appendChild(blurOverlay);
          blurOverlayRef.current = blurOverlay;
        }
        blurOverlay.style.backdropFilter = `blur(${blurAmount}px)`;
      } else {
        if (blurOverlay) {
          blurOverlay.remove();
          blurOverlayRef.current = null;
        }
      }
    } else if (livePreview) {
      let blurOverlay = blurOverlayRef.current || document.getElementById('prism-blur-overlay-live') as HTMLElement;
      
      if (intensity > 0) {
        if (!blurOverlay) {
          blurOverlay = document.createElement('div');
          blurOverlay.id = 'prism-blur-overlay-live';
          blurOverlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9998;
          `;
          livePreview.appendChild(blurOverlay);
          blurOverlayRef.current = blurOverlay;
        }
        blurOverlay.style.backdropFilter = `blur(${blurAmount}px)`;
      } else {
        if (blurOverlay) {
          blurOverlay.remove();
          blurOverlayRef.current = null;
        }
      }
    }
  }, []);

  const handleVignetteToggle = useCallback((enabled: boolean) => {
    vignetteEnabledRef.current = enabled;
    // DO NOT call setVignetteEnabled to avoid re-renders
    
    const previewIframe = document.querySelector('.preview-iframe, iframe[title="Generated Interface Preview"]') as HTMLIFrameElement;
    const livePreview = document.querySelector('.clean-preview-container');
    
    if (previewIframe && previewIframe.contentDocument) {
      const targetDoc = previewIframe.contentDocument;
      let vignetteOverlay = vignetteOverlayRef.current || targetDoc.getElementById('prism-vignette-overlay') as HTMLElement;
      
      if (enabled) {
        if (!vignetteOverlay) {
          vignetteOverlay = targetDoc.createElement('div');
          vignetteOverlay.id = 'prism-vignette-overlay';
          vignetteOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            background: radial-gradient(circle, transparent 30%, rgba(0,0,0,0.4) 100%);
            z-index: 9997;
          `;
          (targetDoc.body || targetDoc.documentElement).appendChild(vignetteOverlay);
          vignetteOverlayRef.current = vignetteOverlay;
        }
      } else {
        if (vignetteOverlay) {
          vignetteOverlay.remove();
          vignetteOverlayRef.current = null;
        }
      }
    } else if (livePreview) {
      let vignetteOverlay = vignetteOverlayRef.current || document.getElementById('prism-vignette-overlay-live') as HTMLElement;
      
      if (enabled) {
        if (!vignetteOverlay) {
          vignetteOverlay = document.createElement('div');
          vignetteOverlay.id = 'prism-vignette-overlay-live';
          vignetteOverlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            background: radial-gradient(circle, transparent 30%, rgba(0,0,0,0.4) 100%);
            z-index: 9997;
          `;
          livePreview.appendChild(vignetteOverlay);
          vignetteOverlayRef.current = vignetteOverlay;
        }
      } else {
        if (vignetteOverlay) {
          vignetteOverlay.remove();
          vignetteOverlayRef.current = null;
        }
      }
    }
  }, []);

  const handleColorFilterChange = useCallback((filter: string) => {
    setColorFilter(filter);
    console.log('🎨 Color filter change:', filter);
    
    const previewContainer = document.querySelector('[data-prism-preview-container]') as HTMLElement;
    const previewIframe = document.querySelector('.preview-iframe') as HTMLIFrameElement;
    
    const filterMap: { [key: string]: string } = {
      'none': 'none',
      'cool-vintage': 'sepia(0.3) saturate(0.8) hue-rotate(200deg)',
      'warm-sepia': 'sepia(0.8) saturate(1.2) hue-rotate(15deg)',
      'cyberpunk-neon': 'saturate(1.5) hue-rotate(270deg) contrast(1.2)',
      'noir': 'grayscale(1) contrast(1.3) brightness(0.9)'
    };
    
    const filterValue = filterMap[filter] || 'none';
    
    if (previewContainer) {
      if (filter === 'none') {
        previewContainer.style.removeProperty('filter');
      } else {
        previewContainer.style.filter = filterValue;
      }
    }
    
    if (previewIframe && previewIframe.contentDocument) {
      const targetDoc = previewIframe.contentDocument;
      const bodyElement = targetDoc.body || targetDoc.documentElement;
      
      if (filter === 'none') {
        bodyElement.style.removeProperty('filter');
      } else {
        bodyElement.style.filter = filterValue;
      }
    }
  }, []);

  const handleToggleEditMode = useCallback(() => {
    setEditMode(prev => !prev);
  }, []);

  // Viewport control handlers
  const handleViewportChange = useCallback((viewport: 'desktop' | 'tablet' | 'mobile') => {
    setCurrentViewport(viewport);
    console.log(`[Viewport] Switched to ${viewport} view`);
  }, []);

  // Refresh preview handler
  const handleRefreshPreview = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    console.log('[Preview] Refreshing preview content');
  }, []);

  // 🎯 EDIT PERSISTENCE: Helper functions for style edit tracking
  const generateSelectorForElement = useCallback((element: HTMLElement): string => {
    // Generate a reliable CSS selector for the element
    if (element.id) {
      return `#${element.id}`;
    }
    
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c.trim()).join('.');
      if (classes) {
        return `.${classes}`;
      }
    }
    
    // Fallback: use tag name + nth-child
    const parent = element.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(child => child.tagName === element.tagName);
      const index = siblings.indexOf(element);
      return `${element.tagName.toLowerCase()}:nth-of-type(${index + 1})`;
    }
    
    return element.tagName.toLowerCase();
  }, []);

  const saveProjectWithEdits = useCallback(async (projectId: string, edits: StyleEdit[]) => {
    console.log('🎯 Saving project with edits:', { projectId, editsCount: edits.length });
    
    // Only update localStorage, don't update React state during editing to prevent reloads
    const savedDesignsRaw = localStorage.getItem('prism-saved-designs');
    if (savedDesignsRaw) {
      try {
        const designs = JSON.parse(savedDesignsRaw);
        const designIndex = designs.findIndex((d: SavedDesign) => d.id === projectId);
        if (designIndex >= 0) {
          designs[designIndex] = {
            ...designs[designIndex],
            edits: edits,
            timestamp: Date.now()
          };
          localStorage.setItem('prism-saved-designs', JSON.stringify(designs));
          console.log(' Project saved with edits to localStorage');

          // Removed the setSavedDesigns call to prevent the preview from refreshing during live edits
        }
      } catch (error) {
        console.error('Error updating localStorage:', error);
      }
    }
  }, []);

  const addStyleEdit = useCallback((selector: string, property: string, value: string) => {
    console.log('🎯 addStyleEdit called with:', { selector, property, value, currentProject: currentProject?.id });
    
    const newEdit: StyleEdit = {
      selector,
      property,
      value,
      timestamp: Date.now()
    };

    // Update the ref without causing a re-render
    const filtered = currentProjectEditsRef.current.filter(edit => 
      !(edit.selector === selector && edit.property === property)
    );
    const updated = [...filtered, newEdit];
    currentProjectEditsRef.current = updated;
    
    console.log('🎯 Updated edits ref, total edits:', updated.length);

    // Get project ID from currentProject or fallback to localStorage
    let projectId = currentProject?.id;
    
    if (!projectId) {
      // Fallback: try to get current project from localStorage
      const savedProject = localStorage.getItem('prism-current-project');
      if (savedProject) {
        try {
          const project = JSON.parse(savedProject);
          projectId = project.id;
          console.log('🎯 Using fallback project ID from localStorage:', projectId);
        } catch (error) {
          console.warn('🎯 Failed to parse saved project from localStorage');
        }
      }
    }

    if (projectId) {
      console.log('🎯 Project ID found, scheduling save for project:', projectId);
      setTimeout(() => {
        if (!document.querySelector('[data-prism-preview-container][data-applying-edits]')) {
          console.log('🎯 Debounced save - applying edit after delay');
          console.log('🎯 About to save edits:', currentProjectEditsRef.current);
          saveProjectWithEdits(projectId, currentProjectEditsRef.current);
        } else {
          console.log('🎯 Skipping save - currently applying edits');
        }
      }, 300);
    } else {
      console.log('🎯 WARNING: No project ID found - edit will not be saved!');
      console.log('🎯 currentProject:', currentProject);
      console.log('🎯 localStorage current project:', localStorage.getItem('prism-current-project'));
    }
    
    console.log('🎯 Added style edit:', newEdit);
  }, [currentProject, saveProjectWithEdits]);


  // Load saved designs and chat from localStorage on component mount
  useEffect(() => {
    const loadData = async () => {
    console.log('🔧 App component mounted');
    try {
      cleanupLocalStorage();
      
        const savedDesignsRaw = localStorage.getItem('prism-saved-designs');
      const savedChat = localStorage.getItem('prism-chat-messages');
      const savedView = localStorage.getItem('prism-current-view');
      const savedProject = localStorage.getItem('prism-current-project');
      const savedGeneratedResult = localStorage.getItem('prism-generated-result');
      const savedModel = localStorage.getItem('prism-selected-model');
      
        if (savedDesignsRaw) {
          try {
            const parsedDesigns: SavedDesign[] = JSON.parse(savedDesignsRaw);
            console.log('🔧 Parsed saved designs:', parsedDesigns);
  
            let needsUpdate = false;
            const updatedDesignsPromises = parsedDesigns.map(async (design) => {
              if (!design.thumbnail) {
                console.log(`🔧 Generating missing thumbnail for project: ${design.prompt.substring(0, 30)}...`);
                needsUpdate = true;
                try {
                  const thumbnail = await generateThumbnail(design.code);
                  return { ...design, thumbnail };
                } catch (error) {
                  console.error(`Failed to generate thumbnail for ${design.id}`, error);
                  return design; // return original design on error
                }
              }
              return design;
            });
  
            const updatedDesigns = await Promise.all(updatedDesignsPromises);
            setSavedDesigns(updatedDesigns);
  
            if (needsUpdate) {
              console.log('🔧 Saving designs back to localStorage with new thumbnails.');
              localStorage.setItem('prism-saved-designs', JSON.stringify(updatedDesigns));
            }
          } catch (error) {
            console.error("Failed to parse or update saved designs:", error);
            localStorage.removeItem('prism-saved-designs');
        }
      }
      
      if (savedChat) {
        try {
          const parsed = JSON.parse(savedChat);
          console.log('🔧 Parsed saved chat:', parsed);
          setChatMessages(parsed);
        } catch (err) {
          console.error('❌ Error loading chat messages:', err);
          setChatMessages([]);
        }
      }

      // Restore current view and project state
      if (savedView) {
        try {
          const view = JSON.parse(savedView);
          setCurrentView(view);
          console.log('🔧 Restored current view:', view);
        } catch (err) {
          console.error('❌ Error loading current view:', err);
        }
      }

      if (savedProject) {
        try {
          const project = JSON.parse(savedProject);
          setCurrentProject(project);
          console.log('🔧 Restored current project:', project);
        } catch (err) {
          console.error('❌ Error loading current project:', err);
        }
      }

      if (savedGeneratedResult) {
        try {
          const result = JSON.parse(savedGeneratedResult);
          setGeneratedResult(result);
          setEditedCode(result.code);
          console.log('🔧 Restored generated result:', result);
        } catch (err) {
          console.error('❌ Error loading generated result:', err);
        }
      }

      // Restore selected model preference
      if (savedModel) {
        try {
          const model = JSON.parse(savedModel);
          setSelectedModel(model);
          console.log('🔧 Restored selected model:', model);
        } catch (err) {
          console.error('❌ Error loading selected model:', err);
        }
      }
    } catch (err) {
      console.error('Error during initial load:', err);
    }
    };

    loadData();
  }, []);

  // Save selected model preference to localStorage
  useEffect(() => {
    console.log('🔧 Saving selected model to localStorage:', selectedModel);
    localStorage.setItem('prism-selected-model', JSON.stringify(selectedModel));
  }, [selectedModel]);

  // Debounced localStorage saves to prevent excessive writes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      console.log('🔧 Saving designs to localStorage:', savedDesigns);
      localStorage.setItem('prism-saved-designs', JSON.stringify(savedDesigns));
    }, 2000); // Debounce by 2 seconds

    return () => clearTimeout(timeoutId);
  }, [savedDesigns]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      console.log('Saving chat to localStorage:', chatMessages);
      localStorage.setItem('prism-chat-messages', JSON.stringify(chatMessages));
    }, 2000); // Debounce by 2 seconds

    return () => clearTimeout(timeoutId);
  }, [chatMessages]);

  // Save current view and project state
  useEffect(() => {
    if (currentView) {
      console.log('Saving current view to localStorage:', currentView);
      try {
        localStorage.setItem('prism-current-view', JSON.stringify(currentView));
      } catch (err) {
        console.error('Error saving current view:', err);
      }
    }
  }, [currentView]);

  useEffect(() => {
    if (currentProject) {
      console.log('🔧 Saving current project to localStorage:', currentProject);
      try {
        localStorage.setItem('prism-current-project', JSON.stringify(currentProject));
      } catch (err) {
        console.error('❌ Error saving current project:', err);
      }
    } else {
      // Remove if null
      localStorage.removeItem('prism-current-project');
    }
  }, [currentProject]);

  useEffect(() => {
    if (generatedResult && generatedResult.code) {
      console.log('🔧 Saving generated result to localStorage:', generatedResult);
      try {
        localStorage.setItem('prism-generated-result', JSON.stringify(generatedResult));
      } catch (err) {
        console.error('❌ Error saving generated result:', err);
      }
    } else {
      // Remove if null or invalid
      localStorage.removeItem('prism-generated-result');
    }
  }, [generatedResult]);

  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  // 🎯 PREMIUM: Generate intelligent AI plan based on user prompt
  const generateAIPlan = (prompt: string): string => {
    const lowerPrompt = prompt.toLowerCase();
    
    // Detect project type and create contextual plan
    let projectType = 'website';
    let sections: string[] = [];
    
    if (lowerPrompt.includes('landing page') || lowerPrompt.includes('landing')) {
      projectType = 'landing page';
      sections = [
        '🎯 Hero section with compelling headline',
        '📋 Key features or benefits section', 
        '👥 Social proof or testimonials',
        '📞 Call-to-action and contact form'
      ];
    } else if (lowerPrompt.includes('portfolio') || lowerPrompt.includes('showcase')) {
      projectType = 'portfolio';
      sections = [
        '🏠 About section with personal intro',
        '💼 Projects showcase gallery',
        '🛠️ Skills and technologies section',
        '📬 Contact information and links'
      ];
    } else if (lowerPrompt.includes('blog') || lowerPrompt.includes('article')) {
      projectType = 'blog';
      sections = [
        '📰 Header with navigation',
        '📝 Featured articles section',
        '📂 Category organization',
        '🔍 Search and archive features'
      ];
    } else if (lowerPrompt.includes('ecommerce') || lowerPrompt.includes('store') || lowerPrompt.includes('shop')) {
      projectType = 'e-commerce store';
      sections = [
        '🏪 Product showcase hero',
        '🛍️ Featured products grid',
        '🛒 Shopping cart functionality',
        '💳 Checkout and payment flow'
      ];
    } else if (lowerPrompt.includes('dashboard') || lowerPrompt.includes('admin')) {
      projectType = 'dashboard';
      sections = [
        '📊 Key metrics overview',
        '📈 Data visualization charts',
        '🔧 Management controls',
        '👤 User profile and settings'
      ];
    } else if (lowerPrompt.includes('restaurant') || lowerPrompt.includes('cafe') || lowerPrompt.includes('food')) {
      projectType = 'restaurant website';
      sections = [
        '🍽️ Hero with appetizing imagery',
        '📋 Menu showcase section',
        '📍 Location and hours info',
        '📞 Reservation and contact form'
      ];
    } else {
      // Generic website
      sections = [
        '🎯 Engaging hero section',
        '📋 Main content area',
        '💡 Key information sections',
        '📞 Contact and footer'
      ];
    }
    
    const businessContext = extractBusinessContext(prompt);
    
    return `Perfect! I'm creating a ${projectType}${businessContext}. Here's my comprehensive plan:

**🎯 Key Components:**
${sections.map(section => `• ${section}`).join('\n')}

**🎨 Design Approach:**
• Modern, clean aesthetic with premium feel
• Smooth animations and micro-interactions  
• Mobile-first responsive design
• Optimized for performance and accessibility

**✨ Technical Features:**
• Fast loading times and smooth scrolling
• Cross-browser compatibility
• SEO-optimized structure
• Interactive elements and hover effects

Let's build something amazing together! 🚀`;
  };

  // Extract business context from prompt for personalization
  const extractBusinessContext = (prompt: string): string => {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('coffee') || lowerPrompt.includes('cafe')) return ' for your coffee business';
    if (lowerPrompt.includes('restaurant') || lowerPrompt.includes('food')) return ' for your restaurant';
    if (lowerPrompt.includes('tech') || lowerPrompt.includes('software')) return ' for your tech company';
    if (lowerPrompt.includes('agency') || lowerPrompt.includes('marketing')) return ' for your agency';
    if (lowerPrompt.includes('fitness') || lowerPrompt.includes('gym')) return ' for your fitness business';
    if (lowerPrompt.includes('medical') || lowerPrompt.includes('health')) return ' for your healthcare practice';
    if (lowerPrompt.includes('fashion') || lowerPrompt.includes('clothing')) return ' for your fashion brand';
    if (lowerPrompt.includes('real estate') || lowerPrompt.includes('property')) return ' for your real estate business';
    
    return '';
  };

  // 🎯 PREMIUM: Simulate live progress updates during generation
  const simulateLiveProgress = (prompt: string) => {
    const lowerPrompt = prompt.toLowerCase();
    let progressSteps: string[] = [];
    let chatMilestones: string[] = [];
    
    // Generate contextual progress steps based on prompt
    if (lowerPrompt.includes('landing page') || lowerPrompt.includes('landing')) {
      progressSteps = [
        '🎨 Designing hero section layout...',
        '📝 Crafting compelling headlines...',
        '🎯 Building call-to-action elements...',
        '📋 Structuring features section...',
        '💫 Adding animations and interactions...',
        '📱 Optimizing for mobile responsiveness...',
        '✨ Applying final polish and styling...'
      ];
      chatMilestones = [
        '✓ **Page Structure** - Foundation complete',
        '✓ **Hero Section** - Compelling design ready', 
        '✓ **Features & CTA** - Conversion elements added',
        '✓ **Responsive Design** - Mobile optimization complete'
      ];
    } else if (lowerPrompt.includes('portfolio') || lowerPrompt.includes('showcase')) {
      progressSteps = [
        '🎨 Creating portfolio layout...',
        '🖼️ Designing project showcase grid...',
        '📝 Building about section...',
        '🛠️ Adding skills visualization...',
        '💫 Implementing smooth transitions...',
        '📱 Ensuring mobile optimization...',
        '✨ Final touches and refinements...'
      ];
      chatMilestones = [
        '✓ **Portfolio Structure** - Layout foundation set',
        '✓ **Project Showcase** - Gallery design complete',
        '✓ **Skills & About** - Personal sections added',
        '✓ **Polish & Mobile** - Final optimizations done'
      ];
    } else if (lowerPrompt.includes('restaurant') || lowerPrompt.includes('cafe') || lowerPrompt.includes('food')) {
      progressSteps = [
        '🍽️ Designing appetizing hero section...',
        '📋 Creating menu layout...',
        '📍 Adding location information...',
        '📞 Building reservation system...',
        '💫 Adding mouth-watering animations...',
        '📱 Mobile-first optimization...',
        '✨ Final culinary touches...'
      ];
      chatMilestones = [
        '✓ **Restaurant Layout** - Visual foundation ready',
        '✓ **Menu System** - Food showcase complete',
        '✓ **Location & Contact** - Business info added',
        '✓ **Mobile & Polish** - Customer experience optimized'
      ];
    } else if (lowerPrompt.includes('ecommerce') || lowerPrompt.includes('store') || lowerPrompt.includes('shop')) {
      progressSteps = [
        '🏪 Building storefront layout...',
        '🛍️ Creating product showcase...',
        '🛒 Implementing shopping features...',
        '💳 Designing checkout flow...',
        '💫 Adding shopping animations...',
        '📱 Mobile commerce optimization...',
        '✨ E-commerce final polish...'
      ];
      chatMilestones = [
        '✓ **Store Foundation** - E-commerce structure ready',
        '✓ **Product Display** - Shopping showcase complete',
        '✓ **Cart & Checkout** - Purchase flow added',
        '✓ **Mobile Commerce** - Shopping experience optimized'
      ];
    } else {
      // Generic progress
      progressSteps = [
        '🎨 Analyzing design requirements...',
        '🏗️ Building page structure...',
        '📝 Generating content sections...',
        '🎯 Adding interactive elements...',
        '💫 Implementing animations...',
        '📱 Responsive optimization...',
        '✨ Final styling and polish...'
      ];
      chatMilestones = [
        '✓ **Structure** - Page foundation complete',
        '✓ **Content** - Core sections ready',
        '✓ **Interactions** - Dynamic elements added',
        '✓ **Responsive** - Multi-device optimization done'
      ];
    }
    
    // 🎯 PREMIUM: Show detailed steps in preview panel (ephemeral)
    progressSteps.forEach((step, index) => {
      setTimeout(() => {
        setCurrentStep(step);
      }, 1500 + (index * 1200));
    });
    
    // 🎯 PREMIUM: Show only major milestones in chat (permanent)
    chatMilestones.forEach((milestone, index) => {
      setTimeout(() => {
        addChatMessage('assistant', milestone);
      }, 2000 + (index * 2100)); // Slower, more spaced out milestones
    });
    
    // Clear current step when done
    setTimeout(() => {
      setCurrentStep('');
    }, 1500 + (progressSteps.length * 1200) + 1000);
  };

  // 🎯 PREMIUM: Generate contextual completion message
  const generateCompletionMessage = (prompt: string): string => {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('landing page') || lowerPrompt.includes('landing')) {
      return `🎉 Your landing page is ready! I've crafted a conversion-focused design with compelling headlines, clear value propositions, and strategic call-to-actions. Ready to capture leads and drive conversions! 

🎯 Click "Edit" to customize colors, text, or layouts
📱 Use the viewport controls to test mobile responsiveness
📥 Hit "Download" when you're ready to launch!`;
    } else if (lowerPrompt.includes('portfolio') || lowerPrompt.includes('showcase')) {
      return `✨ Your portfolio is complete! I've designed a professional showcase that highlights your work beautifully. The layout emphasizes your projects while maintaining clean, modern aesthetics.

🖼️ Perfect for impressing potential clients and employers
🎨 Click "Edit" to personalize colors and content
📱 Fully responsive across all devices!`;
    } else if (lowerPrompt.includes('restaurant') || lowerPrompt.includes('cafe') || lowerPrompt.includes('food')) {
      return `🍽️ Bon appétit! Your restaurant website is served! I've created an appetizing design that showcases your menu, location, and atmosphere. Perfect for attracting hungry customers!

📋 Menu section designed for easy browsing
📞 Integrated contact and reservation features
🎨 Mouth-watering visual design that builds appetite!`;
    } else if (lowerPrompt.includes('ecommerce') || lowerPrompt.includes('store') || lowerPrompt.includes('shop')) {
      return `🛍️ Your online store is open for business! I've built a conversion-optimized e-commerce experience with intuitive navigation, compelling product displays, and seamless shopping flow.

💳 Optimized for sales and conversions
🛒 User-friendly shopping experience
📱 Mobile-first design for on-the-go shoppers!`;
    } else {
      return `🚀 Your website is live and looking fantastic! I've crafted a modern, responsive design that captures your vision perfectly. Every element has been carefully designed for optimal user experience.

✨ Clean, professional design
📱 Fully responsive layout
🎨 Ready to customize and make it yours!

What would you like to adjust or explore next?`;
    }
  };

  const addChatMessage = (type: 'user' | 'assistant', content: string, designId?: string) => {
    const message: ChatMessage = {
      id: generateId(),
      type,
      content,
      timestamp: Date.now(),
      designId
    };
    setChatMessages(prev => [...prev, message]);
  };

  const saveCurrentDesign = async () => {
    if (!generatedResult) {
      console.log('🔧 No generated result to save');
      return;
    }

    console.log('🔧 Saving current design:', { generatedResult, editedCode });
    
    const codeToSave = editedCode || generatedResult.code;
    const thumbnail = await generateThumbnail(codeToSave);

    const design: SavedDesign = {
      id: generateId(),
      prompt: generatedResult.prompt,
      code: codeToSave,
      timestamp: Date.now(),
      thumbnail: thumbnail,
    };

    console.log('🔧 Created design object:', design);

    setSavedDesigns(prev => {
      const newDesigns = [design, ...prev];
      console.log('🔧 Updated designs array:', newDesigns);
      return newDesigns;
    });
    
    addChatMessage('assistant', `Design saved: "${design.prompt}"`, design.id);
  };

  const loadSavedDesign = (design: SavedDesign) => {
    console.log('🔧 Loading saved design:', design);
    setGeneratedResult({
      code: design.code,
      prompt: design.prompt,
      timestamp: design.timestamp,
      id: design.id
    });
    setEditedCode(design.code);
    setCurrentView('project');
    setCurrentProject(design);
    setError(null);
  };

  const deleteSavedDesign = (id: string) => {
    setSavedDesigns(prev => prev.filter(design => design.id !== id));
    addChatMessage('assistant', 'Design deleted from history');
  };

  // Debug function to clear localStorage
  const clearLocalStorage = () => {
    console.log('🔧 Clearing localStorage for debugging');
    localStorage.clear();
    setSavedDesigns([]);
    setChatMessages([]);
    setCurrentView('landing');
    setCurrentProject(null);
    setGeneratedResult(null);
    setEditedCode('');
    setError(null);
    addChatMessage('assistant', 'Local storage cleared for debugging');
  };

  // Function to clean up corrupted localStorage data
  const cleanupLocalStorage = () => {
    try {
      // Check and clean saved designs
      const saved = localStorage.getItem('prism-saved-designs');
      if (saved) {
        const designs = JSON.parse(saved);
        if (Array.isArray(designs)) {
          // Filter out invalid designs
          const validDesigns = designs.filter(design => 
            design && design.id && design.prompt && design.code && design.timestamp
          );
          if (validDesigns.length !== designs.length) {
            console.log('Cleaned up corrupted designs:', designs.length - validDesigns.length);
            localStorage.setItem('prism-saved-designs', JSON.stringify(validDesigns));
          }
        }
      }
    } catch (err) {
      console.error('Error cleaning up localStorage:', err);
    }
  };

  // STEP 1: Starting with clean, simple functions
  
  // STEP 1: Simple element selector function (defined first)
  // STEP 1: Load content with proper HTML/CSS extraction for element selection
  // STEP 1: Load content when entering edit mode
  useEffect(() => {
    if (!editMode) {
      // Clear selected element when exiting edit mode
      // setSelectedElement(null); // This state is now managed by the Editor component
    }
  }, [editMode]);

  // handleIframeLoad is no longer needed with the new approach

  const openProject = (design: SavedDesign) => {
    console.log('🎯 Opening project:', design.id, design.prompt);
    
    // Reset applied project ID to force edit reapplication
    appliedProjectId.current = null;
    
    setCurrentProject(design);
    setCurrentView('project');
    
    // 🎯 EDIT PERSISTENCE: Load project edits when opening a project
    console.log('🎯 Loaded project with edits:', design.edits?.length || 0);
    
    loadSavedDesign(design);
  };

  const handleBackToDashboard = useCallback(() => {
    console.log('🎯 Saving edits before leaving project');
    if (currentProject && currentProjectEditsRef.current.length > 0) {
      saveProjectWithEdits(currentProject.id, currentProjectEditsRef.current);
    }
    
    // Reset applied project ID so edits will be reapplied when we return
    appliedProjectId.current = null;
    
    setCurrentProject(null);
    setCurrentView('landing');
  }, [currentProject, saveProjectWithEdits]);

  const goToLanding = () => {
    // Save any pending edits before leaving
    if (currentProject && currentProjectEditsRef.current.length > 0) {
      console.log('🎯 Saving edits before leaving project');
      saveProjectWithEdits(currentProject.id, currentProjectEditsRef.current);
    }
    
    // Reset applied project ID so edits will be reapplied when we return
    appliedProjectId.current = null;
    
    setViewTransition(true);
    setTimeout(() => {
      setCurrentView('landing');
      setCurrentProject(null);
      setGeneratedResult(null);
      setEditedCode('');
      setError(null);
      setInputPrompt(''); // Clear input prompt when going back
      setViewTransition(false);
    }, 100);
  };

  // Generate two design variants in parallel
  const generateVariants = async (submittedPrompt: string) => {
    console.log('🎨 [Variants] Generating two design variations...');
    setGeneratingVariants(true);
    setShowVariantSelector(false);
    setVariantA(null);
    setVariantB(null);
    
    // Create two different prompts for variety
    const basePrompt = enhancePromptWithPremiumDesignV3(submittedPrompt.trim());
    
    const variantAPrompt = basePrompt + `\n\n**DESIGN VARIATION A - Bold & Vibrant**:
    - Use bold, saturated colors (blues, purples, vibrant gradients)
    - Modern, geometric card shapes with strong shadows
    - High contrast elements
    - Energetic, dynamic feel`;
    
    const variantBPrompt = basePrompt + `\n\n**DESIGN VARIATION B - Minimal & Elegant**:
    - Use subtle, muted colors (grays, soft pastels, gentle gradients)
    - Clean, minimal card shapes with soft shadows
    - Refined spacing and typography
    - Calm, sophisticated feel`;
    
    try {
      // Send both requests in parallel
      const [responseA, responseB] = await Promise.all([
        fetch('http://localhost:3001/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            prompt: variantAPrompt,
            model: selectedModel,
            metadata: { designSystem: 'premium', variant: 'A' }
          }),
        }),
        fetch('http://localhost:3001/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            prompt: variantBPrompt,
            model: selectedModel,
            metadata: { designSystem: 'premium', variant: 'B' }
          }),
        })
      ]);
      
      const [dataA, dataB] = await Promise.all([
        responseA.json(),
        responseB.json()
      ]);
      
      if (dataA.success && dataB.success) {
        setVariantA({
          code: dataA.code,
          prompt: submittedPrompt.trim(),
          timestamp: Date.now(),
          id: generateId()
        });
        
        setVariantB({
          code: dataB.code,
          prompt: submittedPrompt.trim(),
          timestamp: Date.now(),
          id: generateId()
        });
        
        setShowVariantSelector(true);
        console.log('✅ [Variants] Both variants generated successfully');
      } else {
        throw new Error('Variant generation failed');
      }
    } catch (err) {
      console.error('❌ [Variants] Error generating variants:', err);
      // Fall back to regular single generation
      handleSubmit(submittedPrompt);
    } finally {
      setGeneratingVariants(false);
    }
  };

  // Handle variant selection
  const handleVariantSelect = async (variant: 'A' | 'B') => {
    console.log(`🎨 [Variants] User selected Variant ${variant}`);
    const selectedVariant = variant === 'A' ? variantA : variantB;
    
    if (!selectedVariant) return;
    
    setShowVariantSelector(false);
    setGeneratedResult(selectedVariant);
    setEditedCode(selectedVariant.code);
    
    // Set view transition state first
    setViewTransition(true);
    setTimeout(() => {
      setCurrentView('editor-workspace');
      setViewTransition(false);
    }, 100);
    
    // Add to chat
    addChatMessage('user', selectedVariant.prompt);
    addChatMessage('assistant', `✅ You selected **Variant ${variant}** - ${variant === 'A' ? 'Bold & Vibrant' : 'Minimal & Elegant'} design!`);
    
    // Auto-save the selected design
    const thumbnail = await generateThumbnail(selectedVariant.code);
    const savedDesign: SavedDesign = {
      id: selectedVariant.id,
      prompt: selectedVariant.prompt,
      code: selectedVariant.code,
      timestamp: selectedVariant.timestamp,
      thumbnail: thumbnail,
      edits: [],
    };
    
    setSavedDesigns(prev => [savedDesign, ...prev]);
    addChatMessage('assistant', `Design automatically saved: "${selectedVariant.prompt}"`);
  };

  const handleSubmit = async (submittedPrompt: string, useVariants: boolean = false) => {
    if (!submittedPrompt.trim()) return;
    
    // Check if user chose to generate variants
    if (useVariants) {
      await generateVariants(submittedPrompt);
      return;
    }
    
    console.log('🔧 handleSubmit called with prompt:', submittedPrompt.trim());
    
    // 🎯 CRITICAL: Start each new project with a clean chat
    setChatMessages([]);
    
    // Enhance the user's prompt with premium design constraints
    const enhancedPrompt = enhancePromptWithPremiumDesignV3(submittedPrompt.trim());
    console.log('✨ [Prism v3] Enhanced prompt with flexible premium guidelines');
    
    // Set the main prompt state only when submitting
    setPrompt(submittedPrompt.trim());
    
    setIsLoading(true);
    setIsGenerating(true);
    setError(null);
    setGeneratedResult(null);
    setEditedCode('');
    setCurrentStep(''); // Clear current step for fresh start
    setGenerationKey(prev => prev + 1); // Force component remount
    
    // Set view transition state first
    setViewTransition(true);
    
    // Small delay to allow transition state to be set
    setTimeout(() => {
      setCurrentView('editor-workspace');
      setViewTransition(false);
    }, 100);
    
    // Add user message to chat
    addChatMessage('user', submittedPrompt.trim());
    
    // 🎯 PREMIUM: AI immediately responds with structured plan
    setTimeout(() => {
      const aiPlan = generateAIPlan(submittedPrompt.trim());
      addChatMessage('assistant', aiPlan);
      
      // 🎯 PREMIUM: Start live progress updates
      simulateLiveProgress(submittedPrompt.trim());
    }, 500);
    
    try {
      console.log('🚀 [Prism] Sending request to Claude API...');
      const response = await fetch('http://localhost:3001/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: enhancedPrompt, // Use the enhanced prompt with design constraints
          model: selectedModel,
          metadata: {
            designSystem: 'premium',
            timestamp: new Date().toISOString()
          }
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate interface');
      }

      if (data.success) {
        console.log('🔧 Generation successful, received data:', data);
        const result: GeneratedResult = {
          code: data.code,
          prompt: data.prompt,
          timestamp: Date.now(),
          id: generateId()
        };
        console.log('🔧 Setting generatedResult:', result);
        setGeneratedResult(result);
        setEditedCode(data.code);
        setIsGenerating(false);
        
        // 🎯 PREMIUM: Contextual completion message
        const completionMessage = generateCompletionMessage(data.prompt);
        addChatMessage('assistant', completionMessage, result.id);
        
        // Clear current step when generation is complete
        setCurrentStep('');
        
        // Automatically save the design
        const thumbnail = await generateThumbnail(result.code);
        const autoSavedDesign: SavedDesign = {
          id: result.id,
          prompt: result.prompt,
          code: result.code,
          timestamp: result.timestamp,
          thumbnail: thumbnail,
          edits: [], // Initialize with empty edits array
        };
        
        setSavedDesigns(prev => {
          // Check if we already have this design (by prompt)
          const existingIndex = prev.findIndex(d => d.prompt === result.prompt);
          if (existingIndex >= 0) {
            // Update existing design
            const updated = [...prev];
            updated[existingIndex] = autoSavedDesign;
            return updated;
          } else {
            // Add new design
            return [autoSavedDesign, ...prev];
          }
        });
        
        addChatMessage('assistant', `Design automatically saved: "${data.prompt}"`, result.id);
      } else {
        throw new Error('Generation failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      setIsGenerating(false);
      setCurrentStep(''); // Clear current step on error
      addChatMessage('assistant', `❌ **Error**: ${errorMessage}`);
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
      // setInputPrompt(''); // This is now handled by the LandingPage component
    }
  };

  const handleViewCode = () => {
    if (generatedResult) {
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(editedCode || generatedResult.code);
        newWindow.document.close();
      }
    }
  };

  const handleCopyCode = async () => {
    const codeToCopy = editedCode || generatedResult?.code;
    if (codeToCopy) {
      try {
        await navigator.clipboard.writeText(codeToCopy);
        addChatMessage('assistant', 'Code copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy code:', err);
      }
    }
  };

  const handleDownloadCode = async () => {
    if (!generatedResult) {
      console.error('No generated result to download');
      return;
    }

    try {
      console.log('🔧 Starting zip download for:', generatedResult.prompt);
      
      const zip = new JSZip();
      const codeToDownload = editedCode || generatedResult.code;
      
      // Parse the HTML to extract CSS and JavaScript
      const parser = new DOMParser();
      const doc = parser.parseFromString(codeToDownload, 'text/html');
      
      // Extract CSS from style elements
      const styleElements = doc.querySelectorAll('style');
      let extractedCss = '';
      styleElements.forEach(style => {
        extractedCss += style.innerHTML + '\n';
      });
      
      // Extract JavaScript from script elements
      const scriptElements = doc.querySelectorAll('script');
      let extractedJs = '';
      scriptElements.forEach(script => {
        if (script.innerHTML.trim()) {
          extractedJs += script.innerHTML + '\n';
        }
      });
      
      // Remove style and script elements from body content
      const bodyClone = doc.body ? doc.body.cloneNode(true) as HTMLElement : document.createElement('body');
      bodyClone.querySelectorAll('style, script').forEach(el => el.remove());
      const bodyContent = bodyClone.innerHTML;
      
      // Create clean HTML file
      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${generatedResult.prompt}</title>
    <link rel="stylesheet" href="styles.css">
    ${extractedJs ? '<script src="script.js"></script>' : ''}
</head>
<body>
    ${bodyContent}
</body>
</html>`;

      // Create CSS file
      const cssContent = `/* Generated by Prism AI */
/* Project: ${generatedResult.prompt} */
/* Generated: ${new Date().toLocaleDateString()} */

${extractedCss}`;

      // Create package.json for modern development
      const packageJson = {
        name: generatedResult.prompt.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        version: "1.0.0",
        description: generatedResult.prompt,
        main: "index.html",
        scripts: {
          start: "npx serve .",
          dev: "npx live-server ."
        },
        keywords: ["prism", "ai-generated", "website"],
        author: "Generated by Prism",
        license: "MIT",
        devDependencies: {
          "live-server": "^1.2.2",
          "serve": "^14.0.0"
        }
      };

      // Create README.md
      const readmeContent = `# ${generatedResult.prompt}

> Generated by **Prism AI** on ${new Date().toLocaleDateString()}

## 🚀 Quick Start

### Option 1: Open Directly
Simply open \`index.html\` in your web browser.

### Option 2: Local Development Server
\`\`\`bash
# Install dependencies
npm install

# Start development server
npm run dev
# or
npm start
\`\`\`

## 📁 File Structure

\`\`\`
├── index.html      # Main HTML file
├── styles.css      # Stylesheet
${extractedJs ? '├── script.js       # JavaScript code' : ''}
├── package.json    # Project configuration
└── README.md       # This file
\`\`\`

## 🎨 Original Prompt

"${generatedResult.prompt}"

## 🛠️ Built With

- **HTML5** - Structure and content
- **CSS3** - Styling and layout
${extractedJs ? '- **JavaScript** - Interactivity' : ''}
- **Prism AI** - Code generation

## 📄 License

MIT License - Feel free to use and modify this code.

---

*Generated with ❤️ by [Prism AI](https://prism.dev)*
`;

      // Add files to zip
      zip.file('index.html', htmlContent);
      zip.file('styles.css', cssContent);
      
      if (extractedJs.trim()) {
        const jsContent = `// Generated by Prism AI
// Project: ${generatedResult.prompt}
// Generated: ${new Date().toLocaleDateString()}

${extractedJs}`;
        zip.file('script.js', jsContent);
      }
      
      zip.file('package.json', JSON.stringify(packageJson, null, 2));
      zip.file('README.md', readmeContent);

      // Generate and download zip
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const projectName = generatedResult.prompt.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const filename = `${projectName}-prism-export.zip`;
      
      // Download the zip file
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      addChatMessage('assistant', `✅ Code downloaded as ${filename}`);
      console.log('🔧 Zip download completed successfully');
      
    } catch (error) {
      console.error('❌ Error creating zip download:', error);
      addChatMessage('assistant', '❌ Download failed. Please try again.');
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatChatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const openDesignInEditor = () => {
    if (generatedResult) {
      setViewTransition(true);
      setTimeout(() => {
        setCurrentView('editor-workspace');
        setViewTransition(false);
      }, 100);
    }
  };

                // 🎯 SIMPLE: Base44-Style Generation (Static Container + Text Animation)
  const StreamingBuilder = ({ currentStep }: { currentStep?: string }) => {
    const [displayText, setDisplayText] = useState('Generating your website...');
    
    useEffect(() => {
      // Simple text progression - only animate the text, not the container
      const textSequence = [
        'Generating your website...',
        'Analyzing requirements...',
        'Building components...',
        'Adding interactions...',
        'Optimizing design...',
        'Final refinements...',
        'Almost ready...'
      ];
      
      let currentIndex = 0;
      const interval = setInterval(() => {
        currentIndex = (currentIndex + 1) % textSequence.length;
        setDisplayText(textSequence[currentIndex]);
      }, 2000); // Change text every 2 seconds

      return () => clearInterval(interval);
    }, []); // Empty dependency array to run only once

    return (
      <div className="simple-generation-area">
        <div className="generation-logo">
          <img src="/prism-icon.png" alt="Prism" className="prism-generation-logo" />
          </div>
        
        <div className="generation-content">
          <h3 className="generation-title">Creating Your App</h3>
          <p className="generation-subtitle">This might take a few minutes</p>
          
          {/* Main progress text */}
          <div className="generation-progress">
            <div className="progress-indicator">
              <div className="progress-dot"></div>
            </div>
            <span className="progress-text">{displayText}</span>
          </div>
          
          {/* Current step from preview panel (if available) */}
          {currentStep && (
            <div className="current-detailed-step">
              <span className="step-detail">{currentStep}</span>
            </div>
          )}
        </div>
      </div>
    );
  };


  const Workspace = ({ 
    generatedResult, 
    editedCode, 
    editMode, 
    onToggleEditMode, 
    codeViewMode, 
    setCodeViewMode, 
    selectedFile, 
    setSelectedFile, 
    chatMessages, 
    isGenerating, 
    currentStep, 
    onCodeChange, 
    onSave, 
    currentViewport, 
    setCurrentViewport, 
    refreshKey, 
    currentProject, 
    addStyleEdit, 
    generateSelectorForElement, 
    appliedProjectId, 
    isPresetsPanelOpen, 
    setIsPresetsPanelOpen, 
    goToLanding, 
    handleViewportChange, 
    handleRefreshPreview, 
    isFullscreen, 
    setIsFullscreen 
  }: { 
    generatedResult: GeneratedResult | null; 
    editedCode: string; 
    editMode: boolean; 
    onToggleEditMode: () => void; 
    codeViewMode: boolean; 
    setCodeViewMode: (mode: boolean) => void; 
    selectedFile: string; 
    setSelectedFile: (file: string) => void; 
    chatMessages: ChatMessage[]; 
    isGenerating: boolean; 
    currentStep: string; 
    onCodeChange: (code: string) => void; 
    onSave: () => void; 
    currentViewport: 'desktop' | 'tablet' | 'mobile'; 
    setCurrentViewport: (viewport: 'desktop' | 'tablet' | 'mobile') => void; 
    refreshKey: number; 
    currentProject: SavedDesign | null; 
    addStyleEdit: (selector: string, property: string, value: string) => void; 
    generateSelectorForElement: (element: HTMLElement) => string; 
    appliedProjectId: React.MutableRefObject<string | null>; 
    isPresetsPanelOpen: boolean; 
    setIsPresetsPanelOpen: (open: boolean) => void; 
    goToLanding: () => void; 
    handleViewportChange: (viewport: 'desktop' | 'tablet' | 'mobile') => void; 
    handleRefreshPreview: () => void; 
    isFullscreen: boolean; 
    setIsFullscreen: (fullscreen: boolean) => void; 
  }) => {
    const [localInputPrompt, setLocalInputPrompt] = useState('');
    const [showInputMenu, setShowInputMenu] = useState(false);
    const [uploadedImage, setUploadedImage] = useState<File | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleLocalSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!localInputPrompt.trim() && !uploadedImage) return;
      
      // Handle image upload with prompt
      if (uploadedImage) {
        // For now, just include the image name in the prompt
        const imagePrompt = `${localInputPrompt.trim()} [Image: ${uploadedImage.name}]`;
        onCodeChange(imagePrompt);
        setUploadedImage(null);
      } else {
        onCodeChange(localInputPrompt);
      }
      
      setLocalInputPrompt('');
      setShowInputMenu(false);
    };

    const handleCodeChange = (filePath: string, newCode: string) => {
      // Update the generated result if editing the main App.tsx file
      if (filePath === 'src/App.tsx' && generatedResult) {
        // Create a new GeneratedResult with the updated code
        const updatedResult = {
          ...generatedResult,
          code: newCode
        };
        
        // This would trigger a re-render of the preview
        // In a real implementation, you'd want to update the parent state
        console.log('Code changed in', filePath, '- Live preview should update');
        
        // For now, we'll just log the change
        // TODO: Implement proper state management to sync with live preview
      }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.type.startsWith('image/')) {
        setUploadedImage(file);
        setShowInputMenu(false);
      }
    };

    const handleMicrophoneClick = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Speech recognition is not supported in this browser.');
        return;
      }

      try {
        setIsRecording(true);
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100
          } 
        });
        
        const mediaRecorder = new MediaRecorder(stream);
        const audioChunks: Blob[] = [];
        
        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
          // Here you would typically send the audio to a speech-to-text service
          // For now, we'll just show a placeholder
          setLocalInputPrompt('Voice input processed...');
          setIsRecording(false);
          
          // Clean up the stream
          stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.start();
        
        // Auto-stop after 30 seconds
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }, 30000);
        
        setShowInputMenu(false);
      } catch (error) {
        setIsRecording(false);
        alert('Microphone access denied or not available.');
      }
    };

    return (
      <>
        {/* Fullscreen Preview Overlay */}
        {isFullscreen && generatedResult && (
          <div className="fullscreen-overlay">
            <div className="fullscreen-header">
              <button 
                onClick={() => setIsFullscreen(false)}
                className="fullscreen-exit-btn"
                title="Exit Fullscreen (ESC)"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18"></path>
                  <path d="m6 6 12 12"></path>
                </svg>
              </button>
            </div>
            <div className="fullscreen-content">
              <LiveEditor
                generatedResult={generatedResult}
                editedCode={editedCode}
                editMode={false}
                onToggleEditMode={() => {}}
                currentViewport="desktop"
                refreshKey={refreshKey}
                currentProject={currentProject}
                addStyleEdit={addStyleEdit}
                generateSelectorForElement={generateSelectorForElement}
                appliedProjectId={appliedProjectId}
              />
            </div>
          </div>
        )}
        
        <div className="workspace-view" ref={(el) => {
          if (el) {
            console.log('🔍 workspace-view:', `height=${el.offsetHeight}px width=${el.offsetWidth}px display=${window.getComputedStyle(el).display} flexDirection=${window.getComputedStyle(el).flexDirection}`);
          }
        }}>
          <nav className="dashboard-navbar" ref={(el) => {
            if (el) {
              const rect = el.getBoundingClientRect();
              const styles = window.getComputedStyle(el);
              console.log(`🔍 NAVBAR POSITION: top=${rect.top}px left=${rect.left}px`);
              console.log(`🔍 NAVBAR SIZE: height=${rect.height}px width=${rect.width}px`);
              console.log(`🔍 NAVBAR STYLES: display=${styles.display} visibility=${styles.visibility} zIndex=${styles.zIndex}`);
              console.log(`🔍 NAVBAR BACKGROUND: ${styles.background}`);
              console.log(`🔍 NAVBAR IN VIEWPORT: ${rect.top >= 0 && rect.top < window.innerHeight}`);
              if (rect.top < 0) console.error('❌ NAVBAR IS ABOVE THE SCREEN!');
              if (rect.top > window.innerHeight) console.error('❌ NAVBAR IS BELOW THE SCREEN!');
            }
          }}>
          <div className="dashboard-navbar-left">
            <button onClick={goToLanding} className="dashboard-nav-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15,18 9,12 15,6"></polyline>
                </svg>
              <span>Home</span>
              </button>
            <span className="dashboard-project-name">
              {(() => {
                const truncated = currentProject?.prompt.substring(0, 30) + '...';
                console.log('🔍 [DEBUG] Dashboard project name:', truncated);
                return truncated;
              })()}
            </span>
            </div>
          
          {/* Viewport Controls & Refresh - Center */}
          <div className="dashboard-navbar-center">
            <div className="viewport-controls">
              <button 
                onClick={() => handleViewportChange('desktop')}
                className={`viewport-btn ${currentViewport === 'desktop' ? 'active' : ''}`}
                title="Desktop View"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="4" width="20" height="12" rx="2"></rect>
                  <path d="M2 16h20"></path>
                  <path d="M12 20v-4"></path>
                </svg>
              </button>
              <button 
                onClick={() => handleViewportChange('tablet')}
                className={`viewport-btn ${currentViewport === 'tablet' ? 'active' : ''}`}
                title="Tablet View (768px)"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="5" y="2" width="14" height="20" rx="2"></rect>
                  <path d="M12 18h.01"></path>
                </svg>
              </button>
              <button 
                onClick={() => handleViewportChange('mobile')}
                className={`viewport-btn ${currentViewport === 'mobile' ? 'active' : ''}`}
                title="Mobile View (390px)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="7" y="1" width="10" height="22" rx="2"></rect>
                  <path d="M12 18h.01"></path>
                </svg>
              </button>
              <div className="viewport-separator"></div>
              <button 
                onClick={handleRefreshPreview}
                className="refresh-btn"
                title="Refresh Preview"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                  <path d="M21 3v5h-5"></path>
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                  <path d="M3 21v-5h5"></path>
                </svg>
              </button>
              <button 
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="fullscreen-btn"
                title="Fullscreen Preview"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                </svg>
              </button>
            </div>
          </div>
          
          <div className="dashboard-navbar-right">
            <button onClick={onToggleEditMode} className={`dashboard-edit-btn ${editMode ? 'active' : ''}`}>
              {editMode ? 'Preview' : 'Edit'}
            </button>
            
            <button onClick={() => setCodeViewMode(!codeViewMode)} className={`dashboard-edit-btn ${codeViewMode ? 'active' : ''}`}>
              {codeViewMode ? 'Preview' : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="16,18 22,12 16,6"></polyline>
                  <polyline points="8,6 2,12 8,18"></polyline>
                </svg>
              )}
            </button>
            
            {/* Style Presets Button */}
            <button 
              onClick={() => setIsPresetsPanelOpen(prev => !prev)} 
              className={`dashboard-nav-btn ${isPresetsPanelOpen ? 'active' : ''}`}
              title="Style Presets"
            >
              ✨
            </button>
            <button onClick={handleDownloadCode} className="dashboard-nav-btn">
              📥 Download
            </button>
            <button className="dashboard-nav-btn">Share</button>
            <button className="dashboard-nav-btn primary">Publish</button>
          </div>
        </nav>

        <SplitPane 
          split="vertical" 
          minSize={320} 
          maxSize={650} 
          defaultSize={450}
          className="workspace-split-pane"
          pane1Style={{ background: 'rgb(20, 20, 22)' }}
          pane2Style={{ background: '#0a0a0f', borderRadius: '12px 12px 0 0' }}
        >
          <div className="workspace-sidebar">
            <div className="control-panel">
              <div className="log-container">
              {chatMessages.map((message) => (
                  <div key={message.id} className="log-entry">
                    <div className="log-icon">
                      {message.type === 'user' ? '👤' : <img src="/prism-icon.png" alt="Prism" className="chat-prism-icon" />}
                    </div>
                    <div className="log-content">
                      <div className="log-text">{message.content}</div>
                      <div className="log-time">{formatChatTime(message.timestamp)}</div>
                    </div>
                  </div>
              ))}
              {isGenerating && (
                  <div className="log-entry">
                    <div className="log-icon">
                      <img src="/prism-icon.png" alt="Prism" className="chat-prism-icon" />
                    </div>
                    <div className="log-content">
                      <div className="log-text">
                        <div className="typing-indicator"><span></span><span></span><span></span></div>
                      </div>
                    </div>
                  </div>
              )}
              </div>
              <form onSubmit={handleLocalSubmit} className="chat-input-form">
                <div className="chat-input-container">
                  <div className="input-controls">
                    <button 
                      type="button" 
                      className="input-file-button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoading}
                      title="Upload Image"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14"></path>
                        <path d="M5 12h14"></path>
                      </svg>
                    </button>
                    
                    <button 
                      type="button" 
                      className={`input-mic-button ${isRecording ? 'recording' : ''}`}
                      onClick={handleMicrophoneClick}
                      disabled={isLoading}
                      title={isRecording ? 'Recording...' : 'Voice Input'}
                    >
                      {isRecording ? (
                        <div className="recording-indicator">
                          <div className="recording-dot"></div>
                        </div>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                          <line x1="12" y1="19" x2="12" y2="23"></line>
                          <line x1="8" y1="23" x2="16" y2="23"></line>
                        </svg>
                      )}
                    </button>
                  </div>
                  
                  {uploadedImage && (
                    <div className="uploaded-image-preview">
                      <img 
                        src={URL.createObjectURL(uploadedImage)} 
                        alt="Uploaded preview" 
                        className="image-thumbnail"
                      />
                      <button 
                        type="button" 
                        className="remove-image-btn"
                        onClick={() => setUploadedImage(null)}
                      >
                        ×
                      </button>
                    </div>
                  )}
                  
                  <input
                    type="text"
                    value={localInputPrompt}
                    onChange={(e) => setLocalInputPrompt(e.target.value)}
                    placeholder="Refine your design or ask for changes..."
                    className="chat-input"
                    disabled={isLoading}
                  />
                  
                  <button type="submit" className="chat-submit-button" disabled={isLoading}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14"></path>
                      <path d="m12 5 7 7-7 7"></path>
                    </svg>
                  </button>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
              </form>
            </div>
          </div>
          <div className="workspace-main">
            {generatedResult ? (
              codeViewMode ? (
                <CodeViewer
                  generatedResult={generatedResult}
                  selectedFile={selectedFile}
                  onFileSelect={setSelectedFile}
                  onCodeChange={handleCodeChange}
                />
              ) : (
                <LiveEditor
                  generatedResult={generatedResult}
                  editedCode={editedCode}
                  editMode={editMode}
                  onToggleEditMode={onToggleEditMode}
                  currentViewport={currentViewport}
                refreshKey={refreshKey}
                currentProject={currentProject}
                addStyleEdit={addStyleEdit}
                generateSelectorForElement={generateSelectorForElement}
                appliedProjectId={appliedProjectId}
              />
            )
          ) : (
            <div className="empty-canvas">
                <StreamingBuilder key={generationKey} currentStep={currentStep} />
            </div>
          )}
          </div>
        </SplitPane>
          
          {isPresetsPanelOpen && (
            <div 
              className="properties-panel"
              style={{ 
                pointerEvents: 'auto',
                position: 'fixed',
                top: '80px',
                right: '20px',
                zIndex: 1000
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              <div className="properties-header">
                <h3>Style Presets</h3>
                <button onClick={() => setIsPresetsPanelOpen(false)} className="close-button">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              
              <div className="properties-list">
                <div className="presets-container">
                  {/* Texture & Effects Section */}
                  <div className="property-section">
                    <h4 className="section-title">Texture & Effects</h4>
                    
                    <div className="property-item">
                      <label className="property-label">Cinematic Grain</label>
                      <div className="property-input-group" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', color: '#6b7280' }}>Intensity</span>
                          <span style={{ fontSize: '13px', color: '#374151', fontWeight: '600' }}>{grainIntensity}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={grainIntensity}
                          onChange={(e) => {
                            const newValue = Number(e.target.value);
                            handleGrainChange(newValue);
                            // Update the slider track fill
                            const target = e.target as HTMLInputElement;
                            target.style.background = `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${newValue}%, rgba(0, 0, 0, 0.1) ${newValue}%, rgba(0, 0, 0, 0.1) 100%)`;
                          }}
                          className="grain-slider"
                          style={{
                            width: '100%',
                            height: '6px',
                            borderRadius: '3px',
                            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${grainIntensity}%, rgba(0, 0, 0, 0.1) ${grainIntensity}%, rgba(0, 0, 0, 0.1) 100%)`,
                            outline: 'none',
                            appearance: 'none',
                            cursor: 'pointer'
                          }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9ca3af' }}>
                          <span>No grain</span>
                          <span>Subtle</span>
                          <span>Heavy grain</span>
                        </div>
                      </div>
                    </div>

                    <div className="property-item">
                      <label className="property-label">Vignette Effect</label>
                      <div className="property-input-group" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', color: '#6b7280' }}>Intensity</span>
                          <span style={{ fontSize: '13px', color: '#374151', fontWeight: '600' }}>{vignetteIntensityRef.current}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          defaultValue={vignetteIntensityRef.current}
                          onInput={(e) => {
                            const target = e.target as HTMLInputElement;
                            const newValue = Number(target.value);
                            vignetteIntensityRef.current = newValue;
                            handleVignetteChange(newValue);
                            // Update the display value
                            const displaySpan = target.parentElement?.querySelector('span[style*="fontWeight"]');
                            if (displaySpan) displaySpan.textContent = `${newValue}%`;
                            // Update the slider track fill
                            target.style.background = `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${newValue}%, rgba(0, 0, 0, 0.1) ${newValue}%, rgba(0, 0, 0, 0.1) 100%)`;
                          }}
                          className="grain-slider"
                          style={{
                            width: '100%',
                            height: '6px',
                            borderRadius: '3px',
                            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${vignetteIntensityRef.current}%, rgba(0, 0, 0, 0.1) ${vignetteIntensityRef.current}%, rgba(0, 0, 0, 0.1) 100%)`,
                            outline: 'none',
                            appearance: 'none',
                            cursor: 'pointer'
                          }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9ca3af' }}>
                          <span>No vignette</span>
                          <span>Subtle</span>
                          <span>Heavy vignette</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Color Grading Section */}
                  <div className="property-section">
                    <h4 className="section-title">Color Grading</h4>
                    
                    <div className="property-item">
                      <label className="property-label">Color Filter</label>
                      <div className="property-input-group">
                        <select
                          value={colorFilter}
                          onChange={(e) => {
                            handleColorFilterChange(e.target.value);
                          }}
                          className="property-select"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid #d1d5db',
                            backgroundColor: '#ffffff',
                            fontSize: '14px',
                            color: '#374151'
                          }}
                        >
                          <option value="none">None</option>
                          <option value="cool-vintage">Cool Vintage</option>
                          <option value="warm-sepia">Warm Sepia</option>
                          <option value="cyberpunk-neon">Cyberpunk Neon</option>
                          <option value="noir">Film Noir</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  {/* AI Design Assistant Section */}
                  <div className="property-section">
                    <h4 className="section-title">AI Design Assistant</h4>
                    
                    <div className="property-item">
                      <button 
                        className="ai-suggestion-btn"
                        onClick={() => {
                          alert('AI Color Palette Suggestions - Coming Soon!\n\nThis feature will integrate with AI APIs to suggest harmonious color palettes based on your current design.');
                        }}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          borderRadius: '8px',
                          border: 'none',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          transition: 'transform 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                      >
                        🎨 Suggest Color Palette
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <div className={`app ${editMode ? 'edit-mode-active' : ''}`}>
      {/* Top Navigation Bar - Only visible on landing page */}
      {currentView === 'landing' && (
      <nav className="navbar">
        <div className="navbar-left">
          <div className="logo">
            <img src="/prism-icon.png" alt="Prism" className="logo-icon" />
            Prism
          </div>
        </div>
        
        <div className="navbar-center">
          <a href="#" className="nav-link">Community</a>
          <a href="#" className="nav-link">Pricing</a>
          <a href="#" className="nav-link">Enterprise</a>
          <a href="#" className="nav-link">Learn</a>
          <a href="#" className="nav-link">Launched</a>
        </div>
        
        <div className="navbar-right">
          <button className="debug-button" title="Debug">
            🎨
          </button>
          <button className="nav-button">Log in</button>
          <button className="nav-button primary">Get started</button>
        </div>
      </nav>
      )}

      {/* Main Content */}
      {currentView === 'landing' ? (
        <div className={viewTransition ? 'view-transitioning' : ''}>
          <LandingPage 
            savedDesigns={savedDesigns}
            isLoading={isLoading}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            onSubmit={handleSubmit}
            onOpenProject={openProject}
            onDeleteDesign={deleteSavedDesign}
            formatTimestamp={formatTimestamp}
            error={error}
            generationMode={generationMode}
            onGenerationModeChange={setGenerationMode}
          />
        </div>
      ) : (
        <div className={viewTransition ? 'view-transitioning' : ''}>
          <Workspace
            generatedResult={generatedResult}
            editedCode={editedCode}
            editMode={editMode}
            onToggleEditMode={handleToggleEditMode}
            codeViewMode={codeViewMode}
            setCodeViewMode={setCodeViewMode}
            selectedFile={selectedFile}
            setSelectedFile={setSelectedFile}
            chatMessages={chatMessages}
            isGenerating={isGenerating}
            currentStep={currentStep}
            onCodeChange={() => {}}
            onSave={() => {}}
            currentViewport={currentViewport}
            setCurrentViewport={setCurrentViewport}
            refreshKey={refreshKey}
            currentProject={currentProject}
            addStyleEdit={addStyleEdit}
            generateSelectorForElement={generateSelectorForElement}
            appliedProjectId={appliedProjectId}
            isPresetsPanelOpen={isPresetsPanelOpen}
            setIsPresetsPanelOpen={setIsPresetsPanelOpen}
            goToLanding={goToLanding}
            handleViewportChange={handleViewportChange}
            handleRefreshPreview={handleRefreshPreview}
            isFullscreen={isFullscreen}
            setIsFullscreen={setIsFullscreen}
          />
        </div>
      )}
      
      {/* Variant Selector Overlay */}
      {(showVariantSelector || generatingVariants) && (
        <div className="variant-selector-overlay">
          <div className="variant-selector-container">
            <div className="variant-selector-header">
              <h2>Choose Your Design Style</h2>
              <p>We've generated two design variations for you. Pick the one you like!</p>
            </div>
            
            {generatingVariants ? (
              <div className="variants-loading">
                <div className="loading-spinner"></div>
                <p>Generating two design variations...</p>
                <span className="loading-subtext">This may take a moment</span>
              </div>
            ) : (
              <div className="variants-grid">
                {/* Variant A */}
                <div className="variant-card">
                  <div className="variant-header">
                    <div className="variant-badge variant-a">Variant A</div>
                    <div className="variant-label">Bold & Vibrant</div>
                  </div>
                  <div className="variant-preview">
                    {variantA && (
                      <iframe
                        srcDoc={variantA.code}
                        className="variant-iframe"
                        title="Variant A Preview"
                        sandbox="allow-scripts"
                      />
                    )}
                  </div>
                  <div className="variant-description">
                    <p>Modern design with bold colors, strong shadows, and high contrast</p>
                  </div>
                  <button 
                    className="variant-select-btn variant-a-btn"
                    onClick={() => handleVariantSelect('A')}
                  >
                    Select This Design
                  </button>
                </div>
                
                {/* Variant B */}
                <div className="variant-card">
                  <div className="variant-header">
                    <div className="variant-badge variant-b">Variant B</div>
                    <div className="variant-label">Minimal & Elegant</div>
                  </div>
                  <div className="variant-preview">
                    {variantB && (
                      <iframe
                        srcDoc={variantB.code}
                        className="variant-iframe"
                        title="Variant B Preview"
                        sandbox="allow-scripts"
                      />
                    )}
                  </div>
                  <div className="variant-description">
                    <p>Clean design with subtle colors, soft shadows, and refined spacing</p>
                  </div>
                  <button 
                    className="variant-select-btn variant-b-btn"
                    onClick={() => handleVariantSelect('B')}
                  >
                    Select This Design
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
