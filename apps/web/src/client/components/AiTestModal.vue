<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useAuth } from '../composables/useAuth';
import { sendAiRequest, fetchModelConfigs, type ModelConfig, type AIResponsePayload } from '../api/endpoints';
import type { PromptData } from '../api/prompts';
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });

const props = defineProps<{
  isOpen: boolean;
  prompt: PromptData | null;
}>();

const emit = defineEmits<{
  close: [];
  saved: [response: string];
}>();

const { token } = useAuth();

// State
const models = ref<ModelConfig[]>([]);
const selectedModelId = ref('');
const isRunning = ref(false);
const result = ref<AIResponsePayload | null>(null);
const error = ref('');
const variableValues = ref<Record<string, string>>({});

// Extract variables from prompt
const variables = computed(() => {
  if (!props.prompt) return [];
  const regex = /\{\{([^}]+)\}\}/g;
  const matches = new Set<string>();
  let match;
  const text = (props.prompt.systemPrompt || '') + props.prompt.userPrompt;
  while ((match = regex.exec(text)) !== null) { matches.add(match[1]); }
  return Array.from(matches);
});

// Fill variables in text
function fillVariables(text: string): string {
  let filled = text;
  for (const [key, value] of Object.entries(variableValues.value)) {
    filled = filled.replaceAll(`{{${key}}}`, value || `{{${key}}}`);
  }
  return filled;
}

// System prompt with filled variables
const filledSystemPrompt = computed(() => {
  if (!props.prompt?.systemPrompt) return '';
  return fillVariables(props.prompt.systemPrompt);
});

// User prompt with filled variables
const filledUserPrompt = computed(() => {
  if (!props.prompt?.userPrompt) return '';
  return fillVariables(props.prompt.userPrompt);
});

// Extract text from response
function extractResponseText(body: string): string {
  if (!body) return '';
  try {
    const parsed = JSON.parse(body);
    // OpenAI / OpenAI-compatible format (Qwen, DeepSeek, etc.)
    const choice = parsed.choices?.[0]?.message;
    if (choice) {
      // content may be empty string when reasoning_content is used
      if (choice.content) return choice.content;
      // Some models put output in reasoning_content (thinking models)
      if (choice.reasoning_content) return choice.reasoning_content;
    }
    // Anthropic format
    if (parsed.content?.[0]?.text) return parsed.content[0].text;
    // Gemini format
    if (parsed.candidates?.[0]?.content?.parts?.[0]?.text) return parsed.candidates[0].content.parts[0].text;
    // Error
    if (parsed.error?.message) return 'Error: ' + parsed.error.message;
  } catch { /* not JSON, use as-is */ }
  return body;
}

// Rendered result
const renderedResult = computed(() => {
  if (!result.value?.body) return '';
  const text = extractResponseText(result.value.body);
  return md.render(text);
});

// Copy result
function copyResult() {
  if (!result.value?.body) return;
  navigator.clipboard.writeText(extractResponseText(result.value.body));
}

async function loadModels() {
  if (!token.value) return;
  try {
    const res = await fetchModelConfigs(token.value);
    models.value = res.data.models.filter(m => m.type === 'chat');
    if (res.data.scenarioModelDefaults.promptTest) {
      selectedModelId.value = res.data.scenarioModelDefaults.promptTest;
    } else if (models.value.length > 0) {
      selectedModelId.value = models.value[0].id;
    }
  } catch { /* ignore */ }
}

async function runTest() {
  if (!token.value || !props.prompt || !selectedModelId.value) return;
  isRunning.value = true;
  result.value = null;
  error.value = '';

  try {
    const messages: Array<{ role: string; content: string }> = [];
    if (filledSystemPrompt.value) {
      messages.push({ role: 'system', content: filledSystemPrompt.value });
    }
    messages.push({ role: 'user', content: filledUserPrompt.value });

    const body = JSON.stringify({
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    });

    const res = await sendAiRequest(token.value, {
      method: 'POST',
      modelId: selectedModelId.value,
      body,
    });

    result.value = res.data;

    if (!res.data.ok) {
      error.value = res.data.error || `请求失败: ${res.data.status}`;
    } else {
      // Save response back to prompt
      const responseText = extractResponseText(res.data.body);
      emit('saved', responseText);
    }
  } catch (e: any) {
    error.value = e.message || 'AI 测试失败';
  } finally {
    isRunning.value = false;
  }
}

function handleClose() {
  result.value = null;
  error.value = '';
  emit('close');
}

watch(() => props.isOpen, (val) => {
  if (val) {
    loadModels();
    result.value = null;
    error.value = '';
    // Reset variable values
    if (props.prompt) {
      const regex = /\{\{([^}]+)\}\}/g;
      const matches = new Set<string>();
      let match;
      const text = (props.prompt.systemPrompt || '') + props.prompt.userPrompt;
      while ((match = regex.exec(text)) !== null) { matches.add(match[1]); }
      const vars: Record<string, string> = {};
      for (const v of matches) { vars[v] = ''; }
      variableValues.value = vars;
    }
  }
});
</script>

<template>
  <Teleport to="body">
    <Transition name="slide">
      <div v-if="isOpen && prompt" class="fixed inset-0 z-50 flex justify-end">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/30 backdrop-blur-sm" @click="handleClose" />

        <!-- Panel -->
        <div class="relative w-full max-w-xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col overflow-hidden animate-slide-in">
          <!-- Header -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <div>
                <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">AI 测试</h3>
                <p class="text-xs text-gray-400">{{ prompt.title }}</p>
              </div>
            </div>
            <button @click="handleClose" class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto p-5 space-y-4">
            <!-- Model selection -->
            <div>
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">选择模型</label>
              <select v-model="selectedModelId" class="w-full h-9 px-3 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all">
                <option value="" disabled>选择模型</option>
                <option v-for="m in models" :key="m.id" :value="m.id">
                  {{ m.name || m.provider + ' / ' + m.model }}
                </option>
              </select>
              <p v-if="models.length === 0" class="text-xs text-amber-500 mt-1">未配置 AI 模型，请先在设置中添加</p>
            </div>

            <!-- Variable inputs -->
            <div v-if="variables.length > 0" class="space-y-2">
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400">变量填充</label>
              <div v-for="v in variables" :key="v" class="flex items-center gap-2">
                <span class="text-xs font-mono text-purple-600 dark:text-purple-400 whitespace-nowrap bg-purple-50 dark:bg-purple-900/20 px-1.5 py-0.5 rounded" v-text="'{{' + v + '}}'" />
                <input
                  :value="variableValues[v]"
                  @input="variableValues[v] = ($event.target as HTMLInputElement).value"
                  type="text"
                  class="flex-1 h-8 px-3 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                  :placeholder="'输入 ' + v + ' 的值'"
                />
              </div>
            </div>

            <!-- Prompt preview -->
            <div class="space-y-2">
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400">提示词预览</label>
              <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 text-xs text-gray-600 dark:text-gray-300 max-h-40 overflow-y-auto">
                <div v-if="filledSystemPrompt" class="mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                  <span class="font-medium text-gray-500">系统: </span>
                  <span class="whitespace-pre-wrap">{{ filledSystemPrompt }}</span>
                </div>
                <div>
                  <span class="font-medium text-gray-500">用户: </span>
                  <span class="whitespace-pre-wrap">{{ filledUserPrompt }}</span>
                </div>
              </div>
            </div>

            <!-- Run button -->
            <button
              @click="runTest"
              :disabled="isRunning || !selectedModelId"
              class="w-full h-10 flex items-center justify-center gap-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg v-if="isRunning" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              {{ isRunning ? '测试中...' : '运行测试' }}
            </button>

            <!-- Error -->
            <div v-if="error" class="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
              {{ error }}
            </div>

            <!-- Result -->
            <div v-if="result" class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="text-xs font-medium text-gray-500 dark:text-gray-400">测试结果</label>
                <button @click="copyResult" class="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 flex items-center gap-1">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  复制
                </button>
              </div>
              <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 text-sm text-gray-700 dark:text-gray-300 markdown-preview max-h-96 overflow-y-auto" v-html="renderedResult" />
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.slide-enter-active, .slide-leave-active { transition: all 0.3s ease; }
.slide-enter-from .relative, .slide-leave-to .relative { transform: translateX(100%); }
.slide-enter-from, .slide-leave-to { opacity: 0; }
.slide-enter-from > div:first-child, .slide-leave-to > div:first-child { opacity: 0; }

.markdown-preview :deep(h1) { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.75rem; }
.markdown-preview :deep(h2) { font-size: 1.125rem; font-weight: 600; margin-top: 1rem; margin-bottom: 0.5rem; }
.markdown-preview :deep(h3) { font-size: 1rem; font-weight: 600; margin-top: 0.75rem; margin-bottom: 0.5rem; }
.markdown-preview :deep(p) { margin-bottom: 0.5rem; line-height: 1.7; }
.markdown-preview :deep(ul) { list-style-type: disc; padding-left: 1.25rem; margin-bottom: 0.5rem; }
.markdown-preview :deep(ol) { list-style-type: decimal; padding-left: 1.25rem; margin-bottom: 0.5rem; }
.markdown-preview :deep(li) { line-height: 1.7; }
.markdown-preview :deep(code) { padding: 0.125rem 0.375rem; border-radius: 0.25rem; background: #f1f5f9; font-family: monospace; font-size: 0.8125rem; }
.markdown-preview :deep(pre) { padding: 0.75rem; border-radius: 0.5rem; background: #f1f5f9; overflow-x: auto; font-size: 0.8125rem; line-height: 1.7; margin-bottom: 0.5rem; }
.markdown-preview :deep(pre code) { padding: 0; background: none; }
.markdown-preview :deep(blockquote) { border-left: 3px solid #cbd5e1; padding-left: 0.75rem; color: #64748b; font-style: italic; margin-bottom: 0.5rem; }
.markdown-preview :deep(a) { color: #7c3aed; text-decoration: underline; }
.markdown-preview :deep(strong) { font-weight: 600; }
.markdown-preview :deep(table) { border-collapse: collapse; width: 100%; margin-bottom: 0.5rem; }
.markdown-preview :deep(th), .markdown-preview :deep(td) { border: 1px solid #e2e8f0; padding: 0.375rem 0.5rem; text-align: left; font-size: 0.8125rem; }
.markdown-preview :deep(th) { background: #f8fafc; font-weight: 600; }
</style>
