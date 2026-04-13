export interface Channel {
  id: string;               // YouTube 채널 ID
  subscriptionId: string;   // 구독 취소를 위한 고유 ID
  title: string;
  thumbnailUrl: string;
  subscriberCount: number;
  lastUploadAt: Date | null;
  lastAnalyzedAt: number | null; // Timestamp of the last successful activity check
  uploadCount: number;
  tags: string[];           // 사용자 지정 태그 ID 배열
  subscribedAt: Date;
  isActive: boolean;        // 최근 3개월 업로드 여부
}

export interface Tag {
  id: string;
  name: string;
  color: string;            // HEX
  channelIds: string[];
  order: number;            // 정렬 순서
}

export interface UserSettings {
  inactivityThresholdMonths: number;  // 기본 3개월
  autoTaggingEnabled: boolean;
  feedFilterEnabled: boolean;
  dateFormat: 'YY/MM/dd' | 'MM/dd/YY' | 'dd/MM/YY';
}

// YouTube API Types
export interface YouTubeSubscription {
  id: string; // Subscription ID
  snippet: {
    resourceId: {
      channelId: string;
    };
    title: string;
    description: string;
    thumbnails: {
      default: { url: string };
      medium: { url: string };
      high: { url: string };
    };
    publishedAt: string;
  };
  contentDetails: {
    totalItemCount: number;
    newItemCount: number;
    activityType: string;
  };
}

export interface YouTubeChannel {
  id: string;
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      default: { url: string };
    };
  };
  statistics: {
    subscriberCount: string;
    videoCount: string;
    viewCount: string;
  };
  contentDetails: {
    relatedPlaylists: {
      uploads: string;
    };
  };
}

export interface YouTubeSubscriptionListResponse {
  items: YouTubeSubscription[];
  nextPageToken?: string;
  pageInfo: {
    totalResults: number;
  };
}

export interface YouTubeChannelListResponse {
  items: YouTubeChannel[];
}
