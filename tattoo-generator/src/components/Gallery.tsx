import { useState } from 'react'
import styles from './Gallery.module.css'

/**
 * SessionGallery — displays all generated tattoo images from the current session.
 *
 * - Receives an array of Result objects ({ idea?, image_base64? }) from the parent.
 * - Renders thumbnails in a consistent grid layout.
 * - Matches the same code and comment style as App.tsx.
 */

/** Shape of each generated result passed in from App.tsx */
type Result = {
  idea?: string
  image_base64?: string
}

/** Props accepted by SessionGallery */
type SessionGalleryProps = {
  images: Result[]
}

function SessionGallery({ images }: SessionGalleryProps) {
  // --- Early return if there are no images ---
  if (!images || images.length === 0) return null

  // Keep track of which images are currently selected (by index)
  const [selected, setSelected] = useState<Set<number>>(new Set())

  /**
   * toggleSelection
   * - toggles an image index in/out of the selected set
   */
  const toggleSelection = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) {
        next.delete(idx)
      } else {
        next.add(idx)
      }
      return next
    })
  }

  /**
   * downloadSelected
   * - for each selected image, creates a temporary link and triggers a download
   * - mobile browsers will usually prompt the user to save/open
   * - we name files like "tattoo-1.png", "tattoo-2.png", ...
   */
  const downloadSelected = () => {
    // no-op if nothing selected
    if (selected.size === 0) return

    selected.forEach((idx) => {
      const img = images[idx]
      if (!img?.image_base64) return

      // convert base64 -> blob -> downloadable link
      const byteString = atob(img.image_base64)
      const arrayBuffer = new ArrayBuffer(byteString.length)
      const intArray = new Uint8Array(arrayBuffer)
      for (let i = 0; i < byteString.length; i++) {
        intArray[i] = byteString.charCodeAt(i)
      }
      const blob = new Blob([intArray], { type: 'image/png' })
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = `tattoo-${idx + 1}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      // cleanup
      URL.revokeObjectURL(url)
    })
  }

  return (
    <section className="output">
      <div className={styles.galleryHeader}>
        <h2>🖼️ This session’s generations</h2>
        <button
          type="button"
          className={styles.downloadBtn}
          onClick={downloadSelected}
          disabled={selected.size === 0}
        >
          Download selected ({selected.size})
        </button>
      </div>

      {/* Use CSS module grid layout for thumbnails */}
      <div className={styles.galleryGrid}>
        {images.map((img, idx) =>
          img.image_base64 ? (
            <button
              key={idx}
              type="button"
              onClick={() => toggleSelection(idx)}
              className={`${styles.galleryItem} ${selected.has(idx) ? styles.selected : ''}`}
            >
              {/* selection indicator */}
              <span className={styles.checkDot} aria-hidden />
              <img
                src={`data:image/png;base64,${img.image_base64}`}
                alt={img.idea ? img.idea : `Generated ${idx + 1}`}
              />
            </button>
          ) : null
        )}
      </div>
    </section>
  )
}

export default SessionGallery