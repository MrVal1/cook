/**
 * Renderer markdown léger — aucune dépendance externe.
 * Supporte : **gras**, *italique*, `code`, - listes, sauts de ligne.
 */

function parseLine(line) {
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g
  const parts = []
  let last = 0, m
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) parts.push(line.slice(last, m.index))
    if      (m[2]) parts.push(<strong key={m.index} className="font-semibold">{m[2]}</strong>)
    else if (m[3]) parts.push(<em key={m.index}>{m[3]}</em>)
    else if (m[4]) parts.push(
      <code key={m.index} className="bg-amber-50 border border-amber-100 rounded px-1 py-0.5 text-xs font-mono">
        {m[4]}
      </code>
    )
    last = m.index + m[0].length
  }
  if (last < line.length) parts.push(line.slice(last))
  return parts.length ? parts : line
}

export default function Markdown({ children, className = '' }) {
  if (!children) return null

  const lines = String(children).split('\n')
  const elements = []
  let listItems = []
  let key = 0

  const flushList = () => {
    if (listItems.length) {
      elements.push(
        <ul key={key++} className="space-y-0.5 my-1">
          {listItems}
        </ul>
      )
      listItems = []
    }
  }

  for (const line of lines) {
    const listMatch = line.match(/^[-*]\s+(.*)/)
    if (listMatch) {
      listItems.push(
        <li key={key++} className="flex gap-1.5 items-start">
          <span className="text-amber-400 mt-0.5 shrink-0 text-xs">●</span>
          <span>{parseLine(listMatch[1])}</span>
        </li>
      )
    } else {
      flushList()
      if (line.trim()) {
        elements.push(<span key={key++} className="block">{parseLine(line)}</span>)
      } else if (elements.length || listItems.length) {
        // Ligne vide → espace entre paragraphes
        elements.push(<span key={key++} className="block h-1" />)
      }
    }
  }
  flushList()

  return <div className={`leading-relaxed ${className}`}>{elements}</div>
}
