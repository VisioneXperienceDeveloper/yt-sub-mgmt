import React, { useEffect, useState, useMemo } from 'react'
import { useChannelStore } from '../shared/store/channelStore'
import { useTagStore } from '../shared/store/tagStore'
import { Channel, Tag } from '../shared/types'

interface CollapsibleGroupProps {
  title: string;
  color: string;
  channels: Channel[];
  isDefaultExpanded?: boolean;
}

const CollapsibleGroup = ({ title, color, channels, isDefaultExpanded = true }: CollapsibleGroupProps) => {
  const [isExpanded, setIsExpanded] = useState(isDefaultExpanded);

  if (channels.length === 0) return null;

  return (
    <div className="border-b border-zinc-900/50 last:border-none">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between py-4 px-5 hover:bg-zinc-900/40 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.2)]" 
            style={{ backgroundColor: color }}
          />
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 group-hover:text-white transition-colors">
            {title}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 bg-zinc-900/80 rounded-md border border-zinc-800 text-zinc-500 font-medium">
            {channels.length}
          </span>
        </div>
        <svg 
          className={`w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-all duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div className={`accordion-content ${isExpanded ? 'expanded' : ''}`}>
        <div className="accordion-inner px-5 pb-5">
          <div className="grid grid-cols-2 gap-2 mt-1">
            {channels.map(channel => (
              <button
                key={channel.id}
                onClick={() => window.open(`https://youtube.com/channel/${channel.id}`, '_blank')}
                className="flex items-center gap-2.5 p-2 bg-zinc-900/40 border border-zinc-900 hover:border-zinc-700 hover:bg-zinc-900 rounded-xl transition-all group active:scale-[0.97] min-w-0"
              >
                <img 
                  src={channel.thumbnailUrl} 
                  alt={channel.title} 
                  className="w-8 h-8 rounded-full ring-1 ring-zinc-800 group-hover:ring-red-500/30 transition-all shrink-0" 
                />
                <span className="text-[11px] font-medium truncate text-zinc-400 group-hover:text-zinc-200 text-left">
                  {channel.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Popup() {
  const { channels, fetchChannels, isLoading: isChannelsLoading } = useChannelStore()
  const { tags, fetchTags, isLoading: isTagsLoading } = useTagStore()
  
  useEffect(() => {
    fetchChannels()
    fetchTags()
  }, [])

  // Grouping Logic
  const groupedData = useMemo(() => {
    // 1. Tagged groups (sorted by order)
    const taggedGroups = tags.map(tag => ({
      tag,
      channels: channels.filter(c => tag.channelIds.includes(c.id))
    })).filter(group => group.channels.length > 0);

    // 2. Untagged group
    const allTaggedChannelIds = new Set(tags.flatMap(t => t.channelIds));
    const untaggedChannels = channels.filter(c => !allTaggedChannelIds.has(c.id));

    return { taggedGroups, untaggedChannels };
  }, [channels, tags]);

  return (
    <div className="w-[380px] h-[550px] bg-zinc-950 text-white selection:bg-red-500/30 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-zinc-900 bg-zinc-950/90 backdrop-blur-md z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-600/20">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight leading-none">YT <span className="text-red-500">Sub</span> Mgmt</h1>
              <p className="text-[10px] text-zinc-500 font-bold mt-0.5 tracking-wider uppercase">Personal Radar</p>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest font-black text-zinc-600">Total</span>
            <span className="text-lg font-black text-zinc-200 leading-none">{isChannelsLoading ? '...' : channels.length}</span>
          </div>
        </div>
      </div>

      {/* Main Content - Groups */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-gradient-to-b from-zinc-950 to-zinc-900/20">
        {isChannelsLoading || isTagsLoading ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 opacity-40">
            <div className="w-6 h-6 border-2 border-red-500 border-t-transparent animate-spin rounded-full" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Loading Records...</span>
          </div>
        ) : (
          <>
            {groupedData.taggedGroups.map(({ tag, channels: groupChannels }) => (
              <CollapsibleGroup 
                key={tag.id}
                title={tag.name}
                color={tag.color}
                channels={groupChannels}
              />
            ))}
            
            <CollapsibleGroup 
              title="Untagged"
              color="#3f3f46"
              channels={groupedData.untaggedChannels}
              isDefaultExpanded={false}
            />

            {channels.length === 0 && (
              <div className="py-20 px-10 text-center space-y-4">
                <div className="w-16 h-16 bg-zinc-900 rounded-3xl mx-auto flex items-center justify-center opacity-20">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="text-[11px] text-zinc-500 font-medium">No channels synced yet.</p>
                <button 
                  onClick={() => chrome.tabs.create({ url: 'src/dashboard/index.html' })}
                  className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-all"
                >
                  Go to Dashboard
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer / Quick Stats */}
      <div className="p-4 bg-zinc-950 border-t border-zinc-900 flex items-center justify-between">
        <button 
          onClick={() => chrome.tabs.create({ url: 'src/dashboard/index.html' })}
          className="flex items-center gap-2 group"
        >
          <div className="p-2 bg-zinc-900 rounded-lg group-hover:bg-zinc-800 transition-colors">
            <svg className="w-3.5 h-3.5 text-zinc-500 group-hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-zinc-300 transition-colors">Management</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[9px] uppercase tracking-widest font-black text-zinc-800">Status</span>
          <div className="flex gap-1">
            <div className="w-1 h-1 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.3)]" />
            <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
          </div>
        </div>
      </div>
    </div>
  )
}
