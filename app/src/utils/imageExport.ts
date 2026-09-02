import { toPng } from 'html-to-image'
import { resolveColor, BC } from '../themes/brandColors'

export async function exportElementAsPng(element: HTMLElement, filename: string): Promise<void> {
  const dataUrl = await toPng(element, { backgroundColor: resolveColor(BC.nearWhite), pixelRatio: 2 })
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename.endsWith('.png') ? filename : `${filename}.png`
  a.click()
}
