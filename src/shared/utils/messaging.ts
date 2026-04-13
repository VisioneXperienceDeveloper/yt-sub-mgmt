import browser from 'webextension-polyfill';
import type { Message, MessageResponse } from '../types/messages';

/** 
 * Background Service Worker로 타입 안전 메시지 전송
 * @template T - 메시지 타입
 * @param message - 전송할 메시지 객체
 * @returns 메시지 응답 타입
 */
export async function sendToBackground<T extends Message>(
  message: T
): Promise<MessageResponse<T>> {
  try {
    const response: any = await browser.runtime.sendMessage(message);
    if (response && response.error) {
        throw new Error(response.error);
    }
    return response as MessageResponse<T>;
  } catch (error) {
    console.error('[Messaging] Background 전송 실패:', error);
    throw error;
  }
}
