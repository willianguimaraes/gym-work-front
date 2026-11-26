import type { RouteRecordRaw } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    guestOnly?: boolean
    title?: string
    /** Rota de volta exibida no cabeçalho (telas internas). */
    back?: string
  }
}

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('@/pages/HomePage.vue'),
        meta: { title: 'Início' },
      },
      {
        path: 'treinar',
        name: 'train',
        component: () => import('@/pages/workout/TrainPage.vue'),
        meta: { title: 'Treinar' },
      },
      {
        path: 'treino/:id',
        name: 'session',
        component: () => import('@/pages/workout/SessionPage.vue'),
        meta: { title: 'Treino', back: 'train' },
      },
      {
        path: 'historico',
        name: 'history',
        component: () => import('@/pages/workout/HistoryPage.vue'),
        meta: { title: 'Histórico' },
      },
      {
        path: 'avaliacao',
        name: 'assessments',
        component: () => import('@/pages/assessment/AssessmentsPage.vue'),
        meta: { title: 'Avaliação física' },
      },
      {
        path: 'avaliacao/nova',
        name: 'assessment-new',
        component: () => import('@/pages/assessment/AssessmentFormPage.vue'),
        meta: { title: 'Nova avaliação', back: 'assessments' },
      },
      {
        path: 'avaliacao/comparar',
        name: 'assessment-compare',
        component: () => import('@/pages/assessment/AssessmentComparePage.vue'),
        meta: { title: 'Comparar avaliações', back: 'assessments' },
      },
      {
        path: 'avaliacao/:id',
        name: 'assessment',
        component: () => import('@/pages/assessment/AssessmentDetailPage.vue'),
        meta: { title: 'Avaliação', back: 'assessments' },
      },
      {
        path: 'avaliacao/:id/editar',
        name: 'assessment-edit',
        component: () => import('@/pages/assessment/AssessmentFormPage.vue'),
        meta: { title: 'Editar avaliação', back: 'assessments' },
      },
      {
        path: 'evolucao',
        name: 'progression',
        component: () => import('@/pages/progression/ProgressionPage.vue'),
        meta: { title: 'Evolução', back: 'more' },
      },
      {
        path: 'relatorios',
        name: 'reports',
        component: () => import('@/pages/report/ReportsPage.vue'),
        meta: { title: 'Relatórios', back: 'more' },
      },
      {
        path: 'relatorios/:scope(sessao|semana|fase)/:id',
        name: 'report',
        component: () => import('@/pages/report/ReportPage.vue'),
        meta: { title: 'Relatório', back: 'reports' },
      },
      {
        path: 'mais',
        name: 'more',
        component: () => import('@/pages/MorePage.vue'),
        meta: { title: 'Mais' },
      },
      {
        path: 'planos',
        name: 'plans',
        component: () => import('@/pages/training/PlansPage.vue'),
        meta: { title: 'Planejamentos', back: 'more' },
      },
      {
        path: 'planos/:id',
        name: 'plan',
        component: () => import('@/pages/training/PlanDetailPage.vue'),
        meta: { title: 'Planejamento', back: 'plans' },
      },
      {
        path: 'fases/:id',
        name: 'phase',
        component: () => import('@/pages/training/PhaseDetailPage.vue'),
        meta: { title: 'Fase', back: 'plans' },
      },
      {
        path: 'dias/:id',
        name: 'day',
        component: () => import('@/pages/training/DayDetailPage.vue'),
        meta: { title: 'Dia de treino', back: 'plans' },
      },
      {
        path: 'exercicios',
        name: 'exercises',
        component: () => import('@/pages/exercise/ExercisesPage.vue'),
        meta: { title: 'Exercícios', back: 'more' },
      },
      {
        path: 'exercicios/novo',
        name: 'exercise-new',
        component: () => import('@/pages/exercise/ExerciseFormPage.vue'),
        meta: { title: 'Novo exercício', back: 'exercises' },
      },
      {
        path: 'exercicios/:id',
        name: 'exercise',
        component: () => import('@/pages/exercise/ExerciseDetailPage.vue'),
        meta: { title: 'Exercício', back: 'exercises' },
      },
      {
        path: 'exercicios/:id/editar',
        name: 'exercise-edit',
        component: () => import('@/pages/exercise/ExerciseFormPage.vue'),
        meta: { title: 'Editar exercício', back: 'exercises' },
      },
      {
        path: 'perfil',
        name: 'profile',
        component: () => import('@/pages/account/ProfilePage.vue'),
        meta: { title: 'Perfil', back: 'more' },
      },
      {
        path: 'perfil/dados',
        name: 'personal-data',
        component: () => import('@/pages/account/PersonalDataPage.vue'),
        meta: { title: 'Dados pessoais', back: 'profile' },
      },
      {
        path: 'perfil/preferencias',
        name: 'preferences',
        component: () => import('@/pages/account/PreferencesPage.vue'),
        meta: { title: 'Preferências', back: 'profile' },
      },
      {
        path: 'perfil/senha',
        name: 'change-password',
        component: () => import('@/pages/account/ChangePasswordPage.vue'),
        meta: { title: 'Alterar senha', back: 'profile' },
      },
    ],
  },
  {
    path: '/',
    component: () => import('@/layouts/AuthLayout.vue'),
    meta: { guestOnly: true },
    children: [
      { path: 'login', name: 'login', component: () => import('@/pages/auth/LoginPage.vue') },
      {
        path: 'cadastro',
        name: 'register',
        component: () => import('@/pages/auth/RegisterPage.vue'),
      },
      {
        path: 'esqueci-senha',
        name: 'forgot-password',
        component: () => import('@/pages/auth/ForgotPasswordPage.vue'),
      },
      {
        // Aberto pelo link do e-mail; funciona com ou sem sessão ativa
        path: 'redefinir-senha',
        name: 'reset-password',
        component: () => import('@/pages/auth/ResetPasswordPage.vue'),
        meta: { guestOnly: false },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/pages/NotFoundPage.vue'),
  },
]
