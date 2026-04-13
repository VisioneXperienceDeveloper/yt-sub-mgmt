import browser from 'webextension-polyfill';
import { Message } from '../shared/types/messages';
import { 
  fetchAllSubscriptions, 
  subscribeChannel,
  unsubscribeChannel, 
  fetchChannelDetails 
} from '../api/youtube';
import { STORAGE_KEYS } from '../shared/constants';
import { storageGet, storageSet } from '../shared/utils/storage';
import { Tag } from '../shared/types';

/** 메시지 핸들러 등록 */
browser.runtime.onMessage.addListener(
  (message: unknown, _sender: browser.Runtime.MessageSender, sendResponse: (response?: any) => void) => {
    handleMessage(message as Message).then(sendResponse);
    return true; // 비동기 응답 필수
  }
);

/** 메시지 분기 처리 */
async function handleMessage(message: Message): Promise<any> {
    try {
        switch (message.type) {
            case 'GET_SUBSCRIPTIONS':
                return { channels: await fetchAllSubscriptions() };
            case 'SUBSCRIBE':
                await subscribeChannel(message.channelId);
                return { success: true };
            case 'UNSUBSCRIBE':
                await unsubscribeChannel(message.subscriptionId);
                return { success: true };
            case 'GET_CHANNEL_DETAILS':
                return { details: await fetchChannelDetails(message.channelIds) };
            case 'GET_TAGS':
                return { tags: await storageGet<Tag[]>(STORAGE_KEYS.TAGS) || [] };
            case 'SET_TAG':
                // 태그 저장 로직 (이후 Store에서 호출됨)
                return { success: true };
            case 'REMOVE_TAG':
                return { success: true };
            default:
                console.warn('[Background] 알 수 없는 메시지 타입:', message);
                return { error: 'Unknown message type' };
        }
    } catch (error) {
        console.error('[Background] 메시지 처리 오류:', error);
        return { error: error instanceof Error ? error.message : '알 수 없는 오류' };
    }
}

/** 설치 시 초기화 */
browser.runtime.onInstalled.addListener(() => {
  console.log('[Background] YouTube Subscription Manager installed');
  // 초기 설정값 세팅
});
