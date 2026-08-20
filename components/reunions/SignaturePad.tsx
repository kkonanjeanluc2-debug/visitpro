'use client'

import { useRef, useEffect, useState } from 'react'

interface Props {
  onSign: (dataUrl: string) => void
  onClear: () => void
  existingSignature?: string | null
  readOnly?: boolean
}

export default function SignaturePad({ onSign, onClear, existingSignature, readOnly = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })
  const [hasStrokes, setHasStrokes] = useState(!!existingSignature)

  // Initialise (ou réinitialise) le canvas quand la signature existante change
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ratio = window.devicePixelRatio || 1
    const w = canvas.offsetWidth
    const h = canvas.offsetHeight
    canvas.width = w * ratio
    canvas.height = h * ratio

    const ctx = canvas.getContext('2d')!
    ctx.scale(ratio, ratio)
    ctx.strokeStyle = '#1e3a5f'
    ctx.lineWidth = 1.8
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (existingSignature) {
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0, w, h)
      img.src = existingSignature
      setHasStrokes(true)
    } else {
      setHasStrokes(false)
    }
  }, [existingSignature])

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top }
  }

  const onStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (readOnly) return
    e.preventDefault()
    isDrawing.current = true
    lastPos.current = getPos(e)
  }

  const onMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || readOnly) return
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPos.current = pos
  }

  const onEnd = () => {
    if (!isDrawing.current) return
    isDrawing.current = false
    const canvas = canvasRef.current
    if (!canvas) return
    setHasStrokes(true)
    onSign(canvas.toDataURL('image/png'))
  }

  const onClearClick = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const ratio = window.devicePixelRatio || 1
    ctx.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio)
    setHasStrokes(false)
    onClear()
  }

  return (
    <div className="space-y-1.5">
      <div
        className={`relative rounded-xl overflow-hidden border-2 ${
          readOnly
            ? 'border-gray-200 bg-gray-50'
            : 'border-dashed border-gray-300 bg-white hover:border-gray-400 transition-colors cursor-crosshair'
        }`}
        style={{ height: 90 }}
      >
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
          onMouseDown={onStart}
          onMouseMove={onMove}
          onMouseUp={onEnd}
          onMouseLeave={onEnd}
          onTouchStart={onStart}
          onTouchMove={onMove}
          onTouchEnd={onEnd}
        />
        {!hasStrokes && !readOnly && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <span className="text-gray-300 text-xs italic">Signez ici avec votre souris ou votre doigt</span>
          </div>
        )}
      </div>
      {!readOnly && (
        <button
          type="button"
          onClick={onClearClick}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          Effacer
        </button>
      )}
    </div>
  )
}
