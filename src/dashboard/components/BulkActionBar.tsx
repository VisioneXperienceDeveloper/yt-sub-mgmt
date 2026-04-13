import { useState } from 'react';
import { toast } from 'sonner';
import { useChannelStore } from '../../shared/store/channelStore';
import { useTagStore } from '../../shared/store/tagStore';

export const BulkActionBar = () => {
  const { 
    selectedIds, 
    channels, 
    clearSelection, 
    unsubscribeSelected, 
    undoUnsubscribe, 
    isLoading 
  } = useChannelStore();
  const { tags, addChannelToTag } = useTagStore();
  const [showTagMenu, setShowTagMenu] = useState(false);

  if (selectedIds.length === 0) return null;

  const handleApplyTag = async (tagId: string) => {
    for (const channelId of selectedIds) {
      await addChannelToTag(tagId, channelId);
    }
    setShowTagMenu(false);
    clearSelection();
  };

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-6 min-w-[450px]">
        <div className="flex items-center gap-3 pr-6 border-r border-zinc-800">
          <span className="flex items-center justify-center w-6 h-6 bg-red-500 text-white text-[10px] font-bold rounded-full">
            {selectedIds.length}
          </span>
          <span className="text-sm font-medium">Selected</span>
        </div>

        <div className="flex gap-2 relative">
          <button 
            disabled={isLoading}
            onClick={() => setShowTagMenu(!showTagMenu)}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
          >
            Add Tag
          </button>

          {showTagMenu && (
            <div className="absolute bottom-full mb-2 left-0 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-2 border-b border-zinc-800">
                <p className="text-[10px] font-bold text-zinc-500 uppercase px-2 py-1">Apply Tag</p>
              </div>
              <div className="max-h-48 overflow-y-auto p-1 py-1">
                {tags.length > 0 ? (
                  tags.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => handleApplyTag(tag.id)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                      {tag.name}
                    </button>
                  ))
                ) : (
                  <p className="text-[10px] text-zinc-600 p-3 italic text-center">No tags found</p>
                )}
              </div>
            </div>
          )}

          <button
            onClick={async () => {
              const selectedChannels = channels.filter(c => selectedIds.includes(c.id));
              const names = selectedChannels.map(c => c.title);
              const confirmMsg = names.length > 2 
                ? `Unsubscribe from ${names[0]}, ${names[1]} and ${names.length - 2} others?`
                : `Unsubscribe from ${names.join(', ')}?`;

              if (confirm(confirmMsg)) {
                try {
                  await unsubscribeSelected();
                  
                  toast.success(`Successfully unsubscribed`, {
                    description: names.length > 1 ? `${names.length} channels` : names[0],
                    action: {
                      label: 'Undo',
                      onClick: () => undoUnsubscribe()
                    },
                    cancel: names.length === 1 ? {
                      label: 'View',
                      onClick: () => window.open(`https://www.youtube.com/channel/${selectedChannels[0].id}`, '_blank')
                    } : undefined
                  });
                } catch (err) {
                  toast.error('Failed to unsubscribe. Please try again.');
                }
              }
            }}
            disabled={isLoading}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading && <div className="w-3 h-3 border-2 border-white/30 border-t-white animate-spin rounded-full" />}
            Unsubscribe
          </button>
        </div>

        <button
          onClick={clearSelection}
          className="ml-auto text-zinc-500 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};
