import React, { useState, useMemo } from 'react';
import { useChannelStore } from '../../shared/store/channelStore';
import { useTagStore } from '../../shared/store/tagStore';
import { ChannelCard } from './ChannelCard';

type SortOption = 'name' | 'subscribed_at' | 'subscribers' | 'recent_upload';

export const ChannelList = () => {
  const { channels, selectedIds, toggleSelect, isLoading, activeTagId, setActiveTag } = useChannelStore();
  const { tags } = useTagStore();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent_upload');

  const filteredAndSortedChannels = useMemo(() => {
    let result = channels.filter(c => 
      c.title?.toLowerCase().includes(search.toLowerCase())
    );

    if (activeTagId) {
      result = result.filter(c => {
        const tag = tags.find(t => t.id === activeTagId);
        return tag?.channelIds.includes(c.id);
      });
    }

    return result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.title.localeCompare(b.title);
        case 'subscribed_at':
          return new Date(b.subscribedAt).getTime() - new Date(a.subscribedAt).getTime();
        case 'subscribers':
          return b.subscriberCount - a.subscriberCount;
        case 'recent_upload':
          return (new Date(b.lastUploadAt || 0).getTime()) - (new Date(a.lastUploadAt || 0).getTime());
        default:
          return 0;
      }
    });
  }, [channels, search, sortBy, activeTagId, tags]);

  if (isLoading && channels.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative group w-full max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search within your subscriptions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-red-500/50 focus:bg-zinc-900 transition-all"
          />
        </div>

        <div className="flex items-center gap-3">
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-zinc-900 border border-zinc-800 outline-none rounded-lg pl-3 pr-10 py-2 text-xs font-medium focus:border-red-500/50 transition-all appearance-none cursor-pointer"
            style={{ 
              backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23a1a1aa\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\' /%3E%3C/svg%3E")',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.75rem center',
              backgroundSize: '1rem'
            }}
          >
            <option value="name">Name (A-Z)</option>
            <option value="subscribers">Subscribers</option>
            <option value="subscribed_at">Date Subscribed</option>
            <option value="recent_upload">Recent Activity</option>
          </select>
          
          <div className="flex gap-1">
            <button 
              onClick={() => setActiveTag(null)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${!activeTagId ? 'bg-zinc-100 text-zinc-950 shadow-lg shadow-white/5' : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
            >
              All
            </button>
            {tags.slice(0, 3).map(tag => (
              <button
                key={tag.id}
                onClick={() => setActiveTag(tag.id === activeTagId ? null : tag.id)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${activeTagId === tag.id ? 'bg-zinc-100 text-zinc-950 shadow-lg shadow-white/5' : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
              >
                #{tag.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {filteredAndSortedChannels.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 pb-20">
            {filteredAndSortedChannels.map(channel => (
              <ChannelCard
                key={channel.id}
                channel={channel}
                isSelected={selectedIds.includes(channel.id)}
                onSelect={toggleSelect}
              />
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-zinc-500">
            <svg className="w-12 h-12 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p>No channels matching your criteria</p>
          </div>
        )}
      </div>
    </div>
  );
};
