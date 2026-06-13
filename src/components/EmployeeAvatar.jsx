import { G } from '../lib/ehUtils'

// ─── Photo map — add photo URLs here when ready ───────────────────────────────
// Example: 'John Graham': '/photos/john-graham.jpg'
const EMPLOYEE_PHOTOS = {}

export function getEmployeeInitials(name) {
  if (!name) return '?'
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

// size: px number  variant: 'solid'|'light'
export default function EmployeeAvatar({ name = '', size = 40, variant = 'solid', className = '' }) {
  const photoUrl = EMPLOYEE_PHOTOS[name]
  const initials = getEmployeeInitials(name)

  const style = variant === 'light'
    ? { width: size, height: size, background: `${G}18`, color: G, border: `1px solid ${G}30`, fontSize: Math.max(9, size * 0.3) }
    : { width: size, height: size, background: G, color: 'white', fontSize: Math.max(10, size * 0.3) }

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={`rounded-2xl object-cover flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
        onError={e => {
          e.target.style.display = 'none'
          if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'
        }}
      />
    )
  }

  return (
    <div
      className={`rounded-2xl flex items-center justify-center font-bold flex-shrink-0 ${className}`}
      style={style}
    >
      {initials}
    </div>
  )
}
