import React, { useState, useRef, useEffect } from 'react'
import TattooFeedback from './components/TattooFeedback'
import './App.css'
import './styles/tattoo.css'
import ImageSlider from './components/ImageSlider'
import ToggleSwitch from './components/ToggleSwitch'
import SessionGallery from './components/Gallery'
import ReferenceUploader from './components/ReferenceUploader'

// Result shape we expect from the server after generating the tattoo
// - `image_base64`: a base64-encoded PNG image we can embed in an <img>
type Result = {
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
 * - collect text inputs (style, theme, color_mode, physical_attributes)
 * - POST the data as FormData to `/generate-tattoo/`
 * - show loading, error, and the returned generated image
 */
function App() {
  // --- Local UI state ---
  // The actual File selected by the user (used when building FormData)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  // A short-lived object URL to preview the uploaded photo before sending it
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  // Reference image (optional): file + preview URL
  const [referenceFile, setReferenceFile] = useState<File | null>(null)
  const [referencePreview, setReferencePreview] = useState<string | null>(null)

  // Text inputs mirroring the original HTML form fields
  const [styleText, setStyleText] = useState('')
  const [themeText, setThemeText] = useState('')
  const [colorMode, setColorMode] = useState('')
  const [physicalAttributes, setPhysicalAttributes] = useState('')

  // Loading / result / error state
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Session gallery of all generated images in this session
  const [gallery, setGallery] = useState<Result[]>([])


  // UI toggle: when true show the slider, otherwise show simple uploaded preview.
  // Default is false so the app shows the uploaded preview by default.
  const [showSlider, setShowSlider] = useState(false)
  // Camera capture state: whether the device camera is active
  const [cameraOn, setCameraOn] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const streamRef = useRef<MediaStream | null>(null)

  // A ref to the native file input so we can clear it programmatically
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Detect environment (local vs deployed)
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

// Choose the correct API base URL
const API_URL = isLocal
  ? ''                      // local FastAPI route added when used
  : import.meta.env.VITE_API_URL || '' // deployed URL from environment

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
      // Clear the native file input's value so selecting the same file
      // again will trigger the change event. We keep the File in state
      // (setPhotoFile) so uploads still work.
      try {
        if (fileInputRef.current) fileInputRef.current.value = ''
      } catch {
        // ignore; clearing is best-effort
      }
    } else {
      // If the input was cleared, remove the preview and file refs
      setPhotoFile(null)
      setPhotoPreview(null)
    }
  }

  // Reference uploader change handler (controlled from child)
  const onReferenceChange = (file: File | null, preview: string | null) => {
    setReferenceFile(file)
    setReferencePreview(preview)
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
  if (referenceFile) form.append('reference', referenceFile)
    form.append('style', styleText)
    form.append('theme', themeText)
    form.append('color_mode', colorMode)
    form.append('physical_attributes', physicalAttributes)

    setLoading(true)
    try {
      // POST to the same path used by your template form: /generate-tattoo/
      // Note: during development you may need to change this to the full
      // backend URL or configure a proxy in Vite if the backend runs on
      // a different origin (see notes in README / next steps).
      // Use a relative path so the dev server proxy (vite) or production
      // host will route the request correctly. We set Accept: application/json
      // so the backend returns JSON for the SPA.
      const resp = await fetch(`${API_URL}/generate-tattoo/`, {
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

      // Expect JSON: either { error } or { image_base64 }
      const json = await resp.json()
      if (json.error) {
        setError(String(json.error))
      } else {
        // normalize key name because sometimes backend might send generated_image_base64
        const thisResult: Result = {
          image_base64: json.generated_image_base64 || json.image_base64,
        }
        // show latest
        setResult(thisResult)
        // add to session gallery (newest first)
        setGallery((prev) => [thisResult, ...prev])
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
    setReferenceFile(null)
    setReferencePreview(null)
    setStyleText('')
    setThemeText('')
    setColorMode('')
    setPhysicalAttributes('')
    setResult(null)
    setError(null)
    // The only reliable way to fully clear a controlled file input is to
    // reset the underlying input element's .value property.
    if (fileInputRef.current) fileInputRef.current.value = ''
    // also turn off camera if it was on
    disableCamera()
  }

  // Enable device camera and attach to video element
  const enableCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Camera not supported in this browser')
      return
    }

    try {
      // Request the camera stream first and store it. We set cameraOn=true
      // so the <video> element mounts, then attach the stream in a separate
      // effect where we can be sure the ref exists.
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      streamRef.current = stream
      setCameraOn(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(`Could not access camera: ${msg}`)
      setCameraOn(false)
    }
  }

  // Attach stream to the video element once camera is turned on and the
  // video element is mounted. This avoids trying to access videoRef before
  // the element exists (which can lead to no visible preview).
  useEffect(() => {
    const attach = async () => {
      const videoEl = videoRef.current
      const stream = streamRef.current
      if (!videoEl || !stream) return
      try {
        videoEl.srcObject = stream
        try {
          videoEl.muted = true
          videoEl.playsInline = true
        } catch (e) {
          console.debug('attach: could not set muted/playsInline', e)
        }
        // Attempt to play; some browsers will allow autoplay if muted.
        await videoEl.play()
      } catch (e) {
        console.debug('attach: video play failed', e)
      }
    }

    if (cameraOn) {
      attach()
    } else {
      // If camera turned off, ensure video element stops showing stream
      if (videoRef.current) {
        try {
          videoRef.current.pause()
          videoRef.current.srcObject = null
        } catch (e) {
          console.debug('disable: could not clear srcObject', e)
        }
      }
    }

    // cleanup not necessary here; disableCamera handles stream stop
  }, [cameraOn])

  const disableCamera = () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    } finally {
      if (videoRef.current) {
        videoRef.current.pause()
        try {
          // clear the media stream reference
          videoRef.current.srcObject = null
        } catch {
          (videoRef.current as HTMLVideoElement).srcObject = null
        }
      }
      setCameraOn(false)
    }
  }

  // Snap photo from the live video and set as the preview + file to upload
  const snapPhoto = async () => {
    if (!videoRef.current) return

    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || video.clientWidth
    canvas.height = video.videoHeight || video.clientHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    return new Promise<void>((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          setError('Failed to capture photo')
          resolve()
          return
        }

        // Create a File so it can be uploaded via FormData like a normal file
        const file = new File([blob], 'camera-snap.png', { type: blob.type })
        setPhotoFile(file)
        // Use object URL for preview
        const url = URL.createObjectURL(file)
        setPhotoPreview(url)
        // If a user had previously selected a file via the native input,
        // clear that input so re-selecting the same file later will fire
        // the change event and be accepted.
        try {
          if (fileInputRef.current) fileInputRef.current.value = ''
        } catch {
          /* ignore */
        }
        resolve()
      }, 'image/png')
    })
  }

  // cleanup on unmount
  useEffect(() => {
    return () => {
      disableCamera()
    }

  }, [])

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
          {/* Hide the native file input UI (removes the "No file chosen" text)
              and use a styled button that triggers the file picker. The input
              remains in the DOM and is triggered programmatically for best
              cross-browser behavior. */}
          <input
            id="photo"
            ref={fileInputRef}
            type="file"
            name="photo"
            accept="image/*"
            onChange={onFileChange}
            className="native-file-input-hidden"
          />
          <button type="button" className="generate-btn" onClick={() => fileInputRef.current?.click()}>
            Choose file
          </button>
          <div className="camera-toggle-bar">
            <label className="muted-text">Use camera</label>
            <ToggleSwitch
              checked={cameraOn}
              onChange={(v) => {
                if (v) enableCamera()
                else disableCamera()
              }}
              ariaLabel="Toggle camera"
            />
          </div>
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
            required={!referenceFile}
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
            required={!referenceFile}
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
            required={!referenceFile}
          />
        </div>

        <div className="form-group">
          <label htmlFor="physical_attributes">Placement / Size:</label>
          <input
            id="physical_attributes"
            type="text"
            name="physical_attributes"
            value={physicalAttributes}
            onChange={(e) => setPhysicalAttributes(e.target.value)}
            placeholder="e.g. forearm, shoulder"
            required={!referenceFile}
          />
        </div>

        {/* Reference uploader: small module that lets user attach a reference image
            used as design inspiration. It renders a preview only when present. */}
        <ReferenceUploader referenceFile={referenceFile} referencePreview={referencePreview} onChange={onReferenceChange} />

        {/* Primary action button — disabled while a request is in a flight */}
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
        {/* Camera preview (appears below the form when enabled). It does not replace
            the uploaded preview — the uploaded image remains visible until a snap
            replaces it. */}
        {cameraOn && (
          <>
            <div className="image-display preview-chrome camera-preview">
              <video ref={videoRef} playsInline autoPlay muted />
            </div>
            <div className="camera-controls">
              <button type="button" className="generate-btn" onClick={() => snapPhoto()}>
                📸 Snap
              </button>
            </div>
          </>
        )}

        {/* Uploaded preview / slider (independent from camera state) */}
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
          /* Show hint only if neither camera nor uploaded preview exists */
          !cameraOn && <p className="muted-text">Upload an image to enable the preview and before/after slider.</p>
        )}
      </section>

      {/* Server-generated result: idea text + generated image (base64). */}
      {result && (
        <section className="output">
          <h2>✨ Generated Tattoo Design</h2>
          {result.image_base64 && (
            <div className="image-display">
              {/* embed PNG image returned as base64 */}
              <img src={`data:image/png;base64,${result.image_base64}`} alt="Generated Tattoo" />
            </div>
          )}

          {/* Tattoo alteration feedback component */}
          {result?.image_base64 && (
            <TattooFeedback
              currentImageBase64={result.image_base64}
              style={styleText}
              theme={themeText}
              colorMode={colorMode}
              physicalAttributes={physicalAttributes}
              isLocal={isLocal}
              apiBaseUrl={API_URL}
              onAlterComplete={(newResult) => {
                setResult(newResult)
                setGallery((prev) => [newResult, ...prev])
              }}
              onError={(msg) => setError(msg)}
            />
          )}



        </section>
      )}

      {/* Session gallery — shows all generated tattoos from this session */}
      <SessionGallery images={gallery} />

      {/* Show server or client error messages here */}
      {error && (
        <h3 className="error">⚠️ Error: {error}</h3>
      )}
    </div>
  )
}

export default App
