// notification-channel.enum.ts
export enum NotificationChannel {
  ORDER = 'order', // order placed, shipped, delivered
  PAYMENT = 'payment', // payment success, failed, refund
  PROMO = 'promo', // promotional offers, discounts
  ALERT = 'alert', // security, system alerts
  LOGIN = 'login', // login OTP, new device login
  SIGNUP = 'signup', // welcome message, email verification
}
