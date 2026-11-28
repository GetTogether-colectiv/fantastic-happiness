export interface EventPost {
  id: number;
  userId: number;
  eventId: number;
  authorName: string;
  authorAvatar: string | null;
  rating: number;
  text: string | null;
  createdAt: string;
  photoUrls: string[];
  commentCount: number;
}

export interface EventPostsResponse {
  averageRating: number | null;
  count: number;
  posts: EventPost[];
}

export interface CreatePostRequest {
  rating: number;
  text: string | null;
}

export interface PostComment {
  id: number;
  postId: number;
  userId: number;
  authorName: string;
  authorAvatar: string | null;
  text: string;
  createdAt: string;
}

export interface CreateCommentRequest {
  text: string;
}

// Must match the backend limits (PostPhotoService and spring.servlet.multipart.max-file-size).
export const MAX_PHOTOS_PER_POST = 3;
export const MAX_PHOTO_SIZE_MB = 5;
export const MAX_PHOTO_SIZE_BYTES = MAX_PHOTO_SIZE_MB * 1024 * 1024;
export const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png'];
export const INVALID_PHOTO_MESSAGE = `Only JPG or PNG up to ${MAX_PHOTO_SIZE_MB} MB`;
export const TOO_MANY_PHOTOS_MESSAGE = `You can add up to ${MAX_PHOTOS_PER_POST} photos`;
