import React, { useState, useRef } from 'react'
import './App.css'
import './styles/tattoo.css'
import ImageSlider from './components/ImageSlider'
import ToggleSwitch from './components/ToggleSwitch'

// Result shape we expect from the server after generating the tattoo
// - `idea`: a short text description of the generated tattoo idea
// - `image_base64`: a base64-encoded PNG image we can embed in an <img>
type Result = {
  idea?: string
  image_base64?: string
}

/**
 * App — main React component for the Tattoo Generator UI.
 *
 * This component mirrors the structure and class names used in
 * `project/templates/index.html` so you can reuse the same styles
 * located in `project/static/style.css` or update `tattoo-generator/src/App.css`.
 *
 * High-level responsibilities:
 * - let the user pick a photo (file input) and preview it locally
 * - collect text inputs (style, theme, color_mode, size)
 * - POST the data as FormData to `/generate-tattoo/`
 * - show loading, error, and the returned generated image/idea
 */
function App() {
  // --- Local UI state ---
  // The actual File selected by the user (used when building FormData)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  // A short-lived object URL to preview the uploaded photo before sending it
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  // Text inputs mirroring the original HTML form fields
  const [styleText, setStyleText] = useState('')
  const [themeText, setThemeText] = useState('')
  const [colorMode, setColorMode] = useState('')
  const [sizeText, setSizeText] = useState('')

  // Loading / result / error state
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)

  // UI toggle: when true show the slider, otherwise show simple uploaded preview.
  // Default is false so the app shows the uploaded preview by default.
  const [showSlider, setShowSlider] = useState(false)

  // A ref to the native file input so we can clear it programmatically
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  /**
   * onFileChange
   * - Called when the user selects (or clears) a file in the file input.
   * - Stores the File object for upload and creates an object URL for preview.
   */
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0]
    if (f) {
      setPhotoFile(f)
      // createObjectURL returns a URL like "blob:https://..." for previewing
      setPhotoPreview(URL.createObjectURL(f))
    } else {
      // If the input was cleared, remove the preview and file refs
      setPhotoFile(null)
      setPhotoPreview(null)
    }
  }

  /**
   * handleSubmit
   * - Prevents the normal form submission
   * - Validates locally that a photo was selected
   * - Builds FormData with the photo + text inputs and POSTs to backend
   * - Handles the JSON response and surfaces errors to the user
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Clear any previous server results/errors when re-submitting
    setError(null)
    setResult(null)

    if (!photoFile) {
      // Basic client-side validation: photo is required for this flow
      setError('Please select a photo to upload.')
      return
    }

    // Build FormData matching the server form names used in your Flask app
    const form = new FormData()
    form.append('photo', photoFile)
    form.append('style', styleText)
    form.append('theme', themeText)
    form.append('color_mode', colorMode)
    form.append('size', sizeText)

    setLoading(true)
    try {
      // POST to the same path used by your template form: /generate-tattoo/
      // Note: during development you may need to change this to the full
      // backend URL or configure a proxy in Vite if the backend runs on
      // a different origin (see notes in README / next steps).
      // Use a relative path so the dev server proxy (vite) or production
      // host will route the request correctly. We set Accept: application/json
      // so the backend returns JSON for the SPA.
      const resp = await fetch('/generate-tattoo/', {
        method: 'POST',
        // Ask the server to return JSON when possible
        headers: { Accept: 'application/json' },
        body: form,
      })

      // If the server returns a non-2xx status, surface the body as an error
      if (!resp.ok) {
        const text = await resp.text()
        throw new Error(text || `Request failed with status ${resp.status}`)
      }

      // Expect JSON: either { error } or { idea, image_base64 }
      const json = await resp.json()
      if (json.error) {
        setError(String(json.error))
      } else {
        setResult({ idea: json.idea, image_base64: json.image_base64 })
      }
    } catch (err: unknown) {
      // Narrow `unknown` to Error (safe) for message extraction
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg || 'An unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  /**
   * resetForm
   * - Clears all local form state and the native file input value
   * - Useful for quick re-runs and to remove the currently selected image
   */
  const resetForm = () => {
    setPhotoFile(null)
    setPhotoPreview(null)
    setStyleText('')
    setThemeText('')
    setColorMode('')
    setSizeText('')
    setResult(null)
    setError(null)
    // The only reliable way to fully clear a controlled file input is to
    // reset the underlying input element's .value property.
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // --- Render ---
  // Uses the same markup structure and CSS class names as your original
  // server-rendered `index.html` template so styles remain consistent.
  return (
    <div className="container">
      <header>
        <h1>🖋️ AI Tattoo Designer</h1>
        <p>Upload your photo and let AI design a realistic tattoo overlay.</p>
      </header>

      {/* The form mirrors the server-side form and sends FormData via JS */}
      <form onSubmit={handleSubmit} className="form-card" encType="multipart/form-data">
        <div className="form-group">
          <label htmlFor="photo">Upload a body photo:</label>
          {/* file input: accepts images only; ref used to clear value programmatically */}
          <input
            id="photo"
            ref={fileInputRef}
            type="file"
            name="photo"
            accept="image/*"
            onChange={onFileChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="style">Style:</label>
          <input
            id="style"
            type="text"
            name="style"
            value={styleText}
            onChange={(e) => setStyleText(e.target.value)}
            placeholder="e.g. tribal, watercolor"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="theme">Theme:</label>
          <input
            id="theme"
            type="text"
            name="theme"
            value={themeText}
            onChange={(e) => setThemeText(e.target.value)}
            placeholder="e.g. phoenix, floral"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="color_mode">Color Mode:</label>
          <input
            id="color_mode"
            type="text"
            name="color_mode"
            value={colorMode}
            onChange={(e) => setColorMode(e.target.value)}
            placeholder="e.g. black-and-grey, full color"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="size">Placement / Size:</label>
          <input
            id="size"
            type="text"
            name="size"
            value={sizeText}
            onChange={(e) => setSizeText(e.target.value)}
            placeholder="e.g. forearm, shoulder"
            required
          />
        </div>

        {/* Primary action button — disabled while a request is in flight */}
        <button type="submit" className="generate-btn" disabled={loading}>
          {loading ? 'Generating...' : '🎨 Generate Tattoo'}
        </button>

        {/* Secondary action: Reset the form. Uses .reset-btn CSS added earlier. */}
        <button type="button" onClick={resetForm} className="generate-btn reset-btn">
          Reset
        </button>
      </form>

      {/* Combined preview/slider area with a toggle switch. If no photoPreview exists
          we show a helpful muted message and disable the switch. */}
      <section className="output">
        <h2>📸 Preview</h2>
        {photoPreview ? (
          <>
            <div className="preview-toggle-bar">
              <label className="muted-text">Show before / after</label>
              <ToggleSwitch checked={showSlider} onChange={setShowSlider} disabled={!photoPreview} ariaLabel="Toggle before after slider" />
            </div>

            {showSlider ? (
              <ImageSlider
                beforeSrc={photoPreview!}
                afterSrc={result?.image_base64 ? `data:image/png;base64,${result.image_base64}` : ''}
                beforeAlt="Uploaded photo"
                afterAlt="Generated tattoo"
              />
            ) : (
              <div className="image-display preview-chrome">
                <img src={photoPreview} alt="Preview" />
              </div>
            )}
          </>
        ) : (
          <p className="muted-text">Upload an image to enable the preview and before/after slider.</p>
        )}
      </section>

      {/* Server-generated result: idea text + generated image (base64). */}
      {result && (
        <section className="output">
          <h2>✨ Generated Tattoo Design</h2>
          <p>
            <strong>Idea:</strong> {result.idea}
          </p>
          {result.image_base64 && (
            <div className="image-display">
              {/* embed PNG image returned as base64 */}
              <img src={`data:image/png;base64,${result.image_base64}`} alt="Generated Tattoo" />
            </div>
          )}
        </section>
      )}

      {/* Show server or client error messages here */}
      {error && (
        <h3 className="error">⚠️ Error: {error}</h3>
      )}
    </div>
  )
}

export default App
