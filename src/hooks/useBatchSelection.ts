import { useState, useCallback, useMemo } from 'react';

export interface UseBatchSelectionReturn<T> {
  selectedIds: Set<string>;
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  toggleAll: (items: T[], getId: (item: T) => string) => void;
  selectAll: (items: T[], getId: (item: T) => string) => void;
  clearSelection: () => void;
  selectedCount: number;
  isAllSelected: (items: T[], getId: (item: T) => string) => boolean;
  isSomeSelected: (items: T[], getId: (item: T) => string) => boolean;
}

export function useBatchSelection<T>(): UseBatchSelectionReturn<T> {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  const toggle = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback((items: T[], getId: (item: T) => string) => {
    const allIds = items.map(getId);
    const allSelected = allIds.every(id => selectedIds.has(id));
    
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  }, [selectedIds]);

  const selectAll = useCallback((items: T[], getId: (item: T) => string) => {
    setSelectedIds(new Set(items.map(getId)));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectedCount = useMemo(() => selectedIds.size, [selectedIds]);

  const isAllSelected = useCallback((items: T[], getId: (item: T) => string) => {
    if (items.length === 0) return false;
    return items.every(item => selectedIds.has(getId(item)));
  }, [selectedIds]);

  const isSomeSelected = useCallback((items: T[], getId: (item: T) => string) => {
    if (items.length === 0) return false;
    const someSelected = items.some(item => selectedIds.has(getId(item)));
    const allSelected = items.every(item => selectedIds.has(getId(item)));
    return someSelected && !allSelected;
  }, [selectedIds]);

  return {
    selectedIds,
    isSelected,
    toggle,
    toggleAll,
    selectAll,
    clearSelection,
    selectedCount,
    isAllSelected,
    isSomeSelected,
  };
}
