import browser from 'webextension-polyfill';

/** chrome.storage.local에서 값 읽기 (sync의 8KB 제한을 피하기 위해 local 사용) */
export async function storageGet<T>(key: string): Promise<T | null> {
  try {
    const result = await browser.storage.local.get(key);
    return (result[key] as T) ?? null;
  } catch (error) {
    console.error(`[Storage] Get failed for key "${key}":`, error);
    return null;
  }
}

/** chrome.storage.local에 값 저장 */
export async function storageSet<T>(key: string, value: T): Promise<boolean> {
  try {
    await browser.storage.local.set({ [key]: value });
    return true;
  } catch (error) {
    console.error(`[Storage] Set failed for key "${key}":`, error);
    return false;
  }
}

/** chrome.storage.local에서 값 삭제 */
export async function storageRemove(key: string): Promise<boolean> {
  try {
    await browser.storage.local.remove(key);
    return true;
  } catch (error) {
    console.error(`[Storage] Remove failed for key "${key}":`, error);
    return false;
  }
}

/** 스토리지 변경 이벤트 구독 */
export function onStorageChange(
  key: string,
  callback: (newValue: any, oldValue: any) => void
): () => void {
  const listener = (changes: Record<string, any>) => {
    if (key in changes) {
      callback(changes[key].newValue, changes[key].oldValue);
    }
  };
  browser.storage.local.onChanged.addListener(listener);
  return () => browser.storage.local.onChanged.removeListener(listener);
}
