import * as SecureStore from 'expo-secure-store';
import {
    Children,
    createContext,
    createElement,
    forwardRef,
    PropsWithChildren,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { Platform } from 'react-native';

import { LanguageCode, LANGUAGES, TRANSLATIONS } from '@/constants/translations';

const STORAGE_KEY = 'uniwell.language';

type Dictionary = Record<string, string>;
type LanguageValue = {
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => void;
  /** Translate a string for places that are not <Text> (alerts, accessibility labels...). */
  t: (text: string) => string;
};

const lookup = (text: string, dictionary: Dictionary | undefined) => {
  if (!dictionary) return text;
  const trimmed = text.trim();
  const hit = trimmed ? dictionary[trimmed] : undefined;
  return hit ? text.replace(trimmed, hit) : text;
};

const LanguageContext = createContext<LanguageValue>({ language: 'en', setLanguage: () => undefined, t: (text) => text });
const DictionaryContext = createContext<Dictionary | undefined>(undefined);

// ---------------------------------------------------------------------------------------------
// App-wide translation, installed the same way as the font scaling and dark mode: the `Text` and
// `TextInput` that screens import from 'react-native' are wrapped once at startup. While English is
// selected they pass everything straight through. Otherwise string children (and placeholders) that
// have an entry in constants/translations.ts are swapped for the chosen language.
// ---------------------------------------------------------------------------------------------
const installTranslation = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  if (RN.__uniwellTranslation) return;

  const OriginalText = RN.Text;
  const OriginalTextInput = RN.TextInput;

  const TranslatedText = forwardRef<unknown, Record<string, any>>((props, ref) => {
    const dictionary = useContext(DictionaryContext);
    if (!dictionary) return createElement(OriginalText, { ...props, ref });
    const { children } = props;
    const translated =
      typeof children === 'string'
        ? lookup(children, dictionary)
        : Array.isArray(children)
          ? Children.map(children, (child) => (typeof child === 'string' ? lookup(child, dictionary) : child))
          : children;
    return createElement(OriginalText, { ...props, ref, children: translated });
  });
  TranslatedText.displayName = 'Text';

  const TranslatedTextInput = forwardRef<unknown, Record<string, any>>((props, ref) => {
    const dictionary = useContext(DictionaryContext);
    if (!dictionary || typeof props.placeholder !== 'string') return createElement(OriginalTextInput, { ...props, ref });
    return createElement(OriginalTextInput, { ...props, ref, placeholder: lookup(props.placeholder, dictionary) });
  });
  TranslatedTextInput.displayName = 'TextInput';
  Object.assign(TranslatedTextInput, { State: OriginalTextInput.State });

  try {
    Object.defineProperty(RN, 'Text', { configurable: true, enumerable: true, get: () => TranslatedText });
    Object.defineProperty(RN, 'TextInput', { configurable: true, enumerable: true, get: () => TranslatedTextInput });
    RN.__uniwellTranslation = true;
  } catch (error) {
    console.warn('[LANGUAGE] Could not install app-wide translation:', error);
  }
};

installTranslation();

const isLanguage = (value: unknown): value is LanguageCode => LANGUAGES.some((item) => item.code === value);

const readStored = async (): Promise<LanguageCode | null> => {
  try {
    const value =
      Platform.OS === 'web'
        ? typeof localStorage === 'undefined'
          ? null
          : localStorage.getItem(STORAGE_KEY)
        : await SecureStore.getItemAsync(STORAGE_KEY);
    return isLanguage(value) ? value : null;
  } catch {
    return null;
  }
};

const writeStored = async (code: LanguageCode) => {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, code);
    } else {
      await SecureStore.setItemAsync(STORAGE_KEY, code);
    }
  } catch {
    // The language still applies for this session even if it can't be saved.
  }
};

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<LanguageCode>('en');

  useEffect(() => {
    let active = true;
    void readStored().then((stored) => {
      if (active && stored) setLanguageState(stored);
    });
    return () => {
      active = false;
    };
  }, []);

  const setLanguage = useCallback((code: LanguageCode) => {
    setLanguageState(code);
    void writeStored(code);
  }, []);

  const dictionary = language === 'en' ? undefined : TRANSLATIONS[language];
  const t = useCallback((text: string) => lookup(text, dictionary), [dictionary]);
  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return createElement(
    LanguageContext.Provider,
    { value },
    createElement(DictionaryContext.Provider, { value: dictionary }, children),
  );
}

export const useLanguage = () => useContext(LanguageContext);
