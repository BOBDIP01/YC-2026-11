export interface CapacitorConfig {
  appId: string;
  appName: string;
  webDir: string;
  server?: Record<string, any>;
  plugins?: Record<string, any>;
  ios?: Record<string, any>;
  android?: Record<string, any>;
}

const config: CapacitorConfig = {
  appId: 'com.youconnect.app',
  appName: 'YouConnect',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#090D16',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#090D16',
    },
  },
  ios: {
    contentInset: 'always',
    preferredContentMode: 'mobile',
    infoPlist: {
      NSCameraUsageDescription:
        'YouConnect uses the camera to scan QR business cards, capture identity documents, and take live biometric selfies for optional KYC verification.',
      NSPhotoLibraryUsageDescription:
        'YouConnect accesses your photo library so you can upload profile headshots, company logos, and creative portfolio images to your digital business cards.',
      NSPhotoLibraryAddUsageDescription:
        'YouConnect saves exported QR codes and digital business card passes to your photo library.',
      NFCReaderUsageDescription:
        'YouConnect uses NFC to read and write NDEF vCard and Universal Link records on physical NFC business cards.',
    },
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    permissions: [
      'android.permission.NFC',
      'android.permission.CAMERA',
      'android.permission.INTERNET',
    ],
  },
};

export default config;
