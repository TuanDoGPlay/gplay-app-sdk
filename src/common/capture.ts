import type { CaptureAndShareOptions, SlideshowVideoDeps, SlideshowVideoOptions } from '@/types'
import { toJpeg, toPng } from 'html-to-image'
import { nextTick } from 'vue'

export async function captureImage(opts: CaptureAndShareOptions = {}): Promise<string> {
  const {
    elementId = 'capture-area',
    pixelRatio = Math.max(3, window.devicePixelRatio || 3),
    shouldIgnoreAttr = 'data-html2canvas-ignore',
  } = opts

  const element = document.getElementById(elementId) as HTMLElement | null
  if (!element) throw new Error(`Không tìm thấy element: #${elementId}`)

  // Đợi font load xong
  // @ts-ignore
  if (document.fonts?.ready) await (document as any).fonts.ready

  return await toPng(element, {
    pixelRatio,
    cacheBust: true,
    quality: 1,
    skipFonts: false,
    filter: (node) => {
      if (!(node instanceof HTMLElement)) return true
      return node.getAttribute(shouldIgnoreAttr) !== 'true'
    },
  })
}

// =======================
// HELPERS
// =======================

function waitNextFrame(): Promise<number> {
  return new Promise((resolve) => requestAnimationFrame(resolve))
}

async function waitFrames(count = 2) {
  for (let i = 0; i < count; i++) await waitNextFrame()
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function waitForAllImages(root: HTMLElement) {
  const imgs = Array.from(root.querySelectorAll('img')) as HTMLImageElement[]
  await Promise.all(
    imgs.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve()
      return new Promise<void>((res) => {
        img.onload = () => res()
        img.onerror = () => res()
      })
    }),
  )
}

async function loadImageFromUrl(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = (e) => reject(new Error(`Failed to load image: ${e}`))
    img.src = src
  })
}

function drawImageCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const iw = img.naturalWidth || img.width
  const ih = img.naturalHeight || img.height
  const scale = Math.max(w / iw, h / ih)
  const dw = iw * scale
  const dh = ih * scale
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh)
}

function findCaptureElement(comp: any, selector: string): HTMLElement {
  const rootEl: HTMLElement | null = comp?.$el ?? null
  if (!rootEl) throw new Error('captureRef.$el is not available')
  return (rootEl.querySelector?.(selector) as HTMLElement | null) ?? rootEl
}

function getSupportedMimeType(): string {
  const types = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4']
  if (typeof MediaRecorder === 'undefined') return ''
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t
  }
  return ''
}

function getExtension(mime: string): string {
  if (mime.includes('mp4')) return 'mp4'
  if (mime.includes('webm')) return 'webm'
  return 'webm'
}

// =======================
// PHASE 1: Capture all slides as images
// =======================
async function captureAllSlides(
  deps: SlideshowVideoDeps,
  opts: {
    totalSlides: number
    quality: number
    pixelRatio: number
    captureSelector: string
    ignoreAttr: string
    captureTimeoutMs: number
  },
): Promise<HTMLImageElement[]> {
  const { totalSlides, quality, pixelRatio, captureSelector, ignoreAttr, captureTimeoutMs } = opts
  const comp = deps.captureRef.value
  if (!comp) throw new Error('captureRef is not ready')

  const images: HTMLImageElement[] = []

  for (let i = 0; i < totalSlides; i++) {
    deps.onProgress?.(i + 1, totalSlides)

    // Set slide content and wait for render
    await deps.setSlide(i)
    await nextTick()
    await waitFrames(3)

    const el = findCaptureElement(comp, captureSelector)

    // Wait for fonts & images inside the element
    try {
      await document.fonts?.ready
    } catch { }
    await waitForAllImages(el)
    await waitFrames(2)

    // Capture the element as JPEG data URL
    const capturePromise = toJpeg(el, {
      quality,
      pixelRatio,
      cacheBust: true,
      skipFonts: false,
      filter: (node) => {
        if (!(node instanceof HTMLElement)) return true
        return node.getAttribute(ignoreAttr) !== 'true'
      },
    })

    // Apply timeout
    const dataUrl = await Promise.race([
      capturePromise,
      sleep(captureTimeoutMs).then(() => {
        throw new Error(`Capture timeout for slide ${i + 1} after ${captureTimeoutMs}ms`)
      }),
    ])

    const img = await loadImageFromUrl(dataUrl)
    images.push(img)

    // Small pause to let GC/rendering breathe
    await sleep(50)
  }

  return images
}

// =======================
// PHASE 2: Encode images into video
// =======================
async function encodeImagesToVideo(
  images: HTMLImageElement[],
  opts: {
    fps: number
    secondsPerSlide: number
    fadeMs: number
    width: number
    height: number
    background: string
  },
): Promise<{ blob: Blob; mime: string; ext: string; durationMs: number }> {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('MediaRecorder is not supported in this environment')
  }

  const { fps, secondsPerSlide, fadeMs, width: w, height: h, background } = opts
  const totalDurationMs = images.length * secondsPerSlide * 1000
  const frameIntervalMs = 1000 / fps

  // Create offscreen canvas
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  if (!ctx) throw new Error('Failed to get canvas 2d context')

  // Draw first frame immediately so the canvas is not blank
  ctx.fillStyle = background
  ctx.fillRect(0, 0, w, h)
  if (images.length > 0) drawImageCover(ctx, images[0], w, h)

  // Set up MediaRecorder
  const stream = canvas.captureStream(fps)
  const mimeType = getSupportedMimeType()
  if (!mimeType) throw new Error('No supported video MIME type found for MediaRecorder')

  const recorder = new MediaRecorder(stream, { mimeType })
  const chunks: Blob[] = []

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data)
  }

  // Start recording
  const recordingStopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve()
  })
  recorder.start(100) // request data every 100ms

  // Render frames using requestAnimationFrame for smooth timing
  const startTime = performance.now()

  const renderLoop = (): Promise<void> => {
    return new Promise((resolve) => {
      const tick = () => {
        const elapsed = performance.now() - startTime
        if (elapsed >= totalDurationMs) {
          // Draw the last frame one final time
          ctx.globalAlpha = 1
          ctx.fillStyle = background
          ctx.fillRect(0, 0, w, h)
          drawImageCover(ctx, images[images.length - 1], w, h)
          resolve()
          return
        }

        // Determine current slide
        const slideIdx = Math.min(
          images.length - 1,
          Math.floor(elapsed / (secondsPerSlide * 1000)),
        )
        const slideElapsed = elapsed - slideIdx * secondsPerSlide * 1000
        const currentImage = images[slideIdx]

        // Draw background + current slide
        ctx.globalAlpha = 1
        ctx.fillStyle = background
        ctx.fillRect(0, 0, w, h)
        drawImageCover(ctx, currentImage, w, h)

        // Cross-fade to next slide if applicable
        if (fadeMs > 0 && slideIdx < images.length - 1) {
          const fadeStartMs = secondsPerSlide * 1000 - fadeMs
          if (slideElapsed >= fadeStartMs) {
            const alpha = Math.min(1, (slideElapsed - fadeStartMs) / fadeMs)
            ctx.globalAlpha = alpha
            drawImageCover(ctx, images[slideIdx + 1], w, h)
            ctx.globalAlpha = 1
          }
        }

        requestAnimationFrame(tick)
      }

      requestAnimationFrame(tick)
    })
  }

  await renderLoop()

  // Give the recorder a moment to flush remaining data
  await sleep(200)

  // Stop recorder
  if (recorder.state !== 'inactive') {
    recorder.stop()
  }
  stream.getTracks().forEach((t) => t.stop())

  // Wait for recorder to fully stop
  await Promise.race([
    recordingStopped,
    sleep(5000), // safety timeout
  ])

  const blob = new Blob(chunks, { type: mimeType })
  if (blob.size === 0) throw new Error('Video encoding produced an empty file')

  return {
    blob,
    mime: mimeType,
    ext: getExtension(mimeType),
    durationMs: Math.round(totalDurationMs),
  }
}

// =======================
// EXPORTED MAIN FUNCTION
// =======================
export async function createSlideshowVideo(
  deps: SlideshowVideoDeps,
  opts: SlideshowVideoOptions,
) {
  const {
    totalSlides,
    fps = 30,
    secondsPerSlide = 0.5,
    fadeMs = 0,
    quality = 0.9,
    pixelRatio = 1.5,
    captureSelector = '#capture-area',
    ignoreAttr = 'data-html2canvas-ignore',
    background = '#000',
    captureTimeoutMs = 20000,
  } = opts

  if (!totalSlides || totalSlides <= 0) throw new Error('totalSlides must be > 0')
  if (!deps.captureRef.value) throw new Error('captureRef is not ready')

  // --- Phase 1: Capture all slides as images ---
  console.log(`[Slideshow] Capturing ${totalSlides} slides...`)
  const images = await captureAllSlides(deps, {
    totalSlides,
    quality,
    pixelRatio,
    captureSelector,
    ignoreAttr,
    captureTimeoutMs,
  })

  if (images.length === 0) throw new Error('No slides were captured')

  // Determine output dimensions from first captured image
  const OUT_W = opts.width ?? images[0].naturalWidth ?? 720
  const OUT_H = opts.height ?? images[0].naturalHeight ?? 1280

  // --- Phase 2: Encode captured images into video ---
  console.log(`[Slideshow] Encoding video ${OUT_W}x${OUT_H} @ ${fps}fps...`)
  const result = await encodeImagesToVideo(images, {
    fps,
    secondsPerSlide,
    fadeMs,
    width: OUT_W,
    height: OUT_H,
    background,
  })

  console.log(`[Slideshow] Done. ${result.blob.size} bytes, ${result.durationMs}ms`)
  return { ...result, width: OUT_W, height: OUT_H, slides: totalSlides }
}
