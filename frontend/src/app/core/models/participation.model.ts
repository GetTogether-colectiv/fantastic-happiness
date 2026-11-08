export type ParticipationStatus = 'GOING' | 'NOT_INTERESTED';
export type MyEventsWhen = 'UPCOMING' | 'PAST';

export interface ParticipationResponse {
  status: ParticipationStatus | null;
  goingCount: number;
  capacity: number | null;
}
