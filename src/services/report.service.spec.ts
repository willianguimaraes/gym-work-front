import { describe, expect, it } from 'vitest'
import { filenameFrom } from './report.service'

describe('filenameFrom', () => {
  it('lê o nome do Content-Disposition (simples ou UTF-8)', () => {
    expect(filenameFrom('attachment; filename="relatorio-fase-1.pdf"', 'x.pdf')).toBe(
      'relatorio-fase-1.pdf',
    )
    expect(filenameFrom("attachment; filename*=UTF-8''pacote%20ia.md", 'x.md')).toBe('pacote ia.md')
    expect(filenameFrom('attachment; filename=plano.json', 'x.json')).toBe('plano.json')
  })

  it('usa o nome padrão quando não há cabeçalho', () => {
    expect(filenameFrom(undefined, 'relatorio.txt')).toBe('relatorio.txt')
    expect(filenameFrom('inline', 'relatorio.txt')).toBe('relatorio.txt')
  })
})
