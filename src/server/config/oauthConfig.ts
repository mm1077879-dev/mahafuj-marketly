export const isConfiguredOAuthValue = (value?: string): value is string =>
  Boolean(value?.trim() && !/(placeholder|your_|replace_|my_app_url)/i.test(value));

export const getConfiguredAppUrl = (): string | undefined => {
  const value = process.env.APP_URL?.trim();
  if (!isConfiguredOAuthValue(value)) return undefined;

  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
};
