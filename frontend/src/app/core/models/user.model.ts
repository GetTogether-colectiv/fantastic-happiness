import { EventCategory } from './event.model'

export interface User {
  id: number;
  displayName: string;
  avatarUrl: string | null;
  city: string | null;
}

export interface UserProfile extends User {
  preferredCategories: EventCategory[];
}

export interface ProfileUpdate {
  displayName: string;
  city: string | null;
  avatarUrl: string | null;
}
