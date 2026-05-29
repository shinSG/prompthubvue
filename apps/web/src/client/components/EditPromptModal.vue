<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useAuth } from '../composables/useAuth';
import { updatePrompt, type PromptData } from '../api/prompts';
import { fetchFolders } from '../api/endpoints';
import type { Folder } from '@prompthub/shared';
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
});

const props = defineProps<{
  isOpen: boolean;
  prompt: PromptData | null;
}>();

const emit = defineEmits<{
  close: [];
  saved: [];
}>();

const { token } = useAuth();

const title = ref('');
const description = ref('');
const systemPrompt = ref('');
const userPrompt = ref('');
const tags = ref<string[]>([]);
const tagInput = ref('');
const folderId = ref('');
const showAttributes = ref(false);
const isSaving = ref(false);

const sysEditMode = ref<'edit' | 'preview'>('edit');
const userEditMode = ref<'edit' | 'preview'>('edit');

const folders = ref<Folder[]>([]);

// Markdown rendered content
const renderedSystemPrompt = computed(() => md.render(systemPrompt.value || ''));
const renderedUserPrompt = computed(() => md.render(userPrompt.value || ''));

async function loadFolders() {
  if (!token.value) return;
  try {
    const res = await fetchFolders(token.value, 'all');
    folders.value = res.data;
  } catch { /* ignore */ }
}

function initForm() {
  if (!props.prompt) return;
  title.value = props.prompt.title;
  description.value = props.prompt.description || '';
  systemPrompt.value = props.prompt.systemPrompt || '';
  userPrompt.value = props.prompt.userPrompt;
  tags.value = [...(props.prompt.tags || [])];
  folderId.value = props.prompt.folderId || '';
}

function addTag() {
  const tag = tagInput.value.trim();
  if (tag && !tags.value.includes(tag)) {
    tags.value.push(tag);
  }
  tagInput.value = '';
}

function removeTag(index: number) {
  tags.value.splice(index, 1);
}

const attributesSummary = computed(() => {
  const parts: string[] = [];
  const folder = folders.value.find(f => f.id === folderId.value);
  if (folder) parts.push(folder.name);
  if (tags.value.length > 0) parts.push(`${tags.value.length} 个标签`);
  return parts.join(' • ');
});

async function handleSubmit() {
  if (!token.value || !props.prompt || !title.value.trim() || !userPrompt.value.trim()) return;
  isSaving.value = true;
  try {
    await updatePrompt(token.value, props.prompt.id, {
      title: title.value.trim(),
      userPrompt: userPrompt.value.trim(),
      description: description.value.trim() || undefined,
      systemPrompt: systemPrompt.value.trim() || undefined,
      tags: tags.value.length > 0 ? tags.value : undefined,
      folderId: folderId.value || undefined,
    });
    emit('saved');
  } catch (e) {
    console.error('Failed to update prompt:', e);
  } finally {
    isSaving.value = false;
  }
}

function handleClose() {
  emit('close');
}

watch(() => props.isOpen, (val) => {
  if (val) {
    loadFolders();
    initForm();
  }
});
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen && prompt" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" @click.self="handleClose">
        <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col overflow-hidden">
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
            <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">编辑提示词</h3>
            <div class="flex items-center gap-2">
              <button
                @click="handleSubmit"
                :disabled="isSaving || !title.trim() || !userPrompt.trim()"
                class="flex items-center gap-1.5 h-8 px-4 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                {{ isSaving ? '保存中...' : '保存' }}
              </button>
            </div>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <!-- Title -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                标题 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="title"
                type="text"
                placeholder="输入提示词标题"
                class="w-full h-12 px-4 rounded-xl bg-gray-50 dark:bg-gray-800 border-0 text-xl font-semibold text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:bg-white dark:focus:bg-gray-700 transition-all duration-200"
              />
            </div>

            <!-- Collapsible Attributes Panel -->
            <div class="border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 overflow-hidden">
              <button
                @click="showAttributes = !showAttributes"
                class="flex items-center gap-2 px-4 py-3 w-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
              >
                <svg class="w-4 h-4 text-gray-400 transition-transform" :class="{ 'rotate-90': showAttributes }" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
                <span>属性</span>
                <span v-if="!showAttributes && attributesSummary" class="text-xs text-gray-400 ml-2 font-normal truncate max-w-[400px]">{{ attributesSummary }}</span>
              </button>

              <div v-if="showAttributes" class="px-4 pb-4 space-y-4">
                <!-- Description -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">描述（可选）</label>
                  <input v-model="description" type="text" placeholder="简短描述" class="w-full h-10 px-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all" />
                </div>

                <!-- Folder -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">文件夹（可选）</label>
                  <select v-model="folderId" class="w-full h-10 px-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all">
                    <option value="">不选择文件夹</option>
                    <option v-for="folder in folders" :key="folder.id" :value="folder.id">
                      {{ folder.icon || '📁' }} {{ folder.name }}
                    </option>
                  </select>
                </div>

                <!-- Tags -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">标签（可选）</label>
                  <div class="flex flex-wrap gap-1.5 mb-2" v-if="tags.length > 0">
                    <span
                      v-for="(tag, i) in tags"
                      :key="i"
                      class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500 text-white"
                    >
                      {{ tag }}
                      <button @click="removeTag(i)" class="hover:bg-white/20 rounded-full p-0.5">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </span>
                  </div>
                  <div class="flex gap-2">
                    <input
                      v-model="tagInput"
                      @keydown.enter.prevent="addTag"
                      type="text"
                      placeholder="输入标签后回车"
                      class="flex-1 h-9 px-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                    />
                    <button @click="addTag" class="h-9 px-3 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">添加</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- System Prompt with split view -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">系统提示词（可选）</label>
              <div class="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden min-h-[160px]">
                <div class="w-1/2 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                  <textarea
                    v-model="systemPrompt"
                    placeholder="输入系统提示词..."
                    class="flex-1 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none resize-none font-mono leading-relaxed bg-transparent"
                  />
                </div>
                <div class="w-1/2 flex flex-col bg-gray-50 dark:bg-gray-800/50">
                  <div v-if="systemPrompt" class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed overflow-y-auto flex-1 markdown-preview" v-html="renderedSystemPrompt" />
                  <div v-else class="px-4 py-3 text-sm text-gray-400 italic">（预览区域）</div>
                </div>
              </div>
            </div>

            <!-- User Prompt with split view -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                用户提示词 <span class="text-red-500">*</span>
              </label>
              <div class="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden min-h-[240px]">
                <div class="w-1/2 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                  <textarea
                    v-model="userPrompt"
                    placeholder="输入用户提示词内容..."
                    class="flex-1 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none resize-none font-mono leading-relaxed bg-transparent"
                  />
                </div>
                <div class="w-1/2 flex flex-col bg-gray-50 dark:bg-gray-800/50">
                  <div v-if="userPrompt" class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed overflow-y-auto flex-1 markdown-preview" v-html="renderedUserPrompt" />
                  <div v-else class="px-4 py-3 text-sm text-gray-400 italic">（预览区域）</div>
                </div>
              </div>
            </div>
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

.markdown-preview :deep(h1) { font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; }
.markdown-preview :deep(h2) { font-size: 1.25rem; font-weight: 600; margin-top: 1.25rem; margin-bottom: 0.75rem; }
.markdown-preview :deep(h3) { font-size: 1.125rem; font-weight: 600; margin-top: 1rem; margin-bottom: 0.75rem; }
.markdown-preview :deep(p) { margin-bottom: 0.75rem; line-height: 1.7; }
.markdown-preview :deep(ul) { list-style-type: disc; padding-left: 1.25rem; margin-bottom: 0.75rem; }
.markdown-preview :deep(ol) { list-style-type: decimal; padding-left: 1.25rem; margin-bottom: 0.75rem; }
.markdown-preview :deep(li) { line-height: 1.7; }
.markdown-preview :deep(code) { padding: 0.125rem 0.375rem; border-radius: 0.25rem; background: #f1f5f9; font-family: monospace; font-size: 0.8125rem; }
.markdown-preview :deep(pre) { padding: 0.75rem; border-radius: 0.5rem; background: #f1f5f9; overflow-x: auto; font-size: 0.8125rem; line-height: 1.7; margin-bottom: 0.75rem; }
.markdown-preview :deep(pre code) { padding: 0; background: none; }
.markdown-preview :deep(blockquote) { border-left: 3px solid #cbd5e1; padding-left: 0.75rem; color: #64748b; font-style: italic; margin-bottom: 0.75rem; }
.markdown-preview :deep(hr) { margin: 1rem 0; border-color: #e2e8f0; }
.markdown-preview :deep(a) { color: #2563eb; text-decoration: underline; }
.markdown-preview :deep(a:hover) { color: #1d4ed8; }
.markdown-preview :deep(table) { border-collapse: collapse; width: 100%; margin-bottom: 0.75rem; }
.markdown-preview :deep(th), .markdown-preview :deep(td) { border: 1px solid #e2e8f0; padding: 0.5rem 0.75rem; text-align: left; }
.markdown-preview :deep(th) { background: #f8fafc; font-weight: 600; }
.markdown-preview :deep(strong) { font-weight: 600; }
.markdown-preview :deep(em) { font-style: italic; }
</style>
