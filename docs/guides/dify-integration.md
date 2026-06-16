# 后台 AI 能力：基于 Dify 快速构建

ChatBridge 的聊天窗口本身不包含任何 AI 模型，所有智能能力都由后端 Dify 平台提供。Dify 是一个开源的 LLM 应用开发平台（GitHub: [langgenius/dify](https://github.com/langgenius/dify)），支持通过可视化界面编排工作流、接入知识库、配置工具和管理多个 AI 应用，无需从零搭建 AI 后端。

## Dify 提供了什么

ChatBridge 选择在 Dify 中创建 **Chatflow（对话流）** ，Chatflow 允许通过可视化画布编排多步骤的业务逻辑。

- **多节点工作流编排**：在画布上通过拖拽节点、连线来设计对话流程。支持 LLM 调用、知识检索、条件分支（IF/ELSE）、问题分类、参数提取、代码执行（Python/NodeJS）、HTTP 请求、迭代循环等多种节点类型，不需要写代码即可构建复杂的多步骤对话逻辑。
- **多轮对话记忆**：Chatflow 内置聊天记忆（Memory），对话历史可在多个 LLM 节点间共享。即使请求在不同节点之间跳转，AI 仍能记住上下文。可以设置记忆窗口大小，精确控制传递给模型的历史轮数。
- **会话变量**：专属于 Chatflow 的持久化状态机制。可以在同一会话的多轮对话中临时存储信息（如用户偏好、Checklist 进度），配合变量赋值器节点写入和更新，让 LLM 在后续轮次中持续引用，比单纯依赖模型记忆更可靠。
- **开始节点内置系统变量**：`sys.query`（用户输入）、`sys.files`（上传文件）、`sys.conversation_id`（会话 ID）、`sys.dialogue_count`（对话轮数）等系统变量在 Chatflow 中开箱即用，方便构建需要感知对话状态的高级逻辑。
- **Answer 节点流式输出**：Chatflow 专有的 Answer 节点支持在流程的任意中间步骤流式输出文本、图片等回复内容，不强制放在流程末尾，适合"边处理边回复"的交互场景。
- **多应用管理**：每个 Dify Chatflow 应用对应一个 `api-key`，ChatBridge 通过 `ORIGIN_CHAT_CONFIG` 将不同业务来源映射到不同的 Chatflow 应用，实现一套前端、多套 AI 后端。

## ChatBridge 调用的 Dify 接口

| 接口 | 用途 |
|------|------|
| `GET /v1/site` | 获取应用名称、描述和图标，显示在聊天窗口标题栏 |
| `GET /v1/parameters` | 获取文件上传配置（允许类型、数量上限、上传方式） |
| `POST /v1/files/upload` | 上传用户选择的文件，返回文件 ID 供对话接口使用 |
| `POST /v1/chat-messages` | 发送消息，使用 SSE 流式接收 AI 回复，支持携带文件 ID |

所有请求通过 `Authorization: Bearer {api_key}` 鉴权，`api_key` 从 `sessionStorage` 读取，多智能体跳转时会动态切换。

## 快速接入新业务场景的流程

1. 在 Dify 控制台新建一个 Chatflow 应用，在画布上编排模型、提示词和知识库检索节点。
2. 复制该应用的 API Key。
3. 在 `src/config.js` 的 `ORIGIN_CHAT_CONFIG` 中增加一条配置，以新的 `origin` 标识作为 key，填入 `HGAI_BASE_URL` 和 `MAIN_AGENT_API_KEY`。
4. 业务系统通过 `?origin=新标识&userID=xxx` 嵌入 iframe，即可接入新的 AI 助手，无需改动任何前端代码。
