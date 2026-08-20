'use client'

import { useEffect } from 'react'
import { captureOnFirstVisit } from '@/lib/traffic-attribution'

export function TrafficAttributionCapture() {
  useEffect(() => {
    captureOnFirstVisit()
  }, [])
  return null
}
