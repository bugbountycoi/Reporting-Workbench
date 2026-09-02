import { useState, useEffect, useCallback } from 'react'
import { requestCacheFolder, loadCacheIndex, type CacheFileEntry } from '../cache/manager'
import { cacheConfig } from '../cache/cacheConfig'
import { formatDistanceToNow } from 'date-fns'
import { safeLog } from '../utils/redaction'

interface Props {
  onFolderSelected: () => void
  onClose: () => void
}

const ENDPOINT_LABELS: Record<string, string> = {
  'programs':              'Programs',
  'program-detail':        'Program detail',
  'program-submissions':   'Submissions (per-program)',
  'submissions':           'Submissions',
  'submission-detail':     'Submission detail',
  'payouts':               'Payouts',
  'reward-requests':       'Reward requests',
  'reward-budget':         'Budget',
}

function fmtSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${bytes} B`
}

function fmtAge(ts: string) {
  try { return formatDistanceToNow(new Date(ts), { addSuffix: true }) }
  catch { return ts }
}

export function CacheFolderPanel({ onFolderSelected, onClose }: Props) {
  const [folderSelected, setFolderSelected] = useState(cacheConfig.folderSelected)
  const [selecting, setSelecting] = useState(false)
  const [index, setIndex] = useState<CacheFileEntry[]>([])
  const [loadingIndex, setLoadingIndex] = useState(false)

  const refreshIndex = useCallback(async () => {
    setLoadingIndex(true)
    try { setIndex(await loadCacheIndex()) }
    catch { setIndex([]) }
    finally { setLoadingIndex(false) }
  }, [])

  useEffect(() => {
    if (folderSelected) refreshIndex()
  }, [folderSelected, refreshIndex])

  const handleSelectFolder = async () => {
    setSelecting(true)
    try {
      await requestCacheFolder()
      cacheConfig.folderSelected = true
      setFolderSelected(true)
      onFolderSelected()
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        safeLog('warn', 'Folder selection failed:', (e as Error).message)
      }
    } finally {
      setSelecting(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-semibold text-gray-900 text-sm">Cache Folder</h2>
        <button onClick={onClose} className="text-xs text-brand-gray-mid hover:text-gray-700 transition-colors">
          Hide
        </button>
      </div>

      <p className="text-xs text-brand-gray-mid leading-relaxed">
        Optional. Saves fetched API data locally so repeat report runs are instant and reports can be run without an internet connection.
      </p>

      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
        Cache files may contain sensitive vulnerability data — store on a trusted device only.
      </div>

      {folderSelected ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-700 text-sm font-semibold">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              Cache folder active
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={refreshIndex}
                disabled={loadingIndex}
                className="text-xs text-brand-gray-mid hover:text-brand-navy transition-colors disabled:opacity-40"
              >
                {loadingIndex ? 'Refreshing…' : 'Refresh'}
              </button>
              <button
                onClick={handleSelectFolder}
                disabled={selecting}
                className="text-xs text-brand-gray-mid hover:text-brand-navy underline"
              >
                Change folder
              </button>
            </div>
          </div>

          {index.length === 0 && !loadingIndex && (
            <p className="text-xs text-brand-gray-mid italic">No cache files found in this folder.</p>
          )}

          {index.length > 0 && (
            <div className="border border-gray-100 rounded-lg overflow-hidden">
              <div className="bg-brand-near-white px-3 py-1.5 border-b border-gray-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-brand-gray-dark uppercase tracking-wide">Cached data</span>
                <span className="text-xs text-brand-gray-mid">{index.length} file{index.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="max-h-52 overflow-y-auto divide-y divide-gray-50">
                {index.map((entry) => (
                  <div key={entry.filename} className="px-3 py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">
                        {ENDPOINT_LABELS[entry.endpoint] ?? entry.endpoint}
                        {entry.scope !== 'global' && (
                          <span className="text-brand-gray-mid font-normal ml-1">· {entry.scope}</span>
                        )}
                      </p>
                      <p className="text-xs text-brand-gray-mid">{fmtAge(entry.fetchedAt)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs text-brand-gray-mid">{fmtSize(entry.sizeBytes)}</span>
                      {entry.encrypted && (
                        <span className="ml-1.5 text-xs text-brand-blue bg-blue-50 px-1 rounded">enc</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={handleSelectFolder}
          disabled={selecting}
          className="px-4 py-2 bg-brand-navy text-white rounded-lg text-sm font-semibold hover:bg-brand-navy-light disabled:opacity-50 transition-colors"
        >
          {selecting ? 'Selecting…' : 'Select cache folder…'}
        </button>
      )}
    </div>
  )
}
