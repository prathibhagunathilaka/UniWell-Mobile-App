import * as SecureStore from 'expo-secure-store';
import * as SystemUI from 'expo-system-ui';
import {
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
import { Appearance, Platform, useColorScheme as useSystemColorScheme } from 'react-native';

export type AppearancePreference = 'Light' | 'Dark' | 'System';
export const APPEARANCE_OPTIONS: AppearancePreference[] = ['Light', 'Dark', 'System'];

const STORAGE_KEY = 'uniwell.appearance';

// ---------------------------------------------------------------------------------------------
// Dark palette used for the navigation container / root background.
// ---------------------------------------------------------------------------------------------
export const DARK_COLORS = {
  background: '#0E1A21',
  surface: '#172730',
  surfaceAlt: '#1F3440',
  border: '#2C414D',
  text: '#E8F0F4',
  muted: '#9FB6C2',
} as const;

export const LIGHT_BACKGROUND = '#F8EEED';

// ---------------------------------------------------------------------------------------------
// Colour translation tables (light value -> dark value).
// Screens hard-code their colours in StyleSheets, so instead of editing every screen the
// wrappers installed below translate colours at render time while dark mode is on. The same
// light colour can need a different dark value depending on how it is used (e.g. #112E3C is the
// main text colour but also a button background), so there is one table per usage.
// ---------------------------------------------------------------------------------------------
type Table = Record<string, string>;

const BACKGROUND: Table = {
  '#f8eeed': '#0e1a21',
  '#ffffff': '#172730',
  '#eaf3f7': '#1f3440',
  '#fff0ec': '#2e2321',
  '#fff4f1': '#2e2321',
  '#fff9f7': '#2a2220',
  '#fff8f5': '#2a2220',
  '#fff1ef': '#2e2321',
  '#fdf1ef': '#2e2321',
  '#c4dae8': '#2b4656',
  '#112e3c': '#2f5568',
  '#d6f0e4': '#1b3a2f',
  '#edf7f1': '#1b3a2f',
  '#fff3d6': '#3a311b',
  '#ffefc7': '#3a311b',
  '#fbe6b7': '#42361c',
  '#ffe1d8': '#4a2d25',
  '#ffd0c2': '#55332a',
  '#fadbd7': '#46292a',
  '#e1ecf0': '#243945',
  '#f7f9fc': '#142129',
  '#fafbfb': '#142129',
  '#f4f6f7': '#1a2b34',
  '#f1f6fd': '#17283a',
  '#dce9fb': '#1f3550',
  '#f0f0f3': '#212225',
  '#e0e1e6': '#2e3135',
  '#e6f4fe': '#1f3440',
  '#d9e3e7': '#2c414d',
  'rgba(17,46,60,0.28)': 'rgba(0,0,0,0.6)',
  'rgba(17,46,60,0.45)': 'rgba(0,0,0,0.65)',
  'rgba(17,46,60,0.13)': 'rgba(0,0,0,0.35)',
  white: '#172730',
};

const TEXT: Table = {
  '#112e3c': '#e8f0f4',
  '#55707d': '#9fb6c2',
  '#8fa3ad': '#7f96a2',
  '#28745d': '#5fcfa8',
  '#a53d35': '#ff8a80',
  '#c9574d': '#ff8a80',
  '#b26a00': '#f0b24b',
  '#8a5a00': '#f0b24b',
  '#8e2f28': '#ff9c94',
  '#1d5c48': '#7fddbb',
  '#1f4e8c': '#8db8f0',
  '#4b5563': '#aab4bf',
  '#111827': '#e5e7eb',
  '#000000': '#e8f0f4',
  '#60646c': '#b0b4ba',
  black: '#e8f0f4',
};

const BORDER: Table = {
  '#d9e3e7': '#2c414d',
  '#e1ecf0': '#2c414d',
  '#eaf3f7': '#2c414d',
  '#c4dae8': '#3a5666',
  '#b5c2c8': '#3a5666',
  '#e6b0a7': '#5a3a36',
  '#f3c3b7': '#5a3a36',
  '#ebc2bc': '#5a3a36',
  '#fff0ec': '#4a2d25',
  '#b5d9c9': '#2f5a4b',
  '#9cc2af': '#2f5a4b',
  '#8fa3ad': '#4a6370',
  '#112e3c': '#4a6f82',
  '#ffffff': '#2c414d',
  white: '#2c414d',
};

const normalise = (value: string) => {
  let v = value.trim().toLowerCase().replace(/\s+/g, '');
  if (/^#[0-9a-f]{3}$/.test(v)) v = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  return v;
};

const luminance = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

type Kind = 'background' | 'text' | 'border';

// Colours that are not in a table still get a sensible dark equivalent (pale -> dark surface,
// dark text -> light text), so a colour added to a screen later does not become unreadable.
const mapColor = (value: string, kind: Kind): string => {
  const key = normalise(value);
  const table = kind === 'background' ? BACKGROUND : kind === 'text' ? TEXT : BORDER;
  if (table[key]) return table[key];
  if (/^#[0-9a-f]{6}$/.test(key)) {
    const lum = luminance(key);
    if (kind === 'background' && lum > 0.78) return DARK_COLORS.surface;
    if (kind === 'border' && lum > 0.78) return DARK_COLORS.border;
    if (kind === 'text' && lum < 0.22) return DARK_COLORS.text;
  }
  return value;
};

const STYLE_KEYS: Record<string, Kind> = {
  backgroundColor: 'background',
  color: 'text',
  tintColor: 'text',
  textDecorationColor: 'text',
  borderColor: 'border',
  borderTopColor: 'border',
  borderBottomColor: 'border',
  borderLeftColor: 'border',
  borderRightColor: 'border',
  borderStartColor: 'border',
  borderEndColor: 'border',
};

// ---------------------------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------------------------
type ThemeValue = {
  preference: AppearancePreference;
  setPreference: (next: AppearancePreference) => void;
  scheme: 'light' | 'dark';
  isDark: boolean;
};

const ThemeContext = createContext<ThemeValue>({
  preference: 'Light',
  setPreference: () => undefined,
  scheme: 'light',
  isDark: false,
});

// ---------------------------------------------------------------------------------------------
// Wrappers for View / Text / TextInput / Pressable / ScrollView / ActivityIndicator / Switch.
// In light mode they return the style untouched (no cost, no visual change). In dark mode they
// translate the colours in the style. Same approach as the app-wide font scaling.
// ---------------------------------------------------------------------------------------------
const installDarkMode = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  if (RN.__uniwellDarkMode) return;

  const cache = new WeakMap<object, unknown>();

  const mapStyle = (style: unknown): unknown => {
    if (!style) return style;
    const cacheable = typeof style === 'object';
    if (cacheable && cache.has(style as object)) return cache.get(style as object);

    const flat = RN.StyleSheet.flatten(style) as Record<string, unknown> | undefined;
    let result: unknown = style;
    if (flat && typeof flat === 'object') {
      let next: Record<string, unknown> | null = null;
      for (const key of Object.keys(STYLE_KEYS)) {
        const value = flat[key];
        if (typeof value !== 'string') continue;
        const mapped = mapColor(value, STYLE_KEYS[key]);
        if (mapped !== value) {
          if (!next) next = { ...flat };
          next[key] = mapped;
        }
      }
      if (next) result = next;
    }
    if (cacheable) cache.set(style as object, result);
    return result;
  };

  const themed = (style: unknown, isDark: boolean) => (isDark ? mapStyle(style) : style);

  const wrap = (name: string, Original: any, extra?: (props: any, isDark: boolean) => Record<string, unknown>) => {
    const Wrapped = forwardRef<unknown, Record<string, any>>((props, ref) => {
      const { isDark } = useContext(ThemeContext);
      if (!isDark) return createElement(Original, { ...props, ref });
      return createElement(Original, {
        ...props,
        ref,
        ...(props.style !== undefined ? { style: mapStyle(props.style) } : null),
        ...(extra ? extra(props, isDark) : null),
      });
    });
    Wrapped.displayName = name;
    return Wrapped;
  };

  const OriginalView = RN.View;
  const OriginalText = RN.Text;
  const OriginalTextInput = RN.TextInput;
  const OriginalScrollView = RN.ScrollView;
  const OriginalActivityIndicator = RN.ActivityIndicator;
  const OriginalSwitch = RN.Switch;
  const OriginalPressable = RN.Pressable;

  const ThemedView = wrap('View', OriginalView);
  const ThemedText = wrap('Text', OriginalText);

  const ThemedTextInput = wrap('TextInput', OriginalTextInput, (props) => ({
    keyboardAppearance: 'dark',
    ...(typeof props.placeholderTextColor === 'string'
      ? { placeholderTextColor: mapColor(props.placeholderTextColor, 'text') }
      : null),
    ...(typeof props.selectionColor === 'string' ? { selectionColor: mapColor(props.selectionColor, 'text') } : null),
  }));
  Object.assign(ThemedTextInput, { State: OriginalTextInput.State });

  const ThemedScrollView = wrap('ScrollView', OriginalScrollView, (props) => ({
    ...(props.contentContainerStyle !== undefined ? { contentContainerStyle: mapStyle(props.contentContainerStyle) } : null),
    indicatorStyle: 'white',
  }));

  // Pressable's style may be a function of its pressed state.
  const ThemedPressable = forwardRef<unknown, Record<string, any>>((props, ref) => {
    const { isDark } = useContext(ThemeContext);
    if (!isDark) return createElement(OriginalPressable, { ...props, ref });
    const style =
      typeof props.style === 'function'
        ? (state: unknown) => mapStyle(props.style(state))
        : mapStyle(props.style);
    return createElement(OriginalPressable, { ...props, ref, style });
  });
  ThemedPressable.displayName = 'Pressable';

  const ThemedActivityIndicator = wrap('ActivityIndicator', OriginalActivityIndicator, (props) =>
    typeof props.color === 'string' ? { color: mapColor(props.color, 'text') } : {},
  );

  const ThemedSwitch = wrap('Switch', OriginalSwitch, (props) => ({
    ...(props.trackColor && typeof props.trackColor === 'object'
      ? {
          trackColor: {
            ...props.trackColor,
            ...(typeof props.trackColor.false === 'string' ? { false: '#3a5666' } : null),
          },
        }
      : null),
    ...(typeof props.ios_backgroundColor === 'string' ? { ios_backgroundColor: '#3a5666' } : null),
  }));

  try {
    const define = (name: string, component: unknown) =>
      Object.defineProperty(RN, name, { configurable: true, enumerable: true, get: () => component });
    define('View', ThemedView);
    define('Text', ThemedText);
    define('TextInput', ThemedTextInput);
    define('ScrollView', ThemedScrollView);
    define('Pressable', ThemedPressable);
    define('ActivityIndicator', ThemedActivityIndicator);
    define('Switch', ThemedSwitch);
    RN.__uniwellDarkMode = true;
  } catch (error) {
    console.warn('[THEME] Could not install app-wide dark mode:', error);
  }
};

installDarkMode();

// ---------------------------------------------------------------------------------------------
// Persistence + provider
// ---------------------------------------------------------------------------------------------
const readStored = async (): Promise<AppearancePreference | null> => {
  try {
    const value =
      Platform.OS === 'web'
        ? typeof localStorage === 'undefined'
          ? null
          : localStorage.getItem(STORAGE_KEY)
        : await SecureStore.getItemAsync(STORAGE_KEY);
    return value && (APPEARANCE_OPTIONS as string[]).includes(value) ? (value as AppearancePreference) : null;
  } catch {
    return null;
  }
};

const writeStored = async (preference: AppearancePreference) => {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, preference);
    } else {
      await SecureStore.setItemAsync(STORAGE_KEY, preference);
    }
  } catch {
    // The preference still applies for this session even if it can't be saved.
  }
};

export function AppThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<AppearancePreference>('Light');

  useEffect(() => {
    let active = true;
    void readStored().then((stored) => {
      if (active && stored) setPreferenceState(stored);
    });
    return () => {
      active = false;
    };
  }, []);

  const scheme: 'light' | 'dark' =
    preference === 'Dark' ? 'dark' : preference === 'Light' ? 'light' : systemScheme === 'dark' ? 'dark' : 'light';

  // Let the OS chrome (status bar, keyboard, native dialogs) follow the choice too.
  useEffect(() => {
    try {
      if (typeof Appearance.setColorScheme === 'function') {
        // Passing null makes the Android native module crash (non-null `style` parameter),
        // so use 'unspecified' to hand control back to the OS on "System".
        const nativeStyle = preference === 'System' ? 'unspecified' : scheme;
        Appearance.setColorScheme(nativeStyle as unknown as 'light' | 'dark');
      }
    } catch {
      // Not supported on this platform: the in-app theme still works.
    }
    void SystemUI.setBackgroundColorAsync(scheme === 'dark' ? DARK_COLORS.background : LIGHT_BACKGROUND).catch(() => undefined);
  }, [preference, scheme]);

  const setPreference = useCallback((next: AppearancePreference) => {
    setPreferenceState(next);
    void writeStored(next);
  }, []);

  const value = useMemo(
    () => ({ preference, setPreference, scheme, isDark: scheme === 'dark' }),
    [preference, setPreference, scheme],
  );
  return createElement(ThemeContext.Provider, { value }, children);
}

export const useAppTheme = () => useContext(ThemeContext);