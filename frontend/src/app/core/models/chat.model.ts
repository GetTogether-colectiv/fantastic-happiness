export interface ChatMessage {
  id: number;
  eventId: number;
  userId: number;
  userName: string;
  userAvatarUrl: string | null;
  content: string;
  sentAt: string;
}

export const MAX_MESSAGE_LENGTH = 1000;
export const JOIN_TO_CHAT_MESSAGE = 'Join the event to chat';
