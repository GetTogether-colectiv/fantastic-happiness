export type EventCategory =
  'MUSIC' | 'SPORTS' | 'ART' | 'FOOD' | 'TECH' | 'NIGHTLIFE' | 'OUTDOORS' | 'EDUCATION' | 'OTHER';

export interface EventSummary {
  id: number;
  title: string;
  category: EventCategory;
  startsAt: string;
  endsAt: string;
  city: string;
  locationName: string;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string | null;
  capacity: number | null;
  goingCount: number;
}

export interface EventDetails extends EventSummary {
  description: string | null;
  organizerId: number;
  createdAt: string;
}

export interface Page<T> {
  content: T[];
  page: number;
  totalPages: number;
  last: boolean;
}

export interface EventFilter {
  category?: EventCategory;
  city?: string;
  from?: string;
  to?: string;
}

export interface MapArea {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface EventRequest {
  title: string;
  description: string | null;
  category: EventCategory;
  startsAt: string;
  endsAt: string;
  locationName: string;
  city: string;
  capacity: number | null;
  imageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
}

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  MUSIC: 'Music',
  SPORTS: 'Sports',
  ART: 'Art',
  FOOD: 'Food',
  TECH: 'Tech',
  NIGHTLIFE: 'Nightlife',
  OUTDOORS: 'Outdoors',
  EDUCATION: 'Education',
  OTHER: 'Other',
};

export const EVENT_CATEGORIES = Object.keys(CATEGORY_LABELS) as EventCategory[];

export const CATEGORY_ICONS: Record<EventCategory, string> = {
  MUSIC: 'music_note',
  SPORTS: 'sports_soccer',
  ART: 'palette',
  FOOD: 'restaurant',
  TECH: 'computer',
  NIGHTLIFE: 'nightlife',
  OUTDOORS: 'park',
  EDUCATION: 'school',
  OTHER: 'category',
};
