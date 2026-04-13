import React, { memo, useCallback } from 'react';
import { Channel } from '../../shared/types';
import { TagChip } from '../../shared/components/TagChip';
import { useTagStore } from '../../shared/store/tagStore';
import { useSettingsStore } from '../../shared/store/settingsStore';

interface ChannelCardProps {
  channel: Channel;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export const ChannelCard = memo(({ channel, isSelected, onSelect }: ChannelCardProps) => {
  const { tags } = useTagStore();
  const { settings } = useSettingsStore();
  
  // Find tags associated with this channel
  const channelTags = tags.filter(t => t.channelIds.includes(channel.id));

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(channel.id);
  }, [channel.id, onSelect]);

  const lastUploadDate = channel.lastUploadAt ? new Date(channel.lastUploadAt) : null;
  const thresholdMs = settings.inactivityThresholdMonths * 30 * 24 * 60 * 60 * 1000;
  const isInactive = lastUploadDate 
    ? (Date.now() - lastUploadDate.getTime()) > thresholdMs
    : false;

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = Date.now() - date.getTime();
    
    if (diff > thresholdMs) return 'Long ago';
    
    // Start of today (00:00:00)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - (24 * 60 * 60 * 1000);
    
    const dateTime = date.getTime();
    
    if (dateTime >= today) return 'Today';
    if (dateTime >= yesterday) return 'Yesterday';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days < 30) return `${days}d ago`;
    
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    switch (settings.dateFormat) {
      case 'YY/MM/dd': return `${year}/${month}/${day}`;
      case 'MM/dd/YY': return `${month}/${day}/${year}`;
      case 'dd/MM/YY': return `${day}/${month}/${year}`;
      default: return `${month}/${day}/${year}`;
    }
  };

  return (
    <div
      onClick={() => onSelect(channel.id)}
      className={`
        group relative flex flex-col p-4 rounded-2xl border transition-all cursor-pointer h-full
        ${isSelected 
          ? 'bg-red-500/10 border-red-500/50 ring-1 ring-red-500/20' 
          : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
        }
      `}
    >
      {/* Checkbox Overlay */}
      <div className={`
        absolute top-3 left-3 w-5 h-5 rounded-md border flex items-center justify-center transition-colors
        ${isSelected ? 'bg-red-500 border-red-500' : 'bg-transparent border-zinc-700 group-hover:border-zinc-500'}
      `}>
        {isSelected && (
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      <div className="flex gap-4 items-start">
        <img
          src={channel.thumbnailUrl}
          alt={channel.title}
          className="w-12 h-12 rounded-full ring-2 ring-zinc-800 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-sm text-zinc-100 truncate pr-4">{channel.title}</h3>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                window.open(`https://youtube.com/channel/${channel.id}`, '_blank');
              }}
              className="p-1.5 text-zinc-600 hover:text-white hover:bg-zinc-800 rounded-lg transition-all"
              title="Go to Channel"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-500">
                {formatCount(channel.subscriberCount)} subscribers
              </span>
              {/* {isInactive && (
                <span className="text-[10px] px-1.5 py-0.5 bg-red-500/10 text-red-400 rounded-md border border-red-400/20 font-medium">
                  Inactive
                </span>
              )} */}
            </div>
            {/* <div className="flex items-center gap-1.5 min-h-[14px]">
              <span className="text-[10px] text-zinc-600">Last Upload:</span>
              {lastUploadDate && !isNaN(lastUploadDate.getTime()) ? (
                <span className={`text-[10px] font-medium ${isInactive ? 'text-red-400' : 'text-zinc-400'}`}>
                  {getRelativeTime(lastUploadDate)}
                </span>
              ) : (
                <span className="text-[10px] text-zinc-700 italic">Needs Analysis</span>
              )}
            </div> */}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5 min-h-6">
        {channelTags.map(tag => (
          <TagChip key={tag.id} tag={tag} size="sm" />
        ))}
        {channelTags.length === 0 && (
          <span className="text-[10px] text-zinc-600 italic">No tags</span>
        )}
      </div>

      <div className="mt-auto pt-4 flex items-center justify-between text-[10px] text-zinc-600 border-t border-zinc-900/50">
        <span>Subscribed: {channel.subscribedAt && !isNaN(new Date(channel.subscribedAt).getTime()) 
          ? formatDate(new Date(channel.subscribedAt))
          : 'Unknown Date'}</span>
      </div>
    </div>
  );
});

function formatCount(count: number): string {
  if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
  if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
  return count.toString();
}
