<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuth } from '../composables/useAuth';
import { fetchFolders } from '../api/endpoints';
import type { Folder } from '@prompthub/shared';

const emit = defineEmits<{
  navigate: [page: string, folderId?: string];
}>();

const { token } = useAuth();

const folders = ref<Folder[]>([]);
const isLoading = ref(true);

async function loadFolders() {
  if (!token.value) return;
  isLoading.value = true;
  try {
    const res = await fetchFolders(token.value, 'all');
    folders.value = res.data;
  } catch (e) {
    console.error('Failed to load folders:', e);
  } finally {
    isLoading.value = false;
  }
}

function openFolder(folderId: string) {
  emit('navigate', 'prompts', folderId);
}

function openAllPrompts() {
  emit('navigate', 'prompts');
}

onMounted(() => {
  loadFolders();
});
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Top bar -->
    <header class="flex items-center gap-4 px-6 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <span class="text-gray-900 dark:text-gray-100 font-medium">提示词管理</span>
      </div>
      <div class="flex-1" />
    </header>

    <!-- Content -->
    <div class="flex-1 overflow-auto p-6">
      <!-- Action bar -->
      <div class="flex items-center gap-3 mb-6">
        <button
          @click="openAllPrompts"
          class="h-9 px-4 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          新建工作区
        </button>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="flex items-center justify-center h-40">
        <div class="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>

      <!-- Workspace cards -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <!-- All prompts card -->
        <div
          class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 group"
          @click="openAllPrompts"
        >
          <div class="h-32 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 flex items-center justify-center">
            <div class="w-16 h-16 rounded-2xl bg-white/80 dark:bg-gray-800/80 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
          </div>
          <div class="flex items-center justify-between px-4 py-3">
            <span class="text-sm font-medium text-gray-900 dark:text-gray-100">全部提示词</span>
            <button class="h-7 px-3 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors">
              查看
            </button>
          </div>
        </div>

        <!-- Folder cards -->
        <div
          v-for="folder in folders"
          :key="folder.id"
          class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 group"
          @click="openFolder(folder.id)"
        >
          <div class="h-32 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 flex items-center justify-center">
            <div class="w-16 h-16 rounded-2xl bg-white/80 dark:bg-gray-800/80 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <span class="text-3xl">{{ folder.icon || '📁' }}</span>
            </div>
          </div>
          <div class="flex items-center justify-between px-4 py-3">
            <span class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{{ folder.name }}</span>
            <button class="h-7 px-3 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors">
              查看
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
