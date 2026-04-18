export async function withUploadProgress(
  onProgress: (msg: string, pct: number) => void,
  label: string,
  fn: () => Promise<void>
): Promise<void> {
  let pct = 0
  const id = setInterval(() => {
    pct = Math.min(pct + Math.random() * 12 + 3, 85)
    onProgress(`${label}... ${Math.round(pct)}%`, Math.round(pct))
  }, 350)
  try {
    await fn()
  } finally {
    clearInterval(id)
  }
  onProgress('Upload complete', 100)
}
