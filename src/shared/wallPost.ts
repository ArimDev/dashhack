export type WallPostPlatform = 'manual' | 'x' | 'instagram';
export type WallPostStatus = 'pending' | 'approved' | 'rejected';

export interface WallPost {
    id: string;
    platform: WallPostPlatform;
    authorName: string;
    handle: string;
    text: string;
    richText?: { type: 'paragraph' | 'bullet'; runs: { text: string; bold: boolean; italic: boolean }[] }[];
    imageUrl: string;
    videoUrl: string;
    sourceUrl: string;
    status: WallPostStatus;
    approved: boolean;
    hidden: boolean;
    pinned: boolean;
    revision: number;
    createdAt: string;
}

export type WallPostInput = Partial<Pick<WallPost,
    'id' | 'platform' | 'authorName' | 'handle' | 'text' | 'imageUrl' | 'videoUrl' | 'sourceUrl' | 'createdAt'>>;

export type CollectedWallPost = Pick<WallPost, 'id' | 'authorName' | 'handle' | 'text' | 'sourceUrl'>
    & { platform: Exclude<WallPostPlatform, 'manual'> }
    & Partial<Pick<WallPost, 'imageUrl' | 'videoUrl' | 'createdAt'>>;
