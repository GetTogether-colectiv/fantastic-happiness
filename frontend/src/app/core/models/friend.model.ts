import { User } from './user.model';

export type FriendRelation = 'NONE' | 'REQUESTED' | 'INCOMING' | 'FRIENDS';

export type FriendshipStatus = 'PENDING' | 'ACCEPTED';

export interface UserSearchResult extends User {
  relation: FriendRelation;
}

export interface FriendRequest {
  id: number;
  user: User;
  createdAt: string;
}

export interface FriendRequestResponse {
  id: number;
  status: FriendshipStatus;
}
