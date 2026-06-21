export interface SkinPreset {
  name: string;
  css: string;
}

export const SKIN_PRESETS: Record<string, SkinPreset> = {
  default: {
    name: '缺省皮肤',
    css: '',
  },
  dark: {
    name: '暗色皮肤',
    css: `
.nr-reader-container { color: #666; background-color: rgba(0,0,0,.1); }
`,
  },
  white: {
    name: '白底黑字',
    css: `
.nr-reader-container { color: black; background-color: white; }
.nr-chapter-title { font-weight: bold; border-bottom-color: currentColor; }
`,
  },
  night: {
    name: '夜间模式',
    css: `
.nr-reader-container { color: #939392; background: #2d2d2d; }
.nr-settings-btn { background: white; }
.nr-chapter-body img { background-color: #c0c0c0; }
.nr-sidebar-item.active { color: #939392; }
`,
  },
  'night-1': {
    name: '夜间模式1',
    css: `
.nr-reader-container { color: #679; background-color: black; }
.nr-settings-btn { background-color: white !important; }
.nr-chapter-title { color: #3399FF; background-color: #121212; }
`,
  },
  'night-2': {
    name: '夜间模式2',
    css: `
.nr-reader-container { color: #AAAAAA; background-color: #121212; }
.nr-settings-btn { background-color: white; }
.nr-chapter-body img { background-color: #c0c0c0; }
.nr-chapter-title { color: #3399FF; background-color: #121212; }
.nr-reader-container a { color: #E0BC2D; }
.nr-reader-container a:visited { color: #AAAAAA; }
.nr-reader-container a:hover { color: #3399FF; }
.nr-reader-container a:active { color: #423F3F; }
`,
  },
  'night-duokan': {
    name: '夜间模式（多看）',
    css: `
.nr-reader-container { color: #4A4A4A; background: #101819; }
.nr-settings-btn { background: white; }
.nr-chapter-body img { background-color: #c0c0c0; }
`,
  },
  orange: {
    name: '橙色背景',
    css: `
.nr-reader-container { color: #24272c; background-color: #FEF0E1; }
`,
  },
  green: {
    name: '绿色背景',
    css: `
.nr-reader-container { color: black; background-color: #d8e2c8; }
`,
  },
  'green-2': {
    name: '绿色背景2',
    css: `
.nr-reader-container { color: black; background-color: #CCE8CF; }
`,
  },
  blue: {
    name: '蓝色背景',
    css: `
.nr-reader-container { color: black; background-color: #E7F4FE; }
`,
  },
  brown: {
    name: '棕黄背景',
    css: `
.nr-reader-container { color: black; background-color: #C2A886; }
`,
  },
  classic: {
    name: '经典皮肤',
    css: `
.nr-reader-container { color: black; background-color: #EAEAEE; }
.nr-chapter-title { background-color: #f0f0f0; }
`,
  },
  'qidian-parchment-dark': {
    name: '起点牛皮纸（深色）',
    css: `
.nr-reader-container { color: black; background: url("http://qidian.gtimg.com/qd/images/read.qidian.com/theme/body_theme1_bg_2x.0.3.png"); }
`,
  },
  'qidian-parchment-light': {
    name: '起点牛皮纸（浅色）',
    css: `
.nr-reader-container { color: black; background: url("http://qidian.gtimg.com/qd/images/read.qidian.com/theme/theme_1_bg_2x.0.3.png"); }
`,
  },
  'qidian-black': {
    name: '起点黑色',
    css: `
.nr-reader-container,
.nr-sidebar,
.nr-sidebar-header { color: #666; background: #111 url("https://qidian.gtimg.com/qd/images/read.qidian.com/theme/theme_6_bg.45ad3.png") repeat; }
.nr-settings-btn { background: white; }
`,
  },
  'green-bright': {
    name: '绿色亮字',
    css: `
.nr-reader-container,
.nr-sidebar,
.nr-sidebar-header,
.nr-sidebar-item.active { color: rgb(187,215,188); background-color: rgb(18,44,20); }
`,
  },
};
