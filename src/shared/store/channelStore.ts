import { create } from 'zustand';
import { Channel } from '../types';
import { sendToBackground } from '../utils/messaging';
import { storageGet, storageSet } from '../utils/storage';
import { STORAGE_KEYS, DEFAULTS } from '../constants';
import { useSettingsStore } from './settingsStore';
import { 
  fetchChannelActivity, 
  fetchAllSubscriptions, 
  fetchRecentSubscriptionActivities 
} from '../../api/youtube';

interface ChannelStore {
  channels: Channel[];
  selectedIds: string[];
  isLoading: boolean;
  error: string | null;
  activeTagId: string | null;
  lastUnsubscribed: Channel[] | null;
  lastActivitySync: number;
  syncProgress: { current: number; total: number; isSyncing: boolean };
  fetchChannels: (forceRefresh?: boolean) => Promise<void>;
  hydrateChannelDetails: () => Promise<void>;
  setActiveTag: (id: string | null) => void;
  normalizeChannels: (channels: any[]) => Channel[];
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  unsubscribeSelected: () => Promise<void>;
  undoUnsubscribe: () => Promise<void>;
  analyzeInactivity: (channelIds?: string[]) => Promise<void>;
  syncRecentActivity: () => Promise<void>;
  clearCacheAndSync: () => Promise<void>;
  prepareForStorage: (channels: Channel[]) => any[];
}

export const useChannelStore = create<ChannelStore>()((set, get) => ({
  channels: [],
  selectedIds: [],
  isLoading: false,
  error: null,
  activeTagId: null,
  lastUnsubscribed: null,
  lastActivitySync: 0,
  syncProgress: { current: 0, total: 0, isSyncing: false },

  setActiveTag: (id) => set({ activeTagId: id }),
  
  // Storage에 저장하기 전 Date 객체를 문자열로 변환 (직렬화 문제 해결)
  prepareForStorage: (channels: Channel[]) => {
    return channels.map(c => ({
      ...c,
      subscribedAt: c.subscribedAt instanceof Date ? c.subscribedAt.toISOString() : c.subscribedAt,
      lastUploadAt: c.lastUploadAt instanceof Date ? c.lastUploadAt.toISOString() : c.lastUploadAt,
    }));
  },

  normalizeChannels: (channels: any[]) => {
    return channels.map(c => {
      try {
        // Handle Date string or Object
        const subscribedAt = c.subscribedAt ? new Date(c.subscribedAt) : null;
        const lastUploadAt = c.lastUploadAt ? new Date(c.lastUploadAt) : null;
        const lastAnalyzedAt = typeof c.lastAnalyzedAt === 'string' ? new Date(c.lastAnalyzedAt).getTime() : c.lastAnalyzedAt;
        
        const validSubscribedAt = subscribedAt && !isNaN(subscribedAt.getTime());
        
        return {
          ...c,
          lastUploadAt: lastUploadAt && !isNaN(lastUploadAt.getTime()) ? lastUploadAt : null,
          subscribedAt: validSubscribedAt 
            ? subscribedAt 
            : (c.subscribedAt && typeof c.subscribedAt === 'string' && !isNaN(new Date(c.subscribedAt).getTime()) 
                ? new Date(c.subscribedAt) 
                : new Date()),
          lastAnalyzedAt: lastAnalyzedAt || null
        };
      } catch (e) {
        console.warn('[ChannelStore] Failed to normalize channel data:', c.title, e);
        return { ...c, subscribedAt: new Date(), lastUploadAt: null };
      }
    });
  },

  fetchChannels: async (force = false) => {
    const { channels: currentChannels, normalizeChannels } = get();
    const now = Date.now();
    const cached = await storageGet<{ channels: Channel[]; timestamp: number; lastActivitySync: number }>(
      STORAGE_KEYS.CHANNELS_CACHE
    );
    const cachedEtag = await storageGet<string>(STORAGE_KEYS.SUBSCRIPTION_ETAG);

    // 1. 캐시 유효성 검사 (강제 새로고침이 아닌 경우 30분간 캐시 유지)
    if (!force && cached && now - cached.timestamp < DEFAULTS.CACHE_TTL_MS) {
      console.log('[ChannelStore] Using fresh cache');
      const normalized = normalizeChannels(cached.channels);
      set({ 
        channels: normalized, 
        lastActivitySync: cached.lastActivitySync,
        isLoading: false 
      });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      // 2. ETag 기반 스마트 페칭 (Zero-Quota 체크)
      const { channels: newChannels, etag, unchanged } = await fetchAllSubscriptions(cachedEtag || undefined);
      
      let finalChannels: Channel[];
      let lastActivitySync = cached?.lastActivitySync || 0;

      if (unchanged && cached) {
        console.log('[ChannelStore] Subscriptions unchanged (304). Using cache.');
        finalChannels = normalizeChannels(cached.channels);
      } else {
        console.log(`[ChannelStore] Fetched ${newChannels.length} channels.`);
        
        // ETag 저장
        if (etag) await storageSet(STORAGE_KEYS.SUBSCRIPTION_ETAG, etag);

        const channelTagsMap = new Map(currentChannels.map(c => [c.id, c.tags]));
        // 캐시된 데이터도 정규화해서 사용
        const cachedChannels = cached ? normalizeChannels(cached.channels) : [];

        finalChannels = newChannels.map((c: Channel) => {
          const cachedChannel = cachedChannels.find(cc => cc.id === c.id);
          return {
            ...c,
            tags: channelTagsMap.get(c.id) || [],
            // 이전 분석 및 상세 데이터 보전 (구독자 수, 비디오 수, 마지막 업로드 등)
            subscriberCount: cachedChannel?.subscriberCount || 0,
            uploadCount: cachedChannel?.uploadCount || 0,
            isActive: cachedChannel?.isActive ?? true,
            lastUploadAt: cachedChannel?.lastUploadAt || null,
            lastAnalyzedAt: cachedChannel?.lastAnalyzedAt || null,
          };
        });
      }

      set({ 
        channels: finalChannels, 
        lastActivitySync,
        isLoading: false 
      });

      // 최신화된 채널 상태 저장
      await storageSet(STORAGE_KEYS.CHANNELS_CACHE, { 
        channels: get().prepareForStorage(finalChannels), 
        timestamp: now,
        lastActivitySync
      });

      // 새로 추가된 채널이 있다면 즉시 증분 분석 트리거
      const existingIds = new Set(currentChannels.map(c => c.id));
      const newlyAddedIds = finalChannels.filter(c => !existingIds.has(c.id)).map(c => c.id);
      
      /* 
      if (newlyAddedIds.length > 0) {
        console.log(`[ChannelStore] Detected ${newlyAddedIds.length} new channels. Triggering incremental sync...`);
        get().analyzeInactivity(newlyAddedIds);
      }
      */
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  hydrateChannelDetails: async () => {
    const { channels } = get();
    if (channels.length === 0) return;

    const pendingIds = channels
      .filter(c => c.subscriberCount === 0)
      .map(c => c.id);
    
    if (pendingIds.length === 0) return;

    const chunkSize = 50;
    for (let i = 0; i < pendingIds.length; i += chunkSize) {
      const chunk = pendingIds.slice(i, i + chunkSize);
      try {
        const response: any = await sendToBackground({ 
          type: 'GET_CHANNEL_DETAILS', 
          channelIds: chunk 
        });

        if (response && response.details) {
          set((state) => ({
            channels: state.channels.map(c => {
              const detail = response.details.find((d: any) => d.id === c.id);
              if (detail) {
                return {
                  ...c,
                  subscriberCount: parseInt(detail.statistics?.subscriberCount || '0'),
                  uploadCount: parseInt(detail.statistics?.videoCount || '0'),
                  isActive: parseInt(detail.statistics?.videoCount || '0') > 0
                };
              }
              return c;
            })
          }));
        }
      } catch (err) {
        console.warn('[ChannelStore] Failed to hydrate chunk:', chunk, err);
      }
    }

    const updatedChannels = get().channels;
    await storageSet(STORAGE_KEYS.CHANNELS_CACHE, { 
      channels: get().prepareForStorage(updatedChannels), 
      timestamp: Date.now() 
    });
  },

  toggleSelect: (id) => {
    set((state) => ({
      selectedIds: state.selectedIds.includes(id)
        ? state.selectedIds.filter((sid) => sid !== id)
        : [...state.selectedIds, id],
    }));
  },

  selectAll: () => {
    set((state) => ({
      selectedIds: state.channels.map((c) => c.id),
    }));
  },

  clearSelection: () => {
    set({ selectedIds: [] });
  },

  unsubscribeSelected: async () => {
    const { selectedIds, channels } = get();
    if (selectedIds.length === 0) return;

    set({ isLoading: true });
    try {
      const { selectedIds, channels } = get();
      const channelsToUnsubscribe = channels.filter(c => selectedIds.includes(c.id));
      
      for (const channel of channelsToUnsubscribe) {
        if (channel.subscriptionId) {
          await sendToBackground({ type: 'UNSUBSCRIBE', subscriptionId: channel.subscriptionId });
        }
      }
      
      const remainingChannels = channels.filter(c => !selectedIds.includes(c.id));
      
      set({ 
        channels: remainingChannels, 
        selectedIds: [], 
        lastUnsubscribed: channelsToUnsubscribe,
        isLoading: false 
      });
      await storageSet(STORAGE_KEYS.CHANNELS_CACHE, { 
        channels: get().prepareForStorage(remainingChannels), 
        timestamp: Date.now() 
      });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  undoUnsubscribe: async () => {
    const { lastUnsubscribed, channels } = get();
    if (!lastUnsubscribed || lastUnsubscribed.length === 0) return;

    set({ isLoading: true });
    try {
      for (const channel of lastUnsubscribed) {
        await sendToBackground({ type: 'SUBSCRIBE', channelId: channel.id });
      }

      // Re-fetch to get new subscriptionIds or just add back (fetching is safer for IDs)
      // For now, let's just add back and prompt a refresh or handle it gracefully
      // Actually, fetching is better to ensure IDs are correct
      set({ 
        channels: [...channels, ...lastUnsubscribed], 
        lastUnsubscribed: null,
        isLoading: false 
      });
      
      // Force refresh to get correct subscription IDs for future deletes
      await get().fetchChannels(true);
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  syncRecentActivity: async () => {
    try {
      console.log('[ChannelStore] Running Global Feed Radar sync...');
      const recentActivities = await fetchRecentSubscriptionActivities();
      if (recentActivities.length === 0) return;

      const { channels } = get();
      const { settings } = useSettingsStore.getState();
      const thresholdMs = settings.inactivityThresholdMonths * 30 * 24 * 60 * 60 * 1000;
      const now = Date.now();

      const activityMap = new Map(recentActivities.map(a => [a.channelId, new Date(a.publishedAt)]));
      
      let updatedCount = 0;
      const updatedChannels: Channel[] = channels.map(c => {
        const newDate = activityMap.get(c.id);
        if (newDate) {
          updatedCount++;
          return {
            ...c,
            lastUploadAt: newDate,
            lastAnalyzedAt: now,
            isActive: (now - newDate.getTime()) < thresholdMs
          };
        }
        return c;
      });

      if (updatedCount > 0) {
        console.log(`[ChannelStore] Radar sync updated ${updatedCount} active channels.`);
        set({ channels: updatedChannels });
        await storageSet(STORAGE_KEYS.CHANNELS_CACHE, { 
          channels: get().prepareForStorage(updatedChannels), 
          timestamp: now,
          lastActivitySync: get().lastActivitySync
        });
      }
    } catch (e) {
      console.warn('[ChannelStore] Radar sync failed:', e);
    }
  },

  analyzeInactivity: async (channelIds?: string[]) => {
    const { channels } = get();
    if (channels.length === 0) return;

    const { settings } = useSettingsStore.getState();
    const thresholdMs = settings.inactivityThresholdMonths * 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    // 지능형 티어링 필터링
    let allTargets: Channel[] = [];
    
    if (channelIds) {
      allTargets = channels.filter(c => channelIds.includes(c.id));
    } else {
      allTargets = channels.filter(c => {
        // 1. 정보가 아예 없는 경우 (신규) - 최우선 분석
        if (!c.lastAnalyzedAt) return true;

        const timeSinceAnalysis = now - c.lastAnalyzedAt;
        
        // 2. 활동 결과가 null인 경우 (분석은 했으나 정보를 못 찾음) 
        // -> 하루에 한 번은 다시 시도해봄
        if (!c.lastUploadAt && timeSinceAnalysis > (24 * 60 * 60 * 1000)) return true;

        // 3. 비활성 경계 채널 (상태가 바뀔 가능성이 높은 채널)
        if (c.lastUploadAt && c.lastUploadAt.getTime() !== 0) {
          const lastUploadTime = c.lastUploadAt.getTime();
          const timeSinceUpload = now - lastUploadTime;
          const isNearThreshold = Math.abs(thresholdMs - timeSinceUpload) < (7 * 24 * 60 * 60 * 1000);
          if (isNearThreshold && timeSinceAnalysis > (24 * 60 * 60 * 1000)) return true;
        }

        // 4. Stale 데이터 (너무 오랫동안 분석 안 함 - 1주일)
        if (timeSinceAnalysis > (7 * 24 * 60 * 60 * 1000)) return true;

        return false;
      });
    }

    if (allTargets.length === 0) {
      console.log('[ChannelStore] No channels need deep analysis at this time.');
      return;
    }

    set({ 
      syncProgress: { current: 0, total: allTargets.length, isSyncing: true },
      isLoading: true 
    });

    console.log(`[ChannelStore] Starting targeted analysis for ${allTargets.length} channels...`);

    const batchSize = 50;
    let completedCount = 0;

    for (let i = 0; i < allTargets.length; i += batchSize) {
      const chunk = allTargets.slice(i, i + batchSize);
      const results: Record<string, Date | null> = {};

      for (const channel of chunk) {
        try {
          const lastActivity = await fetchChannelActivity(channel.id);
          // 활동을 못 찾은 경우 Date(0)을 할당하여 "확인 완료"임을 표시
          results[channel.id] = lastActivity || new Date(0); 
        } catch (e) {
          console.warn(`[ChannelStore] Analysis failed for ${channel.title}:`, e);
        }
        
        completedCount++;
        set(state => ({
          syncProgress: { ...state.syncProgress, current: completedCount }
        }));
      }

      set(state => ({
        channels: state.channels.map(c => {
          const activity = results[c.id];
          if (activity !== undefined) {
            const activityDate = activity ? new Date(activity) : new Date(0);
            const isNoActivity = activityDate.getTime() === 0;
            
            return { 
              ...c, 
              lastUploadAt: isNoActivity ? new Date(0) : activityDate,
              lastAnalyzedAt: now,
              isActive: !isNoActivity && (now - activityDate.getTime()) < thresholdMs
            };
          }
          return c;
        })
      }));

      const { channels: updatedChannels, lastActivitySync } = get();
      await storageSet(STORAGE_KEYS.CHANNELS_CACHE, { 
        channels: get().prepareForStorage(updatedChannels), 
        timestamp: now,
        lastActivitySync
      });

      if (i + batchSize < allTargets.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    if (!channelIds) {
      set({ lastActivitySync: now });
    }

    set({ 
      isLoading: false,
      syncProgress: { current: 0, total: 0, isSyncing: false }
    });
  },

  clearCacheAndSync: async () => {
    console.log('[ChannelStore] Performing Hard Reset...');
    await chrome.storage.local.clear();
    set({ 
      channels: [], 
      lastActivitySync: 0, 
      syncProgress: { current: 0, total: 0, isSyncing: false } 
    });
    window.location.reload();
  },
}));
