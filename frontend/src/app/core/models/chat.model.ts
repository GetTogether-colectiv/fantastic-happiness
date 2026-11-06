export interface ChatMessage {
  id: number;
  eventId: number;
  userId: number;
  userName: string;
  userAvatarUrl: string | null;
  content: string;
  sentAt: string;
}
