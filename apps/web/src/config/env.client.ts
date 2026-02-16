export const clientEnv = {
  APP_ENV: (import.meta.env.VITE_APP_ENV ?? 'prod') as 'dev' | 'prod',
};
