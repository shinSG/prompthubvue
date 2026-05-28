<script setup lang="ts">
import { ref } from 'vue';
import AppLayout from '../components/AppLayout.vue';
import WorkspaceHome from './WorkspaceHome.vue';
import PromptList from './PromptList.vue';

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
    <div v-else-if="currentPage === 'settings'" class="flex items-center justify-center h-full text-gray-400">
      <p>设置页面（待实现）</p>
    </div>
  </AppLayout>
</template>
