import { useEffect, useRef } from 'react';

interface UseFocusManagementOptions {
  trapFocus?: boolean;
  returnFocus?: boolean;
  initialFocus?: HTMLElement | null;
  onFocusChange?: (element: HTMLElement | null) => void;
}

export const useFocusManagement = ({
  trapFocus = false,
  returnFocus = false,
  initialFocus = null,
  onFocusChange,
}: UseFocusManagementOptions = {}) => {
  const containerRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Store the previously focused element
    if (returnFocus) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }

    // Set initial focus
    if (initialFocus) {
      initialFocus.focus();
    } else {
      // Find the first focusable element
      const focusableElements = containerRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
      }
    }

    // Focus trap
    if (trapFocus) {
      const handleFocusTrap = (event: FocusEvent) => {
        if (!containerRef.current?.contains(event.target as Node)) {
          event.preventDefault();
          const focusableElements = containerRef.current?.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusableElements?.length) {
            (focusableElements[0] as HTMLElement).focus();
          }
        }
      };

      document.addEventListener('focusin', handleFocusTrap);
      return () => {
        document.removeEventListener('focusin', handleFocusTrap);
        // Restore focus
        if (returnFocus && previousFocusRef.current) {
          previousFocusRef.current.focus();
        }
      };
    }

    // Cleanup
    return () => {
      if (returnFocus && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [trapFocus, returnFocus, initialFocus]);

  // Focus change handler
  useEffect(() => {
    if (!onFocusChange) return;

    const handleFocusChange = (event: FocusEvent) => {
      if (containerRef.current?.contains(event.target as Node)) {
        onFocusChange(event.target as HTMLElement);
      }
    };

    document.addEventListener('focusin', handleFocusChange);
    return () => {
      document.removeEventListener('focusin', handleFocusChange);
    };
  }, [onFocusChange]);

  return containerRef;
}; 