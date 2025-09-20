/**
 * CSP-Safe Style Utilities
 * Provides functions to set dynamic styles without violating Content Security Policy
 */

/**
 * Set CSS custom properties on an element for CSP-safe dynamic styling
 * @param element - DOM element to apply styles to
 * @param styles - Object containing CSS custom property names and values
 */
export function setCSPSafeStyles(
  element: HTMLElement | null,
  styles: Record<string, string>
): void {
  if (!element) return;

  Object.entries(styles).forEach(([property, value]) => {
    element.style.setProperty(property, value);
  });
}

/**
 * Set dynamic background color using CSS custom properties
 * @param element - DOM element to apply background color to
 * @param color - Color value (hex, rgb, hsl, etc.)
 */
export function setDynamicBackgroundColor(
  element: HTMLElement | null,
  color: string
): void {
  setCSPSafeStyles(element, { '--dynamic-bg-color': color });
}

/**
 * Set dynamic border color using CSS custom properties
 * @param element - DOM element to apply border color to
 * @param color - Color value (hex, rgb, hsl, etc.)
 */
export function setDynamicBorderColor(
  element: HTMLElement | null,
  color: string
): void {
  setCSPSafeStyles(element, { '--dynamic-border-color': color });
}

/**
 * Set dynamic text color using CSS custom properties
 * @param element - DOM element to apply text color to
 * @param color - Color value (hex, rgb, hsl, etc.)
 */
export function setDynamicTextColor(
  element: HTMLElement | null,
  color: string
): void {
  setCSPSafeStyles(element, { '--dynamic-text-color': color });
}

/**
 * Generate CSS custom properties for multiple dynamic colors
 * @param colors - Object mapping property names to color values
 * @returns Object suitable for spreading into a style prop (only contains CSS custom properties)
 */
export function generateDynamicColorStyles(
  colors: Record<string, string>
): Record<string, string> {
  const styles: Record<string, string> = {};

  Object.entries(colors).forEach(([key, value]) => {
    // Ensure property names start with --
    const propertyName = key.startsWith('--') ? key : `--${key}`;
    styles[propertyName] = value;
  });

  return styles;
}

/**
 * Hook to use dynamic colors with CSS custom properties
 * @param color - Color value
 * @returns Object with style properties for background, border, and text colors
 */
export function useDynamicColorStyles(color?: string) {
  if (!color) return {};

  return generateDynamicColorStyles({
    'dynamic-bg-color': color,
    'dynamic-border-color': color,
    'dynamic-text-color': color,
  });
}

/**
 * Generate relationship color CSS custom properties
 * @param relationshipColor - Relationship color value
 * @returns Style object with relationship color custom properties
 */
export function generateRelationshipColorStyles(relationshipColor?: string) {
  if (!relationshipColor) return {};

  return generateDynamicColorStyles({
    'relationship-color': relationshipColor,
    'dynamic-bg-color': relationshipColor,
  });
}