// The page speaks English or Simplified Chinese (the translations are in zh.js).
// English is the source: text is looked up by its English wording, with {name}
// placeholders for the parts that change. A voyage's words stay English either
// way; only what the page says changes. Switching saves the choice and reloads.
import { ZH as CORE } from './zh.js';
import { PACK_ZH } from './packs/zh.js';

// The core's Chinese and every content pack's (packs/zh.js).
const ZH = { ...CORE, ...PACK_ZH };

const KEY = 'paca-lang';
const stored = (() => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
})();
export const lang = stored === 'zh' || stored === 'en' ? stored : /^zh/i.test(navigator.language) ? 'zh' : 'en';

// English with no translation yet (handy for checking: `missing` in the console).
export const missing = new Set();

// t('the Hush is {n} miles behind you', { n: 4 })
export function t(en, vars) {
  let text = en;
  if (lang === 'zh' && en) {
    if (ZH[en] === undefined) missing.add(en);
    else text = ZH[en];
  }
  if (!vars) return text;
  text = text.replace(/\{(\w+)\}/g, (all, k) => (k in vars ? vars[k] : all));
  // Chinese puts a space around a Latin word (“Wa 的”), but none between two
  // characters, which is what a space by {name} becomes when the name is Chinese.
  return lang === 'zh' ? text.replace(/([一-鿿]) (?=[一-鿿])/g, '$1') : text;
}

export function setLang(next) {
  try {
    localStorage.setItem(KEY, next);
  } catch {}
  location.reload();
}

// The page's own text: elements marked data-i18n, and placeholder/title/aria-label attributes.
export function translatePage() {
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  if (lang === 'en') return;
  for (const node of document.querySelectorAll('[data-i18n]')) node.textContent = t(node.textContent.trim());
  for (const attr of ['placeholder', 'title', 'aria-label']) {
    for (const node of document.querySelectorAll(`[${attr}]`)) node.setAttribute(attr, t(node.getAttribute(attr)));
  }
}
