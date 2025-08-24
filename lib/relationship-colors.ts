// Relationship color management utility
// Ensures each relationship has a unique, visually distinct color

export interface RelationshipColor {
  id: string
  name: string
  hex: string
  cssClass: string
}

// Predefined color palette for relationships
// These colors are designed to be visually distinct and accessible
export const RELATIONSHIP_COLORS: RelationshipColor[] = [
  { id: '1', name: 'Mystic Purple', hex: '#A855F7', cssClass: 'relationship-color-1' },
  { id: '2', name: 'Cosmic Orange', hex: '#F97316', cssClass: 'relationship-color-2' },
  { id: '3', name: 'Enchanted Green', hex: '#10B981', cssClass: 'relationship-color-3' },
  { id: '4', name: 'Celestial Pink', hex: '#EC4899', cssClass: 'relationship-color-4' },
  { id: '5', name: 'Deep Purple', hex: '#8B5CF6', cssClass: 'relationship-color-5' },
  { id: '6', name: 'Golden Amber', hex: '#F59E0B', cssClass: 'relationship-color-6' },
  { id: '7', name: 'Cosmic Cyan', hex: '#06B6D4', cssClass: 'relationship-color-7' },
  { id: '8', name: 'Lime Green', hex: '#84CC16', cssClass: 'relationship-color-8' },
  { id: '9', name: 'Rose Red', hex: '#F43F5E', cssClass: 'relationship-color-9' },
  { id: '10', name: 'Violet', hex: '#7C3AED', cssClass: 'relationship-color-10' },
  { id: '11', name: 'Ocean Blue', hex: '#3B82F6', cssClass: 'relationship-color-11' },
  { id: '12', name: 'Sunset Orange', hex: '#FB7185', cssClass: 'relationship-color-12' },
  { id: '13', name: 'Emerald', hex: '#059669', cssClass: 'relationship-color-13' },
  { id: '14', name: 'Indigo', hex: '#6366F1', cssClass: 'relationship-color-14' },
  { id: '15', name: 'Teal', hex: '#14B8A6', cssClass: 'relationship-color-15' },
]

/**
 * Get a color for a relationship based on its ID or name
 * Ensures consistent color assignment
 */
export function getRelationshipColor(relationshipId: string, relationshipName?: string): string {
  // Use a hash of the relationship ID to consistently assign colors
  const hash = simpleHash(relationshipId)
  const colorIndex = hash % RELATIONSHIP_COLORS.length
  return RELATIONSHIP_COLORS[colorIndex].hex
}

/**
 * Get a color for a relationship by name (for backward compatibility)
 */
export function getRelationshipColorByName(name: string): string {
  const hash = simpleHash(name)
  const colorIndex = hash % RELATIONSHIP_COLORS.length
  return RELATIONSHIP_COLORS[colorIndex].hex
}

/**
 * Get the CSS class for a relationship color
 */
export function getRelationshipColorClass(relationshipId: string): string {
  const hash = simpleHash(relationshipId)
  const colorIndex = hash % RELATIONSHIP_COLORS.length
  return RELATIONSHIP_COLORS[colorIndex].cssClass
}

/**
 * Simple hash function for consistent color assignment
 */
function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

/**
 * Ensure a relationship has a color, assign one if missing
 */
export function ensureRelationshipColor(relationship: any): string {
  if (relationship.color && relationship.color.startsWith('#')) {
    return relationship.color
  }
  
  // Assign a new color based on relationship ID or name
  const color = relationship.id 
    ? getRelationshipColor(relationship.id, relationship.partner_name)
    : getRelationshipColorByName(relationship.partner_name || 'default')
  
  return color
}

/**
 * Get all available colors for relationship selection
 */
export function getAvailableColors(): RelationshipColor[] {
  return RELATIONSHIP_COLORS
}

/**
 * Get a color by its hex value
 */
export function getColorByName(hex: string): RelationshipColor | undefined {
  return RELATIONSHIP_COLORS.find(color => color.hex.toLowerCase() === hex.toLowerCase())
}

/**
 * Create CSS custom properties for dynamic colors
 */
export function createColorStyle(color: string): React.CSSProperties {
  return {
    '--dynamic-color': color
  } as React.CSSProperties
}

/**
 * Get a contrasting text color for a background color
 */
export function getContrastColor(backgroundColor: string): string {
  // Convert hex to RGB
  const hex = backgroundColor.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  
  // Return black or white based on luminance
  return luminance > 0.5 ? '#000000' : '#FFFFFF'
}
