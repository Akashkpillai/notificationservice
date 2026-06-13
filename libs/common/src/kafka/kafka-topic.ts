export const KAFKA_TOPICS = {
  NOTIFICATION_REQUESTED: 'notifications.requested',

  EMAIL_NOTIFICATIONS: 'notifications.email',
  SMS_NOTIFICATIONS: 'notifications.sms',
  PUSH_NOTIFICATIONS: 'notifications.push',

  NOTIFICATIONS_RETRY: 'notifications.retry',
  NOTIFICATIONS_DLQ: 'notifications.dlq',
} as const;
