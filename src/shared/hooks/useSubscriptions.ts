import { useEffect } from 'react';
import { useChannelStore } from '../store/channelStore';
import { useTagStore } from '../store/tagStore';

export function useSubscriptions() {
  const { 
    channels, isLoading, error, fetchChannels, hydrateChannelDetails, 
    lastActivitySync, analyzeInactivity, syncRecentActivity 
  } = useChannelStore();
  const { fetchTags } = useTagStore();

  useEffect(() => {
    const init = async () => {
      console.log('[useSubscriptions] Initializing sync cycle...');
      await fetchChannels();
      await fetchTags();
      
      // 1. Hydrate basic details (subscribers) if missing
      await hydrateChannelDetails();
      
      // 2. Radar Sync: Catch hot channels (Fast scan, catches Today/Yesterday)
      console.log('[useSubscriptions] Running Radar sync for active channels...');
      await syncRecentActivity();
      
      // 3. Smart Deep-dive: Targeted analysis for borderline/stale channels
      // (Internal logic in analyzeInactivity will filter only necessary channels)
      console.log('[useSubscriptions] Starting smart targeted analysis...');
      analyzeInactivity();
    };
    init();
  }, [fetchChannels, fetchTags, hydrateChannelDetails, analyzeInactivity, syncRecentActivity]);

  return {
    channels,
    isLoading,
    error,
    refresh: () => fetchChannels(true),
  };
}
