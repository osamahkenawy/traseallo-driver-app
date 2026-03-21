/**
 * Trasealla Driver App — i18n Setup
 * Supports English (LTR) + Arabic (RTL)
 */

import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import {I18nManager} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './en.json';
import ar from './ar.json';

const LANGUAGE_KEY = '@trasealla_language';

const resources = {
  en: {translation: en},
  ar: {translation: ar},
};

/**
 * Get saved language from AsyncStorage, default to 'en'
 */
const getStoredLanguage = async () => {
  try {
    const lang = await AsyncStorage.getItem(LANGUAGE_KEY);
    return lang || 'en';
  } catch {
    return 'en';
  }
};

/**
 * Save selected language and apply RTL settings
 */
export const changeLanguage = async (lang) => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
    const isRTL = lang === 'ar';
    I18nManager.forceRTL(isRTL);
    I18nManager.allowRTL(isRTL);
    await i18n.changeLanguage(lang);
  } catch (error) {
    console.error('Failed to change language:', error);
  }
};

/**
 * Initialize i18n — call in App.js before rendering
 */
export const initI18n = async () => {
  const storedLang = await getStoredLanguage();

  await i18n.use(initReactI18next).init({
    compatibilityJSON: 'v3',
    resources,
    lng: storedLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

  // Apply RTL for Arabic
  const isRTL = storedLang === 'ar';
  I18nManager.forceRTL(isRTL);
  I18nManager.allowRTL(isRTL);
};

export default i18n;
