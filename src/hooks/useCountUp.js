import { useState, useEffect, useRef } from 'react'

export function useCountUp(target, { duration = 1100, delay = 0, decimals = 0 } = {}) {
  const [value, setValue] = useState(0)
  const rafRef = useRef(null)
  const timeoutRef = useRef(null)

  useEffect(() => {
    setValue(0)
    clearTimeout(timeoutRef.current)
    cancelAnimationFrame(rafRef.current)

    timeoutRef.current = setTimeout(() => {
      const startTime = performance.now()
      const animate = (now) => {
        const elapsed = now - startTime
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3) // cubic ease-out
        const current = target * eased
        setValue(decimals > 0 ? parseFloat(current.toFixed(decimals)) : Math.round(current))
        if (progress < 1) rafRef.current = requestAnimationFrame(animate)
      }
      rafRef.current = requestAnimationFrame(animate)
    }, delay)

    return () => {
      clearTimeout(timeoutRef.current)
      cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration, delay, decimals])

  return value
}
