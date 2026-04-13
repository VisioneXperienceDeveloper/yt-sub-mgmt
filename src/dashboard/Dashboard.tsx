import { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { TagSidebar } from './components/TagSidebar';
import { ChannelList } from './components/ChannelList';
import { BulkActionBar } from './components/BulkActionBar';
import { useSubscriptions } from '../shared/hooks/useSubscriptions';
import { ErrorBoundary } from '../shared/components/ErrorBoundary';
import { useChannelStore } from '../shared/store/channelStore';
import { useTagStore } from '../shared/store/tagStore';
import { SettingsView } from './components/SettingsView';

const Dashboard = () => {
  const [activeView, setActiveView] = useState<'channels' | 'settings'>('channels');
  const { error, refresh } = useSubscriptions();
  const { fetchChannels, syncProgress } = useChannelStore();
  const { fetchTags } = useTagStore();

  useEffect(() => {
    fetchChannels();
    fetchTags();

    // Initial view from hash
    const hash = window.location.hash.replace('#', '');
    if (hash === 'settings' || hash === 'channels') {
      setActiveView(hash as any);
    }
  }, []);

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-950 text-white overflow-hidden selection:bg-red-500/30">
      <div className="flex-1 min-w-0 flex flex-col relative overflow-hidden">
        {activeView === 'channels' && (
          <div className="flex-1 flex overflow-hidden">
            <ErrorBoundary>
              <TagSidebar />
            </ErrorBoundary>
            <main className="flex-1 flex flex-col min-w-0 bg-zinc-950/20 backdrop-blur-sm relative border-l border-zinc-900/50">
              <header className="h-20 border-b border-zinc-900 flex items-center px-10 justify-between bg-zinc-950/50">
                <div>
                  <h1 className="text-2xl font-bold">Your Subscriptions</h1>
                  <p className="text-sm text-zinc-500 mt-1">
                    Manage and categorize your YouTube channels {/* {syncProgress.isSyncing && `• Syncing Activity (${syncProgress.current}/${syncProgress.total})...`} */}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {error && (
                    <span className="text-xs text-red-400 font-medium px-3 py-1 bg-red-500/10 rounded-full border border-red-500/20">
                      {error}
                    </span>
                  )}
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={refresh}
                      className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 hover:border-zinc-700 transition-all group"
                      title="Refresh Subscriptions"
                    >
                      <svg className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500 text-zinc-400 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => setActiveView('settings')}
                      className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 hover:border-zinc-700 transition-all group"
                      title="Settings"
                    >
                      <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500 text-zinc-400 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </header>
              <div className="flex-1 overflow-y-auto px-10 pt-8">
                <ChannelList />
              </div>
              <BulkActionBar />
            </main>
          </div>
        )}

        {activeView === 'settings' && (
          <div className="flex-1 flex flex-col h-full bg-zinc-950">
            <header className="h-20 border-b border-zinc-900 flex items-center px-10 gap-6 bg-zinc-950/50">
              <button 
                onClick={() => setActiveView('channels')}
                className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 hover:border-zinc-700 transition-all group text-zinc-400 hover:text-white"
                title="Back to Subscriptions"
              >
                <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold">Extension Settings</h1>
                <p className="text-sm text-zinc-500 mt-1">Manage tags, backup data, and customize extension behavior</p>
              </div>
            </header>
            <main className="flex-1 overflow-y-auto p-10 pt-8">
              <SettingsView />
            </main>
          </div>
        )}
      </div>

      <Toaster position="bottom-center" theme="dark" closeButton />
    </div>
  );
};

export default Dashboard;
