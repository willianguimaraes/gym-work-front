<script setup lang="ts">
const items = [
  {
    to: 'progression',
    icon: 'insights',
    label: 'Evolução',
    caption: 'Progressão por exercício, volume e frequência',
  },
  {
    to: 'reports',
    icon: 'description',
    label: 'Relatórios',
    caption: 'Semana, fase, TXT/PDF/CSV e pacote para IA',
  },
  {
    to: 'plans',
    icon: 'event_note',
    label: 'Planejamentos',
    caption: 'Fases, semanas e dias de treino',
  },
  {
    to: 'exercises',
    icon: 'fitness_center',
    label: 'Catálogo de exercícios',
    caption: 'Exercícios do sistema e personalizados',
  },
  {
    to: 'profile',
    icon: 'person',
    label: 'Perfil e configurações',
    caption: 'Dados, preferências, senha',
  },
]
</script>

<template>
  <q-page padding>
    <div class="page-container">
      <q-list bordered separator class="rounded-borders">
        <q-item v-for="item in items" :key="item.to" clickable :to="{ name: item.to }">
          <q-item-section avatar><q-icon :name="item.icon" color="primary" /></q-item-section>
          <q-item-section>
            <q-item-label>{{ item.label }}</q-item-label>
            <q-item-label caption>{{ item.caption }}</q-item-label>
          </q-item-section>
          <q-item-section side><q-icon name="chevron_right" /></q-item-section>
        </q-item>
      </q-list>
    </div>
  </q-page>
</template>
