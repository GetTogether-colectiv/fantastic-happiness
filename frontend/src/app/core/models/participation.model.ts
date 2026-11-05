export type ParticipationStatus = 'GOING' | 'NOT_INTERESTED';

export interface ParticipationResponse {
  status: ParticipationStatus | null;
  goingCount: number;
  capacity: number | null;
}
