<template>
  <div class="fullscreen flex flex-center column q-pa-md text-center">
    <div class="text-h2 text-weight-bold text-primary">404</div>
    <div class="text-subtitle1 q-mb-lg">Página não encontrada</div>
    <q-btn :to="{ name: 'home' }" label="Voltar ao início" color="primary" unelevated />
  </div>
</template>
