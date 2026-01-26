import { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Camera, CameraResultType, CameraSource, Photo, GalleryPhoto } from '@capacitor/camera';

export interface CapturedPhoto {
  webPath?: string;
  path?: string;
  format: string;
}

interface UseCapacitorReturn {
  isNative: boolean;
  platform: string;
  // Haptics
  hapticImpact: (style?: ImpactStyle) => Promise<void>;
  hapticNotification: (type?: NotificationType) => Promise<void>;
  hapticVibrate: (duration?: number) => Promise<void>;
  hapticSelection: () => Promise<void>;
  // Status Bar
  setStatusBarStyle: (style: Style) => Promise<void>;
  hideStatusBar: () => Promise<void>;
  showStatusBar: () => Promise<void>;
  setStatusBarColor: (color: string) => Promise<void>;
  // Push Notifications
  registerPushNotifications: () => Promise<string | null>;
  pushToken: string | null;
  // Camera
  takePhoto: () => Promise<CapturedPhoto | null>;
  pickPhotos: (limit?: number) => Promise<CapturedPhoto[]>;
}

export function useCapacitor(): UseCapacitorReturn {
  const [pushToken, setPushToken] = useState<string | null>(null);
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();

  // ============ HAPTICS ============
  const hapticImpact = useCallback(async (style: ImpactStyle = ImpactStyle.Medium) => {
    if (!isNative) return;
    try {
      await Haptics.impact({ style });
    } catch (error) {
      console.warn('Haptic impact failed:', error);
    }
  }, [isNative]);

  const hapticNotification = useCallback(async (type: NotificationType = NotificationType.Success) => {
    if (!isNative) return;
    try {
      await Haptics.notification({ type });
    } catch (error) {
      console.warn('Haptic notification failed:', error);
    }
  }, [isNative]);

  const hapticVibrate = useCallback(async (duration: number = 300) => {
    if (!isNative) return;
    try {
      await Haptics.vibrate({ duration });
    } catch (error) {
      console.warn('Haptic vibrate failed:', error);
    }
  }, [isNative]);

  const hapticSelection = useCallback(async () => {
    if (!isNative) return;
    try {
      await Haptics.selectionStart();
      await Haptics.selectionChanged();
      await Haptics.selectionEnd();
    } catch (error) {
      console.warn('Haptic selection failed:', error);
    }
  }, [isNative]);

  // ============ STATUS BAR ============
  const setStatusBarStyle = useCallback(async (style: Style) => {
    if (!isNative) return;
    try {
      await StatusBar.setStyle({ style });
    } catch (error) {
      console.warn('Status bar style failed:', error);
    }
  }, [isNative]);

  const hideStatusBar = useCallback(async () => {
    if (!isNative) return;
    try {
      await StatusBar.hide();
    } catch (error) {
      console.warn('Hide status bar failed:', error);
    }
  }, [isNative]);

  const showStatusBar = useCallback(async () => {
    if (!isNative) return;
    try {
      await StatusBar.show();
    } catch (error) {
      console.warn('Show status bar failed:', error);
    }
  }, [isNative]);

  const setStatusBarColor = useCallback(async (color: string) => {
    if (!isNative || platform !== 'android') return;
    try {
      await StatusBar.setBackgroundColor({ color });
    } catch (error) {
      console.warn('Status bar color failed:', error);
    }
  }, [isNative, platform]);

  // ============ PUSH NOTIFICATIONS ============
  const registerPushNotifications = useCallback(async (): Promise<string | null> => {
    if (!isNative) {
      console.log('Push notifications not available on web');
      return null;
    }

    try {
      // Request permission
      let permissionStatus = await PushNotifications.checkPermissions();
      
      if (permissionStatus.receive === 'prompt') {
        permissionStatus = await PushNotifications.requestPermissions();
      }

      if (permissionStatus.receive !== 'granted') {
        console.warn('Push notification permission not granted');
        return null;
      }

      // Register with APNs/FCM
      await PushNotifications.register();

      return new Promise((resolve) => {
        // Listen for registration success
        PushNotifications.addListener('registration', (token: Token) => {
          console.log('Push registration success, token:', token.value);
          setPushToken(token.value);
          resolve(token.value);
        });

        // Listen for registration errors
        PushNotifications.addListener('registrationError', (error) => {
          console.error('Push registration error:', error);
          resolve(null);
        });
      });
    } catch (error) {
      console.error('Push notification registration failed:', error);
      return null;
    }
  }, [isNative]);

  // Set up push notification listeners when native
  useEffect(() => {
    if (!isNative) return;

    // Listen for push notifications received while app is in foreground
    const receivedListener = PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        console.log('Push notification received:', notification);
        // You can dispatch to your notification system here
      }
    );

    // Listen for push notification actions (user tapped on notification)
    const actionListener = PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action: ActionPerformed) => {
        console.log('Push notification action performed:', action);
        // Handle navigation or actions based on notification data
      }
    );

    return () => {
      receivedListener.then(l => l.remove());
      actionListener.then(l => l.remove());
    };
  }, [isNative]);

  // ============ CAMERA ============
  const takePhoto = useCallback(async (): Promise<CapturedPhoto | null> => {
    if (!isNative) {
      console.log('Native camera not available on web');
      return null;
    }

    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        saveToGallery: false,
      });
      return {
        webPath: photo.webPath,
        path: photo.path,
        format: photo.format,
      };
    } catch (error) {
      console.warn('Camera capture failed:', error);
      return null;
    }
  }, [isNative]);

  const pickPhotos = useCallback(async (limit: number = 10): Promise<CapturedPhoto[]> => {
    if (!isNative) {
      console.log('Native photo picker not available on web');
      return [];
    }

    try {
      const result = await Camera.pickImages({
        quality: 90,
        limit,
      });
      return result.photos.map((photo: GalleryPhoto) => ({
        webPath: photo.webPath,
        path: photo.path,
        format: photo.format,
      }));
    } catch (error) {
      console.warn('Photo picker failed:', error);
      return [];
    }
  }, [isNative]);

  return {
    isNative,
    platform,
    // Haptics
    hapticImpact,
    hapticNotification,
    hapticVibrate,
    hapticSelection,
    // Status Bar
    setStatusBarStyle,
    hideStatusBar,
    showStatusBar,
    setStatusBarColor,
    // Push Notifications
    registerPushNotifications,
    pushToken,
    // Camera
    takePhoto,
    pickPhotos,
  };
}

// Re-export types for convenience
export { ImpactStyle, NotificationType } from '@capacitor/haptics';
export { Style as StatusBarStyle } from '@capacitor/status-bar';
export { CameraResultType, CameraSource } from '@capacitor/camera';
