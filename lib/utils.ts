/**
 * Utilitários compartilhados entre as telas do app.
 * Centraliza funções que antes estavam duplicadas em vários arquivos.
 */

/**
 * Capitaliza palavras, mantendo "de" em minúsculo.
 * Usado nas telas de Liturgia e Santo do Dia.
 */
export const capitalizeWordsExceptDe = (value: string): string => {
  const parts = value.split(' ');
  return parts
    .map(part => {
      if (!part) return part;

      const m = /^([^\p{L}]*)((?:[\p{L}]+(?:-[\p{L}]+)*)+)([^\p{L}]*)$/u.exec(part);
      if (!m) return part;

      const leading = m[1] ?? '';
      const core = m[2] ?? '';
      const trailing = m[3] ?? '';

      if (core.toLowerCase() === 'de') return `${leading}de${trailing}`;

      const hyphenParts = core.split('-').map(p => (p ? p[0].toUpperCase() + p.slice(1) : p));
      return `${leading}${hyphenParts.join('-')}${trailing}`;
    })
    .join(' ');
};

/**
 * Remove acentos e converte para minúsculas para buscas.
 */
export const normalizeText = (value: string): string =>
  (value ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

/**
 * Formata uma Date em português por extenso (ex: "segunda-feira, 2 de março de 2026").
 */
export const formatDatePT = (date: Date): string => {
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Mapa de abreviação de mês em pt-BR para nome completo.
 */
const MONTH_MAP: Record<string, string> = {
  JAN: 'janeiro',
  FEV: 'fevereiro',
  MAR: 'março',
  ABR: 'abril',
  MAI: 'maio',
  JUN: 'junho',
  JUL: 'julho',
  AGO: 'agosto',
  SET: 'setembro',
  OUT: 'outubro',
  NOV: 'novembro',
  DEZ: 'dezembro',
};

/**
 * Converte uma abreviação de mês (MAR, JAN, etc.) para o nome completo em português.
 */
export const monthLabelPt = (month: string | null | undefined): string | null => {
  if (!month) return null;
  const key = month
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .slice(0, 3);
  return MONTH_MAP[key] ?? month.trim();
};

const MONTH_NAMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/**
 * Retorna o índice (0 = janeiro) de uma abreviação de mês.
 */
export const monthIndexFromLabel = (label: string | null | undefined): number | null => {
  const name = monthLabelPt(label);
  if (!name) return null;
  const idx = MONTH_NAMES.indexOf(name);
  return idx >= 0 ? idx : null;
};
