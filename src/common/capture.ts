import type { CaptureAndShareOptions, SlideshowVideoDeps, SlideshowVideoOptions } from '@/types'
import { toJpeg, toPng } from 'html-to-image'
import { nextTick } from 'vue'

export async function captureImage(opts: CaptureAndShareOptions = {}) {
  const {
    elementId = 'capture-area',
    pixelRatio = Math.max(2, window.devicePixelRatio || 2),
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
    filter: (node) => {
      if (!(node instanceof HTMLElement)) return true
      return node.getAttribute(shouldIgnoreAttr) !== 'true'
    },
  })
}

function raf2() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`TIMEOUT @ ${label} (${ms}ms)`)), ms)
    p.then((v) => {
      clearTimeout(t)
      resolve(v)
    }).catch((e) => {
      clearTimeout(t)
      reject(e)
    })
  })
}

async function waitForImages(root: HTMLElement) {
  const imgs = Array.from(root.querySelectorAll('img')) as HTMLImageElement[]
  await Promise.all(
    imgs.map(async (img) => {
      if (!img.complete || img.naturalWidth === 0) {
        await new Promise<void>((res) => {
          const done = () => res()
          img.onload = done
          img.onerror = done
        })
      }
      if (typeof img.decode === 'function') {
        await img.decode().catch(() => undefined)
      }
    }),
  )
}

async function getCaptureElementFromComponent(comp: any, selector = '#capture-area') {
  await nextTick()
  await raf2()
  const rootEl: HTMLElement | null = comp?.$el ?? null
  if (!rootEl) throw new Error('captureRef.$el not ready')
  return (rootEl.querySelector?.(selector) as HTMLElement | null) ?? rootEl
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = async () => {
      try {
        /* @ts-ignore */ if (img.decode) await img.decode()
      } catch {}
      resolve(img)
    }
    img.onerror = reject
    img.src = src
  })
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const iw = img.naturalWidth || img.width
  const ih = img.naturalHeight || img.height
  const scale = Math.max(w / iw, h / ih)
  const dw = iw * scale
  const dh = ih * scale
  const dx = (w - dw) / 2
  const dy = (h - dh) / 2
  ctx.drawImage(img, dx, dy, dw, dh)
}

async function normalizeDataUrlToJpeg(dataUrl: string, outW: number, outH: number, background: string) {
  const img = await loadImage(dataUrl)
  const c = document.createElement('canvas')
  c.width = outW
  c.height = outH
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('no ctx')
  ctx.fillStyle = background
  ctx.fillRect(0, 0, outW, outH)
  drawCover(ctx, img, outW, outH)
  return c.toDataURL('image/jpeg', 0.92)
}

function pickMimeTypeSafe(): string {
  const candidates = ['video/webm;codecs=vp8', 'video/webm', 'video/mp4']
  // @ts-ignore
  if (typeof MediaRecorder === 'undefined') return ''
  for (const t of candidates) {
    // @ts-ignore
    if (MediaRecorder.isTypeSupported?.(t)) return t
  }
  return ''
}

function extFromMime(mime: string) {
  if (!mime) return 'webm'
  if (mime.includes('mp4')) return 'mp4'
  if (mime.includes('webm')) return 'webm'
  if (mime.includes('quicktime')) return 'mov'
  return 'webm'
}

async function dataUrlsToVideoBlobSafe(
  dataUrls: string[],
  opts: { fps: number; secondsPerSlide: number; fadeMs: number; width: number; height: number; background: string },
) {
  if (!dataUrls.length) throw new Error('No frames')
  // @ts-ignore
  if (typeof MediaRecorder === 'undefined') throw new Error('MediaRecorder not supported')

  const { fps, secondsPerSlide, fadeMs, width: w, height: h, background } = opts
  const images = await Promise.all(dataUrls.map(loadImage))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No canvas ctx')

  const stream = canvas.captureStream(fps)
  if (!stream.getTracks().length) throw new Error('captureStream returned empty tracks')

  const mimeType = pickMimeTypeSafe()
  // @ts-ignore
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)

  const chunks: BlobPart[] = []
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data)
  }

  const totalMs = Math.max(1, Math.round(images.length * secondsPerSlide * 1000))
  const frameInterval = Math.max(12, Math.round(1000 / fps))

  let intervalId: any = null
  let stopTimer: any = null
  let watchdog: any = null
  let lastTick = Date.now()
  const startTs = Date.now()

  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve()
  })

  const stopAll = () => {
    try {
      if (intervalId) clearInterval(intervalId)
    } catch {}
    try {
      if (stopTimer) clearTimeout(stopTimer)
    } catch {}
    try {
      if (watchdog) clearInterval(watchdog)
    } catch {}
    try {
      stream.getTracks().forEach((t) => t.stop())
    } catch {}
    try {
      if (recorder.state !== 'inactive') recorder.stop()
    } catch {}
  }

  recorder.start(250)

  intervalId = setInterval(() => {
    const now = Date.now()
    lastTick = now

    const t = now - startTs
    if (t >= totalMs) return stopAll()

    const slideIndex = Math.min(images.length - 1, Math.floor(t / (secondsPerSlide * 1000)))
    const slideT = t - slideIndex * secondsPerSlide * 1000

    const cur = images[slideIndex]
    const next = images[Math.min(slideIndex + 1, images.length - 1)]

    ctx.globalAlpha = 1
    ctx.fillStyle = background
    ctx.fillRect(0, 0, w, h)
    drawCover(ctx, cur, w, h)

    if (fadeMs > 0 && slideIndex < images.length - 1) {
      const fadeStart = secondsPerSlide * 1000 - fadeMs
      if (slideT >= fadeStart) {
        const a = Math.min(1, Math.max(0, (slideT - fadeStart) / fadeMs))
        ctx.globalAlpha = a
        drawCover(ctx, next, w, h)
        ctx.globalAlpha = 1
      }
    }
  }, frameInterval)

  stopTimer = setTimeout(() => stopAll(), totalMs + 500)
  watchdog = setInterval(() => {
    if (Date.now() - lastTick > 5000) stopAll()
  }, 1000)

  await Promise.race([
    stopped,
    new Promise<void>((resolve) =>
      setTimeout(() => {
        stopAll()
        resolve()
      }, totalMs + 15000),
    ),
  ])

  const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'video/webm' })
  if (!blob.size) throw new Error(`Encoded blob is empty. mime=${blob.type}`)

  return { blob, mime: blob.type, ext: extFromMime(blob.type), durationMs: totalMs }
}

// =======================
// EXPORTED MAIN FUNCTION
// =======================
export async function createSlideshowVideoFromCaptureComponent(deps: SlideshowVideoDeps, opts: SlideshowVideoOptions) {
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

  if (!totalSlides) throw new Error('totalSlides = 0')
  const comp = deps.captureRef.value
  if (!comp) throw new Error('captureRef not ready')

  const frameDataUrls: string[] = []
  let OUT_W = opts.width ?? 0
  let OUT_H = opts.height ?? 0

  for (let i = 0; i < totalSlides; i++) {
    deps.onProgress?.(i + 1, totalSlides)

    await deps.setSlide(i)
    await nextTick()
    await raf2()

    const el = await getCaptureElementFromComponent(comp, captureSelector)

    try {
      /* @ts-ignore */ await document.fonts?.ready
    } catch {}
    await raf2()
    await waitForImages(el)
    await raf2()

    const rawJpeg = await withTimeout(
      toJpeg(el, {
        quality,
        pixelRatio,
        cacheBust: true,
        filter: (node) => !(node instanceof HTMLElement) || node.getAttribute(ignoreAttr) !== 'true',
      }),
      captureTimeoutMs,
      `toJpeg #${i + 1}`,
    )

    if (!OUT_W || !OUT_H) {
      const img = await loadImage(rawJpeg)
      OUT_W = img.naturalWidth || 720
      OUT_H = img.naturalHeight || 1280
    }

    const normalized = await withTimeout(
      normalizeDataUrlToJpeg(rawJpeg, OUT_W, OUT_H, background),
      captureTimeoutMs,
      `normalize #${i + 1}`,
    )

    frameDataUrls.push(normalized)
    await sleep(10)
  }

  const result = await dataUrlsToVideoBlobSafe(frameDataUrls, {
    fps,
    secondsPerSlide,
    fadeMs,
    width: OUT_W,
    height: OUT_H,
    background,
  })

  return { ...result, width: OUT_W, height: OUT_H, slides: totalSlides }
}
