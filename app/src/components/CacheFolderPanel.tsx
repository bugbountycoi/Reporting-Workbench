import { useState } from 'react'
import { requestCacheFolder } from '../cache/manager'
import { cacheConfig } from '../cache/cacheConfig'

interface Props {
  onFolderSelected: () => void
  onClose: () => void
}

export function CacheFolderPanel({ onFolderSelected, onClose }: Props) {
  const [folderSelected, setFolderSelected] = useState(cacheConfig.folderSelected)
  const [selecting, setSelecting] = useState(false)

  const handleSelectFolder = async () => {
    setSelecting(true)
    try {
      await requestCacheFolder()
      cacheConfig.folderSelected = true
      setFolderSelected(true)
      onFolderSelected()
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        console.warn('Folder selection failed:', (e as Error).message)
      }
    } finally {
      setSelecting(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-semibold text-gray-900 text-sm">Cache Folder</h2>
        <button
          onClick={onClose}
          className="text-xs text-brand-gray-mid hover:text-gray-700 transition-colors"
        >
          Hide
        </button>
      </div>

      <p className="text-xs text-brand-gray-mid leading-relaxed">
        Optional. Saves fetched API data locally so repeat report runs are instant.
      </p>

      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
        Cache files may contain sensitive vulnerability data — store on a trusted device only.
      </div>

      {folderSelected ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-green-700 text-sm font-semibold">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            Cache folder active
          </div>
          <button
            onClick={handleSelectFolder}
            disabled={selecting}
            className="text-xs text-brand-gray-mid hover:text-brand-navy underline"
          >
            Change folder
          </button>
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
