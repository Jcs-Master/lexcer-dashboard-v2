import { useRef, useEffect, useState } from 'react'
import DiffLine from './DiffLine'

export default function DiffViewer({ diff, viewMode = 'split' }) {
  const leftPaneRef = useRef(null)
  const rightPaneRef = useRef(null)
  const isSyncing = useRef(false)
  const containerRef = useRef(null)
  const [viewerHeight, setViewerHeight] = useState(400)

  // Calcular altura disponible dinámicamente
  useEffect(() => {
    const calculateHeight = () => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const available = window.innerHeight - rect.top - 16 // 16px margen inferior
      setViewerHeight(Math.max(250, available))
    }

    calculateHeight()
    window.addEventListener('resize', calculateHeight)
    // Recalcular después de que el DOM se estabilice
    const timeout = setTimeout(calculateHeight, 100)
    return () => {
      window.removeEventListener('resize', calculateHeight)
      clearTimeout(timeout)
    }
  }, [])

  // Sincronizar scroll entre paneles (solo scroll event, NO wheel)
  useEffect(() => {
    const leftEl = leftPaneRef.current
    const rightEl = rightPaneRef.current
    if (!leftEl || !rightEl) return

    const syncScroll = (source, target) => {
      if (isSyncing.current) return
      isSyncing.current = true
      target.scrollTop = source.scrollTop
      target.scrollLeft = source.scrollLeft
      requestAnimationFrame(() => { isSyncing.current = false })
    }

    const onLeftScroll = () => syncScroll(leftEl, rightEl)
    const onRightScroll = () => syncScroll(rightEl, leftEl)

    leftEl.addEventListener('scroll', onLeftScroll)
    rightEl.addEventListener('scroll', onRightScroll)

    return () => {
      leftEl.removeEventListener('scroll', onLeftScroll)
      rightEl.removeEventListener('scroll', onRightScroll)
    }
  }, [])

  const paneStyle = {
    width: '50%',
    height: `${viewerHeight}px`,
    overflow: 'auto',
    backgroundColor: '#000',
    border: '1px solid #1e293b',
    borderRadius: '6px',
    boxSizing: 'border-box',
  }

  const Pane = ({ paneRef, side }) => (
    <div ref={paneRef} className="diff-pane" style={paneStyle}>
      {diff.map((item, idx) => (
        <DiffLine key={idx} diffItem={item} side={side} />
      ))}
    </div>
  )

  if (viewMode === 'unified') {
    return (
      <div ref={containerRef} className="diff-pane" style={{ width: '100%', height: `${viewerHeight}px`, overflow: 'auto', backgroundColor: '#000', border: '1px solid #1e293b', borderRadius: '6px' }}>
        {diff.map((item, idx) => (
          <DiffLine key={idx} diffItem={item} side="right" />
        ))}
      </div>
    )
  }

  return (
    <div ref={containerRef} style={{ display: 'flex', gap: '4px', width: '100%', overflow: 'hidden' }}>
      <Pane paneRef={leftPaneRef} side="left" />
      <Pane paneRef={rightPaneRef} side="right" />
    </div>
  )
}