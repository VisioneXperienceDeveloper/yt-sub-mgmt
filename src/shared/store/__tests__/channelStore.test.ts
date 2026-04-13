import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useChannelStore } from '../channelStore';
import { storageGet, storageSet } from '../../utils/storage';
import { fetchChannelActivity } from '../../../api/youtube';

// webextension-polyfill 모킹 (브라우저 환경 에러 방지)
vi.mock('webextension-polyfill', () => ({
  default: {
    storage: {
      local: {
        get: vi.fn(),
        set: vi.fn(),
        remove: vi.fn(),
      }
    },
    runtime: {
      sendMessage: vi.fn(),
      getURL: vi.fn(),
    }
  }
}));

// Storage 유틸리티 모킹
vi.mock('../../utils/storage', () => ({
  storageGet: vi.fn(),
  storageSet: vi.fn(),
}));

// Messaging 유틸리티 모킹
vi.mock('../../utils/messaging', () => ({
  sendToBackground: vi.fn(),
}));

// YouTube API 모킹
vi.mock('../../../api/youtube', () => ({
  fetchChannelActivity: vi.fn(),
}));

// Chrome API 모킹
const chromeMock = {
  storage: {
    local: {
      clear: vi.fn(),
    },
  },
  runtime: {
    reload: vi.fn(),
  },
};
vi.stubGlobal('chrome', chromeMock);

// window.location.reload 모킹
const locationMock = { reload: vi.fn() };
vi.stubGlobal('location', locationMock);
vi.stubGlobal('window', { location: locationMock });

// Zustand 스토어 Mock
// Note: useSettingsStore도 필요할 수 있으므로 최소한으로 모킹
vi.mock('../../store/settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({
      settings: { inactivityThresholdMonths: 3 }
    })
  }
}));

describe('ChannelStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Zustand 스토어 초기화
    useChannelStore.setState({
      channels: [],
      lastActivitySync: 0,
      syncProgress: { current: 0, total: 0, isSyncing: false },
      isLoading: false,
    });
  });

  it('analyzeInactivity should update sync progress and apply results in batch', async () => {
    // 1. 초기 데이터 설정 (분석이 필요한 채널 2개)
    const mockChannels = [
      { id: 'ch1', title: 'Channel 1', lastUploadAt: null },
      { id: 'ch2', title: 'Channel 2', lastUploadAt: null },
    ];
    useChannelStore.setState({ channels: mockChannels as any });

    // 2. API 응답 모킹 (약간의 딜레이를 주어 진행률 변화 관찰 가능하게 함)
    (fetchChannelActivity as any).mockImplementation(async (id: string) => {
      await new Promise(r => setTimeout(r, 10));
      return new Date('2026-04-11T10:00:00Z');
    });

    // 3. 분석 실행
    const promise = useChannelStore.getState().analyzeInactivity();

    // 4. 즉시 상태 확인 (isSyncing이 true여야 함)
    expect(useChannelStore.getState().syncProgress.isSyncing).toBe(true);
    expect(useChannelStore.getState().syncProgress.total).toBe(2);

    await promise;

    // 5. 완료 후 상태 확인
    const state = useChannelStore.getState();
    expect(state.syncProgress.isSyncing).toBe(false);
    expect(state.channels[0].lastUploadAt).not.toBeNull();
    expect(state.channels[1].lastUploadAt).not.toBeNull();
    
    // storageSet이 호출되었는지 확인
    expect(storageSet).toHaveBeenCalled();
  });

  it('analyzeInactivity should use sentinel value for channels with no activity', async () => {
    const mockChannels = [{ id: 'empty_ch', title: 'Empty Channel', lastUploadAt: null }];
    useChannelStore.setState({ channels: mockChannels as any });

    // API가 null을 반환하는 상황 (영상이 없는 채널)
    (fetchChannelActivity as any).mockResolvedValue(null);

    await useChannelStore.getState().analyzeInactivity();

    const state = useChannelStore.getState();
    // 결과적으로 null로 처리됨
    expect(state.channels[0].lastUploadAt).toBeNull();
  });

  it('clearCacheAndSync should clear storage and reload', async () => {
    await useChannelStore.getState().clearCacheAndSync();

    expect(chromeMock.storage.local.clear).toHaveBeenCalled();
    expect(locationMock.reload).toHaveBeenCalled();
    
    const state = useChannelStore.getState();
    expect(state.channels).toEqual([]);
    expect(state.lastActivitySync).toBe(0);
  });

  it('analyzeInactivity should handle large numbers of channels (multi-batch) sequentially', async () => {
    // 1. 150개 채널 생성 (3개의 배치)
    const mockChannels = Array.from({ length: 150 }, (_, i) => ({
      id: `ch${i}`,
      title: `Channel ${i}`,
      lastUploadAt: null
    }));
    useChannelStore.setState({ channels: mockChannels as any });

    // 2. API 응답 모킹 (즉시 응답)
    (fetchChannelActivity as any).mockResolvedValue(new Date('2026-04-11T10:00:00Z'));

    // 3. 분석 실행
    await useChannelStore.getState().analyzeInactivity();

    // 4. 모든 채널이 분석되었는지 확인
    const state = useChannelStore.getState();
    expect(state.channels.every(c => c.lastUploadAt !== null)).toBe(true);
    expect(state.syncProgress.isSyncing).toBe(false);
    
    // storageSet이 여러 번(배치마다) 호출되었는지 확인
    // 150 / 50 = 3 batches
    expect(storageSet).toHaveBeenCalledTimes(3);
  });
});
