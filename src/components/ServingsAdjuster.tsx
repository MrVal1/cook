'use client';

import React from 'react';
import { Users, Minus, Plus } from 'lucide-react';

interface ServingsAdjusterProps {
  currentServings: number;
  originalServings: number;
  onChange: (newServings: number) => void;
}

export default function ServingsAdjuster({
  currentServings,
  originalServings,
  onChange,
}: ServingsAdjusterProps) {
  const handleDecrement = () => {
    if (currentServings > 1) {
      onChange(currentServings - 1);
    }
  };

  const handleIncrement = () => {
    if (currentServings < 50) {
      onChange(currentServings + 1);
    }
  };

  const isModified = currentServings !== originalServings;

  return (
    <div className="flex items-center gap-3 bg-stone-100/90 border border-stone-200/90 px-3 py-1.5 rounded-2xl shadow-inner">
      <div className="flex items-center gap-1.5 text-stone-700 font-semibold text-xs">
        <Users className="w-3.5 h-3.5 text-orange-600" />
        <span>Portions :</span>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={currentServings <= 1}
          className="w-6 h-6 rounded-lg bg-white border border-stone-300 hover:bg-stone-50 disabled:opacity-40 flex items-center justify-center text-stone-600 active:scale-95 transition-all shadow-sm"
          title="Diminuer les portions"
        >
          <Minus className="w-3 h-3" />
        </button>

        <span className="w-7 text-center font-bold text-sm text-stone-900">
          {currentServings}
        </span>

        <button
          type="button"
          onClick={handleIncrement}
          disabled={currentServings >= 50}
          className="w-6 h-6 rounded-lg bg-white border border-stone-300 hover:bg-stone-50 disabled:opacity-40 flex items-center justify-center text-stone-600 active:scale-95 transition-all shadow-sm"
          title="Augmenter les portions"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {isModified && (
        <button
          type="button"
          onClick={() => onChange(originalServings)}
          className="text-[10px] text-orange-600 hover:text-orange-700 font-semibold underline ml-1"
        >
          (Base {originalServings})
        </button>
      )}
    </div>
  );
}
