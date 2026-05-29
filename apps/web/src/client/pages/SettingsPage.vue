<script setup lang="ts">
import { ref } from 'vue';
import AISettings from '../components/AISettings.vue';

const emit = defineEmits<{
  back: [];
}>();

const activeSection = ref('ai');

const menuItems = [
  { key: 'ai', label: 'AI 模型', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
  { key: 'general', label: '通用', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
];
</script>

<template>
  <div class="flex flex-col h-full bg-gray-50 dark:bg-gray-950">
    <!-- Top bar -->
    <header class="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shrink-0">
      <button @click="emit('back')" class="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors flex-shrink-0">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
      </button>
      <span class="text-sm font-medium text-gray-900 dark:text-gray-100">设置</span>
    </header>

    <!-- Content -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Sidebar nav -->
      <aside class="w-48 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shrink-0 py-3 px-2">
        <button
          v-for="item in menuItems"
          :key="item.key"
          @click="activeSection = item.key"
          class="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors"
          :class="activeSection === item.key ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'"
        >
          <svg class="w-4 h-4 flex-shrink-0" :class="activeSection === item.key ? 'text-blue-500' : 'text-gray-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
          </svg>
          <span>{{ item.label }}</span>
        </button>
      </aside>

      <!-- Main content -->
      <div class="flex-1 overflow-y-auto">
        <div class="max-w-4xl mx-auto p-6">
          <AISettings v-if="activeSection === 'ai'" />
          <div v-else class="text-center py-20 text-gray-400 text-sm">{{ menuItems.find(m => m.key === activeSection)?.label }} 页面开发中...</div>
        </div>
      </div>
    </div>
  </div>
</template>
