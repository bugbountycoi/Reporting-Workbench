export interface PaginationState {
  pageIndex: number
  pageSize: number
}

export function paginate<T>(items: T[], state: PaginationState): T[] {
  const start = state.pageIndex * state.pageSize
  return items.slice(start, start + state.pageSize)
}

export function pageCount(total: number, pageSize: number): number {
  return Math.ceil(total / pageSize)
}
