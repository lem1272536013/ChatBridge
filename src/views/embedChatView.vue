<template>
<div id="embedChatApp" class="openai-shell" :class="{'fullscreen': isFullScreen}">
  <div class="header">
    <div class="title">
<div class="title-copy">
        <span class="title-text">{{ siteTitle }}</span>
        <span class="title-subtext">{{ siteDescription }}</span>
      </div>
    </div>
    <div class="actions">
      <el-tooltip content="刷新对话" placement="bottom" >
        <el-icon class="action-icon" @click="refreshChat"><Refresh /></el-icon>
      </el-tooltip>
      <el-tooltip :content="isFullScreen ? '小屏' : '大屏'" placement="bottom">
        <el-icon class="action-icon" @click="toggleFullScreen">
          <FullScreen v-if="!isFullScreen" />
          <Rank v-else />
        </el-icon>
      </el-tooltip>
      <el-tooltip content="关闭" placement="bottom">
        <el-icon class="action-icon" @click="closeChat"><Close /></el-icon>
      </el-tooltip>
    </div>
  </div>

  <div class="chat-container">
    <div class="alCahrtBox" ref="messagesRef" :class="isMobile ? 'mobile-chat' : 'desktop-chat'">

      <div v-if="chartContentList.length === 0" class="empty-state">
        <div class="empty-title">{{ siteTitle }}</div>
        <div class="empty-subtitle">{{ siteDescription }}</div>
      </div>

      <div v-for="(item, index) in chartContentList" :key="index" class="message-row">
        <!-- 分隔提示 -->
        <div v-if="item.separatorMessage" class="separator-message">
          <div class="separator-line"></div>
          <div class="separator-text">进入 {{ item.agentName }}</div>
          <div class="separator-line"></div>
        </div>
        <!-- 普通消息 -->
        <template v-else>
          <div class="message-files" v-for="(ite, fileIndex) in item.message_files || []" :key="fileIndex">
            <div class="file-attachment-wrap">
              <el-image
                  class="message-image"
                  v-if="ite.type==='image'"
                  :src="ite.url"
                  :preview-src-list="[ite.url]"
                  :fit="'contain'"
                  :lazy="true"
              >
              </el-image>
              <div v-else class="filePdf">
                <div class="file_icon">
                  <el-icon><Document /></el-icon>
                </div>
                <div>
                  <div class="file_name">{{ite.filename}}</div>
                  <div class="file_type">文件</div>
                </div>
              </div>
            </div>
          </div>
          <div class="userContent"  v-if="item.query">
            <div class="contentMsg">
              <div class="message-text">{{item.query}}</div>
            </div>
          </div>
          <div class="chartMachine" :class="isMobile ? 'chartMachineModel' : 'chartMachineWidth'">
            <div class="contentMsg">
              <div v-if="item.loading" class="loading-indicator">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
              </div>
              <!-- 消息内容 -->
              <div
                  v-if="item.answer"
                  class="markdown-body chat-markdown"
                  v-html="renderMarkdown(item.answer)"
                  :id="index+'id'"
              ></div>

              <!-- 智能体按钮 -->
              <div v-if="item.agentButtons && item.agentButtons.length > 0" class="agent-buttons">
                <div class="agent-title"><span>智能体选择</span></div>
                <div
                    v-for="(btn, btnIndex) in item.agentButtons"
                    :key="btnIndex"
                    class="button-wrapper"
                >
                  <el-button
                      :disabled="index+1!=chartContentList.length"
                      v-if="getAgentApiKey(btn)"
                      type="primary"
                      size="small"
                      class="agent-button"
                      @click="selectAgent(btn)"
                  >
                    进入<span class="highlight">{{ getAgentDisplayName(btn) }}</span>
                  </el-button>
                </div>
              </div>

              <!-- 状态按钮 -->
              <div v-if="item.statusButtons && item.statusButtons.length > 0" class="status-buttons">
                <div class="agent-title"><span>操作</span></div>
                <div
                    v-for="(btn, btnIndex) in item.statusButtons"
                    :key="btnIndex"
                    class="button-wrapper"
                >
                  <el-button
                      :disabled="index+1!=chartContentList.length"
                      v-if="btn.task_status && btn.task_status === 'finish'"
                      type="primary"
                      size="small"
                      class="status-button"
                      @click="backAgent(btn)"
                  >
                    <i class="el-icon-check"></i> 任务已完成，返回主智能体
                  </el-button>
                  <el-button
                      :disabled="index+1!=chartContentList.length"
                      v-if="btn.task_status && btn.task_status === 'finish'"
                      type="primary"
                      size="small"
                      class="status-button"
                      @click="continueChat()"
                  >
                    <i class="el-icon-check"></i> 继续当前智能体
                  </el-button>
                </div>
              </div>

              <el-tooltip
                  class="box-item"
                  effect="dark"
                  content="复制"
                  placement="bottom"
              >
                <el-icon class="copy-action" v-if="item.showIcon" @click="copyTextContent(item.answer, index)"><CopyDocument /></el-icon>
              </el-tooltip>
            </div>
          </div>
        </template>
      </div>
    </div>

    <div class="inputBox">

      <div v-if="uploadedFiles.length" class="file-preview-list">
        <div v-for="file in uploadedFiles" :key="file.uid" class="file-preview">
          <el-icon><Document /></el-icon>
          <div class="file-name">{{file.name}}</div>
          <el-icon class="remove-icon" @click="handleRemoveFile(file.uid)"><CircleClose /></el-icon>
        </div>
      </div>
      <div class="composer" :class="isMobile ? 'composer-mobile' : 'composer-desktop'">
        <div class="upload-wrapper" v-if="canUploadLocalFile">
          <el-upload
              action=""
              :on-preview="handlePreview"
              :on-remove="handleRemove"
              :before-upload="beforeUpload"
              :http-request="customUpload"
              multiple
              :limit="uploadFileLimit"
              :accept="uploadAccept"
              :show-file-list="false"
              :file-list="fileList"
              @change="handleFileChange"
              @exceed="handleUploadExceed"
          >
            <el-tooltip content="上传文件" placement="top">
              <el-button circle plain type="primary" size="small" class="upload-action">
                <el-icon><Paperclip /></el-icon>
              </el-button>
            </el-tooltip>
          </el-upload>
        </div>
        <el-input
            v-model="input_text"
            class="composer-input"
            type="textarea"
            :autosize="{ minRows: 1, maxRows: 5 }"
            :disabled="inputDisabled"
            resize="none"
            placeholder="给聊天助手发送消息"
            @keydown.enter.exact.prevent="chartSubmit"
        />
        <el-tooltip :content="isSubmit ? '发送' : '停止生成'" placement="top">
          <el-button
              circle
              type="primary"
              class="composer-action"
              :disabled="isSubmit && inputDisabled"
              @click="isSubmit ? chartSubmit() : pause()"
          >
            <el-icon v-if="isSubmit"><Position /></el-icon>
            <el-icon v-else><CircleClose /></el-icon>
          </el-button>
        </el-tooltip>
      </div>
    </div>
  </div>
</div>
</template>

<script setup>
defineOptions({ name: "embedChat" });
import { get, post } from '../axios/axios.js'
import { computed, ref, onMounted, nextTick, onUnmounted } from 'vue'
import { ElMessage } from "element-plus";
import { getChatConfigByOrigin } from "../config";
import { Refresh, FullScreen, Rank, Close, Document, CircleClose, Paperclip, Position, CopyDocument } from '@element-plus/icons-vue'
import defaultAiIcon from '../img/AI.png'
import MarkdownIt from 'markdown-it'
import texmath from 'markdown-it-texmath'
import katex from 'katex'
import DOMPurify from 'dompurify'
import 'katex/dist/katex.min.css'

const isMobile = ref(false);
const isFullScreen = ref(false);
const messagesRef = ref(null);
const urlParams = new URLSearchParams(window.location.search);
const chatConfig = getChatConfigByOrigin(urlParams.get('origin'));
const baseUrl = chatConfig.HGAI_BASE_URL;
const defaultSite = {
  title: 'AI智能客服',
  description: '智能问答工作台',
  icon_url: defaultAiIcon
};
const webAppSite = ref({ ...defaultSite });

// 文件相关状态
const fileList = ref([]);
const uploadedFiles = ref([]);
const pendingUploadTypes = ref([]);

const getUserInfo = () => {
  try { return localStorage.getItem("userID"); } catch (_) { return 'guest'; }
};
const userId = getUserInfo();

const chartContentList = ref([]);
const input_text = ref("");
const isSubmit = ref(true);
const aiConfig = ref({ file_upload: {}, system_parameters: {} });
const conversation_id = ref('');
const ptask_id = ref("");
const streamAbortController = ref(null);
const isStoppingResponse = ref(false);
const input = ref('');
const lastName = ref('');
const agentSiteCache = ref({});
const agentSiteRequests = new Map();

const markdownRenderer = new MarkdownIt({
  html: true,
  linkify: true,
  breaks: true,
  typographer: true,
}).use(texmath, {
  engine: katex,
  delimiters: ['dollars', 'brackets', 'beg_end'],
  katexOptions: {
    throwOnError: false,
    strict: false,
    output: 'htmlAndMathml',
  },
});

const defaultLinkOpen = markdownRenderer.renderer.rules.link_open || ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
markdownRenderer.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const targetIndex = tokens[idx].attrIndex('target');
  if (targetIndex < 0) tokens[idx].attrPush(['target', '_blank']);
  else tokens[idx].attrs[targetIndex][1] = '_blank';

  const relIndex = tokens[idx].attrIndex('rel');
  if (relIndex < 0) tokens[idx].attrPush(['rel', 'noopener noreferrer']);
  else tokens[idx].attrs[relIndex][1] = 'noopener noreferrer';

  return defaultLinkOpen(tokens, idx, options, env, self);
};

const containsTexCommand = (value = '') => /\\(?:frac|sqrt|lim|to|infty|text|quad|qquad|sum|prod|int|begin|end|rho|alpha|beta|gamma|delta|sigma|theta|lambda|mu|pi|cdot|times|div|leq|geq|neq|approx|nabla|partial)\b/.test(value);
const normalizeMathDelimiters = (content = '') => {
  let text = String(content).replace(/\r\n/g, '\n');
  text = text.replace(/\\\[\s*\n?([\s\S]*?)\n?\s*\\\]/g, (_, expr) => `\n\n\\[\n${expr.trim()}\n\\]\n\n`);
  text = text.replace(/\$\$\s*\n?([\s\S]*?)\n?\s*\$\$/g, (_, expr) => `\n\n$$\n${expr.trim()}\n$$\n\n`);
  text = text.replace(/(^|\n)\s*\[\s*\n([\s\S]*?)\n\s*\]\s*(?=\n|$)/g, (match, prefix, expr) => {
    const trimmed = expr.trim();
    return containsTexCommand(trimmed) ? `${prefix}\n\\[\n${trimmed}\n\\]\n\n` : match;
  });
  text = text.replace(/(^|\n)\s*\[\s*([^\n\]]*\\[A-Za-z]+[^\n\]]*)\s*\]\s*(?=\n|$)/g, (match, prefix, expr) => {
    const trimmed = expr.trim();
    return containsTexCommand(trimmed) ? `${prefix}\n\\[\n${trimmed}\n\\]\n\n` : match;
  });
  return text;
};

const renderMarkdown = (content = '') => {
  const html = markdownRenderer.render(normalizeMathDelimiters(content));
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['details', 'summary', 'eq', 'eqn'],
    ADD_ATTR: ['target', 'rel', 'class', 'style', 'aria-hidden', 'xmlns', 'encoding', 'open'],
    USE_PROFILES: { html: true, mathMl: true, svg: true },
  });
};

const siteTitle = computed(() => webAppSite.value.title || defaultSite.title);
const siteDescription = computed(() => webAppSite.value.description || defaultSite.description);
const siteIconUrl = computed(() => webAppSite.value.icon_url || defaultSite.icon_url);
const inputDisabled = computed(() => {
  const last = chartContentList.value[chartContentList.value.length - 1];
  return last?.statusButtons?.[0]?.task_status === 'finish';
});
const getSiteSnapshot = () => ({
  siteTitle: siteTitle.value,
  siteDescription: siteDescription.value,
  siteIconUrl: siteIconUrl.value,
});
const freezeExistingMessageSiteSnapshots = () => {
  const snapshot = getSiteSnapshot();
  chartContentList.value = chartContentList.value.map((item) => {
    if (item.separatorMessage || item.siteIconUrl) return item;
    return { ...snapshot, ...item };
  });
};
const getCurrentApiKey = () => sessionStorage.getItem('api_key') || '';
const getAgentApiKey = (agent = {}) => agent?.['api-key'] || agent?.api_key || agent?.apiKey || '';
const getAgentDisplayName = (agent = {}) => {
  const apiKey = getAgentApiKey(agent);
  return agent.siteTitle || agentSiteCache.value[apiKey]?.title || agent.title || agent.agent || '智能体';
};

const fetchSiteByApiKey = async (apiKey) => {
  if (!apiKey) return null;
  const response = await fetch(baseUrl + '/v1/site', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  });
  if (!response.ok) return null;
  return response.json();
};

const getAgentSiteByApiKey = async (apiKey) => {
  if (!apiKey) return null;
  if (agentSiteCache.value[apiKey]) return agentSiteCache.value[apiKey];
  if (!agentSiteRequests.has(apiKey)) {
    agentSiteRequests.set(apiKey, fetchSiteByApiKey(apiKey)
        .then((site) => {
          if (!site) return null;
          const normalizedSite = {
            title: site?.title || '智能体',
            description: site?.description || '',
            icon_url: site?.icon_url || defaultSite.icon_url,
          };
          agentSiteCache.value = {
            ...agentSiteCache.value,
            [apiKey]: normalizedSite,
          };
          return normalizedSite;
        })
        .catch(() => null)
        .finally(() => {
          agentSiteRequests.delete(apiKey);
        }));
  }
  return agentSiteRequests.get(apiKey);
};

const applyCachedAgentSiteTitles = (buttons = []) => buttons.map((button) => {
  const apiKey = getAgentApiKey(button);
  const cachedSite = agentSiteCache.value[apiKey];
  return {
    ...button,
    siteTitle: cachedSite?.title || button.siteTitle,
  };
});

const hydrateAgentButtons = async (buttons = []) => {
  return Promise.all(buttons.map(async (button) => {
    const apiKey = getAgentApiKey(button);
    const site = await getAgentSiteByApiKey(apiKey);
    return {
      ...button,
      siteTitle: site?.title || button.siteTitle || button.agent || '智能体',
    };
  }));
};

const getAgentButtonsKey = (buttons = []) => JSON.stringify(buttons.map((button) => ({
  apiKey: getAgentApiKey(button),
  input: button.input || '',
})));

const fileTypes = {
  document: ['TXT', 'MD', 'MARKDOWN', 'MDX', 'PDF', 'HTML', 'XLSX', 'XLS', 'VTT', 'PROPERTIES', 'DOC', 'DOCX', 'CSV', 'EML', 'MSG', 'PPTX', 'PPT', 'XML', 'EPUB'],
  image: ['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP', 'SVG'],
  audio: ['MP3', 'M4A', 'WAV', 'WEBM', 'AMR', 'MPGA'],
  video: ['MP4', 'MOV', 'MPEG', 'WEBM'],
};
const uploadTypeOrder = ['document', 'image', 'audio', 'video', 'custom'];
const defaultTypeLimit = 3;
const defaultFileSizeLimit = 10;

const getFileUploadConfig = () => aiConfig.value.file_upload || {};
const hasTopLevelUploadConfig = () => {
  const config = getFileUploadConfig();
  return Object.prototype.hasOwnProperty.call(config, 'enabled') ||
      Array.isArray(config.allowed_file_types) ||
      Array.isArray(config.allowed_file_upload_methods) ||
      Array.isArray(config.allowed_file_extensions);
};
const normalizeList = (list = []) => list.map((item) => String(item).toLowerCase());
const getUploadTypeConfig = (type) => getFileUploadConfig()?.[type] || {};
const isLocalFileTransferAllowed = (type) => {
  const config = getFileUploadConfig();
  if (hasTopLevelUploadConfig()) {
    const allowedMethods = normalizeList(config.allowed_file_upload_methods || config.transfer_methods || []);
    const allowedTypes = normalizeList(config.allowed_file_types || []);
    return config.enabled === true &&
        allowedMethods.includes('local_file') &&
        (!allowedTypes.length || allowedTypes.includes(type));
  }

  const typeConfig = getUploadTypeConfig(type);
  return typeConfig.enabled === true && (typeConfig.transfer_methods || []).includes('local_file');
};
const getTopLevelUploadLimit = () => {
  const config = getFileUploadConfig();
  return Number(config.number_limits || config.fileUploadConfig?.file_upload_limit) || defaultTypeLimit;
};
const getUploadTypeLimit = (type) => (
  hasTopLevelUploadConfig()
      ? getTopLevelUploadLimit()
      : Number(getUploadTypeConfig(type).number_limits) || defaultTypeLimit
);

const enabledLocalUploadTypes = computed(() => uploadTypeOrder.filter(isLocalFileTransferAllowed));
const canUploadLocalFile = computed(() => enabledLocalUploadTypes.value.length > 0);
const uploadFileLimit = computed(() => {
  if (hasTopLevelUploadConfig() && canUploadLocalFile.value) return getTopLevelUploadLimit();
  const total = enabledLocalUploadTypes.value.reduce((sum, type) => sum + getUploadTypeLimit(type), 0);
  return Math.max(total, 1);
});
const uploadAccept = computed(() => {
  if (!canUploadLocalFile.value) return '';
  const config = getFileUploadConfig();
  const allowedExtensions = config.allowed_file_extensions || [];
  if (hasTopLevelUploadConfig() && allowedExtensions.length) {
    return allowedExtensions.map((ext) => ext.toLowerCase()).join(',');
  }
  if (enabledLocalUploadTypes.value.includes('custom')) return '';
  const extensions = enabledLocalUploadTypes.value.flatMap((type) => fileTypes[type] || []);
  return [...new Set(extensions.map((ext) => `.${ext.toLowerCase()}`))].join(',');
});

const detectDeviceType = () => {
  isMobile.value = /Mobi|Android/i.test(navigator.userAgent) && !/iPad|iP[ao]d/i.test(navigator.userAgent);
};

const handleSiteIconError = (event) => {
  const img = event?.target;
  if (!img || img.src === new URL(defaultSite.icon_url, window.location.href).href) return;
  img.src = defaultSite.icon_url;
};

const getWebAppSite = async () => {
  try {
    const site = await fetchSiteByApiKey(getCurrentApiKey());
    if (!site) return;
    webAppSite.value = {
      ...webAppSite.value,
      title: site?.title || defaultSite.title,
      description: site?.description || defaultSite.description,
      icon_url: site?.icon_url || defaultSite.icon_url,
    };
  } catch (_) {}
};

const copyTextContent = async (item, index) => {
  try {
    const textNode = document.getElementById(index + 'id');
    const tempTextArea = document.createElement('textarea');
    tempTextArea.value = textNode.textContent;
    document.body.appendChild(tempTextArea);
    tempTextArea.select();
    document.execCommand('copy');
    document.body.removeChild(tempTextArea);
    ElMessage.success('复制成功！');
  } catch (_) {
    ElMessage.error('复制失败，请尝试手动复制。');
  }
};

// 文件处理
const fileTypeLabels = {
  document: '文档',
  image: '图片',
  audio: '音频',
  video: '视频',
  custom: '自定义文件',
};

const getFileExtension = (file) => (file.name?.split('.').pop() || '').toUpperCase();
const getDifyFileType = (file) => {
  const ext = getFileExtension(file);
  for (const [type, extensions] of Object.entries(fileTypes)) {
    if (extensions.includes(ext)) return type;
  }
  return 'custom';
};
const getFileSizeLimit = (type) => {
  const params = aiConfig.value.system_parameters || {};
  const limits = {
    document: params.file_size_limit,
    image: params.image_file_size_limit,
    audio: params.audio_file_size_limit,
    video: params.video_file_size_limit,
    custom: params.file_size_limit,
  };
  return Number(limits[type]) || defaultFileSizeLimit;
};
const getCurrentUploadCountByType = (type) => {
  const uploadedCount = uploadedFiles.value.filter((file) => file.type === type).length;
  const pendingCount = pendingUploadTypes.value.filter((item) => item === type).length;
  return uploadedCount + pendingCount;
};
const removePendingUploadType = (type) => {
  const index = pendingUploadTypes.value.indexOf(type);
  if (index !== -1) pendingUploadTypes.value.splice(index, 1);
};
const clearFile = () => {
  fileList.value = [];
  uploadedFiles.value = [];
  pendingUploadTypes.value = [];
};
const handleFileChange = (_, list) => { fileList.value = list; };
const handlePreview = () => {};
const handleRemove = (file) => {
  if (file?.uid) handleRemoveFile(file.uid);
};
const handleRemoveFile = (uid) => {
  uploadedFiles.value = uploadedFiles.value.filter((file) => file.uid !== uid);
  fileList.value = fileList.value.filter((file) => file.uid !== uid);
};
const handleUploadExceed = () => {
  ElMessage.warning(`最多可上传 ${uploadFileLimit.value} 个文件`);
};

const beforeUpload = (file) => {
  if (!canUploadLocalFile.value) {
    ElMessage.warning('当前应用未开启本地文件上传');
    return false;
  }

  const type = getDifyFileType(file);
  const label = fileTypeLabels[type] || '文件';

  if (!isLocalFileTransferAllowed(type)) {
    ElMessage.warning(`当前应用不支持上传${label}`);
    return false;
  }

  const typeLimit = getUploadTypeLimit(type);
  if (getCurrentUploadCountByType(type) >= typeLimit) {
    ElMessage.warning(`${label}最多可上传 ${typeLimit} 个`);
    return false;
  }

  const sizeLimit = getFileSizeLimit(type);
  if (file.size / 1024 / 1024 > sizeLimit) {
    ElMessage.warning(`${label}大小不能超过 ${sizeLimit}MB`);
    return false;
  }

  pendingUploadTypes.value.push(type);
  return true;
};

const customUpload = (options) => {
  const { file, onProgress, onError, onSuccess } = options;
  const type = getDifyFileType(file);
  const previewUrl = URL.createObjectURL(file);
  const formData = new FormData();
  formData.append('file', file);
  formData.append('user', userId);

  post(baseUrl + '/v1/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => onProgress?.({ percent: e.total ? Math.round((e.loaded * 100) / e.total) : 0 })
  }).then((res) => {
    uploadedFiles.value.push({
      uid: file.uid,
      name: file.name,
      filename: file.name,
      upload_file_id: res.id,
      transfer_method: 'local_file',
      type,
      url: previewUrl,
      mime_type: res.mime_type || file.type,
    });
    onSuccess?.(res);
    ElMessage.success('上传成功');
  }).catch((err) => {
    onError?.(err);
    fileList.value = fileList.value.filter((item) => item.uid !== file.uid);
    ElMessage.error('上传失败');
  }).finally(() => {
    removePendingUploadType(type);
  });
};

// JSON 解析容错：依次尝试直接解析、修复格式、逐对象提取
const tryParseJSON = (str) => {
  try { return JSON.parse(str); } catch (_) {}
  try {
    let s = str.replace(/,\s*]/g, ']').replace(/,\s*}/g, '}');
    if (!s.trim().startsWith('[')) s = '[' + s;
    if (!s.trim().endsWith(']')) s = s + ']';
    return JSON.parse(s);
  } catch (_) {}
  try {
    const matches = str.match(/{[^{}]*}/g);
    if (matches) {
      const results = matches.map(m => { try { return JSON.parse(m); } catch (_) { return null; } }).filter(Boolean);
      if (results.length) return results;
    }
  } catch (_) {}
  return [];
};

// 处理 <think>...</think> 标签：
// - 已闭合：替换为 <details><summary>思考过程</summary>内容</details>
// - 未闭合（流式进行中）：替换为折叠占位，避免原始标签裸露
const processThinkTag = (text) => {
  // 已闭合的 <think> 块
  const closed = text.replace(/<think>([\s\S]*?)<\/think>/g, (_, content) => {
    const trimmed = content.trim();
    if (!trimmed) return '';
    return `<details><summary>思考过程</summary>\n\n${trimmed}\n\n</details>`;
  });
  // 未闭合的 <think>（流式还未收到 </think>），展开显示已收到的内容
  return closed.replace(/<think>([\s\S]*)$/, (_, content) => {
    const trimmed = content.trim();
    return `<details open><summary>思考中…</summary>\n\n${trimmed}\n\n</details>`;
  });
};

// 从累积文本中提取并移除 ///.../// 和 ***...*** 特殊标记
// 返回 { display, agentButtons, statusButtons }
const extractSpecialMarkers = (text) => {
  let display = processThinkTag(text);
  let agentButtons = null;
  let statusButtons = null;

  const agentMatch = display.match(/\/\/\/([\s\S]*?)\/\/\//);
  if (agentMatch) {
    display = display.substring(0, display.indexOf('///'));
    const parsed = tryParseJSON(agentMatch[1].trim());
    if (parsed && parsed.length > 0) agentButtons = parsed;
  }

  const statusMatch = display.match(/\*\*\*([\s\S]*?)\*\*\*/);
  if (statusMatch) {
    display = display.substring(0, display.indexOf('***'));
    const parsed = tryParseJSON(statusMatch[1].trim());
    if (parsed && parsed.length > 0) statusButtons = parsed;
  }

  return { display, agentButtons, statusButtons };
};

// 将提取结果写入消息列表最后一条
const applyMarkers = (accumulated) => {
  const { display, agentButtons, statusButtons } = extractSpecialMarkers(accumulated);
  const last = chartContentList.value[chartContentList.value.length - 1];
  last.answer = display;
  if (agentButtons) {
    const sourceKey = getAgentButtonsKey(agentButtons);
    last.agentButtons = applyCachedAgentSiteTitles(agentButtons);
    if (last.agentButtonsSourceKey !== sourceKey) {
      last.agentButtonsSourceKey = sourceKey;
      hydrateAgentButtons(agentButtons).then((hydratedButtons) => {
        if (last.agentButtonsSourceKey === sourceKey) {
          last.agentButtons = hydratedButtons;
        }
      });
    }
  }
  if (statusButtons) last.statusButtons = statusButtons;
};

// 统一 SSE 流处理：正确处理跨 chunk 的事件边界
// handlers: { onMessage, onEnd, onError }
const processSSEResponse = async (response, handlers) => {
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      // 按 \n\n 分割，保留末尾不完整的片段留到下次拼接
      const parts = buffer.split('\n\n');
      buffer = parts.pop();

      for (const part of parts) {
        if (!part.startsWith('data: ')) continue;
        const raw = part.slice(6).trim();
        let msg;
        try { msg = JSON.parse(raw); } catch (_) { continue; }

        if (msg.task_id) handlers.onTask?.(msg);
        if (msg.event === 'message' || msg.event === 'message_replace') {
          handlers.onMessage(msg);
        } else if (msg.event === 'message_end') {
          handlers.onEnd(msg);
        } else if (msg.event === 'error') {
          handlers.onError(msg);
        }
        // workflow/node/ping 等事件无需处理
      }

      scrollToBottom();
    }
  } catch (e) {
    if (e.name === 'AbortError') {
      handlers.onAbort?.();
      return;
    }
    console.error('SSE 读取出错:', e);
    handlers.onError({ message: e.message });
  }
};

// 统一发送请求入口，合并原 createNewConversation 和 fetchStreamData 的重复逻辑
// isNew=true 表示初始化对话（发送 "start"），不影响 isSubmit 状态
const sendChatRequest = async (params, isNew = false) => {
  const controller = new AbortController();
  if (!isNew) {
    streamAbortController.value = controller;
    isStoppingResponse.value = false;
  }
  const isCurrentStream = () => isNew || streamAbortController.value === controller;

  try {
    const response = await fetch(baseUrl + '/v1/chat-messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('api_key')}`,
        Accept: 'text/event-stream',
      },
      signal: controller.signal,
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const last = chartContentList.value[chartContentList.value.length - 1];
      last.loading = false;
      last.answer = isNew ? '创建对话失败，请重试！' : '您发送的文件类型不支持，请重新发送！';
      if (!isNew) isSubmit.value = true;
      return;
    }

    if (!isNew && uploadedFiles.value.length) clearFile();

    let accumulated = '';

    await processSSEResponse(response, {
      onTask: (msg) => {
        if (!isCurrentStream()) return;
        if (!isNew) ptask_id.value = msg.task_id;
      },
      onMessage: (msg) => {
        if (!isCurrentStream()) return;
        const last = chartContentList.value[chartContentList.value.length - 1];
        last.loading = false;
        if (!isNew) last.showContent = true;
        conversation_id.value = msg.conversation_id;
        ptask_id.value = msg.task_id;
        accumulated += (msg.answer || '');
        applyMarkers(accumulated);
      },
      onEnd: () => {
        if (!isCurrentStream()) return;
        const last = chartContentList.value[chartContentList.value.length - 1];
        last.showIcon = true;
        applyMarkers(accumulated);
        if (!isNew) { isSubmit.value = true; ptask_id.value = ''; }
      },
      onAbort: () => {
        if (!isCurrentStream()) return;
        const last = chartContentList.value[chartContentList.value.length - 1];
        last.loading = false;
        last.showIcon = Boolean(last.answer);
        if (!isNew) { isSubmit.value = true; ptask_id.value = ''; }
      },
      onError: () => {
        if (!isCurrentStream()) return;
        const last = chartContentList.value[chartContentList.value.length - 1];
        last.loading = false;
        if (isStoppingResponse.value) {
          last.showIcon = Boolean(last.answer);
          if (!isNew) { isSubmit.value = true; ptask_id.value = ''; }
          return;
        }
        last.answer = '没有明白您说什么，请重新发送！';
        if (!isNew) isSubmit.value = true;
      }
    });
  } catch (e) {
    if (!isCurrentStream()) return;
    if (e.name === 'AbortError' || isStoppingResponse.value) {
      const last = chartContentList.value[chartContentList.value.length - 1];
      last.loading = false;
      last.showIcon = Boolean(last.answer);
      if (!isNew) { isSubmit.value = true; ptask_id.value = ''; }
      return;
    }
    console.error('请求异常:', e);
    const last = chartContentList.value[chartContentList.value.length - 1];
    last.loading = false;
    last.answer = '请求异常，请重试！';
    if (!isNew) isSubmit.value = true;
  } finally {
    if (!isNew && streamAbortController.value === controller) {
      streamAbortController.value = null;
      isStoppingResponse.value = false;
    }
  }
};

// 创建新对话：发送初始 start 消息触发 AI 开场白
const createNewConversation = async () => {
  const params = {
    inputs: { user_id: userId },
    query: 'start',
    response_mode: 'streaming',
    conversation_id: '',
    user: userId,
  };
  if (input.value && input.value !== 'null') params.inputs.input = input.value;

  chartContentList.value.push({
    ...getSiteSnapshot(),
    answer: '', loading: true, showContent: true, showIcon: false,
    agentButtons: [], statusButtons: []
  });
  await sendChatRequest(params, true);
};

// 用户主动发送消息
const chartSubmit = async () => {
  if (!input_text.value) { ElMessage.warning('请输入内容'); return; }
  if (!isSubmit.value) return;
  if (pendingUploadTypes.value.length) { ElMessage.warning('文件正在上传，请稍后发送'); return; }
  isSubmit.value = false;
  const text = input_text.value;
  input_text.value = '';

  const params = {
    inputs: { user_id: userId },
    query: text,
    response_mode: 'streaming',
    conversation_id: conversation_id.value,
    user: userId,
  };

  if (uploadedFiles.value.length) {
    params.files = uploadedFiles.value.map((file) => ({
      upload_file_id: file.upload_file_id,
      transfer_method: file.transfer_method,
      type: file.type,
    }));
  }

  const messageFiles = uploadedFiles.value.map((file) => ({
    url: file.url,
    mime_type: file.mime_type,
    type: file.type,
    filename: file.filename,
  }));

  chartContentList.value.push({
    ...getSiteSnapshot(),
    query: text, answer: '', loading: true, showContent: false, showIcon: false,
    agentButtons: [], statusButtons: [],
    message_files: messageFiles
  });

  await sendChatRequest(params, false);
};

// 暂停响应
const pause = () => {
  const taskId = ptask_id.value;
  if (!taskId && !streamAbortController.value) return;

  isStoppingResponse.value = true;
  streamAbortController.value?.abort();

  const last = chartContentList.value[chartContentList.value.length - 1];
  if (last) {
    last.loading = false;
    last.showIcon = Boolean(last.answer);
  }
  isSubmit.value = true;
  ptask_id.value = '';

  if (!taskId) return;
  post(baseUrl + '/v1/chat-messages/' + taskId + '/stop', { user: userId }).catch(() => {});
};

// 获取 AI 配置（文件上传开关等）
const getAiConfig = async () => {
  try {
    const res = await get(baseUrl + '/v1/parameters');
    aiConfig.value = {
      file_upload: res?.file_upload || {},
      system_parameters: res?.system_parameters || {},
    };
    uploadedFiles.value = uploadedFiles.value.filter((file) => isLocalFileTransferAllowed(file.type));
    fileList.value = fileList.value.filter((file) => uploadedFiles.value.some((item) => item.uid === file.uid));
    scrollToBottom();
  } catch (_) {
    aiConfig.value = { file_upload: {}, system_parameters: {} };
  }
};

// 滚动到底部
const scrollToBottom = async () => {
  await nextTick();
  if (messagesRef.value) messagesRef.value.scrollTop = messagesRef.value.scrollHeight;
};

const getSameOriginFrameElement = () => {
  try {
    return window.frameElement || null;
  } catch (_) {
    return null;
  }
};

const saveInlineStyle = (element) => {
  if (!element || element.dataset.embedChatFullscreenStyle !== undefined) return;
  element.dataset.embedChatFullscreenStyle = element.getAttribute('style') || '';
};

const restoreInlineStyle = (element) => {
  if (!element || element.dataset.embedChatFullscreenStyle === undefined) return;
  const style = element.dataset.embedChatFullscreenStyle;
  if (style) {
    element.setAttribute('style', style);
  } else {
    element.removeAttribute('style');
  }
  delete element.dataset.embedChatFullscreenStyle;
};

const applyElementFullscreenStyle = (element, styles) => {
  if (!element) return;
  saveInlineStyle(element);
  Object.assign(element.style, styles);
};

const setEmbeddedFrameFullscreen = (fullScreen) => {
  const frame = getSameOriginFrameElement();
  if (!frame) return;

  const parentDocument = frame.ownerDocument;
  const shell = frame.parentElement;

  if (fullScreen) {
    applyElementFullscreenStyle(shell, {
      position: 'fixed',
      inset: '0',
      width: '100vw',
      height: '100vh',
      maxWidth: 'none',
      maxHeight: 'none',
      margin: '0',
      borderRadius: '0',
      boxShadow: 'none',
      overflow: 'visible',
      zIndex: '2147483646',
    });
    applyElementFullscreenStyle(frame, {
      position: 'fixed',
      inset: '0',
      width: '100vw',
      height: '100vh',
      maxWidth: 'none',
      maxHeight: 'none',
      margin: '0',
      border: '0',
      borderRadius: '0',
      display: 'block',
      zIndex: '2147483647',
    });
    applyElementFullscreenStyle(parentDocument?.documentElement, { overflow: 'hidden' });
    applyElementFullscreenStyle(parentDocument?.body, { overflow: 'hidden' });
    return;
  }

  restoreInlineStyle(frame);
  restoreInlineStyle(shell);
  restoreInlineStyle(parentDocument?.body);
  restoreInlineStyle(parentDocument?.documentElement);
};

const startConversationForCurrentAgent = async () => {
  await Promise.all([getWebAppSite(), getAiConfig()]);
  await createNewConversation();
};

// 刷新聊天（重置为主智能体的新对话）
const refreshChat = () => {
  chartContentList.value = [];
  conversation_id.value = '';
  ptask_id.value = '';
  input_text.value = '';
  input.value = '';
  clearFile();
  sessionStorage.setItem('api_key', chatConfig.MAIN_AGENT_API_KEY);
  setTimeout(() => { startConversationForCurrentAgent(); }, 50);
};

const toggleFullScreen = () => {
  isFullScreen.value = !isFullScreen.value;
  setEmbeddedFrameFullscreen(isFullScreen.value);
  try { window.parent.postMessage({ type: 'toggleFullScreen', isFullScreen: isFullScreen.value }, '*'); } catch (_) {}
};

const handleParentMessage = (event) => {
  if (event.data?.type === 'refreshChat') refreshChat();
};

const closeChat = () => {
  try { window.parent.postMessage({ type: 'closeChat' }, '*'); } catch (_) {}
};

// ─── 多智能体跳转逻辑（保留不变）────────────────────────────────────────────

const addSeparator = (agentName) => {
  lastName.value = agentName;
  chartContentList.value.push({ separatorMessage: true, agentName, showContent: true, loading: false });
};

const selectAgent = async (agent) => {
  const apiKey = getAgentApiKey(agent);
  if (!apiKey) return;
  freezeExistingMessageSiteSnapshots();
  const agentSite = await getAgentSiteByApiKey(apiKey);
  addSeparator(agentSite?.title || getAgentDisplayName(agent));
  sessionStorage.setItem('api_key', apiKey);
  conversation_id.value = '';
  input.value = agent.input;
  clearFile();
  setTimeout(() => { startConversationForCurrentAgent(); }, 50);
};

const backAgent = (agent) => {
  if (!agent || !agent.task_status) return;
  freezeExistingMessageSiteSnapshots();
  addSeparator('主智能体');
  sessionStorage.setItem('api_key', chatConfig.MAIN_AGENT_API_KEY);
  input.value = '';
  conversation_id.value = '';
  clearFile();
  setTimeout(() => { startConversationForCurrentAgent(); }, 50);
};

const continueChat = () => {
  freezeExistingMessageSiteSnapshots();
  addSeparator(lastName.value || '未知智能体');
  conversation_id.value = '';
  input.value = '';
  clearFile();
  setTimeout(() => { startConversationForCurrentAgent(); }, 50);
};

// ─────────────────────────────────────────────────────────────────────────────

onMounted(() => {
  detectDeviceType();
  getWebAppSite();
  getAiConfig();
  scrollToBottom();
  window.addEventListener('resize', detectDeviceType);
  window.addEventListener('message', handleParentMessage);
});

onUnmounted(() => {
  setEmbeddedFrameFullscreen(false);
  window.removeEventListener('resize', detectDeviceType);
  window.removeEventListener('message', handleParentMessage);
});
</script>

<style scoped lang="less">
@app-bg: #ffffff;
@panel: rgba(255, 255, 255, 0.92);
@panel-strong: #ffffff;
@ink: #171717;
@muted: #8f9399;
@muted-light: #b8bcc4;
@line: #e8eaef;
@soft: #f6f7f9;
@soft-2: #f1f3f6;
@user-bubble: #eaf5ff;
@accent: #1f1f22;
@accent-blue: #0b55ff;
@shadow: 0 10px 28px rgba(20, 24, 35, 0.08);

* {
  font-family: "Alibaba PuHuiTi 3.0", "HarmonyOS Sans SC", "PingFang SC", "Microsoft YaHei", "Segoe UI", sans-serif;
}

.chat-markdown {
  overflow-y: hidden;
}

:deep(.markdown-body table),
.chat-markdown :deep(table) {
  max-width: 100%;
  overflow: auto;
  border-radius: 10px;
}

:deep(.el-image-viewer__wrapper) {
  width: 72%;
  height: 64%;
  margin: auto;
  top: 5%;
  border-radius: 18px;
  overflow: hidden;
}

:deep(.knowledge-base-btn) {
  display: inline-block;
  margin: 0 3px;
  padding: 1px 7px;
  border: 1px solid rgba(11, 85, 255, 0.18);
  border-radius: 999px;
  background-color: rgba(11, 85, 255, 0.06);
  color: @accent-blue;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(11, 85, 255, 0.1);
    border-color: rgba(11, 85, 255, 0.28);
  }
}

#embedChatApp {
  width: min(570px, 100vw);
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: @ink;
  background: @app-bg;
  border: 1px solid @line;
  border-radius: 10px;
  box-shadow: none;
  transition: width 0.24s ease, height 0.24s ease, border-radius 0.24s ease;

  &.fullscreen {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    border-radius: 0;
    border-color: transparent;
  }

  .header {
    min-height: 52px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    padding: 0 14px;
    background: @panel;
    border-bottom: 0;
    backdrop-filter: blur(18px);
    position: relative;
    z-index: 3;

    .title {
      position: absolute;
      left: 50%;
      top: 50%;
      width: min(48%, 280px);
      transform: translate(-50%, -50%);
      min-width: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .brand-mark {
      display: none;

      img {
        width: 18px;
        height: 18px;
        object-fit: contain;
      }
    }

    .title-copy {
      min-width: 0;
      display: flex;
      flex-direction: column;
      line-height: 1.2;
      align-items: center;
    }

    .title-text {
      max-width: 100%;
      color: #050505;
      font-size: 16px;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .title-subtext {
      display: none;
    }

    .actions {
      display: flex;
      align-items: center;
      gap: 6px;

      .action-icon {
        width: 30px;
        height: 30px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 10px;
        color: #1d1d1f;
        cursor: pointer;
        font-size: 15px;
        transition: background-color 0.16s ease, color 0.16s ease, transform 0.16s ease;

        &:hover {
          color: @ink;
          background: @soft;
        }

        &:active {
          background: @soft-2;
          transform: scale(0.96);
        }
      }
    }
  }

  .chat-container {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .alCahrtBox {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 22px 26px 16px;
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.16) transparent;
    scroll-behavior: smooth;

    &::-webkit-scrollbar {
      width: 5px;
    }

    &::-webkit-scrollbar-thumb {
      border-radius: 999px;
      background: rgba(0, 0, 0, 0.14);
    }

    &.mobile-chat {
      padding: 18px 22px 12px;
    }

    &.desktop-chat {
      padding: 22px 26px 16px;
    }
  }

  .empty-state {
    min-height: 62%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    padding: 0 10px;
    color: @muted;
    animation: fadeUp 0.34s ease both;

    .empty-mark {
      display: none;
    }

    .empty-title {
      color: transparent;
      background: linear-gradient(90deg, #b9c5f8 0%, #e9bfd8 76%);
      -webkit-background-clip: text;
      background-clip: text;
      font-size: 28px;
      font-weight: 700;
      line-height: 1.2;
      letter-spacing: 0;
    }

    .empty-subtitle {
      margin-top: 8px;
      color: #c2c6ce;
      font-size: 15px;
      font-weight: 600;
    }
  }

  .message-row {
    animation: fadeUp 0.24s ease both;
  }

  .separator-message {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin: 18px 0 22px;

    .separator-line {
      display: none;
    }

    .separator-text {
      max-width: 68%;
      padding: 3px 10px;
      border: 1px solid @line;
      border-radius: 999px;
      background: @soft;
      color: @muted;
      font-size: 12px;
      font-weight: 400;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .message-files {
    display: flex;
    justify-content: flex-end;
    margin: 10px 0 5px;
  }

  .file-attachment-wrap {
    display: flex;
    justify-content: flex-end;
    max-width: 76%;
  }

  .message-image {
    width: auto;
    height: 112px;
    max-width: 220px;
    display: block;
    border: 1px solid @line;
    border-radius: 14px;
    overflow: hidden;
  }

  .userContent {
    width: 100%;
    display: flex;
    justify-content: flex-end;
    margin: 0 0 28px;

    .contentMsg {
      max-width: min(72%, 460px);
      padding: 10px 16px;
      border-radius: 16px;
      background: @user-bubble;
      color: @ink;
      word-wrap: break-word;
      overflow-wrap: anywhere;
      animation: slideFromRight 0.2s ease both;
    }
  }

  .message-text {
    font-size: 15px;
    line-height: 1.6;
    font-weight: 400;
    white-space: pre-wrap;
  }

  .chartMachine {
    width: 100%;
    display: flex;
    align-items: flex-start;
    gap: 0;
    margin: 0 0 28px;

    &.chartMachineModel,
    &.chartMachineWidth {
      width: 100%;
    }

    .logo {
      display: none;

      img {
        width: 18px;
        height: 18px;
        object-fit: contain;
      }
    }

    .contentMsg {
      position: relative;
      flex: 1;
      min-width: 0;
      padding: 0;
      color: @ink;
      word-wrap: break-word;
      overflow-wrap: anywhere;
      animation: fadeUp 0.2s ease both;
    }
  }

  .chat-markdown {
    color: @ink;
    font-size: 16px;
    line-height: 1.72;
    overflow-wrap: anywhere;
  }

  .chat-markdown :deep(p) {
    margin: 0 0 10px;
  }

  .chat-markdown :deep(p:last-child) {
    margin-bottom: 0;
  }

  .chat-markdown :deep(ul),
  .chat-markdown :deep(ol) {
    margin: 8px 0 12px;
    padding-left: 20px;
  }

  .chat-markdown :deep(li) {
    margin: 4px 0;
    padding-left: 2px;
  }

  .chat-markdown :deep(pre) {
    padding: 14px;
    border: 1px solid @line;
    border-radius: 12px;
    background: #f7f8fa;
    color: #25262a;
    overflow-x: auto;
  }

  .chat-markdown :deep(code) {
    border-radius: 5px;
    background: #f1f2f4;
    color: #25262a;
    padding: 1px 5px;
    font-size: 13px;
  }

  .chat-markdown :deep(pre code) {
    padding: 0;
    background: transparent;
    color: inherit;
    font-size: 13px;
  }

  .chat-markdown :deep(blockquote) {
    margin: 10px 0;
    padding: 8px 14px;
    border-left: 3px solid #d9dde5;
    border-radius: 0 8px 8px 0;
    background: #f8f9fb;
    color: #6d7178;
  }

  .chat-markdown :deep(details) {
    margin: 10px 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: #8c9097;
  }

  .chat-markdown :deep(summary) {
    color: @muted;
    cursor: pointer;
    font-size: inherit;
    font-weight: 400;
  }

  .chat-markdown :deep(table) {
    display: block;
    width: max-content;
    max-width: 100%;
    margin: 12px 0;
    border-collapse: collapse;
    overflow-x: auto;
  }

  .chat-markdown :deep(th),
  .chat-markdown :deep(td) {
    padding: 8px 10px;
    border: 1px solid @line;
  }

  .chat-markdown :deep(th) {
    background: @soft;
    font-weight: 600;
  }

  .chat-markdown :deep(eq) {
    display: inline-block;
    max-width: 100%;
    vertical-align: -0.08em;
  }

  .chat-markdown :deep(eqn) {
    display: block;
    max-width: 100%;
    margin: 12px 0;
    padding: 12px;
    overflow-x: auto;
    overflow-y: hidden;
    border-radius: 10px;
    background: @soft;
    text-align: center;
  }

  .chat-markdown :deep(section.eqno) {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .chat-markdown :deep(section.eqno > eqn) {
    flex: 1;
    min-width: 0;
  }

  .chat-markdown :deep(section.eqno > span) {
    flex: 0 0 auto;
    color: @muted;
    font-size: 13px;
  }

  .chat-markdown :deep(.katex-display) {
    max-width: 100%;
    margin: 0;
    padding: 0;
    overflow-x: auto;
    overflow-y: hidden;
    text-align: center;
  }

  .chat-markdown :deep(.katex) {
    font-size: 1.04em;
    text-rendering: auto;
  }

  .copy-action {
    width: 24px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-top: 12px;
    margin-right: 4px;
    border-radius: 6px;
    color: #777c84;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      color: #1f2329;
      background: @soft;
    }
  }

  .loading-indicator {
    display: inline-flex;
    align-items: center;
    height: 24px;
    padding: 2px 0;

    .dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #2f3338;
      animation: dotPulse 1.4s infinite ease-in-out;

      &:nth-child(2) {
        animation-delay: 0.2s;
        margin: 0 4px;
      }

      &:nth-child(3) {
        animation-delay: 0.4s;
      }
    }
  }

  .filePdf {
    width: min(240px, 76vw);
    min-height: 52px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border: 1px solid @line;
    border-radius: 14px;
    background: @panel-strong;

    .file_icon {
      width: 32px;
      height: 32px;
      flex: 0 0 32px;
      display: grid;
      place-items: center;
      border-radius: 8px;
      background: @soft;
      color: #555a63;
    }

    .file_name,
    .file_type {
      width: 160px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .file_name {
      color: @ink;
      font-size: 13px;
      font-weight: 500;
      line-height: 1.35;
    }

    .file_type {
      margin-top: 2px;
      color: @muted;
      font-size: 12px;
      font-weight: 400;
    }
  }

  .agent-buttons,
  .status-buttons {
    display: grid;
    gap: 8px;
    margin-top: 14px;

    .agent-title {
      display: flex;
      align-items: center;
      gap: 8px;
      color: @muted;
      font-size: 12px;
      font-weight: 400;

      &::after {
        content: "";
        flex: 1;
        height: 1px;
        background: @line;
      }
    }

    .button-wrapper {
      width: 100%;
      margin: 0;
    }

    .highlight {
      margin-left: 4px;
      color: inherit;
      font-weight: 700;
    }

    :deep(.el-button.agent-button),
    :deep(.el-button.status-button) {
      width: 100%;
      height: auto;
      min-height: 38px;
      justify-content: center;
      margin: 0;
      padding: 8px 14px;
      border: 1px solid @line;
      border-radius: 14px;
      background: @soft;
      color: @accent-blue;
      box-shadow: none;
      font-weight: 500;
      font-size: 14px;
      line-height: 1.4;
      white-space: normal;
      transition: all 0.15s ease;

      &:not(:disabled):hover {
        border-color: rgba(11, 85, 255, 0.22);
        background: rgba(11, 85, 255, 0.06);
      }

      &:not(:disabled):active {
        background: rgba(11, 85, 255, 0.1);
      }

      &:disabled {
        cursor: not-allowed;
        opacity: 0.45;
      }
    }
  }

  .status-buttons {
    :deep(.el-button.status-button) {
      border-color: @line;
      background: @soft;
      color: @accent-blue;

      &:not(:disabled):hover {
        border-color: rgba(11, 85, 255, 0.22);
        background: rgba(11, 85, 255, 0.06);
      }
    }
  }

  .inputBox {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
    padding: 10px 18px 18px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0), #ffffff 26%);
    border-top: 0;
    position: relative;
    z-index: 4;

    .file-preview-list {
      width: 100%;
      display: flex;
      flex-wrap: nowrap;
      gap: 8px;
      overflow-x: auto;
      overflow-y: hidden;
      padding: 0 0 10px;
      scrollbar-width: thin;
      scrollbar-color: rgba(0, 0, 0, 0.1) transparent;

      &::-webkit-scrollbar {
        height: 4px;
      }

      &::-webkit-scrollbar-thumb {
        border-radius: 999px;
        background: rgba(0, 0, 0, 0.1);
      }
    }

    .file-preview {
      width: 148px;
      flex: 0 0 148px;
      min-height: 38px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 10px;
      border: 1px solid @line;
      border-radius: 12px;
      background: @panel-strong;
      color: @muted;
      animation: fadeUp 0.2s ease both;

      .file-name {
        min-width: 0;
        flex: 1;
        color: @ink;
        font-size: 12px;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .remove-icon {
        width: 22px;
        height: 22px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        cursor: pointer;
        color: @muted;
        transition: all 0.15s ease;

        &:hover {
          color: #cc3333;
          background: rgba(204, 51, 51, 0.07);
        }
      }
    }

    .composer-desktop,
    .composer-mobile {
      width: 100%;
      margin: 0 auto;
    }

    .composer {
      position: relative;
      display: flex;
      align-items: flex-start;
      gap: 6px;
      min-height: 96px;
      padding: 16px 58px 42px 18px;
      border: 1px solid #dfe2e8;
      border-radius: 24px;
      background: @panel-strong;
      box-shadow: @shadow;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .composer:focus-within {
      border-color: #d5d9e1;
      box-shadow: 0 12px 32px rgba(20, 24, 35, 0.1);
    }

    .composer-input {
      flex: 1;
      min-width: 0;
    }

    .composer-input :deep(.el-textarea__inner) {
      min-height: 34px !important;
      padding: 0;
      border: 0;
      background: transparent;
      color: @ink;
      font-size: 15px;
      line-height: 1.55;
      box-shadow: none;
    }

    .composer-input :deep(.el-textarea__inner::placeholder) {
      color: #b9bdc5;
    }

    .composer-action {
      position: absolute;
      right: 14px;
      bottom: 14px;
      width: 32px;
      height: 32px;
      flex: 0 0 32px;
      background: @accent;
      border-color: @accent;
      color: #ffffff;

      &:hover {
        background: #000000;
        border-color: #000000;
      }

      &.is-disabled,
      &:disabled {
        background: #d4d6da;
        border-color: #d4d6da;
        color: #ffffff;
      }

      &.is-plain,
      &[type="danger"] {
        background: @accent;
        border-color: @accent;
      }
    }

    .upload-wrapper {
      position: absolute;
      left: 16px;
      bottom: 13px;
      flex: 0 0 auto;
      z-index: 2;
    }

    :deep(.upload-action.el-button) {
      width: 32px;
      height: 32px;
      border: 0;
      background: transparent;
      color: #1f2329;
      font-size: 18px;
      transition: all 0.15s ease;

      &:hover {
        background: @soft;
        color: #000000;
      }
    }
  }

  @media (max-width: 640px) {
    width: 100vw;
    border-radius: 0;

    .header {
      min-height: 50px;
      padding: 0 12px;

      .brand-mark {
        width: 26px;
        height: 26px;
        flex-basis: 26px;
      }

      .title {
        width: min(52%, 220px);
      }

      .title-subtext {
        display: none;
      }

      .actions {
        gap: 3px;

        .action-icon {
          width: 28px;
          height: 28px;
        }
      }
    }

    .alCahrtBox {
      padding: 18px 22px 12px;
    }

    .chartMachine {
      gap: 8px;

      .logo {
        width: 26px;
        height: 26px;
        flex-basis: 26px;
      }
    }

    .userContent .contentMsg {
      max-width: 78%;
    }

    .inputBox {
      padding: 8px 16px 14px;

      .composer {
        min-height: 96px;
        padding: 16px 54px 42px 18px;
        border-radius: 24px;
      }
    }
  }

  @keyframes fadeUp {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideFromLeft {
    from {
      opacity: 0;
      transform: translateX(-6px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes slideFromRight {
    from {
      opacity: 0;
      transform: translateX(6px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes dotPulse {
    0%, 80%, 100% {
      opacity: 0.2;
      transform: scale(0.8);
    }
    40% {
      opacity: 1;
      transform: scale(1);
    }
  }
}
</style>
