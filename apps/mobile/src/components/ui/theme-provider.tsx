import {
  createContext,
  type PropsWithChildren,
  useContext,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';

type Theme = 'dark' | 'light' | 'system';
const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
}>({ theme: 'system', setTheme: () => undefined });
function ThemeProvider({
  children,
  defaultTheme = 'system',
}: PropsWithChildren<{ defaultTheme?: Theme }>) {
  const system = useColorScheme();
  const [theme, setTheme] = useState(defaultTheme);
  const value = useMemo(() => ({ theme, setTheme }), [theme]);
  void system;
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
function useTheme() {
  return useContext(ThemeContext);
}

export { ThemeProvider, useTheme };
