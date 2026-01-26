import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.fef72b1bd1214ff6bcc3c957ca919cde',
  appName: 'rug-scan-report',
  webDir: 'dist',
  // COMMENTED OUT for local builds - uncomment for live reload development
  // server: {
  //   url: 'https://fef72b1b-d121-4ff6-bcc3-c957ca919cde.lovableproject.com?forceHideBadge=true',
  //   cleartext: true
  // },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'Rugboost'
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#f7f5f3',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    }
  }
};

export default config;
