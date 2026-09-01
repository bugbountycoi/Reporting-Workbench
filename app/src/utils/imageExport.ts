import { toPng } from 'html-to-image'

export async function exportElementAsPng(element: HTMLElement, filename: string): Promise<void> {
  const dataUrl = await toPng(element, { backgroundColor: '#ffffff', pixelRatio: 2 })
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename.endsWith('.png') ? filename : `${filename}.png`
  a.click()
}
