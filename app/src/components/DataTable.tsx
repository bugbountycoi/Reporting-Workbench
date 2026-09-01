import { useState, useRef, useEffect } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'

interface Props {
  columns: ColumnDef<Record<string, unknown>>[]
  data: Record<string, unknown>[]
  defaultPageSize?: number
}

// Produces page numbers with ellipsis gaps, e.g. [1, '…', 4, 5, 6, '…', 12]
function pageWindow(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '…')[] = []
  const add = (n: number | '…') => { if (pages[pages.length - 1] !== n) pages.push(n) }

  add(1)
  if (current > 3) add('…')
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) add(p)
  if (current < total - 2) add('…')
  add(total)

  return pages
}

function SortIcon({ dir }: { dir: 'asc' | 'desc' | false }) {
  if (dir === 'asc') return (
    <svg className="w-3 h-3 text-brand-blue" viewBox="0 0 12 12" fill="currentColor">
      <path d="M6 2l4 6H2z" />
    </svg>
  )
  if (dir === 'desc') return (
    <svg className="w-3 h-3 text-brand-blue" viewBox="0 0 12 12" fill="currentColor">
      <path d="M6 10L2 4h8z" />
    </svg>
  )
  return (
    <svg className="w-3 h-3 text-gray-300 group-hover:text-gray-400" viewBox="0 0 12 12" fill="currentColor">
      <path d="M6 2l3 4H3zM6 10L3 6h6z" />
    </svg>
  )
}

export function DataTable({ columns, data, defaultPageSize = 20 }: Props) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [jumpValue, setJumpValue] = useState('')
  const jumpRef = useRef<HTMLInputElement>(null)

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: defaultPageSize } },
  })

  const pageIndex = table.getState().pagination.pageIndex
  const pageCount = table.getPageCount()
  const currentPage = pageIndex + 1

  // Keep jump input in sync when page changes externally
  useEffect(() => { setJumpValue('') }, [pageIndex])

  function handleJump(e: React.FormEvent) {
    e.preventDefault()
    const n = parseInt(jumpValue, 10)
    if (!isNaN(n) && n >= 1 && n <= pageCount) {
      table.setPageIndex(n - 1)
    }
    setJumpValue('')
    jumpRef.current?.blur()
  }

  if (!data.length) return null

  const pages = pageWindow(currentPage, pageCount)

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden my-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sorted = header.column.getIsSorted()
                  return (
                    <th
                      key={header.id}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      className={`group px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide select-none ${canSort ? 'cursor-pointer hover:bg-gray-100 hover:text-gray-700' : ''}`}
                    >
                      <div className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && <SortIcon dir={sorted} />}
                      </div>
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-100">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-2.5 text-gray-700">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50">
          {/* Row count */}
          <span className="text-xs text-gray-500 shrink-0">
            {data.length.toLocaleString()} rows · page {currentPage} of {pageCount}
          </span>

          {/* Page number buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-white disabled:opacity-30 disabled:cursor-default"
              aria-label="Previous page"
            >
              ‹
            </button>

            {pages.map((p, i) =>
              p === '…' ? (
                <span key={`ellipsis-${i}`} className="px-1 text-xs text-gray-400 select-none">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => table.setPageIndex(p - 1)}
                  className={`min-w-[28px] px-1.5 py-1 text-xs border rounded transition-colors ${
                    p === currentPage
                      ? 'bg-brand-navy border-brand-navy text-white font-semibold'
                      : 'border-gray-300 hover:bg-white text-gray-700'
                  }`}
                >
                  {p}
                </button>
              )
            )}

            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-white disabled:opacity-30 disabled:cursor-default"
              aria-label="Next page"
            >
              ›
            </button>
          </div>

          {/* Jump to page */}
          <form onSubmit={handleJump} className="flex items-center gap-1.5 shrink-0">
            <label className="text-xs text-gray-500">Go to</label>
            <input
              ref={jumpRef}
              type="number"
              min={1}
              max={pageCount}
              value={jumpValue}
              onChange={(e) => setJumpValue(e.target.value)}
              placeholder={String(currentPage)}
              className="w-14 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-blue text-center"
            />
            <button
              type="submit"
              className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-white text-gray-600"
            >
              →
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
