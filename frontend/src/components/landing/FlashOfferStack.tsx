import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, X, Zap } from 'lucide-react'

export type FlashOffer = {
  id: string
  badge: string
  badgeClass: 'deal-badge-hot' | 'deal-badge-new' | 'deal-badge-sale'
  headline: string
  sub: string
  cta: string
  accent: string
}

export default function FlashOfferStack({
  offers,
  onCta,
  position = 'hero',
}: {
  offers: FlashOffer[]
  onCta: () => void
  position?: 'hero' | 'fixed'
}) {
  const [index, setIndex] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (dismissed || offers.length < 2) return
    const t = setInterval(() => setIndex(i => (i + 1) % offers.length), 4200)
    return () => clearInterval(t)
  }, [dismissed, offers.length])

  if (dismissed || offers.length === 0) return null

  const offer = offers[index]
  const isFixed = position === 'fixed'

  return (
    <div className={isFixed ? 'flash-offer-fixed' : 'flash-offer-hero'}>
      <AnimatePresence mode="wait">
        <motion.div
          key={offer.id}
          initial={{ opacity: 0, y: isFixed ? 24 : 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.98 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="flash-offer-card"
        >
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setDismissed(true)}
            className="flash-offer-dismiss"
          >
            <X size={14} />
          </button>
          <div className="flex items-start gap-3">
            <div className="flash-offer-icon" style={{ background: `${offer.accent}18`, color: offer.accent }}>
              <Zap size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <span className={`deal-badge ${offer.badgeClass} flash-offer-badge`}>{offer.badge}</span>
              <p className="flash-offer-headline">{offer.headline}</p>
              <p className="flash-offer-sub">{offer.sub}</p>
              <button type="button" onClick={onCta} className="flash-offer-cta">
                {offer.cta} <ArrowRight size={14} />
              </button>
            </div>
          </div>
          {offers.length > 1 && (
            <div className="flash-offer-dots">
              {offers.map((o, i) => (
                <button
                  key={o.id}
                  type="button"
                  aria-label={`Offer ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={`flash-offer-dot ${i === index ? 'active' : ''}`}
                />
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
