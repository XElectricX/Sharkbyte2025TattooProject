import React from 'react'
import styles from './ImageSlider.module.css'

// Props for the ImageSlider component.
// NOTE: This is intentionally presentation-only — no interactive logic is included.
export type ImageSliderProps = {
  // URL or data URI for the "before" image
  beforeSrc: string
  // URL or data URI for the "after" image
  afterSrc: string | null
  // Accessibility strings
  beforeAlt?: string
  afterAlt?: string
  // Show small labels overlaid on each image (default: true)
  showLabels?: boolean
  // Optional className to apply to the root element
  className?: string
}

/**
 * ImageSlider (presentation-only)
 *
 * This component renders the DOM structure and CSS class hooks for a
 * before/after image slider. It intentionally contains NO interactive
 * behavior — you'll implement sliding/dragging/keyboard logic yourself.
 *
 * How to use:
 * - Supply `beforeSrc` and `afterSrc` (strings)
 * - Optionally toggle `showLabels` to display "Before" / "After" captions
 * - Add your own logic to control the overlay (for example, a `position`
 *   value 0..1 to indicate slider split) and pass it in via a wrapper or
 *   by converting this to a controlled component later.
 */
const ImageSlider: React.FC<ImageSliderProps> = ({
  beforeSrc,
  afterSrc,
  beforeAlt = 'Before image',
  afterAlt = 'After image',
  showLabels = true,
  className,
}) => {
  return (
    <div className={[styles.container, className || ''].join(' ').trim()}>
      {/*
        Structure:
        - .chrome: non-clipped wrapper that holds the visual chrome (border + glow)
        - .viewport: the clipped area used for overlay/slider logic
        - .imageWrap: contains both images stacked on top of each other
        - .afterImage is layered above .beforeImage and will be clipped/masked
          by the slider logic you implement later
        - .handle: visual handle element (no behavior attached here)
      */}
      <div className={`${styles.chrome} preview-chrome`}>
        <div className={styles.viewport}>
          <div className={styles.imageWrap}>
            <img className={styles.beforeImage} src={beforeSrc} alt={beforeAlt} />
            {/* afterSrc may be an empty string or null; guard to avoid React complaining */}
            {afterSrc ? (
              <img className={styles.afterImage} src={afterSrc} alt={afterAlt} />
            ) : null}
            {/* visual handle (positioning / drag behavior to be implemented by you) */}
            <div className={styles.handle} aria-hidden>
              <div className={styles.handleKnob} />
            </div>
          </div>

          {/* Optional labels */}
          {showLabels && (
            <div className={styles.labels}>
              <span className={styles.labelBefore}>Before</span>
              <span className={styles.labelAfter}>After</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ImageSlider
