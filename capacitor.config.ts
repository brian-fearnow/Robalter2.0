import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.brianfearnow.robalter',
  appName: 'Robalter',
  webDir: 'dist',
  server: {
    url: 'https://robalter.vercel.app',
    cleartext: false
  }
};

export default config;
