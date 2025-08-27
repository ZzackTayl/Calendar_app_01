'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface KeyboardNavigationProps {
  children: React.ReactNode;
}

export function KeyboardNavigation({ children }: KeyboardNavigationProps) {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle keyboard shortcuts when not typing in input fields
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement || 
          event.target instanceof HTMLSelectElement) {
        return;
      }

      // Alt/Cmd + key combinations
      if (event.altKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 'h':
          case '1':
            event.preventDefault();
            router.push('/dashboard');
            break;
          case 'c':
          case '2':
            event.preventDefault();
            router.push('/calendar');
            break;
          case 'r':
          case '3':
            event.preventDefault();
            router.push('/relationships');
            break;
          case 'g':
          case '4':
            event.preventDefault();
            router.push('/groups');
            break;
          case 's':
          case '5':
            event.preventDefault();
            router.push('/settings');
            break;
          case 'n':
            event.preventDefault();
            router.push('/events/create');
            break;
          case '?':
            event.preventDefault();
            showKeyboardShortcuts();
            break;
        }
      }

      // Escape key to go back
      if (event.key === 'Escape') {
        if (window.history.length > 1) {
          router.back();
        }
      }
    };

    const showKeyboardShortcuts = () => {
      const shortcuts = [
        { key: 'Alt/Cmd + H', description: 'Go to Dashboard' },
        { key: 'Alt/Cmd + C', description: 'Go to Calendar' },
        { key: 'Alt/Cmd + R', description: 'Go to Relationships' },
        { key: 'Alt/Cmd + G', description: 'Go to Groups' },
        { key: 'Alt/Cmd + S', description: 'Go to Settings' },
        { key: 'Alt/Cmd + N', description: 'Create New Event' },
        { key: 'Escape', description: 'Go Back' },
        { key: 'Alt/Cmd + ?', description: 'Show this help' },
      ];

      const helpText = shortcuts
        .map(({ key, description }) => `${key}: ${description}`)
        .join('\n');

      // Show keyboard shortcuts in a toast or alert
      if (typeof window !== 'undefined') {
        alert(`Keyboard Shortcuts:\n\n${helpText}`);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [router]);

  return <>{children}</>;
}

// Keyboard shortcuts help component
export function KeyboardShortcutsHelp() {
  const shortcuts = [
    { key: 'Alt/Cmd + H', description: 'Go to Dashboard' },
    { key: 'Alt/Cmd + C', description: 'Go to Calendar' },
    { key: 'Alt/Cmd + R', description: 'Go to Relationships' },
    { key: 'Alt/Cmd + G', description: 'Go to Groups' },
    { key: 'Alt/Cmd + S', description: 'Go to Settings' },
    { key: 'Alt/Cmd + N', description: 'Create New Event' },
    { key: 'Escape', description: 'Go Back' },
  ];

  return (
    <div className="p-4 bg-card border rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold mb-3">Keyboard Shortcuts</h3>
      <div className="space-y-2">
        {shortcuts.map(({ key, description }) => (
          <div key={key} className="flex justify-between items-center">
            <kbd className="px-2 py-1 bg-muted rounded text-sm font-mono">
              {key}
            </kbd>
            <span className="text-sm text-muted-foreground">{description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
