import axios from 'axios'
import { api } from './api'
import type { AnalysisReport, DownloadedFile, ReportFormat, ReportScope } from '@/types/report'

const PATH: Record<ReportScope, string> = {
  sessao: 'sessions',
  semana: 'weeks',
  fase: 'phases',
}

/** Nome do arquivo do cabeçalho Content-Disposition (ou o padrão informado). */
export function filenameFrom(header: unknown, fallback: string): string {
  const value = typeof header === 'string' ? header : ''
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(value)
  if (utf8?.[1]) return decodeURIComponent(utf8[1])
  const plain = /filename="?([^";]+)"?/i.exec(value)
  return plain?.[1] ?? fallback
}

/**
 * Em respostas de texto ou arquivo, o erro (ProblemDetail) chega como texto ou Blob; converte para
 * objeto para que `getErrorMessage` mostre a mensagem do servidor.
 */
async function withJsonError<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request()
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const data: unknown = error.response.data
      try {
        if (data instanceof Blob) error.response.data = JSON.parse(await data.text())
        else if (typeof data === 'string' && data) error.response.data = JSON.parse(data)
      } catch {
        // corpo não é JSON: mantém como veio
      }
    }
    throw error
  }
}

function download(
  url: string,
  params: Record<string, unknown>,
  fallback: string,
): Promise<DownloadedFile> {
  return withJsonError(async () => {
    const response = await api.get<Blob>(url, { params, responseType: 'blob', timeout: 60000 })
    return {
      blob: response.data,
      filename: filenameFrom(response.headers['content-disposition'], fallback),
    }
  })
}

function text(url: string): Promise<string> {
  return withJsonError(async () => {
    const { data } = await api.get<string>(url, {
      responseType: 'text',
      transformResponse: (raw: string) => raw,
      timeout: 60000,
    })
    return data
  })
}

/** Relatórios de sessão, semana e fase; análise; pacote para IA e template do plano. */
export const reportService = {
  text(scope: ReportScope, id: string): Promise<string> {
    return text(`/api/reports/${PATH[scope]}/${id}`)
  },
  file(scope: ReportScope, id: string, format: ReportFormat): Promise<DownloadedFile> {
    const params = format === 'txt' ? { download: true } : { format }
    return download(`/api/reports/${PATH[scope]}/${id}`, params, `relatorio.${format}`)
  },
  async analysis(scope: ReportScope, id: string): Promise<AnalysisReport> {
    const { data } = await api.get<AnalysisReport>(`/api/reports/${PATH[scope]}/${id}/analysis`)
    return data
  },
  aiPackageText(phaseId: string): Promise<string> {
    return text(`/api/reports/phases/${phaseId}/ai-package`)
  },
  aiPackageFile(phaseId: string, format: 'md' | 'json'): Promise<DownloadedFile> {
    return download(
      `/api/reports/phases/${phaseId}/ai-package`,
      { format, download: true },
      `pacote-ia.${format}`,
    )
  },
  planTemplate(planId: string): Promise<DownloadedFile> {
    return download(`/api/plans/${planId}/template`, { download: true }, 'plano.json')
  },
  phaseTemplate(phaseId: string): Promise<DownloadedFile> {
    return download(`/api/phases/${phaseId}/template`, { download: true }, 'fase.json')
  },
}
