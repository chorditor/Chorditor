import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  PROJECTS: 'chorditor_projects',
  PLAN:     'chorditor_plan',
  SESSION:  'chorditor_session',
};

export async function getItem(key) {
  try {
    return await AsyncStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

export async function setItem(key, value) {
  try {
    await AsyncStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.warn('Storage setItem failed:', e);
    return false;
  }
}

export async function removeItem(key) {
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {}
}

export { KEYS };
