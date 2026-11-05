'use client';

import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number; // 0 to 5
  maxStars?: number;
  interactive?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showScore?: boolean;
  onRate?: (rating: number) => void;
  className?: string;
}

export default function StarRating({
  rating = 0,
  maxStars = 5,
  interactive = false,
  size = 'md',
  showScore = true,
  onRate,
  className = '',
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const activeRating = hoverRating !== null ? hoverRating : rating;

  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const textClasses = {
    xs: 'text-[10px]',
    sm: 'text-xs',
    md: 'text-xs font-semibold',
    lg: 'text-sm font-bold',
  };

  const handleClick = (starValue: number) => {
    if (!interactive || !onRate) return;
    // Clicking the same star toggles it off (to 0)
    if (rating === starValue) {
      onRate(0);
    } else {
      onRate(starValue);
    }
  };

  return (
    <div className={`inline-flex items-center gap-1.5 select-none ${className}`}>
      <div
        className="flex items-center gap-0.5"
        onMouseLeave={() => interactive && setHoverRating(null)}
      >
        {Array.from({ length: maxStars }, (_, i) => {
          const starValue = i + 1;
          const isFilled = activeRating >= starValue;
          const isHalf = !isFilled && activeRating >= starValue - 0.5;

          return (
            <button
              key={i}
              type="button"
              disabled={!interactive}
              onClick={() => handleClick(starValue)}
              onMouseEnter={() => interactive && setHoverRating(starValue)}
              className={`p-0.5 rounded transition-transform ${
                interactive
                  ? 'cursor-pointer hover:scale-125 focus:outline-none focus:ring-1 focus:ring-amber-400'
                  : 'cursor-default'
              }`}
              title={interactive ? `Noter ${starValue} étoile${starValue > 1 ? 's' : ''}` : undefined}
            >
              <Star
                className={`${sizeClasses[size]} transition-colors duration-150 ${
                  isFilled
                    ? 'fill-amber-400 text-amber-400 drop-shadow-sm'
                    : isHalf
                    ? 'fill-amber-200 text-amber-400'
                    : 'text-stone-300 fill-stone-100 hover:text-amber-300'
                }`}
              />
            </button>
          );
        })}
      </div>

      {showScore && (
        <span className={`text-stone-600 ${textClasses[size]} tabular-nums`}>
          {rating > 0 ? (
            <>
              <span className="text-amber-600 font-bold">{rating.toFixed(1)}</span>
              <span className="text-stone-400 text-[10px] ml-0.5">/5</span>
            </>
          ) : interactive ? (
            <span className="text-stone-400 italic text-[11px]">Non notée</span>
          ) : null}
        </span>
      )}
    </div>
  );
}
