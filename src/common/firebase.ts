import { FirebaseRemoteConfig } from '@capacitor-firebase/remote-config'

export async function initFirebase() {
  try {
    await FirebaseRemoteConfig.fetchAndActivate()
    return Promise.resolve()
  } catch (error) {
    console.log('initFirebase error', error)
    return Promise.resolve()
  }
}
