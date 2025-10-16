import React, { useState, useRef, useEffect, useMemo, memo, useCallback } from 'react';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import SimpleEditor from './SimpleEditor';
import './App.css';

interface GeneratedResult {
  code: string;
  prompt: string;
  timestamp: number;
  id: string;
}

interface SavedDesign {
  id: string;
  prompt: string;
  code: string;
  timestamp: number;
  thumbnail?: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: number;
  designId?: string;
}

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
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
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
  };

  const handleFontChange = (property: string, value: string) => {
    selectedElement.element.style.setProperty(property, value, 'important');
    console.log(`Applied ${property}: ${value} to element`);
  };

  const handleTextChange = (value: string) => {
    selectedElement.element.textContent = value;
    console.log(`Changed text to: ${value}`);
  };

  const currentColor = window.getComputedStyle(selectedElement.element).color;
  const currentBgColor = window.getComputedStyle(selectedElement.element).backgroundColor;
  const currentFontSize = window.getComputedStyle(selectedElement.element).fontSize;
  const currentFontWeight = window.getComputedStyle(selectedElement.element).fontWeight;
  const currentText = selectedElement.element.textContent || '';

  return (
    <div className="properties-panel">
      <div className="properties-header">
        <h3>Edit Element</h3>
        <button onClick={onClose} className="close-btn">×</button>
      </div>
      
      <div className="properties-content">
        {selectedElement.type === 'text' && (
          <div className="property-group">
            <label>Text Content:</label>
            <input 
              type="text" 
              value={currentText}
              onChange={(e) => handleTextChange(e.target.value)}
              className="text-input"
            />
          </div>
        )}
        
        <div className="property-group">
          <label>Text Color:</label>
          <input 
            type="color" 
            value="#000000"
            onChange={(e) => handleColorChange('color', e.target.value)}
            className="color-input"
          />
        </div>
        
        <div className="property-group">
          <label>Background Color:</label>
          <input 
            type="color" 
            value="#ffffff"
            onChange={(e) => handleColorChange('background-color', e.target.value)}
            className="color-input"
          />
        </div>
        
        <div className="property-group">
          <label>Font Size:</label>
          <input 
            type="range" 
            min="8" 
            max="72" 
            value={parseInt(currentFontSize) || 16}
            onChange={(e) => handleFontChange('font-size', e.target.value + 'px')}
            className="range-input"
          />
          <span>{parseInt(currentFontSize) || 16}px</span>
        </div>
        
        <div className="property-group">
          <label>Font Weight:</label>
          <select 
            value={currentFontWeight}
            onChange={(e) => handleFontChange('font-weight', e.target.value)}
            className="select-input"
          >
            <option value="300">Light</option>
            <option value="400">Normal</option>
            <option value="600">Semi Bold</option>
            <option value="700">Bold</option>
            <option value="900">Black</option>
          </select>
        </div>
      </div>
    </div>
  );
};

const SimpleEditor = ({ generatedResult, editedCode, editMode, onToggleEditMode }: {
  generatedResult: GeneratedResult | null;
  editedCode: string;
  editMode: boolean;
  onToggleEditMode: () => void;
}) => {
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Check if an element is editable text
  const isTextElement = (element: HTMLElement): boolean => {
    const tagName = element.tagName.toLowerCase();
    const textTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'div', 'a', 'button', 'label'];
    return textTags.includes(tagName) && 
           element.children.length === 0 && 
           Boolean(element.textContent) && 
           (element.textContent?.trim().length || 0) > 0;
  };

  // Simple element selection for editing
  const handleElementClick = useCallback((element: HTMLElement, event: MouseEvent) => {
    event.stopPropagation();
    
    // Clear previous selections
    const prevSelected = previewContainerRef.current?.querySelectorAll('.prism-selected');
    prevSelected?.forEach(el => el.classList.remove('prism-selected'));
    
    // Mark as selected
    element.classList.add('prism-selected');
    
    // Determine element type
    const type = isTextElement(element) ? 'text' : 'container';
    
    setSelectedElement({ element, type });
    console.log('Selected element:', element.tagName, type);
  }, [isTextElement]);

  const loadPreviewContent = useCallback(() => {
    if (!previewContainerRef.current || !generatedResult || !editMode) {
      return;
    }
    
    // Clear any existing selections
    const existingSelected = previewContainerRef.current.querySelectorAll('.prism-selected');
    existingSelected.forEach(el => el.classList.remove('prism-selected'));
    
    const fullHtml = generatedResult.code;
    const parser = new DOMParser();
    const doc = parser.parseFromString(fullHtml, 'text/html');
    
    const bodyContent = doc.body.innerHTML;
    const styleElements = doc.querySelectorAll('style');
    let extractedCss = '';
    styleElements.forEach(style => {
      extractedCss += style.innerHTML + '\n';
    });
    
    previewContainerRef.current.innerHTML = '';
    
    const scopedCss = extractedCss.replace(/body/g, '[data-prism-preview-container]');

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
      .prism-selected {
        outline: rgba(59, 130, 246, 0.5) solid 2px !important;
        outline-offset: 1px !important;
      }
    `;

    if (scopedCss.trim() || resetCss) {
      const styleElement = document.createElement('style');
      styleElement.textContent = resetCss + scopedCss;
      previewContainerRef.current.appendChild(styleElement);
    }
    
    const contentWrapper = document.createElement('div');
    contentWrapper.innerHTML = bodyContent;
    previewContainerRef.current.appendChild(contentWrapper);
    
    // Add click handlers for element selection
    const contentElements = contentWrapper.querySelectorAll('*:not(script):not(style)');
    
    contentElements.forEach(element => {
      const htmlElement = element as HTMLElement;
      
      // Add hover effects
      htmlElement.addEventListener('mouseenter', () => {
        if (!htmlElement.classList.contains('prism-selected')) {
          htmlElement.style.outline = 'rgba(59, 130, 246, 0.3) solid 1px';
          htmlElement.style.outlineOffset = '1px';
        }
      });
      
      htmlElement.addEventListener('mouseleave', () => {
        if (!htmlElement.classList.contains('prism-selected')) {
          htmlElement.style.outline = '';
          htmlElement.style.outlineOffset = '';
        }
      });
      
      // Add click handler
      htmlElement.addEventListener('click', (event) => {
        handleElementClick(htmlElement, event);
      });
    });
  }, [generatedResult, editMode, handleElementClick]);

  useEffect(() => {
    if (editMode && generatedResult) {
      setTimeout(() => {
        loadPreviewContent();
      }, 100);
    }
  }, [editMode, generatedResult, loadPreviewContent]);

  const handleClosePanel = () => {
    setSelectedElement(null);
    // Clear all selections
    const selected = previewContainerRef.current?.querySelectorAll('.prism-selected');
    selected?.forEach(el => el.classList.remove('prism-selected'));
  };

  return (
    <div className="editor-container">
      {editMode ? (
        <div className="editor-layout">
          <div 
            ref={previewContainerRef}
            className="clean-preview-container"
            data-prism-preview-container
            style={{ 
              width: '100%', 
              height: '100%', 
              overflow: 'auto'
            }}
          />
          {selectedElement && (
            <PropertiesPanel 
              selectedElement={selectedElement}
              onClose={handleClosePanel}
            />
          )}
        </div>
      ) : (
        <iframe
          src={`data:text/html;charset=utf-8,${encodeURIComponent(editedCode)}`}
          className="clean-preview-container"
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Preview"
        />
      )}
    </div>
  );
};

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

// Remove duplicate PropertiesPanel - using the one defined above

  // 🎯 PANEL FIX: Prevent clicks inside panel from bubbling up and closing the panel
  const handlePanelClick = useCallback((event: React.MouseEvent) => {
    // Stop event from bubbling up to parent elements that might close the panel
    event.stopPropagation();
    console.log('🎯 Panel click captured and stopped from bubbling');
  }, []);

  // 🎯 PANEL FIX: Additional event blocking for all panel interactions
  const handlePanelEvent = useCallback((event: React.SyntheticEvent) => {
    event.stopPropagation();
    console.log('🎯 Panel event blocked:', event.type);
  }, []);

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
    'borderRadius', 'border'
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
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
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
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
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
                    
                    if (gradientData) {
                      // Render multiple color pickers for gradient
                      return (
                        <div className="gradient-color-editor">
                          <div className="gradient-colors-label">Gradient Colors:</div>
                          {gradientData.colors.map((color: string, index: number) => (
                            <div key={index} className="gradient-color-item">
                              <span className="gradient-color-index">{index + 1}</span>
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
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                              />
                              <span className="gradient-color-value">{color}</span>
                            </div>
                          ))}
                        </div>
                      );
                    } else {
                      // Regular single color picker
                      return (
                    <input
                      type="color"
                      className="color-input"
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
                    />
                      );
                    }
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
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  );
};

const Editor = ({ generatedResult, editedCode, editMode, onToggleEditMode, currentViewport, refreshKey, currentProject, applyStyleEdits, setCurrentProjectEdits, addStyleEdit, generateSelectorForElement }: {
  generatedResult: GeneratedResult | null;
  editedCode: string;
  editMode: boolean;
  onToggleEditMode: () => void;
  currentViewport?: 'desktop' | 'tablet' | 'mobile';
  refreshKey?: number;
  currentProject?: SavedDesign | null;
  applyStyleEdits?: (edits: StyleEdit[], containerElement: HTMLElement) => void;
  setCurrentProjectEdits?: (edits: StyleEdit[]) => void;
  addStyleEdit?: (selector: string, property: string, value: string) => void;
  generateSelectorForElement?: (element: HTMLElement) => string;
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

  return (
    <div ref={editorRef} className={`editor-container viewport-${currentViewport || 'desktop'}`}>
      <div className="preview-container">
        {editMode ? (
          <LivePreview
            generatedResult={generatedResult}
            editMode={editMode}
            onElementSelect={handleElementSelect}
            className="clean-preview-container"
            viewport={currentViewport}
            refreshKey={refreshKey}
            currentProject={currentProject}
            applyStyleEdits={applyStyleEdits}
            setCurrentProjectEdits={setCurrentProjectEdits}
          />
        ) : (
          <iframe
            srcDoc={editedCode || (generatedResult ? generatedResult.code : '')}
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
  error
}: {
  savedDesigns: SavedDesign[];
  isLoading: boolean;
  selectedModel: 'claude-3-5-haiku' | 'claude-4';
  onModelChange: (model: 'claude-3-5-haiku' | 'claude-4') => void;
  onSubmit: (prompt: string) => void;
  onOpenProject: (design: SavedDesign) => void;
  onDeleteDesign: (id: string) => void;
  formatTimestamp: (timestamp: number) => string;
  error: string | null;
}) => {
  const [inputPrompt, setInputPrompt] = useState('');

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim()) return;
    onSubmit(inputPrompt);
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
  const [prompt, setPrompt] = useState('');
  const [inputPrompt, setInputPrompt] = useState(''); // Separate state for input field
  const [selectedModel, setSelectedModel] = useState<'claude-3-5-haiku' | 'claude-4'>('claude-4');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<GeneratedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editedCode, setEditedCode] = useState<string>('');
  const [savedDesigns, setSavedDesigns] = useState<SavedDesign[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [viewTransition, setViewTransition] = useState(false);
  
  // Simple state for new edit mode
  const [editMode, setEditMode] = useState(false); // New state for edit mode
  
  // Viewport and preview controls
  const [currentViewport, setCurrentViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [refreshKey, setRefreshKey] = useState(0);
  
  // 🎯 PREMIUM: Current step display for preview panel
  const [currentStep, setCurrentStep] = useState<string>('');
  
  // Generation key to force component remount on new generation
  const [generationKey, setGenerationKey] = useState<number>(0);
  
  // 🎯 EDIT PERSISTENCE: Track style edits for current project
  const [currentProjectEdits, setCurrentProjectEdits] = useState<StyleEdit[]>([]);

  // Memoized callbacks to prevent re-renders
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
    
    setSavedDesigns(prev => {
      const designIndex = prev.findIndex(d => d.id === projectId);
      if (designIndex >= 0) {
        const updated = [...prev];
        updated[designIndex] = {
          ...updated[designIndex],
          edits: edits,
          timestamp: Date.now() // Update timestamp when edits are saved
        };
        
        // Don't trigger a re-render if this is the current project
        // This prevents the currentProject from being recreated
        if (currentProject && currentProject.id === projectId) {
          console.log('🎯 Updating current project edits without triggering reload');
        }
        
        return updated;
      }
      return prev;
    });
  }, [currentProject]);

  const addStyleEdit = useCallback((selector: string, property: string, value: string) => {
    const newEdit: StyleEdit = {
      selector,
      property,
      value,
      timestamp: Date.now()
    };
    
    setCurrentProjectEdits(prev => {
      // Remove any existing edit for this selector + property combination
      const filtered = prev.filter(edit => 
        !(edit.selector === selector && edit.property === property)
      );
      
      // Add the new edit
      const updated = [...filtered, newEdit];
      
      // Save to localStorage if we have a current project
      if (currentProject) {
        // Use a longer timeout and more robust debouncing to prevent rapid successive saves
        setTimeout(() => {
          // Only save if we're not in the middle of applying edits
          if (!document.querySelector('[data-prism-preview-container][data-applying-edits]')) {
            console.log('🎯 Debounced save - applying edit after delay');
            saveProjectWithEdits(currentProject.id, updated);
          } else {
            console.log('🎯 Skipping save - currently applying edits');
          }
        }, 300); // Increased from 100ms to 300ms for more stability
      }
      
      return updated;
    });
    
    console.log('🎯 Added style edit:', newEdit);
  }, [currentProject, saveProjectWithEdits]);

  const applyStyleEdits = useCallback((edits: StyleEdit[], containerElement: HTMLElement) => {
    // Early return if no edits to apply
    if (!edits || edits.length === 0) {
      console.log('🎯 No edits to apply');
      return;
    }
    
    console.log('🎯 Applying style edits:', edits.length);
    
    // Set flag to prevent saves while applying edits
    const container = containerElement.closest('[data-prism-preview-container]');
    if (container) {
      container.setAttribute('data-applying-edits', 'true');
    }
    
    // Create a Set to track which edits have been applied to prevent duplicates
    const appliedEdits = new Set<string>();
    
    edits.forEach(edit => {
      // Create a unique key for this edit to prevent duplicate application
      const editKey = `${edit.selector}-${edit.property}-${edit.value}`;
      
      if (appliedEdits.has(editKey)) {
        console.log(`🎯 Skipping duplicate edit: ${editKey}`);
        return;
      }
      
      try {
        const elements = containerElement.querySelectorAll(edit.selector);
        elements.forEach(element => {
          if (element instanceof HTMLElement) {
            if (edit.property === 'textContent') {
              element.textContent = edit.value;
            } else if (edit.property === 'pageBackground') {
              // Apply page background to container and body
              const containerEl = containerElement.closest('[data-prism-preview-container]') as HTMLElement;
              if (containerEl) {
                containerEl.style.setProperty('background', edit.value, 'important');
              }
              element.style.setProperty('background', edit.value, 'important');
            } else {
              element.style.setProperty(edit.property, edit.value, 'important');
            }
            console.log(`🎯 Applied ${edit.property}: ${edit.value} to ${edit.selector}`);
          }
        });
        
        // Mark this edit as applied
        appliedEdits.add(editKey);
      } catch (error) {
        console.warn('⚠️ Failed to apply style edit:', edit, error);
      }
    });
    
    // Clear the applying-edits flag
    if (container) {
      container.removeAttribute('data-applying-edits');
      console.log('🎯 Finished applying edits, cleared flag');
    }
  }, []);

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
    setCurrentProject(design);
    setCurrentView('project');
    
    // 🎯 EDIT PERSISTENCE: Load project edits when opening a project
    setCurrentProjectEdits(design.edits || []);
    console.log('🎯 Loaded project with edits:', design.edits?.length || 0);
    
    loadSavedDesign(design);
  };

  const goToLanding = () => {
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

  const handleSubmit = async (submittedPrompt: string) => {
    if (!submittedPrompt.trim()) return;
    
    console.log('🔧 handleSubmit called with prompt:', submittedPrompt.trim());
    
    // 🎯 CRITICAL: Start each new project with a clean chat
    setChatMessages([]);
    
    // Set the main prompt state only when submitting
    setPrompt(submittedPrompt.trim());
    
    setIsLoading(true);
    setIsGenerating(true);
    setError(null);
    setGeneratedResult(null);
    setEditedCode('');
    setCurrentStep(''); // Clear current step for fresh start
    setGenerationKey(prev => prev + 1); // Force component remount
    setCurrentProjectEdits([]); // Clear any existing edits for new project
    
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
      const response = await fetch('http://localhost:3001/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: submittedPrompt.trim(),
          model: selectedModel 
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

  // New Unified Workspace Component
  const Workspace = memo(({
  generatedResult, 
  editedCode, 
  editMode, 
    onToggleEditMode,
    chatMessages,
    isGenerating,
    isLoading,
    initialInputPrompt,
    onSubmit,
    goToLanding,
    currentProject,
    formatChatTime,
    currentViewport,
    refreshKey,
    currentStep
  }: {
    generatedResult: GeneratedResult | null;
    editedCode: string;
    editMode: boolean;
    onToggleEditMode: () => void;
    chatMessages: ChatMessage[];
    isGenerating: boolean;
    isLoading: boolean;
    initialInputPrompt: string;
    onSubmit: (prompt: string) => void;
    goToLanding: () => void;
    currentProject: SavedDesign | null;
    formatChatTime: (timestamp: number) => string;
    currentViewport?: 'desktop' | 'tablet' | 'mobile';
    refreshKey?: number;
    currentStep?: string;
  }) => {
    const [localInputPrompt, setLocalInputPrompt] = useState(initialInputPrompt);

    useEffect(() => {
      setLocalInputPrompt(initialInputPrompt);
    }, [initialInputPrompt]);

    const handleLocalSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!localInputPrompt.trim()) return;
      onSubmit(localInputPrompt);
      setLocalInputPrompt(''); // Clear after submit
    };

    return (
      <div className="workspace-view">
        <nav className="dashboard-navbar">
          <div className="dashboard-navbar-left">
            <button onClick={goToLanding} className="dashboard-nav-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15,18 9,12 15,6"></polyline>
                </svg>
              <span>Home</span>
              </button>
            <span className="dashboard-project-name">{currentProject?.prompt.substring(0, 30)}...</span>
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
            </div>
          </div>
          
          <div className="dashboard-navbar-right">
            <button onClick={onToggleEditMode} className={`dashboard-edit-btn ${editMode ? 'active' : ''}`}>
              {editMode ? 'Preview' : 'Edit'}
            </button>
            <button onClick={handleDownloadCode} className="dashboard-nav-btn">
              📥 Download
            </button>
            <button className="dashboard-nav-btn">Share</button>
            <button className="dashboard-nav-btn primary">Publish</button>
          </div>
        </nav>

        <div className="workspace-body">
          <aside className="workspace-sidebar">
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
                <input
                  type="text"
                  value={localInputPrompt}
                  onChange={(e) => setLocalInputPrompt(e.target.value)}
                  placeholder="Refine your design or ask for changes..."
                  className="chat-input"
                  disabled={isLoading}
                />
                  <button type="submit" className="chat-submit-button" disabled={isLoading}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                </button>
              </div>
            </form>
          </div>
          </aside>
          <main className="workspace-main">
          {generatedResult ? (
              <Editor
                generatedResult={generatedResult}
                editedCode={editedCode}
                editMode={editMode}
                onToggleEditMode={onToggleEditMode}
                currentViewport={currentViewport}
                refreshKey={refreshKey}
                currentProject={currentProject}
                applyStyleEdits={applyStyleEdits}
                setCurrentProjectEdits={setCurrentProjectEdits}
                addStyleEdit={addStyleEdit}
                generateSelectorForElement={generateSelectorForElement}
              />
          ) : (
            <div className="empty-canvas">
                <StreamingBuilder key={generationKey} currentStep={currentStep} />
            </div>
          )}
          </main>
      </div>
    </div>
  );
});
  Workspace.displayName = 'Workspace';


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
          />
        </div>
      ) : (
        <div className={viewTransition ? 'view-transitioning' : ''}>
          <Workspace
            generatedResult={generatedResult}
            editedCode={editedCode}
            editMode={editMode}
            onToggleEditMode={handleToggleEditMode}
            chatMessages={chatMessages}
            isGenerating={isGenerating}
            isLoading={isLoading}
            initialInputPrompt={inputPrompt}
            onSubmit={handleSubmit}
            goToLanding={goToLanding}
            currentProject={currentProject}
            formatChatTime={formatChatTime}
            currentViewport={currentViewport}
            refreshKey={refreshKey}
            currentStep={currentStep}
          />
        </div>
      )}
    </div>
  );
}

export default App;
