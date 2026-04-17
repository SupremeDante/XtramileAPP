export function getGradientStyle(id: string): { background: string } {
  const hash = Array.from(id).reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  const hue1 = hash % 360
  const hue2 = (hue1 + 40) % 360
  return {
    background: `linear-gradient(135deg, hsl(${hue1}, 60%, 40%), hsl(${hue2}, 60%, 25%))`,
  }
}
