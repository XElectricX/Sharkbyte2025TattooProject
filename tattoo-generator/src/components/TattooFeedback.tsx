// src/components/TattooFeedback.tsx
import React, { useState } from 'react'

type Props = {
  // Base64 of the currently generated tattoo
  currentImageBase64: string
  // Tattoo generation context
  style: string
  theme: string
  colorMode: string
  size: string
  // Callback to update parent state after successful alteration
  onAlterComplete: (result: { idea?: string; image_base64?: string }) => void
  // Whether to use local or remote API
  isLocal?: boolean
  apiBaseUrl?: string
  // Optional error setter from parent
  onError?: (msg: string) => void
}

const TattooFeedback: React.FC<Props> = ({
  currentImageBase64,
  style,
  theme,
  colorMode,
  size,
  onAlterComplete,
  isLocal = true,
  apiBaseUrl = '',
  onError,
}) => {
  const [feedbackText, setFeedbackText] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAlter = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentImageBase64) {
      onError?.('No tattoo available to alter.')
      return
    }
    if (!feedbackText.trim()) {
      onError?.('Please enter feedback for alteration.')
      return
    }

    setLoading(true)
    onError?.('') // clear old error

    // First, validate the base64 image data
    let base64Data = currentImageBase64
    if (base64Data.includes(',')) {
      // If it's a data URL, extract just the base64 part
      base64Data = base64Data.split(',')[1]
    } else {
      // If it's already base64, remove any data URL prefix just in case
      base64Data = base64Data.replace(/^data:image\/\w+;base64,/, '')
    }

    // Create JSON payload
    const payload = {
      feedback: feedbackText,
      style,
      theme,
      color_mode: colorMode,
      size,
      generated_image_base64: base64Data,
    }

    try {
      console.log('Debug - currentImageBase64:', currentImageBase64.substring(0, 50) + '...')
      console.log('Debug - validated base64Data:', base64Data.substring(0, 50) + '...')
      console.log('Submitting alteration with feedback:', feedbackText)
      console.log('JSON data being sent:', {
        ...payload,
        generated_image_base64: payload.generated_image_base64.substring(0, 50) + '...',
      })
      
      const url = isLocal ? '/alter-tattoo/' : `${apiBaseUrl}/alter-tattoo/`
      console.log('Debug - Request URL:', url)
      
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      
      console.log('Response status:', resp.status)
      const responseText = await resp.text()
      console.log('Debug - Full response:', responseText)
      
      if (!resp.ok) {
        console.error('Error response:', responseText)
        throw new Error(responseText)
      }

      const json = JSON.parse(responseText)

      if (json.error) {
        onError?.(String(json.error))
        return
      }

      const newResult = {
        idea: json.idea,
        image_base64: json.image_base64,
      }

      onAlterComplete(newResult)
      setFeedbackText('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      onError?.(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleAlter} className="form-card feedback-form">
      <h3>💬 Request an alteration</h3>
      <textarea
        value={feedbackText}
        onChange={(e) => setFeedbackText(e.target.value)}
        placeholder="e.g. Make the tattoo smaller and move it to the forearm"
        rows={3}
        required
      />
      <button type="submit" className="generate-btn" disabled={loading}>
        {loading ? 'Updating...' : '🔁 Apply Alteration'}
      </button>
    </form>
  )
}

export default TattooFeedback
