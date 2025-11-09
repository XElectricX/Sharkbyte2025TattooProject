import React, { useRef } from 'react'

type Props = {
  referenceFile: File | null
  referencePreview: string | null
  onChange: (file: File | null, preview: string | null) => void
}

/**
 * ReferenceUploader
 * - Controlled component that lets the parent hold the File + preview URL.
 * - Renders a visible button to open the native file picker and shows the
 *   preview in the same visual style as other previews.
 */
const ReferenceUploader: React.FC<Props> = ({ referenceFile, referencePreview, onChange }) => {
  const refInput = useRef<HTMLInputElement | null>(null)

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0]
    if (f) {
      onChange(f, URL.createObjectURL(f))
      try {
        if (refInput.current) refInput.current.value = ''
      } catch {
        /* ignore */
      }
    }
  }

  const clear = () => {
    onChange(null, null)
  }

  return (
    <div className="ref-uploader" data-has-reference={Boolean(referenceFile)}>
      {/* native input hidden; triggered by button */}
      <input aria-label="Upload reference image" ref={refInput} type="file" accept="image/*" className="native-file-input-hidden" onChange={handleSelect} />
      {!referencePreview ? (
        <div className="ref-actions">
          <button type="button" className="generate-btn" onClick={() => refInput.current?.click()}>
            📎 Upload reference image
          </button>
        </div>
      ) : (
        <div>
          <div className="image-display preview-chrome ref-preview-gap">
            <img src={referencePreview} alt="Reference" />
          </div>
          <div className="ref-actions">
            <button type="button" className="generate-btn" onClick={() => refInput.current?.click()}>
              Replace reference
            </button>
            <button type="button" className="generate-btn reset-btn" onClick={clear}>
              Remove reference
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ReferenceUploader
