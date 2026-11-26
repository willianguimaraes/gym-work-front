/** Regras de validação reutilizáveis para os componentes de formulário do Quasar. */
type Rule = (value: string) => true | string

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const rules = {
  required: ((v) => !!v?.trim() || 'Campo obrigatório') as Rule,
  email: ((v) => EMAIL_REGEX.test(v) || 'E-mail inválido') as Rule,
  minLength:
    (min: number): Rule =>
    (v) =>
      (v?.length ?? 0) >= min || `Mínimo de ${min} caracteres`,
  maxLength:
    (max: number): Rule =>
    (v) =>
      (v?.length ?? 0) <= max || `Máximo de ${max} caracteres`,
}
