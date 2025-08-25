# Accessibility Guide for PolyHarmony

This document outlines the accessibility features and guidelines implemented in the PolyHarmony calendar application to ensure it meets WCAG 2.1 AA standards.

## Table of Contents

1. [Overview](#overview)
2. [Keyboard Navigation](#keyboard-navigation)
3. [Screen Reader Support](#screen-reader-support)
4. [Visual Accessibility](#visual-accessibility)
5. [Mobile Accessibility](#mobile-accessibility)
6. [Testing Guidelines](#testing-guidelines)
7. [Component Guidelines](#component-guidelines)

## Overview

PolyHarmony is designed to be accessible to users with various disabilities, including:
- Visual impairments
- Motor impairments
- Hearing impairments
- Cognitive disabilities

The app follows WCAG 2.1 AA guidelines and implements best practices for web accessibility.

## Keyboard Navigation

### Skip Links
- **Skip to Main Content**: Allows keyboard users to bypass navigation and jump directly to the main content
- **Skip to Navigation**: Provides quick access to the main navigation menu

### Keyboard Shortcuts
The following keyboard shortcuts are available throughout the application:

| Shortcut | Action |
|----------|--------|
| `Alt/Cmd + H` | Go to Dashboard |
| `Alt/Cmd + C` | Go to Calendar |
| `Alt/Cmd + R` | Go to Relationships |
| `Alt/Cmd + G` | Go to Groups |
| `Alt/Cmd + S` | Go to Settings |
| `Alt/Cmd + N` | Create New Event |
| `Escape` | Go Back |
| `Alt/Cmd + ?` | Show keyboard shortcuts help |

### Focus Management
- All interactive elements are keyboard accessible
- Focus indicators are clearly visible with a 2px ring around focused elements
- Focus order follows logical document flow
- Modal dialogs trap focus appropriately

## Screen Reader Support

### ARIA Labels and Descriptions
- All interactive elements have appropriate `aria-label` attributes
- Form fields are properly labeled with associated `<label>` elements
- Error messages are announced using `aria-live="polite"`
- Required fields are marked with `aria-required="true"`

### Semantic HTML
- Proper heading hierarchy (h1, h2, h3, etc.)
- Semantic elements (`<nav>`, `<main>`, `<section>`, `<article>`)
- Lists use appropriate `<ul>`, `<ol>`, and `<li>` elements
- Tables include proper headers and captions

### Screen Reader Only Text
- Decorative elements are hidden with `aria-hidden="true"`
- Important information is available to screen readers using `.sr-only` class
- Icons have descriptive text alternatives

## Visual Accessibility

### Color and Contrast
- Text meets WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text)
- Color is not the only way to convey information
- Focus indicators are visible regardless of color vision

### Typography
- Font sizes are scalable (minimum 16px base)
- Line spacing provides adequate readability
- Font choices support good readability

### Motion and Animation
- Respects `prefers-reduced-motion` user preference
- Animations can be disabled for users with vestibular disorders
- No auto-playing content that could cause seizures

## Mobile Accessibility

### Touch Targets
- All interactive elements meet minimum 44px touch target size
- Adequate spacing between touch targets to prevent accidental activation
- Touch feedback is provided for all interactions

### Gesture Alternatives
- All gesture-based interactions have keyboard alternatives
- Swipe actions are complemented by button controls
- Pinch-to-zoom is supported for content viewing

### Mobile-Specific Features
- Mobile navigation is optimized for thumb navigation
- Form inputs are appropriately sized for mobile interaction
- Viewport settings support proper scaling

## Testing Guidelines

### Automated Testing
- Use axe-core for automated accessibility testing
- Run accessibility audits in browser developer tools
- Test with screen readers (NVDA, JAWS, VoiceOver)

### Manual Testing
- Navigate the entire app using only keyboard
- Test with screen readers enabled
- Verify color contrast ratios
- Test with different zoom levels (up to 200%)

### User Testing
- Include users with disabilities in testing sessions
- Test with various assistive technologies
- Gather feedback on accessibility barriers

## Component Guidelines

### Forms
- All form fields must have associated labels
- Error messages should be clear and actionable
- Required fields should be clearly marked
- Form validation should be announced to screen readers

### Navigation
- Navigation menus should be keyboard accessible
- Current page should be clearly indicated
- Breadcrumbs should be provided for complex navigation
- Skip links should be available for main content areas

### Modals and Dialogs
- Focus should be trapped within modal dialogs
- Escape key should close modals
- Modal content should be announced to screen readers
- Backdrop clicks should not close modals (use explicit close button)

### Images and Media
- All images should have appropriate alt text
- Decorative images should have empty alt attributes
- Video content should have captions
- Audio content should have transcripts

### Tables
- Tables should have proper headers
- Complex tables should have captions
- Data tables should be properly structured
- Responsive tables should maintain accessibility

## Implementation Examples

### Accessible Button
```tsx
<button
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
  aria-label="Create new event"
  className="focus:ring-2 focus:ring-primary focus:ring-offset-2"
>
  <Plus className="h-4 w-4" aria-hidden="true" />
  <span>Add Event</span>
</button>
```

### Accessible Form Field
```tsx
<div className="space-y-2">
  <label htmlFor="event-title" className="block text-sm font-medium">
    Event Title
    <span className="text-destructive ml-1" aria-label="required">*</span>
  </label>
  <input
    id="event-title"
    type="text"
    required
    aria-describedby={error ? 'title-error' : undefined}
    aria-invalid={!!error}
    className="focus:ring-2 focus:ring-primary"
  />
  {error && (
    <p id="title-error" className="text-destructive" role="alert">
      {error}
    </p>
  )}
</div>
```

### Accessible Navigation
```tsx
<nav role="navigation" aria-label="Main navigation">
  <ul>
    <li>
      <a 
        href="/dashboard"
        aria-current={pathname === '/dashboard' ? 'page' : undefined}
        className="focus:ring-2 focus:ring-primary"
      >
        Dashboard
      </a>
    </li>
  </ul>
</nav>
```

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Web Accessibility Initiative](https://www.w3.org/WAI/)
- [axe-core Testing Library](https://github.com/dequelabs/axe-core)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)

## Contact

For accessibility-related issues or questions, please contact the development team or create an issue in the project repository.
