<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useAuth } from '../composables/useAuth';
import { getPrompts, copyPrompt, deletePrompt, updatePrompt, getPromptVersions, type PromptData } from '../api/prompts';
import type { PromptVersion } from '@prompthub/shared';
import CreatePromptModal from '../components/CreatePromptModal.vue';
import EditPromptModal from '../components/EditPromptModal.vue';
import AiTestModal from '../components/AiTestModal.vue';

const emit = defineEmits<{
  back: [];
}>();

const props = defineProps<{
  folderId?: string;
}>();

const { token } = useAuth();

const prompts = ref<PromptData[]>([]);
const isLoading = ref(true);
const searchQuery = ref('');
const showFavoritesOnly = ref(false);
const viewMode = ref<'table' | 'card'>('card');
const selectedPrompt = ref<PromptData | null>(null);

// Modals
const showCreateModal = ref(false);
const showEditModal = ref(false);
const editingPrompt = ref<PromptData | null>(null);
const showAiTestModal = ref(false);
const aiTestPrompt = ref<PromptData | null>(null);

// Version history modal
const showVersionModal = ref(false);
const versions = ref<PromptVersion[]>([]);
const isLoadingVersions = ref(false);

// Confirm dialog
const showConfirmDialog = ref(false);
const confirmMessage = ref('');
const confirmAction = ref<() => void>(() => {});

// Toast
const toastMessage = ref('');
const toastType = ref<'success' | 'error'>('success');
const showToast = ref(false);

function showToastMsg(msg: string, type: 'success' | 'error' = 'success') {
  toastMessage.value = msg;
  toastType.value = type;
  showToast.value = true;
  setTimeout(() => { showToast.value = false; }, 2500);
}

async function loadPrompts() {
  if (!token.value) return;
  isLoading.value = true;
  try {
    const res = await getPrompts(token.value, {
      keyword: searchQuery.value || undefined,
      isFavorite: showFavoritesOnly.value || undefined,
      folderId: props.folderId || undefined,
    });
    prompts.value = res.data;
  } catch (e) {
    console.error('Failed to load prompts:', e);
    showToastMsg('加载失败', 'error');
  } finally {
    isLoading.value = false;
  }
}

async function handleCopy(prompt: PromptData) {
  if (!token.value) return;
  try {
    await copyPrompt(token.value, prompt.id);
    showToastMsg('复制成功');
    await loadPrompts();
  } catch (e) {
    showToastMsg('复制失败', 'error');
  }
}

async function handleFavorite(prompt: PromptData) {
  if (!token.value) return;
  try {
    await updatePrompt(token.value, prompt.id, { isFavorite: !prompt.isFavorite });
    prompt.isFavorite = !prompt.isFavorite;
    showToastMsg(prompt.isFavorite ? '已收藏' : '已取消收藏');
  } catch (e) {
    showToastMsg('操作失败', 'error');
  }
}

function confirmDelete(prompt: PromptData) {
  confirmMessage.value = `确定要删除「${prompt.title}」吗？`;
  confirmAction.value = async () => {
    if (!token.value) return;
    try {
      await deletePrompt(token.value, prompt.id);
      showToastMsg('已删除');
      if (selectedPrompt.value?.id === prompt.id) selectedPrompt.value = null;
      await loadPrompts();
    } catch (e) {
      showToastMsg('删除失败', 'error');
    }
  };
  showConfirmDialog.value = true;
}

function openEdit(prompt: PromptData) {
  editingPrompt.value = prompt;
  showEditModal.value = true;
}

function handleCreated() {
  showCreateModal.value = false;
  showToastMsg('创建成功');
  loadPrompts();
}

function handleSaved() {
  showEditModal.value = false;
  showToastMsg('保存成功');
  loadPrompts();
}

async function openVersions(prompt: PromptData) {
  if (!token.value) return;
  selectedPrompt.value = prompt;
  isLoadingVersions.value = true;
  showVersionModal.value = true;
  try {
    const res = await getPromptVersions(token.value, prompt.id);
    versions.value = res.data;
  } catch (e) {
    showToastMsg('加载版本失败', 'error');
  } finally {
    isLoadingVersions.value = false;
  }
}

function handleAiTest(prompt: PromptData) {
  aiTestPrompt.value = prompt;
  showAiTestModal.value = true;
}

function handleAiTestSaved(response: string) {
  showToastMsg('AI 响应已保存');
  loadPrompts();
}

function getVariableCount(prompt: PromptData): number {
  const regex = /\{\{([^}]+)\}\}/g;
  const matches = new Set<string>();
  let match;
  const text = (prompt.systemPrompt || '') + prompt.userPrompt + (prompt.systemPromptEn || '') + (prompt.userPromptEn || '');
  while ((match = regex.exec(text)) !== null) { matches.add(match[1]); }
  return matches.size;
}

function getVariables(prompt: PromptData): string[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const matches = new Set<string>();
  let match;
  const text = (prompt.systemPrompt || '') + prompt.userPrompt + (prompt.systemPromptEn || '') + (prompt.userPromptEn || '');
  while ((match = regex.exec(text)) !== null) { matches.add(match[1]); }
  return Array.from(matches).slice(0, 4);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('zh-CN');
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('zh-CN');
}

watch(() => props.folderId, () => { loadPrompts(); });
onMounted(() => { loadPrompts(); });
</script>

<template>
  <div class="flex flex-col h-full bg-gray-50 dark:bg-gray-950">
    <!-- Toast -->
    <Teleport to="body">
      <Transition name="toast">
        <div v-if="showToast" class="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium text-white transition-all" :class="toastType === 'success' ? 'bg-green-500' : 'bg-red-500'">{{ toastMessage }}</div>
      </Transition>
    </Teleport>

    <!-- Top bar -->
    <header class="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shrink-0">
      <button @click="emit('back')" class="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors flex-shrink-0">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
      </button>
      <div class="flex items-center gap-2 flex-1 max-w-xl">
        <input v-model="searchQuery" @keyup.enter="loadPrompts" type="text" placeholder="输入关键词搜索您想要的提示词" class="flex-1 h-9 px-3 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
        <button @click="loadPrompts" class="h-9 px-5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors flex-shrink-0">搜索</button>
        <label class="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 cursor-pointer whitespace-nowrap">
          <input v-model="showFavoritesOnly" @change="loadPrompts" type="checkbox" class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
          我收藏的
        </label>
      </div>
      <div class="flex-1" />
      <div class="flex items-center gap-2 flex-shrink-0">
        <div class="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
          <button @click="viewMode = 'table'" class="p-1.5 rounded-md transition-colors" :class="viewMode === 'table' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-400 hover:text-gray-600'">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
          </button>
          <button @click="viewMode = 'card'" class="p-1.5 rounded-md transition-colors" :class="viewMode === 'card' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-400 hover:text-gray-600'">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
          </button>
        </div>
        <button @click="showCreateModal = true" class="h-9 px-4 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors flex items-center gap-1.5">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
          新建
        </button>
      </div>
    </header>

    <!-- Content -->
    <div class="flex-1 overflow-auto p-5">
      <div v-if="isLoading" class="flex items-center justify-center h-40"><div class="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      <div v-else-if="prompts.length === 0" class="flex flex-col items-center justify-center h-40 text-gray-400">
        <svg class="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
        <p class="text-sm">暂无提示词</p>
      </div>

      <!-- Table view -->
      <div v-else-if="viewMode === 'table'" class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <table class="w-full text-sm">
          <thead><tr class="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
            <th class="px-4 py-2.5 text-left text-xs font-medium text-gray-500 w-12">序号</th>
            <th class="px-4 py-2.5 text-left text-xs font-medium text-gray-500">标题</th>
            <th class="px-4 py-2.5 text-left text-xs font-medium text-gray-500">用户提示词</th>
            <th class="px-4 py-2.5 text-left text-xs font-medium text-gray-500">AI响应</th>
            <th class="px-4 py-2.5 text-center text-xs font-medium text-gray-500 w-16">变量</th>
            <th class="px-4 py-2.5 text-center text-xs font-medium text-gray-500 w-16">使用次数</th>
            <th class="px-4 py-2.5 text-left text-xs font-medium text-gray-500 w-56">操作</th>
          </tr></thead>
          <tbody>
            <tr v-for="(prompt, index) in prompts" :key="prompt.id" class="border-b border-gray-100 last:border-b-0 hover:bg-blue-50/30 transition-colors cursor-pointer" :class="selectedPrompt?.id === prompt.id ? 'bg-blue-50/50' : ''" @click="selectedPrompt = prompt">
              <td class="px-4 py-2.5 text-gray-400 text-xs">{{ index + 1 }}</td>
              <td class="px-4 py-2.5"><span class="font-medium text-sm text-blue-600">{{ prompt.title }}</span></td>
              <td class="px-4 py-2.5"><span class="text-xs text-gray-500 line-clamp-1 block max-w-[280px]">{{ prompt.userPrompt || '-' }}</span></td>
              <td class="px-4 py-2.5"><span class="text-xs text-gray-400">-</span></td>
              <td class="px-4 py-2.5 text-center"><span class="text-xs" :class="getVariableCount(prompt) > 0 ? 'text-blue-600 font-medium' : 'text-gray-400'">{{ getVariableCount(prompt) || '-' }}</span></td>
              <td class="px-4 py-2.5 text-center text-xs text-gray-500">{{ prompt.usageCount || 0 }}</td>
              <td class="px-4 py-2.5" @click.stop>
                <div class="flex items-center gap-0.5">
                  <button @click="handleCopy(prompt)" class="text-xs text-blue-600 hover:text-blue-700 px-1 py-0.5">复制</button>
                  <button @click="handleAiTest(prompt)" class="text-xs text-blue-600 hover:text-blue-700 px-1 py-0.5">AI测试</button>
                  <button @click="openVersions(prompt)" class="text-xs text-blue-600 hover:text-blue-700 px-1 py-0.5">历史版本</button>
                  <button @click="handleFavorite(prompt)" class="text-xs px-1 py-0.5" :class="prompt.isFavorite ? 'text-yellow-500' : 'text-blue-600 hover:text-blue-700'">{{ prompt.isFavorite ? '已收藏' : '收藏' }}</button>
                  <button @click="openEdit(prompt)" class="text-xs text-blue-600 hover:text-blue-700 px-1 py-0.5">编辑</button>
                  <button @click="confirmDelete(prompt)" class="text-xs text-red-500 hover:text-red-600 px-1 py-0.5">删除</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Card view -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div v-for="prompt in prompts" :key="prompt.id" class="bg-white dark:bg-gray-900 rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-lg group flex flex-col" :class="selectedPrompt?.id === prompt.id ? 'ring-2 ring-blue-400 border-blue-400 shadow-md' : 'border-gray-200 shadow-sm hover:border-gray-300'" @click="selectedPrompt = prompt">
          <div class="flex items-center justify-between px-4 pt-4 pb-2">
            <div class="flex items-center gap-2 min-w-0 flex-1">
              <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              <h3 class="font-semibold text-sm text-gray-900 truncate" :title="prompt.title">{{ prompt.title }}</h3>
            </div>
            <button @click.stop="handleFavorite(prompt)" class="flex-shrink-0 p-1 transition-transform hover:scale-110">
              <svg class="w-4 h-4" :class="prompt.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 group-hover:text-gray-400'" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
            </button>
          </div>
          <div v-if="getVariableCount(prompt) > 0" class="flex flex-wrap gap-1.5 px-4 pb-2">
            <span v-for="v in getVariables(prompt)" :key="v" class="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-[11px] text-blue-600 font-medium border border-blue-100" v-text="'{{' + v + '}}'" />
            <span v-if="getVariableCount(prompt) > 4" class="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-[11px] text-gray-500">+{{ getVariableCount(prompt) - 4 }}</span>
          </div>
          <div class="px-4 pb-2 space-y-1.5 flex-1">
            <p v-if="prompt.systemPrompt" class="text-xs text-gray-400 line-clamp-2" :title="prompt.systemPrompt"><span class="font-medium text-gray-500">系统提示词</span> {{ prompt.systemPrompt }}</p>
            <p v-if="prompt.userPrompt" class="text-xs text-gray-500 line-clamp-2" :title="prompt.userPrompt"><span class="font-medium text-gray-600">用户提示词</span> {{ prompt.userPrompt }}</p>
          </div>
          <div class="flex items-center justify-between px-4 py-3 border-t border-gray-100 mt-auto" @click.stop>
            <span class="text-xs text-gray-400">{{ formatDate(prompt.updatedAt) }}</span>
            <div class="flex items-center gap-0.5">
              <button @click="handleCopy(prompt)" class="text-xs text-blue-600 hover:text-blue-700 px-1.5 py-0.5 rounded hover:bg-blue-50 transition-colors">复制</button>
              <button @click="openEdit(prompt)" class="text-xs text-blue-600 hover:text-blue-700 px-1.5 py-0.5 rounded hover:bg-blue-50 transition-colors">编辑</button>
              <button @click="handleAiTest(prompt)" class="text-xs text-blue-600 hover:text-blue-700 px-1.5 py-0.5 rounded hover:bg-blue-50 transition-colors">AI测试</button>
              <button @click="confirmDelete(prompt)" class="text-xs text-red-500 hover:text-red-600 px-1.5 py-0.5 rounded hover:bg-red-50 transition-colors">删除</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Modal -->
    <CreatePromptModal :isOpen="showCreateModal" :defaultFolderId="folderId" @close="showCreateModal = false" @created="handleCreated" />

    <!-- Edit Modal -->
    <EditPromptModal :isOpen="showEditModal" :prompt="editingPrompt" @close="showEditModal = false" @saved="handleSaved" />

    <!-- AI Test Modal -->
    <AiTestModal :isOpen="showAiTestModal" :prompt="aiTestPrompt" @close="showAiTestModal = false" @saved="handleAiTestSaved" />

    <!-- Version History Modal -->
    <Teleport to="body">
      <div v-if="showVersionModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" @click.self="showVersionModal = false">
        <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
            <h3 class="text-base font-semibold text-gray-900">历史版本 - {{ selectedPrompt?.title }}</h3>
            <button @click="showVersionModal = false" class="p-1 rounded-lg hover:bg-gray-100 transition-colors"><svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
          <div class="px-6 py-4 max-h-80 overflow-y-auto">
            <div v-if="isLoadingVersions" class="flex items-center justify-center py-8"><div class="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
            <div v-else-if="versions.length === 0" class="text-center py-8 text-gray-400 text-sm">暂无历史版本</div>
            <div v-else class="space-y-2">
              <div v-for="v in versions" :key="v.id" class="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                <div>
                  <p class="text-sm font-medium text-gray-900">版本 {{ v.version }}</p>
                  <p class="text-xs text-gray-400 mt-0.5">{{ formatDateTime(v.createdAt) }}</p>
                  <p v-if="v.note" class="text-xs text-gray-500 mt-0.5">{{ v.note }}</p>
                </div>
              </div>
            </div>
          </div>
          <div class="flex justify-end px-6 py-3 border-t border-gray-100 bg-gray-50"><button @click="showVersionModal = false" class="h-9 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">关闭</button></div>
        </div>
      </div>
    </Teleport>

    <!-- Confirm Dialog -->
    <Teleport to="body">
      <div v-if="showConfirmDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" @click.self="showConfirmDialog = false">
        <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
          <div class="px-6 py-5"><p class="text-sm text-gray-700">{{ confirmMessage }}</p></div>
          <div class="flex items-center justify-end gap-2 px-6 py-3 border-t border-gray-100 bg-gray-50">
            <button @click="showConfirmDialog = false" class="h-9 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">取消</button>
            <button @click="confirmAction(); showConfirmDialog = false" class="h-9 px-4 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors">确定删除</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-10px); }
</style>
