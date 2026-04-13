import React, { useState } from 'react';
import { toast } from 'sonner';
import { useTagStore } from '../../shared/store/tagStore';
import { useChannelStore } from '../../shared/store/channelStore';
import { TagChip } from '../../shared/components/TagChip';
import { COLORS } from '../../shared/constants';

export const TagSidebar = () => {
  const { tags, isLoading, addTag, removeTag, updateTag } = useTagStore();
  const { activeTagId, setActiveTag } = useChannelStore();
  const [newTagName, setNewTagName] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleTagClick = (tagId: string) => {
    setActiveTag(tagId === activeTagId ? null : tagId);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Set a transparent ghost image to avoid messy default ghosting
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newTags = [...tags];
    const draggedItem = newTags[draggedIndex];
    newTags.splice(draggedIndex, 1);
    newTags.splice(index, 0, draggedItem);
    
    // Update store state locally for immediate feedback
    useTagStore.setState({ tags: newTags });
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex !== null) {
      await useTagStore.getState().reorderTags(tags.map(t => t.id));
    }
    setDraggedIndex(null);
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    
    // Default color preset
    const color = COLORS.TAG_PRESETS[Math.floor(Math.random() * COLORS.TAG_PRESETS.length)];
    await addTag(newTagName.trim(), color);
    setNewTagName('');
    toast.success('Tag created');
  };

  return (
    <aside className="w-72 border-r border-zinc-800 bg-zinc-950/50 flex flex-col p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-bold bg-linear-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
          Tags
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-8">
        {/* Tag Creation */}
        <section>
          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">
            Create New Tag
          </h3>
          <form onSubmit={handleAddTag} className="relative group">
            <input
              type="text"
              placeholder="Tag name..."
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-red-500/50 focus:bg-zinc-900 transition-all pr-10"
            />
            <button title="Add Tag" type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </form>
        </section>

        {/* All Tags */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              All Tags
            </h3>
            <span className="text-[10px] px-1.5 py-0.5 bg-zinc-900 rounded border border-zinc-800 text-zinc-600 font-bold">
              {tags.length}
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-4 bg-zinc-900 animate-pulse rounded w-full" />
              ))}
            </div>
          ) : tags.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {tags.map((tag, index) => (
                <div 
                  key={tag.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`
                    group/tag flex items-center justify-between p-2 rounded-xl border transition-all cursor-default
                    ${draggedIndex === index ? 'opacity-40 scale-95' : 'opacity-100 scale-100'}
                    ${activeTagId === tag.id 
                      ? 'bg-zinc-100 border-zinc-100' 
                      : 'bg-zinc-900/40 border-zinc-900/50 hover:border-zinc-800 hover:bg-zinc-900/60'
                    }
                  `}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Drag Handle */}
                    <div className={`p-1 cursor-grab active:cursor-grabbing transition-colors ${activeTagId === tag.id ? 'text-zinc-400' : 'text-zinc-700 group-hover/tag:text-zinc-500'}`}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9h.01M8 15h.01M12 9h.01M12 15h.01M16 9h.01M16 15h.01" />
                      </svg>
                    </div>

                    {/* Color Picker Dot */}
                    <div className="relative w-4 h-4 rounded-full shrink-0 cursor-pointer overflow-hidden border border-white/10 hover:scale-110 transition-transform">
                      <input 
                        type="color"
                        value={tag.color}
                        onChange={(e) => updateTag(tag.id, { color: e.target.value })}
                        className="absolute inset-[-5px] w-[200%] h-[200%] cursor-pointer border-none p-0 bg-transparent"
                      />
                    </div>
                    
                    <button 
                      onClick={() => handleTagClick(tag.id)}
                      className={`text-sm truncate font-bold transition-colors ${activeTagId === tag.id ? 'text-zinc-950' : 'text-zinc-400 group-hover/tag:text-zinc-200'}`}
                    >
                      {tag.name}
                    </button>
                  </div>

                  <div className="flex items-center ml-2 shrink-0">
                    <button
                      onClick={() => confirm(`Delete tag #${tag.name}?`) && removeTag(tag.id)}
                      className={`w-6 h-6 rounded-lg transition-all flex items-center justify-center text-xs ml-1 ${activeTagId === tag.id ? 'text-zinc-400 hover:text-red-600' : 'text-zinc-700 hover:text-red-400 hover:bg-zinc-800'}`}
                      title="Delete Tag"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-600 italic">No tags created yet</p>
          )}
        </section>
      </div>
    </aside>
  );
};
