'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { addDays, format, isSameDay } from 'date-fns'
import { type Event } from '@/lib/supabase/types'

interface RoadmapViewProps {
  currentDate: Date
  events: Event[]
  onDateSelect?: (date: Date) => void
}

interface DayData {
  date: Date
  dayName: string
  events: Event[]
  color: string
}

const dayColors = [
  'bg-primary',
  'bg-secondary', 
  'bg-chart-1',
  'bg-chart-2',
  'bg-chart-3',
  'bg-chart-4',
  'bg-chart-5',
]

export function RoadmapView({ currentDate, events, onDateSelect }: RoadmapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Array<HTMLDivElement | null>>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  // Build the next 7 days
  const dayData: DayData[] = useMemo(() => (
    Array.from({ length: 7 }, (_, index) => {
    const date = addDays(currentDate, index)
      const dayEvents = events.filter((event) => isSameDay(new Date(event.start_time), date))
    return {
      date,
      dayName: format(date, 'EEEE'),
      events: dayEvents,
        color: dayColors[index % dayColors.length],
      }
    })
  ), [currentDate, events])

  // Focal line is near the bottom, where items should snap
  const focalOffsetFromBottomPx = 64

  const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value))

  const updateScales = useCallback((): void => {
    const container = containerRef.current
    if (!container) return

    const focalY = container.scrollTop + container.clientHeight - focalOffsetFromBottomPx

    let nearestIndex = 0
    let nearestDistance = Number.POSITIVE_INFINITY

    itemRefs.current.forEach((el, index) => {
      if (!el) return

      const itemTop = el.offsetTop
      const itemCenter = itemTop + el.clientHeight / 2
      const distance = Math.abs(itemCenter - focalY)

      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestIndex = index
      }

      // Scale between 0.85 and 1.12 for a clear depth cue
      const maxScale = 1.12
      const minScale = 0.85
      const scale = clamp(maxScale - distance / 750, minScale, maxScale)

      // Opacity change for depth
      const opacity = clamp(1 - distance / 1200, 0.45, 1)

      el.style.transform = `scale(${scale.toFixed(3)})`
      el.style.opacity = opacity.toString()
    })

    setCurrentIndex(nearestIndex)
  }, [])

  // Attach scroll handler
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = (): void => updateScales()

    // Initialize once mounted
    updateScales()

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [updateScales])

  // On mount, ensure first item is snapped to the focal line
  useEffect(() => {
    const first = itemRefs.current[0]
    if (first) {
      first.scrollIntoView({ behavior: 'auto', block: 'end' })
      requestAnimationFrame(() => updateScales())
    }
  }, [updateScales])

  const handleItemClick = (idx: number): void => {
    const el = itemRefs.current[idx]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'end' })
    if (onDateSelect) onDateSelect(dayData[idx].date)
  }

  return (
    <div className="w-full max-w-sm h-[600px] mx-auto p-4 flex flex-col">
      <div className="p-4 text-center">
        <h2 className="text-2xl font-bold text-foreground">The Road Ahead</h2>
      </div>

      <div className="relative flex-1">
      <div 
        ref={containerRef}
          className="h-full w-full overflow-y-auto rounded-2xl bg-muted/10 border border-border/20 scroll-smooth snap-y snap-mandatory pr-2 scroll-snap-container"
      >
          <div className="pt-2 pb-20 space-y-0">
          {dayData.map((day, index) => (
            <div
              key={day.date.toISOString()}
                ref={(el) => {
                itemRefs.current[index] = el;
              }}
                className={`milestone-item snap-end mx-auto w-[86%] max-w-[360px] p-4 rounded-xl origin-bottom ${day.color} transition-transform duration-300`}
                onClick={() => handleItemClick(index)}
            >
              <h3 className="font-bold text-white text-lg mb-1">{day.dayName}</h3>
              <p className="text-white/90 text-sm mb-2">{format(day.date, 'MMM d')}</p>
              {day.events.length > 0 ? (
                <div className="space-y-1">
                    {day.events.slice(0, 3).map((event) => (
                    <div key={event.id} className="text-white/80 text-xs truncate">
                      {event.title}
                    </div>
                  ))}
                  {day.events.length > 3 && (
                      <div className="text-white/60 text-xs">+{day.events.length - 3} more</div>
                  )}
                </div>
              ) : (
                <p className="text-white/60 text-xs">No events</p>
              )}
            </div>
          ))}
          </div>
        </div>

        {/* Focal line overlay */}
        <div className="pointer-events-none absolute left-0 right-0 focal-line">
          <div className="mx-auto w-[90%] h-px bg-primary/30" />
        </div>
        
        {/* Dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 transform flex space-x-2">
          {dayData.map((_, idx) => (
            <div key={idx} className={`w-2 h-2 rounded-full ${idx === currentIndex ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
          ))}
        </div>
      </div>

      <style jsx>{`
        .milestone-item {
          will-change: transform, opacity;
        }
        /* Overlap successive items to create stepped stack with uniform spacing */
        .stacked .milestone-item + .milestone-item { margin-top: -56px; }
        /* Hide native scrollbar in WebKit */
        :global(.scroll-smooth::-webkit-scrollbar) { display: none; }
      `}</style>
    </div>
  )
}