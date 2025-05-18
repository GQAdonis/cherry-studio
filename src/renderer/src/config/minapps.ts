import AIStudioLogo from '@renderer/assets/images/apps/aistudio.svg?url'
import ApplicationLogo from '@renderer/assets/images/apps/application.png?url'
import BaiduAiAppLogo from '@renderer/assets/images/apps/baidu-ai.png?url'
import BaiduAiSearchLogo from '@renderer/assets/images/apps/baidu-ai-search.webp?url'
import BoltAppLogo from '@renderer/assets/images/apps/bolt.png?url'
import ClaudeAppLogo from '@renderer/assets/images/models/claude.png?url'
import DeepSeekProviderLogo from '@renderer/assets/images/providers/deepseek.png?url'
import DevvAppLogo from '@renderer/assets/images/apps/devv.png?url'
import DifyAppLogo from '@renderer/assets/images/apps/dify.svg?url'
import DuckDuckGoAppLogo from '@renderer/assets/images/apps/duckduckgo.webp?url'
import GeminiAppLogo from '@renderer/assets/images/apps/gemini.png?url'
import GithubCopilotLogo from '@renderer/assets/images/apps/github-copilot.webp?url'
import GroqProviderLogo from '@renderer/assets/images/providers/groq.png?url'
import HuggingChatLogo from '@renderer/assets/images/apps/huggingchat.svg?url'
import KimiAppLogo from '@renderer/assets/images/apps/kimi.webp?url'
import n8nLogo from '@renderer/assets/images/apps/n8n.svg?url'
import NotebookLMAppLogo from '@renderer/assets/images/apps/notebooklm.svg?url'
import OpenAiProviderLogo from '@renderer/assets/images/providers/openai.png?url'
import PerplexityAppLogo from '@renderer/assets/images/apps/perplexity.webp?url'
import PoeAppLogo from '@renderer/assets/images/apps/poe.webp?url'
import QwenlmAppLogo from '@renderer/assets/images/apps/qwenlm.webp?url'
import SiliconFlowProviderLogo from '@renderer/assets/images/providers/silicon.png?url'
import ThinkAnyLogo from '@renderer/assets/images/apps/thinkany.webp?url'
import WanZhiAppLogo from '@renderer/assets/images/apps/wanzhi.jpg?url'
import YouLogo from '@renderer/assets/images/apps/you.jpg?url'
import ZhipuProviderLogo from '@renderer/assets/images/apps/qingyan.png?url'
import { MinAppType } from '@renderer/types'

// Load custom mini apps
const loadCustomMiniApp = async (): Promise<MinAppType[]> => {
  try {
    let content: string
    try {
      content = await window.api.file.read('custom-minapps.json')
    } catch (error) {
      // If the file doesn't exist, create an empty JSON array
      content = '[]'
      await window.api.file.writeWithId('custom-minapps.json', content)
    }

    const customApps = JSON.parse(content)
    const now = new Date().toISOString()

    return customApps.map((app: any) => ({
      ...app,
      type: 'Custom',
      logo: app.logo && app.logo !== '' ? app.logo : ApplicationLogo,
      addTime: app.addTime || now
    }))
  } catch (error) {
    console.error('Failed to load custom mini apps:', error)
    return []
  }
}

// Initialize default mini apps
const ORIGIN_DEFAULT_MIN_APPS: MinAppType[] = [
  {
    id: 'openai',
    name: 'ChatGPT',
    url: 'https://chatgpt.com/',
    logo: OpenAiProviderLogo,
    bodered: true
  },
  {
    id: 'gemini',
    name: 'Gemini',
    url: 'https://gemini.google.com/',
    logo: GeminiAppLogo
  },
  {
    id: 'silicon',
    name: 'SiliconFlow',
    url: 'https://cloud.siliconflow.cn/playground/chat',
    logo: SiliconFlowProviderLogo
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    url: 'https://chat.deepseek.com/',
    logo: DeepSeekProviderLogo
  },
  {
    id: 'yi',
    name: 'Wanzhi',
    url: 'https://www.wanzhi.com/',
    logo: WanZhiAppLogo,
    bodered: true
  },
  {
    id: 'zhipu',
    name: 'Zhipu Qingyan',
    url: 'https://chatglm.cn/main/alltoolsdetail',
    logo: ZhipuProviderLogo
  },
  {
    id: 'moonshot',
    name: 'Kimi',
    url: 'https://kimi.moonshot.cn/',
    logo: KimiAppLogo
  },
  {
    id: 'groq',
    name: 'Groq',
    url: 'https://chat.groq.com/',
    logo: GroqProviderLogo
  },
  {
    id: 'anthropic',
    name: 'Claude',
    url: 'https://claude.ai/',
    logo: ClaudeAppLogo
  },
  {
    id: 'baidu-ai-chat',
    name: 'Wenxin Yiyan',
    logo: BaiduAiAppLogo,
    url: 'https://yiyan.baidu.com/'
  },
  {
    id: 'baidu-ai-search',
    name: 'Baidu AI Search',
    logo: BaiduAiSearchLogo,
    url: 'https://chat.baidu.com/',
    bodered: true,
    style: {
      padding: 5
    }
  },
  {
    id: 'poe',
    name: 'Poe',
    logo: PoeAppLogo,
    url: 'https://poe.com'
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    logo: PerplexityAppLogo,
    url: 'https://www.perplexity.ai/'
  },
  {
    id: 'devv',
    name: 'DEVV_',
    logo: DevvAppLogo,
    url: 'https://devv.ai/'
  },
  {
    id: 'hugging-chat',
    name: 'HuggingChat',
    logo: HuggingChatLogo,
    url: 'https://huggingface.co/chat/',
    bodered: true
  },
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    logo: DuckDuckGoAppLogo,
    url: 'https://duck.ai'
  },
  {
    id: 'bolt.diy',
    name: 'Bolt.diy',
    logo: BoltAppLogo,
    url: 'https://bolt.prometheusags.ai',
    bodered: true,
    // Add style properties to ensure proper rendering
    style: {
      padding: 5,
      backgroundColor: '#ffffff'
    },
    // Add metadata for WebContentsView configuration
    metadata: {
      // Prioritize local file for better reliability
      fallbackUrls: [
        'file://${path.join(__dirname, "resources", "miniapps", "bolt.diy.html")}',
        'http://localhost:3000/bolt.diy'
      ],
      // Disable sandbox for better compatibility
      webPreferences: {
        sandbox: false,
        contextIsolation: true,
        webSecurity: true
      }
    }
  },
  {
    id: 'thinkany',
    name: 'ThinkAny',
    logo: ThinkAnyLogo,
    url: 'https://thinkany.ai/',
    bodered: true,
    style: {
      padding: 5
    }
  },
  {
    id: 'github-copilot',
    name: 'GitHub Copilot',
    logo: GithubCopilotLogo,
    url: 'https://github.com/copilot'
  },
  {
    id: 'qwenlm',
    name: 'QwenLM',
    logo: QwenlmAppLogo,
    url: 'https://qwenlm.ai/'
  },
  {
    id: 'aistudio',
    name: 'AI Studio',
    logo: AIStudioLogo,
    url: 'https://aistudio.google.com/'
  },
  {
    id: 'notebooklm',
    name: 'NotebookLM',
    logo: NotebookLMAppLogo,
    url: 'https://notebooklm.google.com/'
  },
  {
    id: 'dify',
    name: 'Dify',
    logo: DifyAppLogo,
    url: 'https://dify.skytok.net',
    bodered: true,
    style: {
      padding: 5
    },
    // Add metadata for WebContentsView configuration
    metadata: {
      // Prioritize the correct URL and add fallbacks
      fallbackUrls: ['https://dify.skytok.net', 'https://dify.skytok.net/apps'],
      // Disable sandbox for better compatibility
      webPreferences: {
        sandbox: false,
        contextIsolation: true,
        webSecurity: true
      }
    }
  },
  {
    id: 'you',
    name: 'You',
    logo: YouLogo,
    url: 'https://you.com/'
  },
  {
    id: 'n8n',
    name: 'n8n',
    logo: n8nLogo,
    url: 'https://n8n.skytok.net/',
    bodered: true,
    style: {
      padding: 5
    }
  }
]

// Load custom mini apps and merge with default apps
let DEFAULT_MIN_APPS = [...ORIGIN_DEFAULT_MIN_APPS, ...(await loadCustomMiniApp())]

function updateDefaultMinApps(param) {
  DEFAULT_MIN_APPS = param
}

export { DEFAULT_MIN_APPS, loadCustomMiniApp, ORIGIN_DEFAULT_MIN_APPS, updateDefaultMinApps }
