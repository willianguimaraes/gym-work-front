import { copyToClipboard, exportFile } from 'quasar'
import type { DownloadedFile } from '@/types/report'

/** Salva um arquivo baixado da API (no celular abre o "salvar/compartilhar" do navegador). */
export function saveFile(file: DownloadedFile): boolean {
  return exportFile(file.filename, file.blob, { mimeType: file.blob.type || undefined }) === true
}

/**
 * Copia texto para a área de transferência. Funciona também pelo IP da rede (http), onde a API
 * moderna de clipboard não está disponível: o Quasar usa o fallback com seleção de texto.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await copyToClipboard(text)
    return true
  } catch {
    return false
  }
}
