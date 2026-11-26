<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="flex flex-center q-pa-md">
        <div class="page-container" style="max-width: 420px">
          <div class="text-center q-mb-lg">
            <q-icon name="fitness_center" size="56px" color="primary" />
            <div class="text-h5 text-weight-bold q-mt-sm">Gym Work</div>
          </div>
          <router-view />
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>
