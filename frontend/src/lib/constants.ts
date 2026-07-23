export const API_URL = import.meta.env.VITE_API_URL as string;

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  VERIFY_EMAIL: '/verify-email',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password/:token',
  DASHBOARD: '/dashboard',
  CONVERSATION: '/c/:conversationId',
  REPORT: '/report/:token',
} as const;
