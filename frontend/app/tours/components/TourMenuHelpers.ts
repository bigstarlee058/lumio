/**
 * Tour menu helper functions for processing Intlayer nodes
 */

export type TranslationRecord = Record<string, unknown>;
export type TourStepText = { title: string; description: string };
export type TourStepTextMap = Record<string, TourStepText>;

export type TourTextContent = {
  name?: unknown;
  description?: unknown;
  steps?: unknown;
  content?: {
    name?: unknown;
    description?: unknown;
    steps?: unknown;
  };
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getPreferredLang(): string {
  if (typeof document !== 'undefined') {
    const lang = document.documentElement?.lang;
    if (lang) return lang;
  }
  return 'ru';
}

function resolveTranslationNode(node: Record<string, unknown>): unknown {
  if (node.nodeType !== 'translation') return undefined;
  if (!isRecord(node.translation)) return undefined;
  const lang = getPreferredLang();
  const translation = node.translation as TranslationRecord;
  return translation[lang] ?? translation.ru ?? Object.values(translation)[0];
}

export function unwrapIntlayerNode(node: unknown): unknown {
  if (!node || typeof node !== 'object') return node;
  const maybeValue = (node as { value?: unknown }).value;
  if (typeof maybeValue !== 'undefined') return maybeValue;
  const resolved = resolveTranslationNode(node as Record<string, unknown>);
  if (typeof resolved !== 'undefined') return resolved;
  return node;
}

export function extractText(node: unknown): string {
  const unwrapped = unwrapIntlayerNode(node);
  if (typeof unwrapped === 'string') return unwrapped;
  return String(unwrapped ?? '');
}

export function extractStepsValues(steps: unknown): TourStepTextMap {
  const result: TourStepTextMap = {};
  const resolvedSteps = unwrapIntlayerNode(steps);
  if (!resolvedSteps || typeof resolvedSteps !== 'object') return result;

  for (const [key, value] of Object.entries(resolvedSteps)) {
    const resolvedStep = unwrapIntlayerNode(value);
    result[key] = {
      title: extractText(isRecord(resolvedStep) ? resolvedStep.title : undefined),
      description: extractText(isRecord(resolvedStep) ? resolvedStep.description : undefined),
    };
  }
  return result;
}

export function getTourContentSteps(texts: TourTextContent): unknown {
  return texts.steps ?? texts.content?.steps;
}

function getNodeString(node: unknown): string | undefined {
  if (typeof node === 'string') return node;
  if (isRecord(node) && typeof node.value === 'string') return node.value;
  return undefined;
}

export function getTourMeta(texts: TourTextContent): { name?: string; description?: string } {
  const resolved = texts.content ?? texts;
  const nameNode = isRecord(resolved) ? resolved.name : undefined;
  const descriptionNode = isRecord(resolved) ? resolved.description : undefined;
  return { name: getNodeString(nameNode), description: getNodeString(descriptionNode) };
}

export function getTypedTourInput<T extends { name?: string; description?: string; steps: object }>(
  texts: TourTextContent,
): { name?: string; description?: string; steps: T['steps'] } {
  return {
    ...getTourMeta(texts),
    steps: extractStepsValues(getTourContentSteps(texts)) as T['steps'],
  };
}
