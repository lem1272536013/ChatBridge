// 默认聊天配置。访问 /embedChatView 时使用的配置。
export const DEFAULT_CHAT_CONFIG = {
  // DIFY AI chatflow应用的baseurl接口。
  HGAI_BASE_URL: 'https://your-dify-domain.example.com',
  // 默认进入、刷新或任务完成后返回的主智能体key。
  MAIN_AGENT_API_KEY: 'app-xxxxxxxx',
};

// 不同嵌入来源的聊天配置。访问 /embedChatView?origin=hgczy 时会使用 hgczy 这组配置。可以配置多组，用于区分不同的业务系统。
export const ORIGIN_CHAT_CONFIG = {
  hgczy: {
    HGAI_BASE_URL: 'https://your-dify-domain.example.com',
    MAIN_AGENT_API_KEY: 'app-xxxxxxxx',
  },
};

export const getChatConfigByOrigin = (origin) => ({
  ...DEFAULT_CHAT_CONFIG,
  ...(ORIGIN_CHAT_CONFIG[origin] || {}),
});
