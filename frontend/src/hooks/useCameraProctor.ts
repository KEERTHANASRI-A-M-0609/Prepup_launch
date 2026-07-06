import { useState, useRef, useCallback } from 'react'

export function useCameraProctor() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [faceWarnings, setFaceWarnings] = useState(0)
  const [tabSwitches, setTabSwitches] = useState(0)
  const [proctorValid, setProctorValid] = useState(true)

  const faceCheckRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const tabCountRef = useRef(0)
  const blurListenerRef = useRef<(() => void) | null>(null)

  const startCamera = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setCameraActive(true)
      setProctorValid(true)
      setCameraError('')
      faceCheckRef.current = setInterval(() => {
        if (!videoRef.current || !canvasRef.current) return
        const ctx = canvasRef.current.getContext('2d')
        if (!ctx) return
        canvasRef.current.width = 64
        canvasRef.current.height = 64
        ctx.drawImage(videoRef.current, 0, 0, 64, 64)
        const data = ctx.getImageData(0, 0, 64, 64).data
        let sum = 0
        const brightness: number[] = []
        for (let i = 0; i < data.length; i += 4) {
          const b = (data[i] + data[i + 1] + data[i + 2]) / 3
          brightness.push(b)
          sum += b
        }
        const avg = sum / brightness.length
        const variance = brightness.reduce((a, b) => a + (b - avg) ** 2, 0) / brightness.length
        if (avg < 15 || avg > 245 || variance < 80) {
          setFaceWarnings(w => w + 1)
          setProctorValid(false)
        }
      }, 6000)
      return true
    } catch {
      setCameraError('Camera access denied. Enable your camera to proceed with proctored checks.')
      setCameraActive(false)
      setProctorValid(false)
      return false
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (faceCheckRef.current) clearInterval(faceCheckRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraActive(false)
  }, [])

  const startTabWatch = useCallback(() => {
    tabCountRef.current = 0
    setTabSwitches(0)
    const onBlur = () => {
      tabCountRef.current += 1
      setTabSwitches(tabCountRef.current)
    }
    window.addEventListener('blur', onBlur)
    blurListenerRef.current = () => window.removeEventListener('blur', onBlur)
  }, [])

  const stopTabWatch = useCallback(() => {
    blurListenerRef.current?.()
    blurListenerRef.current = null
  }, [])

  const resetProctor = useCallback(() => {
    stopTabWatch()
    stopCamera()
    tabCountRef.current = 0
    setTabSwitches(0)
    setFaceWarnings(0)
    setProctorValid(true)
    setCameraError('')
  }, [stopCamera, stopTabWatch])

  const isCheatDetected = useCallback(
    (requireCamera = true) =>
      tabSwitches > 0 ||
      faceWarnings >= 2 ||
      (requireCamera && !cameraActive),
    [tabSwitches, faceWarnings, cameraActive],
  )

  return {
    videoRef,
    canvasRef,
    cameraActive,
    cameraError,
    faceWarnings,
    tabSwitches,
    proctorValid,
    startCamera,
    stopCamera,
    startTabWatch,
    stopTabWatch,
    resetProctor,
    isCheatDetected,
  }
}
