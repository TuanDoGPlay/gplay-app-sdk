import { FirebaseRemoteConfig } from '@capacitor-firebase/remote-config'

export async function initFirebase() {
  await FirebaseRemoteConfig.fetchAndActivate()
}
