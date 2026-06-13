import {
  NotificationType,
  NotificationStatus,
  NotificationChannel,
} from '@app/common';

export interface INotification {
  id: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  payload: Record<string, any>;
  retries: number;
  errorMessage?: string | null;
  sentAt?: Date | null;
  createdAt: Date;
}

export interface IUserPreference {
  id: string;
  userId: string;
  email: boolean;
  sms: boolean;
  push: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  subject?: string | null;
  body: string;
  isActive: boolean;
  createdAt: Date;
}
