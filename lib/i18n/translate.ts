export type TranslationParams = Record<string, string | number>;

export function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => (key in params ? String(params[key]) : `{${key}}`));
}

export function createTranslator(dictionary: Record<string, string>) {
  return function t(key: string, params?: TranslationParams): string {
    const template = dictionary[key] ?? key;
    return interpolate(template, params);
  };
}
