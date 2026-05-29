<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuth } from '../composables/useAuth';
import { createPrompt } from '../api/prompts';
import { fetchFolders } from '../api/endpoints';
import type { Folder } from '@prompthub/shared';
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });

const renderedSystemPrompt = computed(() => md.render(systemPrompt.value || ''));
const renderedUserPrompt = computed(() => md.render(userPrompt.value || ''));

const props = defineProps<{
  isOpen: boolean;
  defaultFolderId?: string;
}>();

const emit = defineEmits<{
  close: [];
  created: [];
}>();

const { token } = useAuth();

const title = ref('');
const description = ref('');
const systemPrompt = ref('');
const userPrompt = ref('');
const tags = ref<string[]>([]);
const tagInput = ref('');
const notes = ref('');
const folderId = ref(props.defaultFolderId || '');
const showAttributes = ref(false);
const promptType = ref<'text' | 'image'>('text');
const isSaving = ref(false);

// System/User prompt edit mode
const sysEditMode = ref<'edit' | 'preview'>('edit');
const userEditMode = ref<'edit' | 'preview'>('edit');

// Folders
const folders = ref<Folder[]>([]);

async function loadFolders() {
  if (!token.value) return;
  try {
    const res = await fetchFolders(token.value, 'all');
    folders.value = res.data;
  } catch { /* ignore */ }
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
  if (!token.value || !title.value.trim() || !userPrompt.value.trim()) return;
  isSaving.value = true;
  try {
    await createPrompt(token.value, {
      title: title.value.trim(),
      userPrompt: userPrompt.value.trim(),
      description: description.value.trim() || undefined,
      systemPrompt: systemPrompt.value.trim() || undefined,
      tags: tags.value.length > 0 ? tags.value : undefined,
      folderId: folderId.value || undefined,
    });
    emit('created');
    resetForm();
  } catch (e) {
    console.error('Failed to create prompt:', e);
  } finally {
    isSaving.value = false;
  }
}

function resetForm() {
  title.value = '';
  description.value = '';
  systemPrompt.value = '';
  userPrompt.value = '';
  tags.value = [];
  tagInput.value = '';
  folderId.value = props.defaultFolderId || '';
  showAttributes.value = false;
  promptType.value = 'text';
  sysEditMode.value = 'edit';
  userEditMode.value = 'edit';
}

function handleClose() {
  emit('close');
}

// Watch for open to load folders
import { watch } from 'vue';
watch(() => props.isOpen, (val) => {
  if (val) loadFolders();
});
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" @click.self="handleClose">
        <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col overflow-hidden">
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
            <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">新建提示词</h3>
            <div class="flex items-center gap-2">
              <button
                @click="handleSubmit"
                :disabled="isSaving || !title.trim() || !userPrompt.trim()"
                class="flex items-center gap-1.5 h-8 px-4 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                {{ isSaving ? '保存中...' : '创建' }}
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

                <!-- Prompt Type -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">类型</label>
                  <div class="flex gap-2">
                    <button
                      @click="promptType = 'text'"
                      class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                      :class="promptType === 'text' ? 'bg-blue-500 text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                      文本
                    </button>
                    <button
                      @click="promptType = 'image'"
                      class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                      :class="promptType === 'image' ? 'bg-blue-500 text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      媒体
                    </button>
                  </div>
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

                <!-- Notes -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">备注（可选）</label>
                  <textarea
                    v-model="notes"
                    rows="3"
                    placeholder="关于此提示词的个人备注..."
                    class="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            <!-- System Prompt -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="text-sm font-medium text-gray-700 dark:text-gray-300">系统提示词（可选）</label>
                <div class="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                  <button @click="sysEditMode = 'edit'" class="px-2.5 py-1 text-xs font-medium rounded-md transition-colors" :class="sysEditMode === 'edit' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500'">编辑</button>
                  <button @click="sysEditMode = 'preview'" class="px-2.5 py-1 text-xs font-medium rounded-md transition-colors" :class="sysEditMode === 'preview' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500'">预览</button>
                </div>
              </div>
              <textarea
                v-if="sysEditMode === 'edit'"
                v-model="systemPrompt"
                rows="5"
                placeholder="输入系统提示词..."
                class="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all resize-none font-mono leading-relaxed"
              />
              <div v-else class="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 min-h-[120px] leading-relaxed markdown-preview" v-html="renderedSystemPrompt || '<span class=&quot;text-gray-400 italic&quot;>（空）</span>'" />
            </div>

            <!-- User Prompt -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                  用户提示词 <span class="text-red-500">*</span>
                </label>
                <div class="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                  <button @click="userEditMode = 'edit'" class="px-2.5 py-1 text-xs font-medium rounded-md transition-colors" :class="userEditMode === 'edit' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500'">编辑</button>
                  <button @click="userEditMode = 'preview'" class="px-2.5 py-1 text-xs font-medium rounded-md transition-colors" :class="userEditMode === 'preview' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500'">预览</button>
                </div>
              </div>
              <textarea
                v-if="userEditMode === 'edit'"
                v-model="userPrompt"
                rows="8"
                placeholder="输入用户提示词内容..."
                class="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all resize-none font-mono leading-relaxed"
              />
              <div v-else class="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 min-h-[200px] leading-relaxed markdown-preview" v-html="renderedUserPrompt || '<span class=&quot;text-gray-400 italic&quot;>（空）</span>'" />
            </div>

            <!-- Variable Tip -->
            <div class="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-sm text-blue-700 dark:text-blue-300">
              <p class="font-medium mb-1">💡 变量提示</p>
              <p class="text-xs opacity-80">使用 <code class="bg-blue-100 dark:bg-blue-800/50 px-1 rounded" v-text="'{{变量名}}'" /> 语法定义变量，在测试时可以动态替换。</p>
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
.markdown-preview :deep(strong) { font-weight: 600; }
</style>
