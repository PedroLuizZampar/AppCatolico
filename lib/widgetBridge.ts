import { Platform } from 'react-native';
import { BOOKS } from './data';

/**
 * Gera a lista de parágrafos (subset) para alimentar o widget Android.
 * Retorna os dados prontos para serem serializados em JSON.
 */
export function buildWidgetParagraphs(maxItems = 200): {
  bookTitle: string;
  text: string;
  reference: string;
}[] {
  const allowedSlugs = new Set(['caminho', 'sulco', 'forja', 'frases-de-santos']);
  const eligibleBooks = BOOKS.filter(b => allowedSlugs.has(b.slug));
  const sourceBooks = eligibleBooks.length > 0 ? eligibleBooks : BOOKS;

  const all: { bookTitle: string; text: string; reference: string }[] = [];

  for (const book of sourceBooks) {
    for (const ch of book.data.chapters) {
      for (const p of ch.paragraphs) {
        const ref =
          book.slug === 'frases-de-santos'
            ? ch.name
            : `Cap. ${ch.chapter} · ${ch.name}  #${p.number}`;

        all.push({ bookTitle: book.title, text: p.text, reference: ref });
      }
    }
  }

  // Embaralha e pega uma amostra para não saturar SharedPreferences
  const shuffled = all.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, maxItems);
}

/**
 * Envia a lista de parágrafos para o widget via SharedPreferences (Android).
 * Em iOS ou plataformas sem suporte, é um no-op.
 */
export async function syncWidgetData(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    const { NativeModules } = require('react-native');
    const MeditationWidgetModule = NativeModules.MeditationWidgetModule;
    if (!MeditationWidgetModule?.syncParagraphs) return;

    const paragraphs = buildWidgetParagraphs();
    await MeditationWidgetModule.syncParagraphs(JSON.stringify(paragraphs));
  } catch (e) {
    // O módulo nativo pode não existir (ex: web, builds sem prebuild)
    console.warn('[Widget] Não foi possível sincronizar dados do widget:', e);
  }
}
