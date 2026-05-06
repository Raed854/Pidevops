export enum ActivityType {
  WALKING = 'Walking',
  LIGHT_JOGGING = 'Light Jogging',
  GENTLE_SWIMMING = 'Gentle Swimming / Aquagym',
  STATIONARY_BIKE = 'Stationary Bike',
  GENTLE_GYM = 'Gentle Gym / Stretching',
  ADAPTED_YOGA = 'Adapted Yoga',
  TAI_CHI = 'Tai Chi',
  LIGHT_PILATES = 'Light Pilates',
  BALANCE_EXERCISES = 'Balance Exercises',
  COORDINATION_GAMES = 'Coordination Games',
  DANCE = 'Dance with Music',
  GUIDED_WALKING = 'Guided Walking',
  MEMORY_MOVEMENT = 'Memory + Movement Exercises'
}

export interface Activity {
  id?: number;
  title: string;
  description: string;
  mediaUrl?: string;
  mediaType?: string;
  fileName?: string;
  type: ActivityType;
  doctorId: number | undefined;
  doctorName?: string;
  createdAt?: string;
}

export interface Session {
  id?: number;
  activityId: number;
  startTime: string;
  endTime: string;
  status: 'AVAILABLE' | 'BOOKED' | 'CANCELED' | 'APPROVED';
  userId?: number;
  userName?: string;
  activityTitle?: string;
  subscriptionType?: string;
  sessionsCount?: number;
}

export interface PricePlan {
  name: string;
  sessions: number;
  months: number;
  price: number;
  planType: string;
}

export interface UserSubscription {
  id?: number;
  userId: number;
  userName: string;
  planName: string;
  sessionsTotal: number;
  sessionsUsed: number;
  purchaseDate: string;
}
