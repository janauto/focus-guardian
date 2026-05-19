interface Props {
  intensity: number // 0..1
}

/** 分心扣血视觉特效（屏幕边缘红光） */
export function DistractOverlay({ intensity }: Props): JSX.Element {
  if (intensity <= 0) return <div className="distract-overlay off" />
  return (
    <div
      className="distract-overlay on"
      style={{
        opacity: Math.min(0.9, intensity),
        animationDuration: `${Math.max(0.6, 2 - intensity * 1.5)}s`
      }}
      aria-hidden
    />
  )
}
