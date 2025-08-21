'use client'

import { useState, useMemo } from 'react'

export type SelectAllState = 'none' | 'some' | 'all'

export interface UseSelectionProps<T> {
  items: T[]
  getId: (item: T) => string
  initialSelection?: string[]
}

export interface UseSelectionReturn<T> {
  selectedIds: string[]
  selectedItems: T[]
  isSelected: (id: string) => boolean
  selectItem: (id: string) => void
  unselectItem: (id: string) => void
  toggleItem: (id: string) => void
  selectAll: () => void
  unselectAll: () => void
  selectMany: (ids: string[]) => void
  unselectMany: (ids: string[]) => void
  selectedCount: number
  totalCount: number
  selectAllState: SelectAllState
  setSelectAllState: (state: SelectAllState) => void
}

/**
 * A hook for managing selection state in lists, grids, or tables
 * 
 * @param props Configuration options
 * @returns Selection state and methods
 */
export function useSelection<T>({
  items,
  getId,
  initialSelection = []
}: UseSelectionProps<T>): UseSelectionReturn<T> {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelection)
  
  // Derive selected items from selectedIds
  const selectedItems = useMemo(() => {
    const itemMap = new Map(items.map(item => [getId(item), item]))
    return selectedIds.map(id => itemMap.get(id)).filter(Boolean) as T[]
  }, [items, selectedIds, getId])
  
  // Calculate selection state
  const selectedCount = selectedIds.length
  const totalCount = items.length
  const selectAllState: SelectAllState = useMemo(() => {
    if (selectedCount === 0) return 'none'
    if (selectedCount === totalCount) return 'all'
    return 'some'
  }, [selectedCount, totalCount])
  
  // Selection methods
  const isSelected = (id: string) => selectedIds.includes(id)
  
  const selectItem = (id: string) => {
    if (!isSelected(id)) {
      setSelectedIds(prev => [...prev, id])
    }
  }
  
  const unselectItem = (id: string) => {
    setSelectedIds(prev => prev.filter(selectedId => selectedId !== id))
  }
  
  const toggleItem = (id: string) => {
    if (isSelected(id)) {
      unselectItem(id)
    } else {
      selectItem(id)
    }
  }
  
  const selectAll = () => {
    const allIds = items.map(item => getId(item))
    setSelectedIds(allIds)
  }
  
  const unselectAll = () => {
    setSelectedIds([])
  }
  
  const selectMany = (ids: string[]) => {
    setSelectedIds(prev => {
      const newSelection = new Set([...prev])
      ids.forEach(id => newSelection.add(id))
      return Array.from(newSelection)
    })
  }
  
  const unselectMany = (ids: string[]) => {
    setSelectedIds(prev => {
      const idsToRemove = new Set(ids)
      return prev.filter(id => !idsToRemove.has(id))
    })
  }
  
  // Handle select all state changes
  const setSelectAllState = (state: SelectAllState) => {
    switch (state) {
      case 'all':
        selectAll()
        break
      case 'none':
        unselectAll()
        break
      case 'some':
        // No-op, this is a derived state
        break
    }
  }
  
  return {
    selectedIds,
    selectedItems,
    isSelected,
    selectItem,
    unselectItem,
    toggleItem,
    selectAll,
    unselectAll,
    selectMany,
    unselectMany,
    selectedCount,
    totalCount,
    selectAllState,
    setSelectAllState
  }
}
