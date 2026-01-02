export type SantoDoDiaToday = {
  day: string | null;
  month: string | null;
  year: string | null;
  title: string | null;
  image: string | null;
  content_blocks: SantoContentBlock[] | null;
  full_text: string | null;
  outros_santos: string[] | null;
};

export type SantoContentBlock =
  | { type: 'h2' | 'h3' | 'h4' | 'p' | 'blockquote'; text: string }
  | { type: 'ul' | 'ol'; items: string[] };

export type SantoDoDiaResponse = {
  objective: string;
  source: 'Canção Nova';
  today: SantoDoDiaToday;
};

const DEFAULT_URL = 'https://santo.cancaonova.com/';

const decodeHtmlEntities = (input: string): string => {
  return input
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16)));
};

const stripHtmlComments = (input: string): string => {
  return input.replace(/<!--[\s\S]*?-->/g, '');
};

const stripTags = (html: string): string => {
  return decodeHtmlEntities(
    html
      .replace(/<\s*br\s*\/?\s*>/gi, '\n')
      .replace(/<\s*\/\s*p\s*>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const normalizeSpaces = (text: string): string => {
  return text
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const normalizeSearchKey = (text: string): string => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

const extractFirst = (re: RegExp, input: string): string | null => {
  const match = re.exec(input);
  return match?.[1] ? stripTags(match[1]) : null;
};

const extractElementInnerHtml = (input: string, openTagRe: RegExp): string | null => {
  const match = openTagRe.exec(input);
  if (!match || match.index == null) return null;

  const tag = (match[1] || '').toLowerCase();
  if (!tag) return null;

  const openTagEnd = match.index + match[0].length;
  const tagRe = new RegExp(`<\\/?${tag}\\b`, 'ig');
  tagRe.lastIndex = openTagEnd;

  let depth = 1;
  let m: RegExpExecArray | null;

  while ((m = tagRe.exec(input)) !== null) {
    const isClosing = input[m.index + 1] === '/';
    depth += isClosing ? -1 : 1;

    if (depth === 0) {
      return input.slice(openTagEnd, m.index);
    }
  }

  return null;
};

const extractAll = (re: RegExp, input: string): string[] => {
  const results: string[] = [];
  let match: RegExpExecArray | null;

  const globalRe = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
  while ((match = globalRe.exec(input)) !== null) {
    if (match[1]) results.push(stripTags(match[1]));
  }
  return results;
};

const extractBalancedOuterHtmlFrom = (
  input: string,
  tagName: string,
  startIndex: number = 0
): string | null => {
  const openRe = new RegExp(`<${tagName}\\b[^>]*>`, 'i');
  const slice = input.slice(startIndex);
  const m = openRe.exec(slice);
  if (!m || m.index == null) return null;

  const absoluteOpenStart = startIndex + m.index;
  const openTagEnd = absoluteOpenStart + m[0].length;

  const tagRe = new RegExp(`<\\/?${tagName}\\b`, 'ig');
  tagRe.lastIndex = openTagEnd;

  let depth = 1;
  let mm: RegExpExecArray | null;
  while ((mm = tagRe.exec(input)) !== null) {
    const isClosing = input[mm.index + 1] === '/';
    depth += isClosing ? -1 : 1;
    if (depth === 0) {
      const closeStart = mm.index;
      const closeEnd = input.indexOf('>', closeStart);
      if (closeEnd === -1) return null;
      return input.slice(absoluteOpenStart, closeEnd + 1);
    }
  }

  return null;
};

const normalizeMonthAbbrev = (value: string | null): string | null => {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  return v
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .slice(0, 3);
};

const chooseBestImage = (entryHtml: string): string | null => {
  const candidates = [] as string[];
  const imgRe = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(entryHtml)) !== null) {
    if (m[1]) candidates.push(m[1]);
  }

  const isBad = (src: string) => {
    const s = src.toLowerCase();
    return (
      s.includes('icon-x-ext') ||
      s.includes('device-liturgia') ||
      s.includes('pedido-thumb')
    );
  };

  const isGood = (src: string) => {
    const s = src.toLowerCase();
    return /\.(jpe?g|png|webp)(\?|$)/.test(s) || s.includes('uploads') || s.includes('cnimages');
  };

  const good = candidates.filter(src => !isBad(src) && isGood(src));
  if (good.length > 0) return good[0];

  const ok = candidates.filter(src => !isBad(src));
  return ok[0] ?? null;
};

const extractTextBlocks = (entryHtml: string): string | null => {
  const blocks = [] as string[];
  const blockRe = /<(p|h2|h3|h4)[^>]*>([\s\S]*?)<\/(\1)>/gi;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(entryHtml)) !== null) {
    const text = stripTags(m[2] || '').replace(/\s{2,}/g, ' ').trim();
    if (!text) continue;

    const upper = text.toUpperCase();
    if (
      upper.includes('COMPARTILHE NO') ||
      upper.includes('AJUDE A CANCAO NOVA') ||
      upper.includes('PEDIDO DE ORACAO') ||
      upper.includes('APLICATIVO LITURGIA')
    ) {
      continue;
    }

    blocks.push(text);
  }

  if (blocks.length === 0) return null;
  return blocks.join('\n\n');
};

const shouldSkipText = (text: string): boolean => {
  const cleaned = normalizeSpaces(text);
  if (!cleaned) return true;

  // Ruídos comuns (WordPress/markup)
  if (cleaned === '.' || cleaned === '…' || cleaned === '-->' || cleaned === '->') return true;

  const upper = cleaned.toUpperCase();
  return (
    upper.includes('COMPARTILHE NO') ||
    upper.includes('AJUDE A CANCAO NOVA') ||
    upper.includes('PEDIDO DE ORACAO') ||
    upper.includes('APLICATIVO LITURGIA')
  );
};

const isBoldOnlyParagraph = (innerHtml: string): boolean => {
  const s = innerHtml.trim();
  if (!s) return false;

  // <p><strong>Texto</strong></p> (com spans opcionais)
  return /^(?:<span\b[^>]*>\s*)*<(strong|b)\b[^>]*>[\s\S]*?<\/\1>\s*(?:<\/span>\s*)*$/i.test(
    s
  );
};

const pushIfText = (
  blocks: SantoContentBlock[],
  type: 'h2' | 'h3' | 'h4' | 'p' | 'blockquote',
  text: string
) => {
  const cleaned = normalizeSpaces(text);
  if (!cleaned) return;
  if (shouldSkipText(cleaned)) return;
  blocks.push({ type, text: cleaned });
};

const findOtherSaintsSectionIndex = (entryHtml: string): number => {
  const re = /<(h2|h3|h4)[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(entryHtml)) !== null) {
    const headingText = normalizeSearchKey(stripTags(m[2] || ''));
    if (headingText.includes('outros santos') || headingText.includes('outros santos e beatos')) {
      return m.index;
    }
  }
  return -1;
};

const extractContentBlocks = (entryHtml: string): SantoContentBlock[] | null => {
  const blocks: SantoContentBlock[] = [];

  const otherIdx = findOtherSaintsSectionIndex(entryHtml);
  const html = otherIdx >= 0 ? entryHtml.slice(0, otherIdx) : entryHtml;

  const elementRe = /<(p|h2|h3|h4|blockquote|ul|ol|strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = elementRe.exec(html)) !== null) {
    const tag = (m[1] || '').toLowerCase();
    const inner = m[2] || '';

    if (tag === 'ul' || tag === 'ol') {
      const items = extractAll(/<li[^>]*>([\s\S]*?)<\/li>/gi, inner)
        .map(t => normalizeSpaces(t))
        .filter(t => t.length > 0 && !shouldSkipText(t));

      if (items.length > 0) blocks.push({ type: tag as 'ul' | 'ol', items });
      continue;
    }

    // Sempre que for <strong>/<b> (top-level), trata como H3
    if (tag === 'strong' || tag === 'b') {
      pushIfText(blocks, 'h3', stripTags(inner));
      continue;
    }

    // Dentro de <p>, qualquer <b>/<strong> vira um bloco H3 (mantendo a ordem)
    if (tag === 'p') {
      const pInner = inner;

      // Caso simples: parágrafo todo em negrito
      if (isBoldOnlyParagraph(pInner)) {
        pushIfText(blocks, 'h3', stripTags(pInner));
        continue;
      }

      const boldRe = /<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi;
      let lastIndex = 0;
      let hasBold = false;
      let bm: RegExpExecArray | null;

      while ((bm = boldRe.exec(pInner)) !== null) {
        hasBold = true;
        const beforeHtml = pInner.slice(lastIndex, bm.index);
        pushIfText(blocks, 'p', stripTags(beforeHtml));

        const boldHtml = bm[2] || '';
        pushIfText(blocks, 'h3', stripTags(boldHtml));

        lastIndex = bm.index + bm[0].length;
      }

      if (hasBold) {
        const afterHtml = pInner.slice(lastIndex);
        pushIfText(blocks, 'p', stripTags(afterHtml));
        continue;
      }

      pushIfText(blocks, 'p', stripTags(pInner));
      continue;
    }

    // Demais tags
    pushIfText(blocks, tag as 'h2' | 'h3' | 'h4' | 'blockquote', stripTags(inner));
  }

  return blocks.length > 0 ? blocks : null;
};

const extractOtherSaints = (entryHtml: string): string[] | null => {
  const otherIdx = findOtherSaintsSectionIndex(entryHtml);

  const candidates: string[] = [];

  if (otherIdx >= 0) {
    const otherSlice = entryHtml.slice(otherIdx);
    const ulOuter =
      extractBalancedOuterHtmlFrom(otherSlice, 'ul', 0) ??
      extractBalancedOuterHtmlFrom(otherSlice, 'ol', 0);

    if (ulOuter) {
      const items = extractAll(/<li[^>]*>([\s\S]*?)<\/li>/gi, ulOuter)
        .map(t => normalizeSpaces(t))
        .filter(t => t.length > 0);

      if (items.length > 0) return items;
    }
  }

  // Fallback: tenta encontrar a lista mais "cara" com cara de outros santos
  const listRe = /<(ul|ol)\b[^>]*>[\s\S]*?<\/\1>/gi;
  let best: { score: number; items: string[] } | null = null;
  let mm: RegExpExecArray | null;
  while ((mm = listRe.exec(entryHtml)) !== null) {
    const outer = mm[0] || '';
    const items = extractAll(/<li[^>]*>([\s\S]*?)<\/li>/gi, outer)
      .map(t => normalizeSpaces(t))
      .filter(t => t.length > 0);
    if (items.length < 3) continue;

    const startsWithEm = items.filter(i => /^em\s+/i.test(i)).length;
    const hasDagger = items.filter(i => i.includes('†')).length;
    const score = items.length + startsWithEm * 2 + hasDagger;

    if (!best || score > best.score) best = { score, items };
  }

  if (best?.items?.length) {
    candidates.push(...best.items);
  }

  return candidates.length > 0 ? candidates : null;
};

export async function fetchSantoDoDia(url: string = DEFAULT_URL): Promise<SantoDoDiaResponse> {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.6',
    },
  });

  if (!response.ok) {
    throw new Error(`Não foi possível acessar ${url}, status ${response.status}`);
  }

  const html = stripHtmlComments(await response.text());

  // Data (dia/mês/ano)
  const dateInner =
    extractElementInnerHtml(html, /<([a-z0-9]+)[^>]*id=["']date-post["'][^>]*>/i) ?? html;
  const day = extractFirst(/class=["']dia["'][^>]*>([\s\S]*?)<\//i, dateInner);
  const monthRaw = extractFirst(/class=["']mes["'][^>]*>([\s\S]*?)<\//i, dateInner);
  const year = extractFirst(/class=["']ano["'][^>]*>([\s\S]*?)<\//i, dateInner);
  const month = normalizeMonthAbbrev(monthRaw) ?? monthRaw;

  // Título
  const title = extractFirst(/<h1[^>]*class=["'][^"']*entry-title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i, html);

  // Conteúdo principal
  const entryInner =
    extractElementInnerHtml(html, /<([a-z0-9]+)[^>]*class=["'][^"']*entry-content[^"']*["'][^>]*>/i) ?? '';

  const image = entryInner ? chooseBestImage(entryInner) : null;
  const content_blocks = entryInner ? extractContentBlocks(entryInner) : null;
  const full_text = entryInner ? extractTextBlocks(entryInner) : null;

  // Lista de outros santos (não depende do primeiro <ul> do conteúdo)
  const outros_santos = entryInner ? extractOtherSaints(entryInner) : null;

  return {
    objective:
      'A API_LITURGIA_DIARIA visa disponibilizar via api as leituras para facilitar a criação de aplicações que almejam a evangelização.',
    source: 'Canção Nova',
    today: {
      day,
      month,
      year,
      title,
      image,
      content_blocks,
      full_text,
      outros_santos,
    },
  };
}
