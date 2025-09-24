import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { useDebounce } from '@/hooks/use-debounce'

describe('useDebounce Hook', () => {
  beforeAll(() => {
    // Engage fake timers for the entire suite to avoid cross-test interference
    vi.useFakeTimers()
  })

  beforeEach(() => {
    vi.clearAllTimers()
  })

  afterEach(() => {
    // Ensure any pending timers are flushed between tests
    vi.runOnlyPendingTimers()
    vi.clearAllTimers()
  })

  afterAll(() => {
    // Restore real timers after the suite completes
    vi.useRealTimers()
  })

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500))
    
    expect(result.current).toBe('initial')
  })

  it('debounces value updates', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 }
      }
    )

    expect(result.current).toBe('initial')

    // Update the value
    rerender({ value: 'updated', delay: 500 })

    // Value should still be the old one before delay
    expect(result.current).toBe('initial')

    // Fast-forward time by less than delay
    act(() => {
      vi.advanceTimersByTime(250)
    })

    // Value should still be old
    expect(result.current).toBe('initial')

    // Fast-forward time past the delay
    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Now value should be updated
    expect(result.current).toBe('updated')
  })

  it('cancels previous timeout when value changes rapidly', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 }
      }
    )

    expect(result.current).toBe('initial')

    // Update value multiple times rapidly
    rerender({ value: 'update1', delay: 500 })
    
    act(() => {
      vi.advanceTimersByTime(100)
    })
    
    rerender({ value: 'update2', delay: 500 })
    
    act(() => {
      vi.advanceTimersByTime(100)
    })
    
    rerender({ value: 'final', delay: 500 })

    // Value should still be initial
    expect(result.current).toBe('initial')

    // Fast-forward past the delay
    act(() => {
      vi.advanceTimersByTime(500)
    })

    // Should have only the final value (previous timeouts were cancelled)
    expect(result.current).toBe('final')
  })

  it('handles delay changes correctly', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 1000 }
      }
    )

    expect(result.current).toBe('initial')

    rerender({ value: 'updated', delay: 1000 })

    // Advance time but change delay before timeout
    act(() => {
      vi.advanceTimersByTime(500)
    })

    // Change delay to a shorter time
    rerender({ value: 'updated', delay: 200 })

    // Should still be initial because new timeout was set
    expect(result.current).toBe('initial')

    // Advance by the new shorter delay
    act(() => {
      vi.advanceTimersByTime(200)
    })

    // Now should be updated
    expect(result.current).toBe('updated')
  })

  it('works with different data types', () => {
    // Test with numbers
    const { result: numberResult, rerender: numberRerender } = renderHook(
      ({ value, delay }: { value: number; delay: number }) => useDebounce(value, delay),
      {
        initialProps: { value: 1, delay: 100 }
      }
    )

    expect(numberResult.current).toBe(1)

    numberRerender({ value: 2, delay: 100 })

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(numberResult.current).toBe(2)

    // Test with objects
    const { result: objectResult, rerender: objectRerender } = renderHook(
      ({ value, delay }: { value: { id: number; name: string }; delay: number }) => 
        useDebounce(value, delay),
      {
        initialProps: { value: { id: 1, name: 'initial' }, delay: 100 }
      }
    )

    expect(objectResult.current).toEqual({ id: 1, name: 'initial' })

    objectRerender({ value: { id: 2, name: 'updated' }, delay: 100 })

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(objectResult.current).toEqual({ id: 2, name: 'updated' })
  })

  it('handles zero delay correctly', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 0 }
      }
    )

    expect(result.current).toBe('initial')

    rerender({ value: 'updated', delay: 0 })

    // With zero delay, should still debounce to next tick
    expect(result.current).toBe('initial')

    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(result.current).toBe('updated')
  })

  it('cleans up timeout on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
    
    const { unmount, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 }
      }
    )

    rerender({ value: 'updated', delay: 500 })

    // Unmount before timeout completes
    unmount()

    expect(clearTimeoutSpy).toHaveBeenCalled()
    
    clearTimeoutSpy.mockRestore()
  })

  describe('Performance and Memory', () => {
    it('creates timeouts for each value change (expected behavior)', () => {
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout')
      
      const { result, rerender } = renderHook(
        ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
        {
          initialProps: { value: 'initial', delay: 500 }
        }
      )

      const initialCallCount = setTimeoutSpy.mock.calls.length

      // Rerender with different values
      rerender({ value: 'first', delay: 500 })
      rerender({ value: 'second', delay: 500 })

      // Each rerender should create a new timeout (this is expected behavior)
      expect(setTimeoutSpy.mock.calls.length).toBeGreaterThan(initialCallCount)
      
      setTimeoutSpy.mockRestore()
    })
  })

  describe('Neurodiversity-Affirming Features', () => {
    it('provides predictable timing for user interactions', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
        {
          initialProps: { value: 'initial', delay: 100 } // Short delay for responsive feel
        }
      )

      // Test that short delays work well for real-time feedback
      rerender({ value: 'typing...', delay: 100 })

      act(() => {
        vi.advanceTimersByTime(100)
      })

      expect(result.current).toBe('typing...')
    })

    it('allows configurable delay for different user needs', () => {
      // Some users may need longer delays to process changes
      const { result, rerender } = renderHook(
        ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
        {
          initialProps: { value: 'initial', delay: 1000 } // Longer delay
        }
      )

      rerender({ value: 'changed', delay: 1000 })

      // Should not change too quickly
      act(() => {
        vi.advanceTimersByTime(500)
      })

      expect(result.current).toBe('initial')

      // But should change after the full delay
      act(() => {
        vi.advanceTimersByTime(500)
      })

      expect(result.current).toBe('changed')
    })
  })
})