"use client"

import { create } from "zustand"
import type { ColumnWithDeals, DealWithNotes } from "./types"

interface DealsStore {
  columns: ColumnWithDeals[]
  setColumns: (columns: ColumnWithDeals[]) => void
  activeDeal: DealWithNotes | null
  setActiveDeal: (deal: DealWithNotes | null) => void
  activeColumn: ColumnWithDeals | null
  setActiveColumn: (column: ColumnWithDeals | null) => void
  moveCard: (
    dealId: string,
    fromColId: string,
    toColId: string,
    newIndex: number
  ) => void
  moveColumn: (columnId: string, newIndex: number) => void
}

export const useDealsStore = create<DealsStore>((set) => ({
  columns: [],
  setColumns: (columns) => set({ columns }),
  activeDeal: null,
  setActiveDeal: (deal) => set({ activeDeal: deal }),
  activeColumn: null,
  setActiveColumn: (column) => set({ activeColumn: column }),
  moveCard: (dealId, fromColId, toColId, newIndex) =>
    set((state) => {
      const newColumns = structuredClone(state.columns)

      const sourceCol = newColumns.find((c) => c.id === fromColId)
      if (!sourceCol) return state
      const dealIndex = sourceCol.deals.findIndex((d) => d.id === dealId)
      if (dealIndex === -1) return state
      const [movedDeal] = sourceCol.deals.splice(dealIndex, 1)

      const targetCol = newColumns.find((c) => c.id === toColId)
      if (!targetCol) return state
      movedDeal.columnId = toColId
      targetCol.deals.splice(newIndex, 0, movedDeal)

      targetCol.deals.forEach((d, i) => {
        d.order = i
      })
      if (fromColId !== toColId) {
        sourceCol.deals.forEach((d, i) => {
          d.order = i
        })
      }

      return { columns: newColumns }
    }),
  moveColumn: (columnId, newIndex) =>
    set((state) => {
      const newColumns = [...state.columns]
      const oldIndex = newColumns.findIndex((c) => c.id === columnId)
      if (oldIndex === -1) return state
      const [movedCol] = newColumns.splice(oldIndex, 1)
      newColumns.splice(newIndex, 0, movedCol)
      newColumns.forEach((c, i) => {
        c.order = i
      })
      return { columns: newColumns }
    }),
}))
