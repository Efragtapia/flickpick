'use client'

import { useState, useTransition } from 'react'
import { updateRating } from '../actions'

export default function RatingStars({
  titleId,
  currentRating,
}: {
  titleId:       string
  currentRating: number | null
}) {
  const [hovered,    setHovered]    = useState<number | null>(null)
  const [rating,     setRating]     = useState<number | null>(currentRating)
  const [, startTransition]         = useTransition()

  function handleClick(star: number) {
    setRating(star)
    startTransition(async () => {
      await updateRating(titleId, star)
    })
  }

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = (hovered !== null ? star <= hovered : star <= (rating ?? 0))
        return (
          <button
            key={star}
            onClick={() => handleClick(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(null)}
            className="text-xl leading-none transition-colors"
            style={{ color: filled ? '#FF3B5C' : '#333' }}
          >
            ★
          </button>
        )
      })}
    </div>
  )
}
