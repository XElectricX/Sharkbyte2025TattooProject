import React, { useState } from 'react'
import styles from './TattooFeedback.module.css'

type AlterResult = {
  idea?: string
  image_base64?: string
}

type Props = {
  // base64 of the currently generated tattoo (required)
  currentImageBase64: string

  // original context so the model knows what to keep
  style: string
  theme: string
  colorMode: string
  physicalAttributes: string

  // parent will replace the current result + add to gallery
  onAlterComplete: (result: AlterResult) => void

  // was the app rendered on localhost?
  isLocal?: boolean

  // API base the parent computed (can be empty in prod if CF didn’t inject)
  apiBaseUrl?: string

  // bubble errors up to parent UI
  onError?: (msg: string) => void
}

const TattooFeedback: React.FC<Props> = ({
  currentImageBase64,
  style,
  theme,
  colorMode,
  physicalAttributes,
  onAlterComplete,
  isLocal = true,
  apiBaseUrl = '',
  onError,
}) => {
  const [feedbackText, setFeedbackText] = useState('')
  const [loading, setLoading] = useState(false)

  // normalise the base the parent gave us (remove trailing /)
  const trimmedBase = apiBaseUrl ? apiBaseUrl.replace(/\/+$/, '') : ''

  // final URL:
  // - local -> hit FastAPI directly
  // - deployed -> use parent base, or hard-fallback to your Render backend
  const alterUrl = isLocal
    ? '/alter-tattoo/'
    : `${trimmedBase || 'https://sharkbyte2025tattooproject.onrender.com'}/alter-tattoo/`

  const handleAlter = async (e: React.FormEvent) => {
    e.preventDefault()

    // basic guards
    if (!currentImageBase64) {
      onError?.('No tattoo available to alter.')
      return
    }
    if (!feedbackText.trim()) {
      onError?.('Please enter some changes first.')
      return
    }

    setLoading(true)
    onError?.('') // clear old error

    // make sure we only send raw base64 (not the data URL prefix)
    let base64Data = currentImageBase64
    if (base64Data.startsWith('data:image')) {
      base64Data = base64Data.split(',')[1]
    }

    const payload = {
      feedback: feedbackText,
      style,
      theme,
      color_mode: colorMode,
      size: physicalAttributes,
      generated_image_base64: base64Data,
    }

    try {
      const resp = await fetch(alterUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const text = await resp.text()

      if (!resp.ok) {
        onError?.(text || `Alter request failed (${resp.status})`)
        return
      }

      const json = JSON.parse(text) as AlterResult & { error?: string }
      if (json.error) {
        onError?.(json.error)
        return
      }

      onAlterComplete({
        idea: json.idea,
        image_base64: json.image_base64,
      })

      // clear box for next tweak
      setFeedbackText('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      onError?.(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleAlter} className={styles.wrapper}>
      <div className={styles.headerRow}>
        <h3 className={styles.title}>🔁 Refine this tattoo</h3>
        <p className={styles.hint}>Describe what to change — color, size, placement…</p>
      </div>

      <textarea
        className={styles.textarea}
        value={feedbackText}
        onChange={(e) => setFeedbackText(e.target.value)}
        placeholder="e.g. make the tattoo smaller and move it slightly toward the wrist"
        rows={3}
      />

      <button type="submit" className={styles.button} disabled={loading}>
        {loading ? 'Updating…' : 'Apply alteration'}
      </button>
    </form>
  )
}

export default TattooFeedback
