import { useUI } from '../store'

export function Notices(): JSX.Element {
  const notices = useUI((s) => s.notices)
  const dismiss = useUI((s) => s.dismissNotice)
  return (
    <div className="notices">
      {notices.map((n) => (
        <div key={n.id} className={`notice notice-${n.kind}`} onClick={() => dismiss(n.id)}>
          {n.message}
        </div>
      ))}
    </div>
  )
}
