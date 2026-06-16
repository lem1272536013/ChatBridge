# AGENTS.md

This file provides guidance to Codex when working with this repository.

## 协作约定

- 使用简体中文交流。
- 先对照实际代码再修改文档或实现，避免把旧版后台、PPT、费用统计等历史功能重新带回来。
- 涉及 SSH、Linux 服务器、远程命令、部署、日志、上传下载、端口转发等任务时，先使用 `mcp-ssh-manager` skill，并在结束前确认没有遗留本任务创建的 session、tunnel 或持续任务。

## 常用命令

```bash
pnpm install      # 安装依赖
pnpm run dev      # 启动开发服务器，默认端口 5173
pnpm run build    # 构建生产包
pnpm run preview  # 预览构建结果
```

项目使用 `pnpm`，不要新增 `package-lock.json`。当前没有测试框架和 lint 配置，修改后至少运行 `pnpm run build` 做基础验证。

## 项目定位

这是一个 Vue 3 + Vite 构建的嵌入式 AI 客服/多智能体聊天窗口。当前目标是通过 iframe 快速接入其他系统，核心页面只有聊天窗口，不再保留旧版后台管理、PPT 生成、费用统计等页面。

## 核心文件

- [src/App.vue](src/App.vue)：嵌入初始化入口。读取 URL 中的 `origin` 和 `userID`，按来源选择聊天配置，写入 `localStorage.userID` 和 `sessionStorage.api_key`，并移除旧的 `sessionStorage.token`。
- [src/router/index.js](src/router/index.js)：当前只保留 `/embedChatView`，根路径重定向到该页面。
- [src/views/embedChatView.vue](src/views/embedChatView.vue)：核心聊天窗口，包含 SSE 流式响应、文件上传、暂停生成、全屏/关闭消息、多智能体跳转、Markdown/公式渲染。
- [src/axios/axios.js](src/axios/axios.js)：HTTP 封装，自动附加 `Authorization: Bearer {api_key}`；核心聊天流式请求在 `embedChatView.vue` 中用原生 `fetch`。
- [src/config.js](src/config.js)：Dify 接口地址、默认主智能体和按 `origin` 覆盖的聊天配置。
- [public/embed-chat-iframe.html](public/embed-chat-iframe.html)：iframe 嵌入示例和父页面消息处理示例。
- [vite.config.js](vite.config.js)：Vite 配置。本地代理使用 `server.proxy`，不是 Vue CLI 的 `devServer`。

## 配置约定

- `DEFAULT_CHAT_CONFIG`：默认聊天接口和主智能体配置。
- `ORIGIN_CHAT_CONFIG`：按 URL 参数 `origin` 覆盖默认配置；没有匹配时回退到 `DEFAULT_CHAT_CONFIG`。
- `getChatConfigByOrigin(origin)`：合并默认配置和来源配置。
- `HGAI_BASE_URL` 指向 Dify 服务地址，聊天页会请求 `/v1/site`、`/v1/parameters`、`/v1/chat-messages`、`/v1/files/upload` 等接口。
- `MAIN_AGENT_API_KEY` 是进入、刷新或任务完成后返回的主智能体 key。多智能体跳转会临时把目标智能体 key 写入 `sessionStorage.api_key`。
- 不要把真实生产 key 扩散到 README、示例页面、日志或截图里；需要示例时使用占位值。

## iframe 消息协议

聊天窗口会通过 `window.parent.postMessage` 向父页面发送：

- `{ type: 'toggleFullScreen', isFullScreen: boolean }`
- `{ type: 'closeChat' }`

父页面可以向聊天窗口发送 `{ type: 'refreshChat' }`，触发重置为主智能体的新会话。

## 多智能体约定

AI 回复中可通过特殊标记驱动前端按钮：

- `/// JSON ///`：解析为“进入智能体”按钮。
- `*** JSON ***`：解析为任务状态按钮。

点击智能体按钮后，前端会把对应 `api-key`、`api_key` 或 `apiKey` 写入 `sessionStorage.api_key`，清空 `conversation_id`，并开启新会话。

## 文件上传约定

- 文件上传能力来自 `/v1/parameters` 返回的 `file_upload` 配置。
- 前端会按 Dify 返回的允许类型、上传方式和数量限制控制上传入口。
- 不要在界面里硬编码长期固定的上传类型或数量，除非后端协议明确变更。

## 注意事项

- 保持嵌入式聊天窗口轻量，不要恢复 Vite 模板页、旧管理组件、Ant Design、Quill、PPT 相关依赖，除非明确要重新启用对应功能。
- 修改本地代理配置时使用 Vite 的 `server.proxy`。
- 生产部署是 Vite SPA，服务器需要把前端路由回退到 `index.html`。
