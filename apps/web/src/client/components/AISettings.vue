<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuth } from '../composables/useAuth';
import { fetchModelConfigs, upsertModelConfig, deleteModelConfig, setScenarioDefault, type ModelConfig, type ModelConfigsResponse } from '../api/endpoints';
import ModelFormModal from './ModelFormModal.vue';

const { token } = useAuth();

const models = ref<ModelConfig[]>([]);
const scenarioDefaults = ref<Record<string, string>>({});
const isLoading = ref(true);

// Model form
const showModelForm = ref(false);
const editingModel = ref<ModelConfig | null>(null);

// Confirm delete
const showDeleteConfirm = ref(false);
const deletingModel = ref<ModelConfig | null>(null);

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

const chatModels = computed(() => models.value.filter(m => m.type === 'chat'));
const imageModels = computed(() => models.value.filter(m => m.type === 'image'));

const defaultChatModel = computed(() => models.value.find(m => m.isDefault && m.type === 'chat'));
const defaultImageModel = computed(() => models.value.find(m => m.isDefault && m.type === 'image'));

const scenarios = [
  { key: 'promptTest', label: '提示词测试', desc: '用于 AI 测试功能的默认模型', type: 'chat' as const },
  { key: 'quickAdd', label: '快捷添加', desc: '用于快捷添加提示词的默认模型', type: 'chat' as const },
  { key: 'translation', label: '翻译', desc: '用于翻译功能的默认模型', type: 'chat' as const },
  { key: 'imageTest', label: '图像测试', desc: '用于图像生成测试的默认模型', type: 'image' as const },
];

async function loadData() {
  if (!token.value) return;
  isLoading.value = true;
  try {
    const res = await fetchModelConfigs(token.value);
    models.value = res.data.models;
    scenarioDefaults.value = res.data.scenarioModelDefaults;
  } catch (e) {
    console.error('Failed to load model configs:', e);
  } finally {
    isLoading.value = false;
  }
}

function openAddModel() {
  editingModel.value = null;
  showModelForm.value = true;
}

function openEditModel(model: ModelConfig) {
  editingModel.value = { ...model };
  showModelForm.value = true;
}

async function handleSaveModel(model: ModelConfig) {
  if (!token.value) {
    showToastMsg('未登录，无法保存', 'error');
    return;
  }
  try {
    console.log('[AI Settings] Saving model:', JSON.stringify(model, null, 2));
    const result = await upsertModelConfig(token.value, model);
    console.log('[AI Settings] Save result:', result);
    showToastMsg(editingModel.value ? '模型已更新' : '模型已添加');
    showModelForm.value = false;
    await loadData();
  } catch (e: any) {
    console.error('[AI Settings] Save failed:', e);
    showToastMsg('保存失败: ' + (e.message || '未知错误'), 'error');
  }
}

function confirmDeleteModel(model: ModelConfig) {
  deletingModel.value = model;
  showDeleteConfirm.value = true;
}

async function handleDeleteModel() {
  if (!token.value || !deletingModel.value) return;
  try {
    await deleteModelConfig(token.value, deletingModel.value.id);
    showToastMsg('模型已删除');
    showDeleteConfirm.value = false;
    await loadData();
  } catch (e) {
    showToastMsg('删除失败', 'error');
  }
}

async function handleSetDefault(model: ModelConfig) {
  if (!token.value) return;
  try {
    await upsertModelConfig(token.value, { ...model, isDefault: true });
    showToastMsg('已设为默认');
    await loadData();
  } catch (e) {
    showToastMsg('操作失败', 'error');
  }
}

async function handleScenarioChange(scenario: string, modelId: string) {
  if (!token.value) return;
  try {
    await setScenarioDefault(token.value, scenario, modelId || null);
    scenarioDefaults.value[scenario] = modelId;
    showToastMsg('已更新');
  } catch (e) {
    showToastMsg('操作失败', 'error');
  }
}

function getProviderIcon(provider: string): string {
  const p = provider.toLowerCase();
  if (p.includes('openai') || p.includes('gpt')) return '🟢';
  if (p.includes('anthropic') || p.includes('claude')) return '🟠';
  if (p.includes('google') || p.includes('gemini')) return '🔵';
  if (p.includes('deepseek')) return '🟣';
  return '⚪';
}

onMounted(() => { loadData(); });
</script>

<template>
  <div class="space-y-6">
    <!-- Toast -->
    <Teleport to="body">
      <Transition name="toast">
        <div v-if="showToast" class="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium text-white transition-all" :class="toastType === 'success' ? 'bg-green-500' : 'bg-red-500'">{{ toastMessage }}</div>
      </Transition>
    </Teleport>

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">AI 模型配置</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">管理 AI 模型连接和默认设置</p>
      </div>
      <button @click="openAddModel" class="h-9 px-4 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors flex items-center gap-1.5">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
        添加模型
      </button>
    </div>

    <!-- Status cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div class="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div class="flex items-center gap-2 mb-1">
          <span class="w-2 h-2 rounded-full" :class="chatModels.length > 0 ? 'bg-green-500' : 'bg-gray-300'" />
          <span class="text-xs font-medium text-gray-500">Chat 模型</span>
        </div>
        <p class="text-lg font-bold text-gray-900 dark:text-gray-100">{{ chatModels.length }}</p>
        <p v-if="defaultChatModel" class="text-xs text-gray-400 mt-0.5 truncate">默认: {{ defaultChatModel.name || defaultChatModel.model }}</p>
      </div>
      <div class="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div class="flex items-center gap-2 mb-1">
          <span class="w-2 h-2 rounded-full" :class="imageModels.length > 0 ? 'bg-green-500' : 'bg-gray-300'" />
          <span class="text-xs font-medium text-gray-500">图像模型</span>
        </div>
        <p class="text-lg font-bold text-gray-900 dark:text-gray-100">{{ imageModels.length }}</p>
        <p v-if="defaultImageModel" class="text-xs text-gray-400 mt-0.5 truncate">默认: {{ defaultImageModel.name || defaultImageModel.model }}</p>
      </div>
      <div class="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div class="flex items-center gap-2 mb-1">
          <span class="w-2 h-2 rounded-full" :class="scenarioDefaults.translation ? 'bg-green-500' : 'bg-gray-300'" />
          <span class="text-xs font-medium text-gray-500">翻译能力</span>
        </div>
        <p class="text-sm font-medium" :class="scenarioDefaults.translation ? 'text-green-600' : 'text-gray-400'">{{ scenarioDefaults.translation ? '已配置' : '未配置' }}</p>
      </div>
      <div class="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div class="flex items-center gap-2 mb-1">
          <span class="w-2 h-2 rounded-full" :class="scenarioDefaults.quickAdd ? 'bg-green-500' : 'bg-gray-300'" />
          <span class="text-xs font-medium text-gray-500">快捷添加</span>
        </div>
        <p class="text-sm font-medium" :class="scenarioDefaults.quickAdd ? 'text-green-600' : 'text-gray-400'">{{ scenarioDefaults.quickAdd ? '已配置' : '未配置' }}</p>
      </div>
    </div>

    <!-- Scenario Defaults -->
    <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">场景默认模型</h3>
      <div class="space-y-3">
        <div v-for="s in scenarios" :key="s.key" class="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
          <div>
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ s.label }}</p>
            <p class="text-xs text-gray-400">{{ s.desc }}</p>
          </div>
          <select
            :value="scenarioDefaults[s.key] || ''"
            @change="handleScenarioChange(s.key, ($event.target as HTMLSelectElement).value)"
            class="w-64 h-9 px-3 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
          >
            <option value="">跟随全局默认</option>
            <option v-for="m in models.filter(m => m.type === s.type)" :key="m.id" :value="m.id">
              {{ getProviderIcon(m.provider) }} {{ m.name || m.model }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Model List -->
    <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">已配置模型</h3>
      </div>

      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <div class="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>

      <div v-else-if="models.length === 0" class="text-center py-12 text-gray-400 text-sm">
        <p>暂无已配置模型</p>
        <p class="text-xs mt-1">点击"添加模型"开始配置</p>
      </div>

      <div v-else>
        <div v-for="model in models" :key="model.id" class="flex items-center gap-4 px-5 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
          <span class="text-lg">{{ getProviderIcon(model.provider) }}</span>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{{ model.name || model.model }}</span>
              <span v-if="model.isDefault" class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">默认</span>
              <span class="px-1.5 py-0.5 rounded text-[10px] font-medium" :class="model.type === 'chat' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'">{{ model.type === 'chat' ? 'Chat' : 'Image' }}</span>
              <span class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">{{ model.apiProtocol }}</span>
            </div>
            <p class="text-xs text-gray-400 truncate mt-0.5">{{ model.provider }} / {{ model.model }}</p>
          </div>
          <div class="flex items-center gap-1 flex-shrink-0">
            <button @click="handleSetDefault(model)" class="p-1.5 rounded-lg text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 transition-colors" title="设为默认">
              <svg class="w-4 h-4" :class="model.isDefault ? 'fill-yellow-400 text-yellow-400' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
            </button>
            <button @click="openEditModel(model)" class="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors" title="编辑">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </button>
            <button @click="confirmDeleteModel(model)" class="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="删除">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Model Form Modal -->
    <ModelFormModal :isOpen="showModelForm" :model="editingModel" @close="showModelForm = false" @save="handleSaveModel" />

    <!-- Delete Confirm -->
    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" @click.self="showDeleteConfirm = false">
        <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
          <div class="px-6 py-5">
            <p class="text-sm text-gray-700 dark:text-gray-300">确定要删除模型「{{ deletingModel?.name || deletingModel?.model }}」吗？</p>
          </div>
          <div class="flex items-center justify-end gap-2 px-6 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <button @click="showDeleteConfirm = false" class="h-9 px-4 text-sm font-medium text-gray-700 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">取消</button>
            <button @click="handleDeleteModel" class="h-9 px-4 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors">删除</button>
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
