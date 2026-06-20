declare const GM_getValue: (key: string, defaultValue?: string) => string | undefined;
declare const GM_setValue: (key: string, value: string) => void;
declare const GM_xmlhttpRequest: (details: {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  timeout?: number;
  onload?: (response: { status: number; responseText: string; finalUrl?: string }) => void;
  onerror?: (error: unknown) => void;
  ontimeout?: () => void;
}) => void;

export function gmGetValue(key: string, defaultValue = ''): string {
  return (typeof GM_getValue === 'function' ? GM_getValue(key, defaultValue) : defaultValue) ?? defaultValue;
}

export function gmSetValue(key: string, value: string): void {
  if (typeof GM_setValue === 'function') {
    GM_setValue(key, value);
  }
}

export async function gmFetch(url: string, timeout = 10000): Promise<string> {
  if (typeof GM_xmlhttpRequest !== 'function') {
    throw new Error('GM_xmlhttpRequest 不可用');
  }

  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      url,
      method: 'GET',
      timeout,
      onload: (response) => {
        if (response.status === 200) {
          resolve(response.responseText);
        } else {
          reject(new Error(`HTTP ${response.status}: ${url}`));
        }
      },
      onerror: (err) => reject(err),
      ontimeout: () => reject(new Error(`请求超时: ${url}`)),
    });
  });
}
