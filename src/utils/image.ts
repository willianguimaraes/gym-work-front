/**
 * Prepara a foto antes do envio: aplica a orientação da câmera, reduz para no máximo 1600 px e
 * regrava em JPEG. Além de deixar o envio rápido no celular, a regravação descarta os metadados
 * (EXIF), incluindo a localização GPS que o celular grava na foto.
 *
 * Se o navegador não conseguir processar a imagem, devolve o arquivo original (o backend valida
 * tipo e tamanho de qualquer forma).
 */
const MAX_SIDE = 1600
const QUALITY = 0.85

export async function prepareImage(file: File): Promise<{ blob: Blob; name: string }> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('canvas indisponível')
    context.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', QUALITY),
    )
    if (!blob) throw new Error('falha ao gerar a imagem')
    return { blob, name: file.name.replace(/\.[^.]+$/, '') + '.jpg' }
  } catch {
    return { blob: file, name: file.name }
  }
}
