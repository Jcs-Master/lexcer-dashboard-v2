import { useMemo } from 'react'

const TYPE_STYLES = {
  unchanged: {
    left: 'bg-black text-slate-400',
    right: 'bg-black text-slate-400',
    lineNum: 'text-slate-600',
  },
  deleted: {
    left: 'bg-amber-950/40 text-amber-200',
    right: 'bg-black text-slate-700',
    lineNum: 'text-amber-500',
  },
  added: {
    left: 'bg-black text-slate-700',
    right: 'bg-emerald-950/40 text-emerald-300',
    lineNum: 'text-emerald-500',
  },
  modified: {
    left: 'bg-slate-900/50 text-slate-300',
    right: 'bg-slate-900/50 text-slate-300',
    lineNum: 'text-cyan-500',
  },
}

export default function DiffLine({ diffItem, side }) {
  const { type, old_line, new_line, old_content, new_content, changes } = diffItem
  const styles = TYPE_STYLES[type] || TYPE_STYLES.unchanged

  const lineNum = side === 'left' ? old_line : new_line
  const content = side === 'left' ? old_content : new_content
  const bgClass = side === 'left' ? styles.left : styles.right

  // Si es una línea vacía (delete en lado derecho, add en lado izquierdo)
  if (content === null || content === undefined) {
    return (
      <div className={`flex font-mono text-xs leading-6 ${bgClass}`}>
        <span className={`w-12 shrink-0 text-right pr-3 select-none ${styles.lineNum}`}>
          {lineNum ?? ''}
        </span>
        <span className="flex-1 whitespace-pre px-2 opacity-30">{' '}</span>
      </div>
    )
  }

  // Renderizado con resaltado de palabras para modified
  const renderedContent = useMemo(() => {
    if (type !== 'modified' || !changes || changes.length === 0) {
      return <span className="whitespace-pre">{content}</span>
    }

    // Para modified, resaltar segmentos cambiados
    const segments = []
    let lastEnd = 0
    const isLeft = side === 'left'

    changes.forEach((change, idx) => {
      const start = isLeft ? change.old_start : change.new_start
      const end = isLeft ? change.old_end : change.new_end

      // Texto antes del cambio
      if (start > lastEnd) {
        segments.push(
          <span key={`pre-${idx}`} className="whitespace-pre">
            {content.slice(lastEnd, start)}
          </span>
        )
      }

      // Texto cambiado
      const changedText = isLeft ? change.old_text : change.new_text
      const highlightClass = isLeft
        ? 'text-red-400 bg-red-950/30'
        : 'text-emerald-400 bg-emerald-950/30'
      segments.push(
        <span key={`chg-${idx}`} className={`whitespace-pre ${highlightClass}`}>
          {changedText}
        </span>
      )

      lastEnd = end
    })

    // Texto después del último cambio
    if (lastEnd < content.length) {
      segments.push(
        <span key="post" className="whitespace-pre">
          {content.slice(lastEnd)}
        </span>
      )
    }

    return segments
  }, [content, changes, type, side])

  return (
    <div className={`flex font-mono text-xs leading-6 ${bgClass}`}>
      <span className={`w-12 shrink-0 text-right pr-3 select-none ${styles.lineNum}`}>
        {lineNum}
      </span>
      <span className="flex-1 whitespace-pre px-2 overflow-hidden">{renderedContent}</span>
    </div>
  )
}