import { useRef, useState } from 'react'
import { ACCEPT_ATTR, ACCEPTED_EXTENSIONS } from '../utils/excelImport'
import type { SourceFile } from '../utils/excelWrite'

export function FileDropzone({ onFile, disabled }: { onFile: (source: SourceFile) => void; disabled?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  // Prefer the File System Access picker: its handle lets us save changes back to the file
  const chooseFile = async () => {
    if (!window.showOpenFilePicker) return inputRef.current?.click()
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'Spreadsheets', accept: { 'application/octet-stream': ACCEPTED_EXTENSIONS } }],
      })
      onFile({ file: await handle.getFile(), handle })
    } catch (e) {
      if ((e as DOMException).name !== 'AbortError') throw e
    }
  }

  return (
    <div
      className={`dropzone${dragging ? ' dragging' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={async (e) => {
        e.preventDefault()
        setDragging(false)
        const file = e.dataTransfer.files[0]
        if (!file) return
        // Must be requested synchronously, before the drop event's data is cleared
        const handlePromise = e.dataTransfer.items[0]?.getAsFileSystemHandle?.()
        const handle = await handlePromise?.catch(() => null)
        onFile({ file, handle: handle?.kind === 'file' ? (handle as FileSystemFileHandle) : undefined })
      }}
    >
      <p>Drag & drop an Excel file here, or</p>
      <button type="button" disabled={disabled} onClick={chooseFile}>
        Choose file
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFile({ file })
          e.target.value = '' // allow re-selecting the same file
        }}
      />
      <p className="muted small">Supports .xlsx, .xls, .xlsm, .xlsb, .ods, .csv</p>
    </div>
  )
}
