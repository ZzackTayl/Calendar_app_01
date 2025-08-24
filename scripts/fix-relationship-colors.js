#!/usr/bin/env node

/**
 * Script to fix relationship colors for existing data
 * Run this script to ensure all relationships have proper colors assigned
 */

const { createClient } = require('@supabase/supabase-js')

// Configuration - you'll need to set these environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:')
  console.error('NEXT_PUBLIC_SUPABASE_URL')
  console.error('SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Predefined color palette
const RELATIONSHIP_COLORS = [
  '#A855F7', // Mystic Purple
  '#F97316', // Cosmic Orange
  '#10B981', // Enchanted Green
  '#EC4899', // Celestial Pink
  '#8B5CF6', // Deep Purple
  '#F59E0B', // Golden Amber
  '#06B6D4', // Cosmic Cyan
  '#84CC16', // Lime Green
  '#F43F5E', // Rose Red
  '#7C3AED', // Violet
  '#3B82F6', // Ocean Blue
  '#FB7185', // Sunset Orange
  '#059669', // Emerald
  '#6366F1', // Indigo
  '#14B8A6', // Teal
]

// Simple hash function for consistent color assignment
function simpleHash(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

// Get a color for a relationship based on its ID or name
function getRelationshipColor(relationshipId, relationshipName) {
  const hash = simpleHash(relationshipId || relationshipName || 'default')
  const colorIndex = hash % RELATIONSHIP_COLORS.length
  return RELATIONSHIP_COLORS[colorIndex]
}

async function fixRelationshipColors() {
  try {
    console.log('🔍 Fetching relationships without colors...')
    
    // Get all relationships that don't have colors or have invalid colors
    const { data: relationships, error } = await supabase
      .from('relationships')
      .select('id, partner_name, color')
      .or('color.is.null,color.eq.,color.not.like.#%')
    
    if (error) {
      console.error('❌ Error fetching relationships:', error)
      return
    }
    
    if (!relationships || relationships.length === 0) {
      console.log('✅ All relationships already have colors assigned')
      return
    }
    
    console.log(`📊 Found ${relationships.length} relationships without colors`)
    
    // Update each relationship with a proper color
    let updatedCount = 0
    for (const relationship of relationships) {
      const color = getRelationshipColor(relationship.id, relationship.partner_name)
      
      const { error: updateError } = await supabase
        .from('relationships')
        .update({ color })
        .eq('id', relationship.id)
      
      if (updateError) {
        console.error(`❌ Error updating relationship ${relationship.id}:`, updateError)
      } else {
        console.log(`✅ Assigned color ${color} to: ${relationship.partner_name || 'Unknown'}`)
        updatedCount++
      }
    }
    
    console.log(`🎉 Finished! Updated ${updatedCount} relationships with colors`)
    
  } catch (error) {
    console.error('❌ Error fixing relationship colors:', error)
  }
}

// Run the script
if (require.main === module) {
  fixRelationshipColors()
    .then(() => {
      console.log('✨ Script completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Script failed:', error)
      process.exit(1)
    })
}

module.exports = { fixRelationshipColors }
