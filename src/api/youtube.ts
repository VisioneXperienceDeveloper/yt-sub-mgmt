import { 
  YouTubeSubscription, 
  YouTubeSubscriptionListResponse, 
  YouTubeChannel, 
  YouTubeChannelListResponse,
  Channel
} from '../shared/types';
import { YOUTUBE_API } from '../shared/constants';

const BASE_URL = YOUTUBE_API.BASE_URL;

async function getAuthToken(): Promise<string> {
  // In production, this would use the real client ID from manifest
  // For testing, we can prompt or use a cached token if possible
  const tokenObj = await new Promise<chrome.identity.TokenDetails & { token?: string }>((resolve) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      resolve({ token });
    });
  });
  if (!tokenObj || !tokenObj.token) throw new Error('OAuth 인증 실패');
  return tokenObj.token;
}

/** 채널의 최근 활동 날짜 가져오기 */
export async function fetchChannelActivity(channelId: string): Promise<Date | null> {
  try {
    const response = await ytFetch<{ items: any[] }>('activities', {
      part: 'snippet,contentDetails',
      channelId: channelId,
      maxResults: '1',
    });

    if (response.data && response.data.items && response.data.items.length > 0) {
      // Background-Foreground 통신 시 Date가 문자열로 변할 수 있으므로 명시적 인스턴스화
      const date = new Date(response.data.items[0].snippet.publishedAt);
      return isNaN(date.getTime()) ? null : date;
    }
    return null;
  } catch (err) {
    console.warn(`[YouTube API] Failed to fetch activity for ${channelId}:`, err);
    return null;
  }
}

async function ytFetch<T>(
  endpoint: string,
  params: Record<string, string>,
  additionalHeaders: Record<string, string> = {}
): Promise<{ data: T | null; etag?: string; status: number }> {
  const token = await getAuthToken();
  const url = new URL(`${BASE_URL}/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const response = await fetch(url.toString(), {
    headers: { 
      Authorization: `Bearer ${token}`,
      ...additionalHeaders
    },
  });

  if (response.status === 401) {
    await new Promise<void>((resolve) => {
      chrome.identity.removeCachedAuthToken({ token }, () => resolve());
    });
    return ytFetch(endpoint, params, additionalHeaders);
  }

  if (response.status === 304) {
    return { data: null, status: 304 };
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`YouTube API 오류: ${error.error?.message ?? response.statusText}`);
  }

  return {
    data: await response.json(),
    etag: response.headers.get('ETag') || undefined,
    status: response.status
  };
}

function mapSubscriptionToChannel(sub: YouTubeSubscription): Channel {
  return {
    id: sub.snippet.resourceId.channelId,
    subscriptionId: sub.id,
    title: sub.snippet.title,
    thumbnailUrl: sub.snippet.thumbnails.medium?.url || sub.snippet.thumbnails.default.url,
    subscriberCount: 0, 
    lastUploadAt: null, 
    lastAnalyzedAt: null, // 초기화
    uploadCount: 0,
    tags: [],
    subscribedAt: new Date(sub.snippet.publishedAt),
    isActive: true, 
  };
}

/** 전체 구독 채널 목록 가져오기 (ETag 지원) */
export async function fetchAllSubscriptions(cachedEtag?: string): Promise<{ channels: Channel[]; etag?: string; unchanged: boolean }> {
  const results: YouTubeSubscription[] = [];
  let pageToken: string | undefined;
  let currentEtag: string | undefined;

  // 1. 첫 번째 페이지 호출 (캐시된 ETag가 있다면 전송)
  const firstResponse = await ytFetch<YouTubeSubscriptionListResponse>('subscriptions', {
    part: 'snippet,contentDetails',
    mine: 'true',
    maxResults: '50',
  }, cachedEtag ? { 'If-None-Match': cachedEtag } : {});

  // 304 Not Modified 처리 (쿼터 아낌)
  if (firstResponse.status === 304) {
    return { channels: [], etag: cachedEtag, unchanged: true };
  }

  if (!firstResponse.data) throw new Error('구독 목록을 불러오지 못했습니다.');
  
  results.push(...firstResponse.data.items);
  pageToken = firstResponse.data.nextPageToken;
  currentEtag = firstResponse.etag;

  // 2. 나머지 페이지들 처리
  while (pageToken) {
    const response = await ytFetch<YouTubeSubscriptionListResponse>('subscriptions', {
      part: 'snippet,contentDetails',
      mine: 'true',
      maxResults: '50',
      pageToken: pageToken
    });

    if (response.data) {
      results.push(...response.data.items);
      pageToken = response.data.nextPageToken;
    } else {
      break;
    }
  }

  return { 
    channels: results.map(mapSubscriptionToChannel),
    etag: currentEtag,
    unchanged: false
  };
}

/** 내 구독 리스트의 최근 활동을 한방에 훑기 (Radar 기능) */
export async function fetchRecentSubscriptionActivities(): Promise<{ channelId: string; publishedAt: string }[]> {
  const response = await ytFetch<{ items: any[] }>('activities', {
    part: 'snippet,contentDetails',
    mine: 'true',
    maxResults: '50', // 가장 최근 50건만 훑음
  });

  if (!response.data || !response.data.items) return [];

  return response.data.items
    .filter(item => item.snippet.type === 'upload')
    .map(item => ({
      channelId: item.snippet.channelId,
      publishedAt: item.snippet.publishedAt
    }));
}

/** 채널 상세 정보 (구독자 수, 마지막 업로드 등) */
export async function fetchChannelDetails(
  channelIds: string[]
): Promise<YouTubeChannel[]> {
  const chunks = chunkArray(channelIds, 50);
  const results: YouTubeChannel[] = [];

  for (const chunk of chunks) {
    const response = await ytFetch<YouTubeChannelListResponse>('channels', {
      part: 'snippet,statistics,contentDetails',
      id: chunk.join(','),
    });
    if (response.data) {
      results.push(...response.data.items);
    }
  }

  return results;
}

/** 구독 추가 (실행 취소용) */
export async function subscribeChannel(channelId: string): Promise<void> {
  const token = await getAuthToken();
  const url = new URL(`${BASE_URL}/subscriptions`);
  url.searchParams.set('part', 'snippet');

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      snippet: {
        resourceId: {
          kind: 'youtube#channel',
          channelId: channelId
        }
      }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`구독 추가 실패: ${error.error?.message ?? response.statusText}`);
  }
}

/** 구독 취소 */
export async function unsubscribeChannel(subscriptionId: string): Promise<void> {
    const token = await getAuthToken();
    const url = new URL(`${BASE_URL}/subscriptions`);
    url.searchParams.set('id', subscriptionId);

    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`구독 취소 실패: ${error.error?.message ?? response.statusText}`);
    }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
}
