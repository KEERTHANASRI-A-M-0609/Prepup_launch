import { useEffect, useState } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'

interface Props {
  value: number
  suffix?: string
  className?: string
  style?: React.CSSProperties
}

export default function AnimatedNumber({ value, suffix = '', className, style }: Props) {
  const spring = useSpring(value, { stiffness: 90, damping: 22, mass: 0.8 })
  const rounded = useTransform(spring, v => Math.round(v))
  const [display, setDisplay] = useState(String(Math.round(value)))

  useEffect(() => { spring.set(value) }, [value, spring])
  useEffect(() => {
    const unsub = rounded.on('change', v => setDisplay(String(v)))
    return unsub
  }, [rounded])

  return (
    <motion.span
      className={className}
      style={style}
      key={value}
      initial={{ scale: 1.08, opacity: 0.7 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {display}{suffix}
    </motion.span>
  )
}
