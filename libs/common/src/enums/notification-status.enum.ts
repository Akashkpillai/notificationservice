// notification-status.enum.ts
export enum NotificationStatus {
  PENDING = 'pending', // created, waiting to be processed
  SENT = 'sent', // successfully delivered
  FAILED = 'failed', // failed, will retry
  DEAD = 'dead', // failed 3 times → went to DLQ
}
