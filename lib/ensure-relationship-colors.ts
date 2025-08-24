import { createSupabaseClient } from '@/lib/supabase/client'
import { getRelationshipColor } from './relationship-colors'

/**
 * Utility to ensure all relationships have colors assigned
 * This should be run once to fix existing relationships without colors
 */
export async function ensureAllRelationshipColors() {
  const supabase = createSupabaseClient()
  
  try {
    // Get all relationships that don't have colors or have invalid colors
    const { data: relationships, error } = await supabase
      .from('relationships')
      .select('id, partner_name, color')
      .or('color.is.null,color.eq.,color.not.like.#%')
    
    if (error) {
      console.error('Error fetching relationships:', error)
      return
    }
    
    if (!relationships || relationships.length === 0) {
      console.log('All relationships already have colors assigned')
      return
    }
    
    console.log(`Found ${relationships.length} relationships without colors`)
    
    // Update each relationship with a proper color
    for (const relationship of relationships) {
      const color = getRelationshipColor(relationship.id, relationship.partner_name)
      
      const { error: updateError } = await supabase
        .from('relationships')
        .update({ color })
        .eq('id', relationship.id)
      
      if (updateError) {
        console.error(`Error updating relationship ${relationship.id}:`, updateError)
      } else {
        console.log(`Assigned color ${color} to relationship: ${relationship.partner_name}`)
      }
    }
    
    console.log('Finished assigning colors to relationships')
  } catch (error) {
    console.error('Error ensuring relationship colors:', error)
  }
}

/**
 * Get or create a color for a specific relationship
 */
export async function getOrCreateRelationshipColor(relationshipId: string): Promise<string> {
  const supabase = createSupabaseClient()
  
  try {
    // Get the relationship
    const { data: relationship, error } = await supabase
      .from('relationships')
      .select('id, partner_name, color')
      .eq('id', relationshipId)
      .single()
    
    if (error) {
      console.error('Error fetching relationship:', error)
      return '#6B7280' // Default gray
    }
    
    if (!relationship) {
      return '#6B7280' // Default gray
    }
    
    // If relationship already has a valid color, return it
    if (relationship.color && relationship.color.startsWith('#')) {
      return relationship.color
    }
    
    // Assign a new color
    const color = getRelationshipColor(relationship.id, relationship.partner_name)
    
    // Update the relationship with the new color
    const { error: updateError } = await supabase
      .from('relationships')
      .update({ color })
      .eq('id', relationshipId)
    
    if (updateError) {
      console.error('Error updating relationship color:', updateError)
    }
    
    return color
  } catch (error) {
    console.error('Error getting relationship color:', error)
    return '#6B7280' // Default gray
  }
}
