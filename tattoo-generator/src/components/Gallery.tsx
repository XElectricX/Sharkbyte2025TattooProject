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

  // --- Render ---
  return (
    <section className="output">
      <h2>🖼️ This session’s generations</h2>

      <div className={styles.galleryGrid}>
        {images.map((img, idx) =>
          img.image_base64 ? (
            <div key={idx} className={styles.galleryItem}>
              <img
                src={`data:image/png;base64,${img.image_base64}`}
                alt={img.idea ? img.idea : `Generated ${idx + 1}`}
              />
            </div>
          ) : null
        )}
      </div>
    </section>
  )
}

export default SessionGallery
