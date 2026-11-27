import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios'
import { describe, expect, it } from 'vitest'
import { getErrorMessage, getFieldErrors, isNetworkError } from './api'

function axiosError(status?: number, data?: unknown): AxiosError {
  const response = status
    ? ({
        status,
        data,
        statusText: '',
        headers: {},
        config: { headers: new AxiosHeaders() },
      } as AxiosResponse)
    : undefined
  return new AxiosError('falhou', 'ERR', undefined, undefined, response)
}

describe('isNetworkError', () => {
  it('sem resposta, gateway sem o servidor e 5xx sem ProblemDetail contam como falta de rede', () => {
    expect(isNetworkError(axiosError())).toBe(true)
    expect(isNetworkError(axiosError(502))).toBe(true)
    expect(isNetworkError(axiosError(504, '<html>'))).toBe(true)
    expect(isNetworkError(axiosError(500, 'erro do proxy'))).toBe(true)
  })

  it('respostas da API (inclusive 500 com ProblemDetail) não são falta de rede', () => {
    expect(isNetworkError(axiosError(400, { status: 400, detail: 'inválido' }))).toBe(false)
    expect(isNetworkError(axiosError(401))).toBe(false)
    expect(isNetworkError(axiosError(500, { status: 500, detail: 'erro' }))).toBe(false)
    expect(isNetworkError(new Error('outro'))).toBe(false)
  })
})

describe('mensagens de erro', () => {
  it('usa os erros por campo, o detail ou a mensagem padrão', () => {
    const fields = axiosError(400, { status: 400, detail: 'x', errors: { reps: 'Obrigatório' } })
    expect(getErrorMessage(fields)).toBe('Obrigatório')
    expect(getFieldErrors(fields)).toEqual({ reps: 'Obrigatório' })
    expect(getErrorMessage(axiosError(404, { status: 404, detail: 'Sessão não encontrada' }))).toBe(
      'Sessão não encontrada',
    )
    expect(getErrorMessage(axiosError(503))).toBe('Sem conexão com o servidor.')
    expect(getErrorMessage(new Error('?'))).toBe('Algo deu errado. Tente novamente.')
  })
})
