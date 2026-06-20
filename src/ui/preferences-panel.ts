import { gmAddStyle } from '../shared/gm';
import { loadAllSettings, saveSetting } from '../settings/storage';
import { type Settings, DEFAULT_SETTINGS } from '../settings/schema';

type ChangeCallback = (key: keyof Settings, value: Settings[keyof Settings]) => void;

const PANEL_CSS = `
.nr-panel-overlay {
  position: fixed;
  inset: 0;
  z-index: 2147483649;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}
.nr-panel {
  background: #fff;
  border-radius: 8px;
  width: 500px;
  max-width: 92vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
}
.nr-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
}
.nr-panel-header h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
}
.nr-panel-close-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 20px;
  color: #999;
  border-radius: 4px;
  line-height: 1;
  padding: 0;
}
.nr-panel-close-btn:hover {
  background: #f0f0f0;
  color: #333;
}
.nr-panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px 20px;
}
.nr-panel-section {
  margin-bottom: 20px;
}
.nr-panel-section-title {
  font-size: 13px;
  font-weight: 700;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid #f0f0f0;
}
.nr-panel-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  min-height: 32px;
}
.nr-panel-row label {
  font-size: 14px;
  color: #333;
  flex-shrink: 0;
  margin-right: 12px;
}
.nr-panel-row input[type="text"],
.nr-panel-row input[type="number"] {
  width: 200px;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
}
.nr-panel-row input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  margin: 0;
}
.nr-panel-row textarea {
  width: 100%;
  min-height: 80px;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
  resize: vertical;
}
.nr-panel-row-full {
  flex-direction: column;
  align-items: flex-start;
}
.nr-panel-row-full label {
  margin-bottom: 4px;
}
.nr-panel-save-hint {
  font-size: 11px;
  color: #aaa;
  text-align: center;
  margin-top: 12px;
}
`;

let overlayEl: HTMLElement | null = null;
let onChangeCallback: ChangeCallback | null = null;
let currentSettings: Settings | null = null;
let stylesInjected = false;

function ensureStyles(): void {
  if (!stylesInjected) {
    gmAddStyle(PANEL_CSS);
    stylesInjected = true;
  }
}

function createRow(label: string, control: HTMLElement, fullWidth = false): HTMLElement {
  const row = document.createElement('div');
  row.className = fullWidth ? 'nr-panel-row nr-panel-row-full' : 'nr-panel-row';
  const lbl = document.createElement('label');
  lbl.textContent = label;
  row.appendChild(lbl);
  row.appendChild(control);
  return row;
}

function createTextInput(key: keyof Settings, value: string): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = value;
  input.addEventListener('change', () => {
    saveSetting(key, input.value);
    onChangeCallback?.(key, input.value);
  });
  return input;
}

function createNumberInput(key: keyof Settings, value: number, step = 1): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'number';
  input.value = String(value);
  if (step !== 1) input.step = String(step);
  input.addEventListener('change', () => {
    const num = Number(input.value);
    if (!isNaN(num)) {
      saveSetting(key, num);
      onChangeCallback?.(key, num);
    }
  });
  return input;
}

function createCheckbox(key: keyof Settings, value: boolean): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = value;
  input.addEventListener('change', () => {
    saveSetting(key, input.checked);
    onChangeCallback?.(key, input.checked);
  });
  return input;
}

function createTextarea(key: keyof Settings, value: string): HTMLTextAreaElement {
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.addEventListener('change', () => {
    saveSetting(key, textarea.value);
    onChangeCallback?.(key, textarea.value);
  });
  return textarea;
}

function buildPanel(settings: Settings): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'nr-panel';

  const header = document.createElement('div');
  header.className = 'nr-panel-header';
  const title = document.createElement('h3');
  title.textContent = '阅读设置';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'nr-panel-close-btn';
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', closePreferencesPanel);
  header.appendChild(title);
  header.appendChild(closeBtn);

  const body = document.createElement('div');
  body.className = 'nr-panel-body';

  function addSection(sectionTitle: string): HTMLElement {
    const section = document.createElement('div');
    section.className = 'nr-panel-section';
    const st = document.createElement('div');
    st.className = 'nr-panel-section-title';
    st.textContent = sectionTitle;
    section.appendChild(st);
    body.appendChild(section);
    return section;
  }

  const styleSection = addSection('阅读样式');
  styleSection.appendChild(createRow('字体', createTextInput('fontFamily', settings.fontFamily)));
  styleSection.appendChild(createRow('字号(px)', createNumberInput('fontSize', settings.fontSize)));
  styleSection.appendChild(createRow('行高', createNumberInput('lineHeight', settings.lineHeight, 0.1)));
  styleSection.appendChild(createRow('内容宽度(px)', createNumberInput('contentWidth', settings.contentWidth)));
  styleSection.appendChild(createRow('皮肤', createTextInput('skinName', settings.skinName)));
  styleSection.appendChild(createRow('自定义CSS', createTextarea('extraCss', settings.extraCss), true));

  const toggleSection = addSection('功能开关');
  toggleSection.appendChild(createRow('简繁转换', createCheckbox('convertToTraditional', settings.convertToTraditional)));
  toggleSection.appendChild(createRow('强制分段', createCheckbox('splitContent', settings.splitContent)));
  toggleSection.appendChild(createRow('隐藏侧栏', createCheckbox('hideSidebar', settings.hideSidebar)));
  toggleSection.appendChild(createRow('隐藏底部导航', createCheckbox('hideFooterNav', settings.hideFooterNav)));
  toggleSection.appendChild(createRow('隐藏设置按钮', createCheckbox('hidePreferencesButton', settings.hidePreferencesButton)));
  toggleSection.appendChild(createRow('图片预加载', createCheckbox('imagePreload', settings.imagePreload)));
  toggleSection.appendChild(createRow('调试日志', createCheckbox('debug', settings.debug)));
  toggleSection.appendChild(createRow('界面语言', createTextInput('language', settings.language)));
  toggleSection.appendChild(createRow('禁用自动启动', createCheckbox('disableAutoLaunch', settings.disableAutoLaunch)));
  toggleSection.appendChild(createRow('启用Booklink', createCheckbox('booklinkEnable', settings.booklinkEnable)));
  toggleSection.appendChild(createRow('复制当前标题', createCheckbox('copyCurrentTitle', settings.copyCurrentTitle)));
  toggleSection.appendChild(createRow('下一页加入历史', createCheckbox('addNextPageToHistory', settings.addNextPageToHistory)));
  toggleSection.appendChild(createRow('双击暂停', createCheckbox('doubleClickPause', settings.doubleClickPause)));
  toggleSection.appendChild(createRow('滚动动画', createCheckbox('scrollAnimate', settings.scrollAnimate)));

  const urlSection = addSection('远程地址');
  urlSection.appendChild(createRow('站点规则', createTextInput('siteRulesUrl', settings.siteRulesUrl)));
  urlSection.appendChild(createRow('文本规则', createTextInput('textRulesUrl', settings.textRulesUrl)));
  urlSection.appendChild(createRow('简繁映射', createTextInput('s2tRulesUrl', settings.s2tRulesUrl)));

  const customSection = addSection('自定义规则');

  const groupInput = document.createElement('input');
  groupInput.type = 'text';
  groupInput.value = settings.enabledTextRuleGroups.join(', ');
  groupInput.addEventListener('change', () => {
    const arr = groupInput.value.split(',').map((s) => s.trim()).filter(Boolean);
    saveSetting('enabledTextRuleGroups', arr);
    onChangeCallback?.('enabledTextRuleGroups', arr);
  });
  customSection.appendChild(createRow('启用规则组(逗号分隔)', groupInput));

  customSection.appendChild(createRow('自定义站点规则(JSON)', createTextarea('customSiteRules', settings.customSiteRules), true));
  customSection.appendChild(createRow('自定义替换规则(JSON)', createTextarea('customReplaceRules', settings.customReplaceRules), true));

  const loadSection = addSection('连续加载');
  loadSection.appendChild(createRow('触发距离(px)', createNumberInput('remainHeight', settings.remainHeight)));
  loadSection.appendChild(createRow('最大重试', createNumberInput('maxRetries', settings.maxRetries)));
  loadSection.appendChild(createRow('重试间隔(ms)', createNumberInput('retryDelay', settings.retryDelay)));

  const kbSection = addSection('快捷键');
  const kbTextarea = document.createElement('textarea');
  kbTextarea.value = JSON.stringify(settings.keybindings, null, 2);
  kbTextarea.addEventListener('change', () => {
    try {
      const parsed = JSON.parse(kbTextarea.value);
      saveSetting('keybindings', parsed);
      onChangeCallback?.('keybindings', parsed);
    } catch {
      // ignore parse errors
    }
  });
  kbSection.appendChild(createRow('快捷键配置(JSON)', kbTextarea, true));

  const hint = document.createElement('div');
  hint.className = 'nr-panel-save-hint';
  hint.textContent = '修改后自动保存';
  body.appendChild(hint);

  panel.appendChild(header);
  panel.appendChild(body);
  return panel;
}

export function openPreferencesPanel(onChange?: ChangeCallback): void {
  if (overlayEl) return;
  ensureStyles();

  currentSettings = loadAllSettings();
  onChangeCallback = onChange ?? null;

  const panel = buildPanel(currentSettings);

  overlayEl = document.createElement('div');
  overlayEl.className = 'nr-panel-overlay';
  overlayEl.appendChild(panel);
  overlayEl.addEventListener('click', (e) => {
    if (e.target === overlayEl) {
      closePreferencesPanel();
    }
  });

  document.body.appendChild(overlayEl);
}

export function closePreferencesPanel(): void {
  if (overlayEl) {
    overlayEl.remove();
    overlayEl = null;
    onChangeCallback = null;
    currentSettings = null;
  }
}

export function togglePreferencesPanel(onChange?: ChangeCallback): void {
  if (overlayEl) {
    closePreferencesPanel();
  } else {
    openPreferencesPanel(onChange);
  }
}

export function isPanelOpen(): boolean {
  return overlayEl !== null;
}
