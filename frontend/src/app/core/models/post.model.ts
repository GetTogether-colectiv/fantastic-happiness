export interface EventPost {
  id: number;
  userId: number;
  eventId: number;
  authorName: string;
  authorAvatar: string | null;
  rating: number;
  text: string | null;
  createdAt: string;
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
