import React, { useState } from 'react'
import styles from './TattooFeedback.module.css'

type TattooFeedbackProps = {
  // current tattoo image (base64, from the last generation)
  currentImageBase64: string
  // context from the original prompt
  style: string
  theme: string
  colorMode: string
  physicalAttributes: string
  // called when backend returns a new altered image
  onAlterComplete: (result: { idea?: string; image_base64?: string }) => void
  // tells us whether we’re hitting localhost or the deployed backend
  isLocal?: boolean
  // if you want to force a base URL from the parent (i.e. Cloudflare env)
  apiBaseUrl?: string
  // pass-through error setter
  onError?: (msg: string) => void
}

const TattooFeedback: React.FC<TattooFeedbackProps> = ({
  currentImageBase64,
  style,
  theme,
  colorMode,
  physicalAttributes,
  onAlterComplete,
  isLocal = true,
  apiBaseUrl,
  onError,
}) => {
  const [feedbackText, setFeedbackText] = useState('')
  const [loading, setLoading] = useState(false)

  // pick final base URL
  // - local → just call /alter-tattoo/
  // - remote → use the one passed in, or Vite’s, then trim extra slashes
  const remoteBase =
    apiBaseUrl ||
    (typeof import.meta !== 'undefined' ? import.meta.env.VITE_API_URL : '') ||
    ''
  const remoteBaseTrimmed = remoteBase.replace(/\/+$/, '')

  const endpoint = isLocal ? '/alter-tattoo/' : `${remoteBaseTrimmed}/alter-tattoo/`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentImageBase64) {
      onError?.('No tattoo available to alter.')
      return
    }
    if (!feedbackText.trim()) {
      onError?.('Please describe the change you want.')
      return
    }

    // normalize base64: remove data URL prefix if user passed full data URI
    let normalizedBase64 = currentImageBase64
    if (normalizedBase64.includes(',')) {
      normalizedBase64 = normalizedBase64.split(',')[1]
    }
    normalizedBase64 = normalizedBase64.replace(/^data:image\/\w+;base64,/, '')

    const payload = {
      feedback: feedbackText,
      style,
      theme,
      color_mode: colorMode,
      size: physicalAttributes,
      generated_image_base64: normalizedBase64,
    }

    setLoading(true)
    onError?.('')

    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const text = await resp.text()

      if (!resp.ok) {
        onError?.(text || `Alter request failed (${resp.status})`)
        return
      }

      const json = JSON.parse(text)

      if (json.error) {
        onError?.(String(json.error))
        return
      }

      onAlterComplete({
        idea: json.idea,
        image_base64: json.image_base64,
      })
      setFeedbackText('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      onError?.(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.wrapper}>
      <div className={styles.headerRow}>
        <div className={styles.title}>
          <span className={styles.emoji}>🛠️</span>
          <span>Refine this tattoo</span>
        </div>
        <button type="submit" className={styles.actionButton} disabled={loading}>
          {loading ? 'Updating…' : 'Apply change'}
        </button>
      </div>

      <p className={styles.helper}>
        Describe how you want to adjust this result. We’ll send that to the model and update the overlay.
      </p>

      <textarea
        className={styles.textarea}
        value={feedbackText}
        onChange={(e) => setFeedbackText(e.target.value)}
        placeholder="e.g. make the tattoo smaller, reduce the blue, move it higher on the forearm"
        rows={3}
      />
    </form>
  )
}

export default TattooFeedback
