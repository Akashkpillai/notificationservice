export const KAFKA_TOPICS = {
  NOTIFICATION_REQUESTED: 'notification.requested',

  EMAIL_NOTIFICATIONS: 'notification.email',
  SMS_NOTIFICATIONS: 'notification.sms',
  PUSH_NOTIFICATIONS: 'notification.push',

  NOTIFICATIONS_RETRY: 'notification.retry',
  NOTIFICATIONS_DLQ: 'notification.dlq',
} as const;
