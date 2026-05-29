<script setup lang="ts">
import { ref, watch } from 'vue';
import type { ModelConfig } from '../api/endpoints';

const props = defineProps<{
  isOpen: boolean;
  model: ModelConfig | null;
}>();

const emit = defineEmits<{
  close: [];
  save: [model: ModelConfig];
}>();

const PROVIDER_OPTIONS = [
  { value: 'OpenAI', protocol: 'openai', url: 'https://api.openai.com/v1' },
  { value: 'Anthropic', protocol: 'anthropic', url: 'https://api.anthropic.com' },
  { value: 'Google Gemini', protocol: 'gemini', url: 'https://generativelanguage.googleapis.com/v1beta' },
  { value: 'DeepSeek', protocol: 'openai', url: 'https://api.deepseek.com/v1' },
  { value: 'Moonshot', protocol: 'openai', url: 'https://api.moonshot.cn/v1' },
  { value: 'Zhipu', protocol: 'openai', url: 'https://open.bigmodel.cn/api/paas/v4' },
  { value: 'Qwen', protocol: 'openai', url: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  { value: 'Doubao', protocol: 'openai', url: 'https://ark.cn-beijing.volces.com/api/v3' },
  { value: 'xAI', protocol: 'openai', url: 'https://api.x.ai/v1' },
  { value: 'Custom', protocol: 'openai', url: '' },
];

// Form state
const formType = ref<'chat' | 'image'>('chat');
const formName = ref('');
const formProvider = ref('OpenAI');
const formProtocol = ref<'openai' | 'gemini' | 'anthropic'>('openai');
const formApiKey = ref('');
const formApiUrl = ref('https://api.openai.com/v1');
const formModel = ref('');
const formIsDefault = ref(false);

// Chat params
const temperature = ref(0.7);
const maxTokens = ref(2048);
const stream = ref(false);

const isEditing = ref(false);

function initForm() {
  if (props.model) {
    isEditing.value = true;
    formType.value = props.model.type;
    formName.value = props.model.name || '';
    formProvider.value = props.model.provider;
    formProtocol.value = props.model.apiProtocol;
    formApiKey.value = props.model.apiKey;
    formApiUrl.value = props.model.apiUrl;
    formModel.value = props.model.model;
    formIsDefault.value = props.model.isDefault || false;
    if (props.model.chatParams) {
      temperature.value = (props.model.chatParams.temperature as number) ?? 0.7;
      maxTokens.value = (props.model.chatParams.max_tokens as number) ?? 2048;
      stream.value = (props.model.chatParams.stream as boolean) ?? false;
    }
  } else {
    isEditing.value = false;
    formType.value = 'chat';
    formName.value = '';
    formProvider.value = 'OpenAI';
    formProtocol.value = 'openai';
    formApiKey.value = '';
    formApiUrl.value = 'https://api.openai.com/v1';
    formModel.value = '';
    formIsDefault.value = false;
    temperature.value = 0.7;
    maxTokens.value = 2048;
    stream.value = false;
  }
}

function handleProviderChange() {
  const opt = PROVIDER_OPTIONS.find(p => p.value === formProvider.value);
  if (opt) {
    formProtocol.value = opt.protocol as 'openai' | 'gemini' | 'anthropic';
    if (opt.url && !isEditing.value) {
      formApiUrl.value = opt.url;
    }
  }
}

function handleSubmit() {
  if (!formApiKey.value.trim() || !formApiUrl.value.trim() || !formModel.value.trim()) return;

  const model: ModelConfig = {
    id: props.model?.id || `model-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: formType.value,
    name: formName.value.trim() || undefined,
    provider: formProvider.value,
    apiProtocol: formProtocol.value,
    apiKey: formApiKey.value.trim(),
    apiUrl: formApiUrl.value.trim(),
    model: formModel.value.trim(),
    isDefault: formIsDefault.value,
    chatParams: formType.value === 'chat' ? {
      temperature: temperature.value,
      max_tokens: maxTokens.value,
      stream: stream.value,
    } : undefined,
  };

  emit('save', model);
}

watch(() => props.isOpen, (val) => { if (val) initForm(); });
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" @click.self="emit('close')">
        <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-xl mx-4 max-h-[90vh] flex flex-col overflow-hidden">
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
            <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">{{ isEditing ? '编辑模型' : '添加模型' }}</h3>
            <button @click="emit('close')" class="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <!-- Row 1: Type + Name -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">模型类型</label>
                <select v-model="formType" class="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
                  <option value="chat">Chat（对话）</option>
                  <option value="image">Image（图像）</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">自定义名称（可选）</label>
                <input v-model="formName" type="text" placeholder="给模型起个名字" class="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
              </div>
            </div>

            <!-- Row 2: Provider + Protocol + API Key -->
            <div class="grid grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">服务商</label>
                <select v-model="formProvider" @change="handleProviderChange" class="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
                  <option v-for="p in PROVIDER_OPTIONS" :key="p.value" :value="p.value">{{ p.value }}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">协议</label>
                <select v-model="formProtocol" class="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
                  <option value="openai">OpenAI Compatible</option>
                  <option value="gemini">Gemini</option>
                  <option value="anthropic">Anthropic</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">API Key</label>
                <input v-model="formApiKey" type="password" placeholder="sk-..." class="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
              </div>
            </div>

            <!-- API URL -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">API URL</label>
              <input v-model="formApiUrl" type="text" placeholder="https://api.openai.com/v1" class="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
              <p class="text-[11px] text-gray-400 mt-1">填写基础 URL，系统会自动拼接 /chat/completions 等路径</p>
            </div>

            <!-- Model Name -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">模型名称</label>
              <input v-model="formModel" type="text" placeholder="gpt-4o / claude-3-sonnet / ..." class="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            </div>

            <!-- Default toggle -->
            <label class="flex items-center gap-2 cursor-pointer">
              <input v-model="formIsDefault" type="checkbox" class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span class="text-sm text-gray-700 dark:text-gray-300">设为默认模型</span>
            </label>

            <!-- Chat params (only for chat type) -->
            <div v-if="formType === 'chat'" class="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
              <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Chat 参数</h4>
              <div class="grid grid-cols-3 gap-4">
                <div>
                  <label class="block text-xs text-gray-500 mb-1">Temperature</label>
                  <input v-model.number="temperature" type="number" min="0" max="2" step="0.1" class="w-full h-9 px-3 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label class="block text-xs text-gray-500 mb-1">Max Tokens</label>
                  <input v-model.number="maxTokens" type="number" min="256" max="32768" step="256" class="w-full h-9 px-3 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div class="flex items-end">
                  <label class="flex items-center gap-2 cursor-pointer pb-2">
                    <input v-model="stream" type="checkbox" class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span class="text-sm text-gray-700 dark:text-gray-300">流式输出</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 shrink-0">
            <button @click="emit('close')" class="h-9 px-4 text-sm font-medium text-gray-700 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">取消</button>
            <button @click="handleSubmit" :disabled="!formApiKey.trim() || !formApiUrl.trim() || !formModel.trim()" class="h-9 px-4 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {{ isEditing ? '保存' : '添加' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: all 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from > div, .modal-leave-to > div { transform: scale(0.95); }
</style>
