import type { TextRule } from '../text-rules/text-rule-types';
import { logger } from '../shared/logger';

export interface CleanOptions {
  convertToTraditional?: boolean;
  splitContent?: boolean;
}

export interface CleanedContent {
  html: string;
  text: string;
}

let placeholderId = 0;
const PLACEHOLDER_PREFIX = '\x00NOVEL_READER_PROTECT_';

function protectHtmlTags(html: string): { protectedHtml: string; map: Map<string, string> } {
  const map = new Map<string, string>();
  let result = html;

  result = result.replace(/<img\b[^>]*\/?>/gi, (match) => {
    const placeholder = `${PLACEHOLDER_PREFIX}${placeholderId++}_`;
    map.set(placeholder, match);
    return placeholder;
  });

  result = result.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, (match) => {
    const placeholder = `${PLACEHOLDER_PREFIX}${placeholderId++}_`;
    map.set(placeholder, match);
    return placeholder;
  });

  return { protectedHtml: result, map };
}

function restoreHtmlTags(html: string, map: Map<string, string>): string {
  let result = html;
  for (const [placeholder, original] of map) {
    while (result.includes(placeholder)) {
      result = result.replace(placeholder, original);
    }
  }
  return result;
}

function removeUnwantedElements(html: string): string {
  let result = html;
  result = result.replace(/<script\b[\s\S]*?<\/script>/gi, '');
  result = result.replace(/<iframe\b[\s\S]*?<\/iframe>/gi, '');
  result = result.replace(/<style\b[\s\S]*?<\/style>/gi, '');
  result = result.replace(/<noscript\b[\s\S]*?<\/noscript>/gi, '');
  return result;
}

function applyTextRules(html: string, rules: TextRule[]): string {
  let result = html;
  for (const rule of rules) {
    try {
      const regex = new RegExp(rule.pattern, rule.flags || 'g');
      result = result.replace(regex, rule.replacement);
    } catch (e) {
      logger.warn(`文本规则执行失败: pattern="${rule.pattern}"`, e);
    }
  }
  return result;
}

function convertBrToParagraphs(html: string): string {
  let result = html.trim();

  result = result.replace(/^(<br\s*\/?>\s*)+/i, '');
  result = result.replace(/(<br\s*\/?>\s*)+$/i, '');
  result = result.replace(/(?:<br\s*\/?>\s*){2,}/gi, '</p><p>');

  if (!/^\s*<p\b/i.test(result)) {
    result = '<p>' + result;
  }
  if (!/<\/p>\s*$/i.test(result)) {
    result = result + '</p>';
  }

  return result;
}

function removeEmptyParagraphs(html: string): string {
  return html.replace(/<p\b[^>]*>\s*(<br\s*\/?>\s*)*\s*<\/p>/gi, '');
}

function forceSplitContent(html: string): string {
  if (!html || /<(p|br|div)\b/i.test(html)) {
    return html;
  }

  return html
    .replace(/([。！？；!?;])\s*/g, '$1</p><p>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}

const S2T_MAP: Record<string, string> = {
  '个': '個', '们': '們', '门': '門', '为': '為', '书': '書', '儿': '兒',
  '从': '從', '无': '無', '见': '見', '风': '風', '开': '開', '关': '關',
  '东': '東', '车': '車', '长': '長', '乐': '樂', '头': '頭', '发': '發',
  '对': '對', '动': '動', '万': '萬', '专': '專', '业': '業', '义': '義',
  '广': '廣', '飞': '飛', '马': '馬', '鱼': '魚', '鸟': '鳥', '龙': '龍',
  '华': '華', '国': '國', '图': '圖', '团': '團', '经': '經', '体': '體',
  '现': '現', '实': '實', '学': '學', '觉': '覺', '览': '覽', '话': '話',
  '说': '說', '读': '讀', '谁': '誰', '谢': '謝', '证': '證', '识': '識',
  '议': '議', '论': '論', '设': '設', '计': '計', '许': '許', '诉': '訴',
  '译': '譯', '试': '試', '测': '測', '诗': '詩', '诚': '誠', '误': '誤', '请': '請',
  '调': '調', '谈': '談', '变': '變', '让': '讓', '认': '認', '记': '記',
  '传': '傳', '伤': '傷', '价': '價', '亿': '億', '会': '會', '伟': '偉',
  '远': '遠', '运': '運', '还': '還', '这': '這', '进': '進', '连': '連',
  '选': '選', '过': '過', '达': '達', '迈': '邁', '迁': '遷', '迟': '遲',
  '际': '際', '陆': '陸', '陈': '陳', '险': '險', '阳': '陽', '队': '隊',
  '阶': '階', '阴': '陰', '邮': '郵', '邻': '鄰', '郑': '鄭', '邓': '鄧',
  '问': '問', '闻': '聞', '间': '間', '闲': '閒', '难': '難', '电': '電',
  '页': '頁', '项': '項', '顺': '順', '须': '須', '顾': '顧', '顿': '頓',
  '预': '預', '领': '領', '养': '養', '饭': '飯', '饮': '飲', '馆': '館',
  '爱': '愛', '笔': '筆', '节': '節', '劳': '勞', '荣': '榮', '蓝': '藍',
  '艺': '藝', '药': '藥', '获': '獲', '虽': '雖', '号': '號', '写': '寫',
  '军': '軍', '农': '農', '冲': '沖', '决': '決', '净': '淨', '准': '準',
  '击': '擊', '划': '劃', '刚': '剛', '则': '則', '创': '創', '刘': '劉',
  '别': '別', '制': '製', '剧': '劇', '剑': '劍', '办': '辦', '务': '務',
  '势': '勢', '劲': '勁', '历': '歷', '压': '壓', '厌': '厭', '厅': '廳',
  '县': '縣', '参': '參', '双': '雙', '圣': '聖', '岁': '歲', '师': '師',
  '带': '帶', '帮': '幫', '干': '幹', '并': '並', '庆': '慶', '应': '應',
  '厂': '廠', '处': '處', '备': '備', '复': '復', '报': '報', '场': '場',
  '块': '塊', '坚': '堅', '尘': '塵', '壮': '壯', '声': '聲', '壳': '殼',
  '夺': '奪', '奖': '獎', '妇': '婦', '妈': '媽', '孙': '孫', '宝': '寶',
  '宁': '寧', '实': '實', '审': '審', '宽': '寬', '宠': '寵', '宾': '賓',
  '寻': '尋', '导': '導', '寿': '壽', '将': '將', '尔': '爾', '尝': '嘗',
  '张': '張', '强': '強', '归': '歸', '当': '當', '录': '錄', '灵': '靈',
  '条': '條', '来': '來', '杨': '楊', '极': '極', '构': '構', '标': '標',
  '树': '樹', '机': '機', '权': '權', '杂': '雜', '梦': '夢', '检': '檢',
  '欢': '歡', '残': '殘', '毁': '毀', '气': '氣', '汉': '漢', '汤': '湯',
  '沟': '溝', '没': '沒', '泽': '澤', '洁': '潔', '济': '濟', '浓': '濃',
  '涛': '濤', '润': '潤', '涨': '漲', '渔': '漁', '湾': '灣', '湿': '濕',
  '满': '滿', '滤': '濾', '滨': '濱', '灯': '燈', '灾': '災', '点': '點',
  '热': '熱', '烧': '燒', '爷': '爺', '争': '爭', '状': '狀', '独': '獨',
  '献': '獻', '兽': '獸', '环': '環', '产': '產', '画': '畫', '疗': '療',
  '疯': '瘋', '众': '眾', '码': '碼', '矿': '礦', '础': '礎', '确': '確',
  '礼': '禮', '视': '視', '离': '離', '种': '種', '积': '積', '称': '稱',
  '稳': '穩', '穷': '窮', '窃': '竊', '简': '簡', '类': '類', '紧': '緊',
  '红': '紅', '纪': '紀', '约': '約', '级': '級', '维': '維', '编': '編',
  '缘': '緣', '缩': '縮', '总': '總', '绩': '績', '续': '續', '绿': '綠',
  '网': '網', '罗': '羅', '罚': '罰', '罢': '罷', '买': '買', '卖': '賣',
  '质': '質', '购': '購', '货': '貨', '贪': '貪', '责': '責', '费': '費',
  '贺': '賀', '资': '資', '赌': '賭', '赏': '賞', '赞': '讚', '赢': '贏',
  '赵': '趙', '赶': '趕', '跃': '躍', '转': '轉', '轮': '輪', '软': '軟',
  '较': '較', '轻': '輕', '输': '輸', '边': '邊', '辽': '遼', '乡': '鄉',
  '释': '釋', '鉴': '鑑', '针': '針', '铁': '鐵', '钱': '錢', '银': '銀',
  '铜': '銅', '钢': '鋼', '错': '錯', '键': '鍵', '镇': '鎮', '闭': '閉',
  '闯': '闖', '闹': '鬧', '阅': '閱', '雪': '雪', '雷': '雷', '雾': '霧',
  '静': '靜', '顶': '頂', '飘': '飄', '饭': '飯', '饱': '飽', '饰': '飾',
  '驾': '駕', '骑': '騎', '鸡': '雞', '鸭': '鴨', '鹅': '鵝', '鸽': '鴿',
  '麦': '麥', '黄': '黃', '齐': '齊', '齿': '齒',
};

function convertSimplifiedToTraditional(html: string): string {
  let result = '';
  for (const char of html) {
    result += S2T_MAP[char] || char;
  }
  return result;
}

export function cleanContent(
  rawHtml: string,
  textRules: TextRule[],
  options: CleanOptions = {},
): CleanedContent {
  if (!rawHtml) {
    return { html: '', text: '' };
  }

  let html = rawHtml;

  html = removeUnwantedElements(html);

  const { protectedHtml, map } = protectHtmlTags(html);
  html = protectedHtml;

  html = applyTextRules(html, textRules);

  html = restoreHtmlTags(html, map);

  if (options.splitContent) {
    html = forceSplitContent(html);
  }

  html = convertBrToParagraphs(html);

  html = removeEmptyParagraphs(html);

  if (options.convertToTraditional) {
    html = convertSimplifiedToTraditional(html);
  }

  const text = html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

  return { html, text };
}
