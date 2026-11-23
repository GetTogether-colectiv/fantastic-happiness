export interface EventPost {
  id: number;
  userId: number;
  eventId: number;
  authorName: string;
  authorAvatar: string | null;
  rating: number;
  text: string | null;
  createdAt: string;
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
