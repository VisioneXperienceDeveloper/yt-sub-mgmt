import { create } from 'zustand';
import { Tag } from '../types';
import { STORAGE_KEYS } from '../constants';
import { storageGet, storageSet } from '../utils/storage';

interface TagStore {
  tags: Tag[];
  isLoading: boolean;
  fetchTags: () => Promise<void>;
  addTag: (name: string, color: string) => Promise<void>;
  updateTag: (id: string, updates: Partial<Tag>) => Promise<void>;
  removeTag: (id: string) => Promise<void>;
  addChannelToTag: (tagId: string, channelId: string) => Promise<void>;
  removeChannelFromTag: (tagId: string, channelId: string) => Promise<void>;
  reorderTags: (tagIds: string[]) => Promise<void>;
}

export const useTagStore = create<TagStore>()((set, get) => ({
  tags: [],
  isLoading: false,

  fetchTags: async () => {
    set({ isLoading: true });
    const tags = await storageGet<Tag[]>(STORAGE_KEYS.TAGS);
    const normalizedTags = (tags || []).map((t, index) => ({
      ...t,
      order: t.order ?? index
    }));
    set({ 
      tags: normalizedTags.sort((a, b) => a.order - b.order), 
      isLoading: false 
    });
  },

  addTag: async (name, color) => {
    const prev = get().tags;
    const newTag: Tag = {
      id: crypto.randomUUID(),
      name,
      color,
      channelIds: [],
      order: prev.length,
    };
    
    set((state) => ({ tags: [...state.tags, newTag] }));
    
    const success = await storageSet(STORAGE_KEYS.TAGS, get().tags);
    if (!success) set({ tags: prev });
  },

  updateTag: async (id, updates) => {
    const prev = get().tags;
    set((state) => ({
      tags: state.tags.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
    const success = await storageSet(STORAGE_KEYS.TAGS, get().tags.sort((a, b) => a.order - b.order));
    if (!success) set({ tags: prev });
  },

  removeTag: async (id) => {
    const prev = get().tags;
    set((state) => ({ tags: state.tags.filter((t) => t.id !== id) }));
    const success = await storageSet(STORAGE_KEYS.TAGS, get().tags);
    if (!success) set({ tags: prev });
  },

  addChannelToTag: async (tagId, channelId) => {
    const prev = get().tags;
    set((state) => ({
      tags: state.tags.map((t) => 
        t.id === tagId && !t.channelIds.includes(channelId)
          ? { ...t, channelIds: [...t.channelIds, channelId] }
          : t
      )
    }));
    const success = await storageSet(STORAGE_KEYS.TAGS, get().tags);
    if (!success) set({ tags: prev });
  },

  removeChannelFromTag: async (tagId, channelId) => {
    const prev = get().tags;
    set((state) => ({
      tags: state.tags.map((t) => 
        t.id === tagId
          ? { ...t, channelIds: t.channelIds.filter(id => id !== channelId) }
          : t
      )
    }));
    const success = await storageSet(STORAGE_KEYS.TAGS, get().tags);
    if (!success) set({ tags: prev });
  },

  reorderTags: async (tagIds) => {
    const prev = get().tags;
    const reordered = tagIds.map((id, index) => {
      const tag = prev.find(t => t.id === id);
      if (!tag) throw new Error(`Tag not found: ${id}`);
      return { ...tag, order: index };
    });

    set({ tags: reordered });
    const success = await storageSet(STORAGE_KEYS.TAGS, reordered);
    if (!success) set({ tags: prev });
  },
}));
