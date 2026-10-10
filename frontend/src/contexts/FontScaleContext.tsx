import * as SecureStore from 'expo-secure-store';
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
import { Platform } from 'react-native';

export type FontSize = 'Small' | 'Default' | 'Large';

export const FONT_SIZE_OPTIONS: FontSize[] = ['Small', 'Default', 'Large'];
const SCALES: Record<FontSize, number> = { Small: 0.9, Default: 1, Large: 1.25 };
const STORAGE_KEY = 'uniwell.fontSize';

type FontScaleValue = { size: FontSize; scale: number; setSize: (size: FontSize) => void };

const FontScaleContext = createContext<FontScaleValue>({ size: 'Default', scale: 1, setSize: () => undefined });

// ---------------------------------------------------------------------------------------------
// App-wide text scaling.
// Every screen sets font sizes with fixed numbers in StyleSheets, so there is no single place to
// change them. Instead, the `Text` and `TextInput` that screens import from 'react-native' are
// replaced (once, at startup) by thin wrappers that multiply the explicit fontSize / lineHeight
// by the chosen scale. The wrappers read the scale from context, so changing the setting updates
// every visible piece of text immediately, on every screen and for every role.
// ---------------------------------------------------------------------------------------------
const installTextScaling = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  if (RN.__uniwellTextScaling) return;

  const OriginalText = RN.Text;
  const OriginalTextInput = RN.TextInput;

  const scaled = (style: unknown, scale: number, fallbackSize?: number) => {
    if (scale === 1) return style;
    const flat = (RN.StyleSheet.flatten(style) || {}) as { fontSize?: number; lineHeight?: number };
    const size = typeof flat.fontSize === 'number' ? flat.fontSize : fallbackSize;
    if (size === undefined) return style; // nested <Text> without its own size inherits the parent's scaled size
    const next: { fontSize: number; lineHeight?: number } = { fontSize: Math.round(size * scale * 10) / 10 };
    if (typeof flat.lineHeight === 'number') next.lineHeight = Math.round(flat.lineHeight * scale * 10) / 10;
    return [style, next];
  };

  const ScaledText = forwardRef<unknown, Record<string, unknown>>((props, ref) => {
    const { scale } = useContext(FontScaleContext);
    return createElement(OriginalText, { ...props, ref, style: scaled(props.style, scale) });
  });
  ScaledText.displayName = 'Text';

  const ScaledTextInput = forwardRef<unknown, Record<string, unknown>>((props, ref) => {
    const { scale } = useContext(FontScaleContext);
    return createElement(OriginalTextInput, { ...props, ref, style: scaled(props.style, scale, 14) });
  });
  ScaledTextInput.displayName = 'TextInput';
  Object.assign(ScaledTextInput, { State: OriginalTextInput.State });

  try {
    Object.defineProperty(RN, 'Text', { configurable: true, enumerable: true, get: () => ScaledText });
    Object.defineProperty(RN, 'TextInput', { configurable: true, enumerable: true, get: () => ScaledTextInput });
    RN.__uniwellTextScaling = true;
  } catch (error) {
    console.warn('[FONT] Could not install app-wide text scaling:', error);
  }
};

installTextScaling();

const readStored = async (): Promise<FontSize | null> => {
  try {
    const value = Platform.OS === 'web'
      ? (typeof localStorage === 'undefined' ? null : localStorage.getItem(STORAGE_KEY))
      : await SecureStore.getItemAsync(STORAGE_KEY);
    return value && (FONT_SIZE_OPTIONS as string[]).includes(value) ? (value as FontSize) : null;
  } catch {
    return null;
  }
};

const writeStored = async (size: FontSize) => {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, size);
    } else {
      await SecureStore.setItemAsync(STORAGE_KEY, size);
    }
  } catch {
    // The preference still applies for this session even if it can't be saved.
  }
};

export function FontScaleProvider({ children }: PropsWithChildren) {
  const [size, setSizeState] = useState<FontSize>('Default');

  useEffect(() => {
    let active = true;
    void readStored().then((stored) => {
      if (active && stored) setSizeState(stored);
    });
    return () => {
      active = false;
    };
  }, []);

  const setSize = useCallback((next: FontSize) => {
    setSizeState(next);
    void writeStored(next);
  }, []);

  const value = useMemo(() => ({ size, scale: SCALES[size], setSize }), [size, setSize]);
  return createElement(FontScaleContext.Provider, { value }, children);
}

export const useFontScale = () => useContext(FontScaleContext);
