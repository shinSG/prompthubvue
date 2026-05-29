<script setup lang="ts">
import { ref } from 'vue';
import AppLayout from '../components/AppLayout.vue';
import WorkspaceHome from './WorkspaceHome.vue';
import PromptList from './PromptList.vue';
import SettingsPage from './SettingsPage.vue';

const currentPage = ref('home');
const selectedFolderId = ref<string | undefined>(undefined);

function handleNavigate(page: string, folderId?: string) {
  currentPage.value = page;
  selectedFolderId.value = folderId;
}

function handleBack() {
  currentPage.value = 'home';
  selectedFolderId.value = undefined;
}
</script>

<template>
  <AppLayout :currentPage="currentPage" @navigate="handleNavigate">
    <WorkspaceHome v-if="currentPage === 'home'" @navigate="handleNavigate" />
    <PromptList v-else-if="currentPage === 'prompts'" :folderId="selectedFolderId" @back="handleBack" />
    <SettingsPage v-else-if="currentPage === 'settings'" @back="handleBack" />
  </AppLayout>
</template>
