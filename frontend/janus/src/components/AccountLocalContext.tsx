import { createContext } from 'react';
import type { LocaleText } from '@toolpad/core';

export const AccountLocaleContext = createContext<Partial<LocaleText> | null>(null);