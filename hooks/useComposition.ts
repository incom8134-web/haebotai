"use client"

import { useCallback, useRef } from "react"

// Korean/Japanese/Chinese IME input fires "Enter" to confirm the composed
// syllable block, which native browser behavior reports as a real Enter
// keydown. Left unguarded, that keystroke also fires whatever the caller's
// onKeyDown does with Enter (submit a form, confirm a dialog) — the user
// wanted to finish typing 한글, not submit. This blocks the caller's
// onKeyDown for Enter while `e.nativeEvent.isComposing` (or our own tracked
// state, for browsers where that flag lags) is true.
interface UseCompositionOptions<T extends HTMLElement> {
  onCompositionStart?: (e: React.CompositionEvent<T>) => void
  onCompositionEnd?: (e: React.CompositionEvent<T>) => void
  onKeyDown?: (e: React.KeyboardEvent<T>) => void
}

export function useComposition<T extends HTMLElement>({
  onCompositionStart,
  onCompositionEnd,
  onKeyDown,
}: UseCompositionOptions<T>) {
  const composingRef = useRef(false)

  const handleCompositionStart = useCallback(
    (e: React.CompositionEvent<T>) => {
      composingRef.current = true
      onCompositionStart?.(e)
    },
    [onCompositionStart]
  )

  const handleCompositionEnd = useCallback(
    (e: React.CompositionEvent<T>) => {
      composingRef.current = false
      onCompositionEnd?.(e)
    },
    [onCompositionEnd]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<T>) => {
      if (e.key === "Enter" && (e.nativeEvent.isComposing || composingRef.current)) {
        return
      }
      onKeyDown?.(e)
    },
    [onKeyDown]
  )

  return {
    onCompositionStart: handleCompositionStart,
    onCompositionEnd: handleCompositionEnd,
    onKeyDown: handleKeyDown,
  }
}
