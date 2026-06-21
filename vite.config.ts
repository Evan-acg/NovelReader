import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/userscript/entry.ts',
      userscript: {
        name: {
          '': 'Universal Novel Reader',
          'zh-CN': '通用小说阅读',
          'zh-TW': '通用小說閱讀',
        },
        namespace: 'https://github.com/Evan-acg/NovelReader',
        author: 'EvanstonLaw',
        description: {
          '': '小说阅读脚本，统一阅读样式，内容去广告、修正拼音字、段落整理，自动下一页',
          'zh-CN': '小说阅读脚本，统一阅读样式，内容去广告、修正拼音字、段落整理，自动下一页',
          'zh-TW': '小說閱讀腳本，統一閱讀樣式，內容去廣告、修正拼音字、段落整理，自動下一頁',
        },
        license: 'GPL version 3',
        grant: [
          'GM_xmlhttpRequest',
          'GM_addStyle',
          'GM_getValue',
          'GM_setValue',
          'GM_openInTab',
          'GM_info',
          'unsafeWindow',
        ],
        connect: [
          'github.com',
          'raw.githubusercontent.com',
        ],
        match: [
          '*://*/*',
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
  },
});
