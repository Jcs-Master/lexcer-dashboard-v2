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

  const paneClasses = "w-1/2 overflow-auto bg-black border border-slate-800 rounded-lg"
  const paneStyle = { maxHeight: '500px' }

  const Pane = ({ paneRef, side }) => (
    <div ref={paneRef} className={paneClasses} style={paneStyle}>
      {diff.map((item, idx) => (
        <DiffLine key={idx} diffItem={item} side={side} />
      ))}
    </div>
  )

  if (viewMode === 'unified') {
    return (
      <div className="w-full overflow-auto bg-black border border-slate-800 rounded-lg" style={{ maxHeight: '500px' }}>
        {diff.map((item, idx) => (
          <DiffLine key={idx} diffItem={item} side="right" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex gap-1 w-full">
      <Pane paneRef={leftPaneRef} side="left" />
      <Pane paneRef={rightPaneRef} side="right" />
    </div>
  )
}