// Simple edit persistence system
import { useCallback, useRef, useEffect } from 'react';

interface StyleEdit {
  selector: string;
  property: string;
  value: string;
  timestamp: number;
}

export const useSimpleEditPersistence = (currentProject: any) => {
  const currentEditsRef = useRef<StyleEdit[]>([]);

  // Save edit to localStorage
  const addEdit = useCallback((selector: string, property: string, value: string) => {
    if (!currentProject?.id) return;

    const newEdit: StyleEdit = {
      selector,
      property,
      value,
      timestamp: Date.now()
    };

    // Add to current edits
    currentEditsRef.current = [...currentEditsRef.current, newEdit];
    
    // Save immediately to localStorage
    const key = `prism-edits-${currentProject.id}`;
    localStorage.setItem(key, JSON.stringify(currentEditsRef.current));

    // Apply immediately to DOM
    const contentWrapper = document.querySelector('[data-step1-content]');
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

  // Load edits when project changes
  useEffect(() => {
    if (currentProject?.id) {
      const key = `prism-edits-${currentProject.id}`;
      const saved = localStorage.getItem(key);
      
      if (saved) {
        try {
          const edits = JSON.parse(saved);
          currentEditsRef.current = edits;
          
          // Apply all saved edits
          setTimeout(() => {
            const contentWrapper = document.querySelector('[data-step1-content]');
            if (contentWrapper) {
              edits.forEach((edit: StyleEdit) => {
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
        } catch (error) {
          console.warn('Failed to load edits:', error);
        }
      } else {
        currentEditsRef.current = [];
      }
    }
  }, [currentProject?.id]);

  return { addEdit };
};
