import { Channel, Tag } from './index';

export type Message =
  | { type: 'GET_SUBSCRIPTIONS' }
  | { type: 'SUBSCRIBE'; channelId: string }
  | { type: 'UNSUBSCRIBE'; subscriptionId: string }
  | { type: 'GET_TAGS' }
  | { type: 'SET_TAG'; channelId: string; tagId: string }
  | { type: 'REMOVE_TAG'; tagId: string }
  | { type: 'GET_CHANNEL_DETAILS'; channelIds: string[] };

export type MessageResponse<T extends Message> =
  T extends { type: 'GET_SUBSCRIPTIONS' } ? { channels: Channel[] } :
  T extends { type: 'SUBSCRIBE' } ? { success: boolean } :
  T extends { type: 'UNSUBSCRIBE' } ? { success: boolean } :
  T extends { type: 'GET_TAGS' } ? { tags: Tag[] } :
  T extends { type: 'SET_TAG' } ? { success: boolean } :
  T extends { type: 'REMOVE_TAG' } ? { success: boolean } :
  T extends { type: 'GET_CHANNEL_DETAILS' } ? { details: any[] } :
  never;
