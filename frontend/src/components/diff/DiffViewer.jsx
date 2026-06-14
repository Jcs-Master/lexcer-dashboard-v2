import { useRef, useEffect } from 'react'
import DiffLine from './DiffLine'

export default function DiffViewer({ diff, viewMode = 'split' }) {
  const leftPaneRef = useRef(null)
  const rightPaneRef = useRef(null)
  const isSyncing = useRef(false)

  useEffect(() => {
    const leftEl = leftPaneRef.current
    const rightEl = rightPaneRef.current
    if (!leftEl || !rightEl) return

    const syncScroll = (source, target) => {
      if (isSyncing.current) return
      isSyncing.current = true
      target.scrollTop = source.scrollTop
      target.scrollLeft = source.scrollLeft
      setTimeout(() => { isSyncing.current = false }, 10)
    }

    const onLeftScroll = () => syncScroll(leftEl, rightEl)
    const onRightScroll = () => syncScroll(rightEl, leftEl)

    leftEl.addEventListener('scroll', onLeftScroll)
    rightEl.addEventListener('scroll', onRightScroll)

    const syncWheel = (source, target, deltaY) => {
      if (isSyncing.current) return
      isSyncing.current = true
      const newTop = source.scrollTop + deltaY
      source.scrollTop = newTop
      target.scrollTop = newTop
      setTimeout(() => { isSyncing.current = false }, 10)
    }

    const onLeftWheel = (e) => {
      e.preventDefault()
      syncWheel(leftEl, rightEl, e.deltaY)
    }
    const onRightWheel = (e) => {
      e.preventDefault()
      syncWheel(rightEl, leftEl, e.deltaY)
    }

    leftEl.addEventListener('wheel', onLeftWheel, { passive: false })
    rightEl.addEventListener('wheel', onRightWheel, { passive: false })

    return () => {
      leftEl.removeEventListener('scroll', onLeftScroll)
      rightEl.removeEventListener('scroll', onRightScroll)
      leftEl.removeEventListener('wheel', onLeftWheel)
      rightEl.removeEventListener('wheel', onRightWheel)
    }
  }, [])

  const Pane = ({ paneRef, side }) => (
    <div
      ref={paneRef}
      className="diff-pane overflow-auto bg-black border border-slate-800"
      style={{
        width: '50%',
        height: 'calc(100vh - 300px)',
        minHeight: '250px',
        boxSizing: 'border-box',
      }}
    >
      {diff.map((item, idx) => (
        <DiffLine key={idx} diffItem={item} side={side} />
      ))}
    </div>
  )

  if (viewMode === 'unified') {
    return (
      <div
        className="diff-pane overflow-auto bg-black border border-slate-800 w-full"
        style={{
          height: 'calc(100vh - 300px)',
          minHeight: '250px',
          boxSizing: 'border-box',
        }}
      >
        {diff.map((item, idx) => (
          <DiffLine key={idx} diffItem={item} side="right" />
        ))}
      </div>
    )
  }

  return (
    <div
      className="flex w-full"
      style={{ gap: '2px', overflow: 'hidden' }}
    >
      <Pane paneRef={leftPaneRef} side="left" />
      <Pane paneRef={rightPaneRef} side="right" />
    </div>
  )
}