import React, { useState, useRef, useEffect } from 'react'
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
  // Position 0..1 where 0 means fully showing the before image and 1 means
  // fully showing the after image. Default to showing mostly "before".
  const [position, setPosition] = useState(0.5)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const draggingRef = useRef(false)
  const handleRef = useRef<HTMLDivElement | null>(null)

  // We capture and freeze the "before" image used for the last generation
  // so that if the parent changes `beforeSrc` (user chooses a new photo)
  // the slider continues to compare the generated result against the
  // image that was used to create it until a new generation occurs.
  const [frozenBefore, setFrozenBefore] = useState<string>(beforeSrc)
  const prevAfterRef = useRef<string | null | undefined>(afterSrc)

  // When `afterSrc` transitions from falsy -> truthy (a new generated
  // image arrived) we freeze the current `beforeSrc` as the comparison
  // baseline.
  useEffect(() => {
    const prev = prevAfterRef.current
    const now = afterSrc
    if (!prev && now) {
      // new generated image; capture the before image that the parent
      // provided at the time of generation
      setFrozenBefore(beforeSrc)
    }
    prevAfterRef.current = now
  }, [afterSrc, beforeSrc])

  // Pointer handling: compute normalized position 0..1 based on clientX
  const setPosFromClientX = (clientX: number) => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    let p = (clientX - rect.left) / rect.width
    if (p < 0) p = 0
    if (p > 1) p = 1
    setPosition(p)
  }

  useEffect(() => {
    const onMouseMove = (ev: MouseEvent) => {
      if (!draggingRef.current) return
      setPosFromClientX(ev.clientX)
    }
    const onMouseUp = () => {
      draggingRef.current = false
    }
    const onTouchMove = (ev: TouchEvent) => {
      if (!draggingRef.current) return
      if (ev.touches && ev.touches[0]) setPosFromClientX(ev.touches[0].clientX)
    }
    const onTouchEnd = () => {
      draggingRef.current = false
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('touchmove', onTouchMove)
    window.addEventListener('touchend', onTouchEnd)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  // Apply the current position as a CSS variable on the root container so
  // styles can reference it without using inline JSX styles (keeps linter
  // happy while preserving dynamic updates).
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    try {
      el.style.setProperty('--slider-pos', `${position * 100}%`)
    } catch {
      /* ignore */
    }
  }, [position])

  return (
    <div ref={containerRef} className={[styles.container, className || ''].join(' ').trim()}>
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
            {/* base/before image is the frozen image (see above) */}
            <img className={styles.beforeImage} src={frozenBefore} alt={beforeAlt} />

            {/* after image is layered above and clipped via CSS clip-path so
                it is cropped rather than resized when the slider moves. */}
            {afterSrc ? (
              <img className={styles.afterImage} src={afterSrc} alt={afterAlt} />
            ) : null}

            {/* visual handle: clickable / draggable */}
            <div
              ref={handleRef}
              className={styles.handle}
              onMouseDown={(e: React.MouseEvent) => {
                e.preventDefault()
                draggingRef.current = true
              }}
              onTouchStart={(e: React.TouchEvent) => {
                draggingRef.current = true
                if (e.touches && e.touches[0]) setPosFromClientX(e.touches[0].clientX)
              }}
              onKeyDown={(e: React.KeyboardEvent) => {
                // keyboard accessibility: arrow keys nudges
                if (e.key === 'ArrowLeft') setPosition((p) => Math.max(0, p - 0.05))
                if (e.key === 'ArrowRight') setPosition((p) => Math.min(1, p + 0.05))
              }}
            >
              <div className={styles.handleKnob} />
            </div>
            {/* Offscreen range input for keyboard/screen-reader accessibility.
                It does not participate in pointer events (so it won't interfere
                with the custom drag handle), but it does allow tab/arrow control. */}
            <input
              className={styles.srRange}
              type="range"
              min={0}
              max={100}
              value={Math.round(position * 100)}
              aria-label="Image comparison"
              onChange={(e) => setPosition(e.target.valueAsNumber / 100)}
            />
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
