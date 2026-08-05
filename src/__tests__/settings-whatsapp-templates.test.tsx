/**
 * Behavioral test for Settings → WhatsApp Invitation Templates
 * (specs/whatsapp-informal-name-placeholder.md).
 *
 * The screen itself is a thin wrapper over TemplateEditorScreen, so what is worth pinning here is
 * the part the wrapper owns: WHICH placeholder chips each tab offers, what token they insert, and
 * that the preview gives the full name and the informal name distinct sample values. Prayer tabs
 * historically got a `slice` of the speech placeholders, so they are asserted separately.
 */
import React from 'react';
import { render as rtlRender, screen, fireEvent } from '@testing-library/react-native';
import ptBR from '../i18n/locales/pt-BR.json';
import enUS from '../i18n/locales/en-US.json';
import esLA from '../i18n/locales/es-LA.json';

import WhatsAppTemplateScreen from '../app/(tabs)/settings/whatsapp';

const INFORMAL_TOKEN = '{nome informal}';
const FULL_NAME_TOKEN = '{nome}';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) =>
    require('react').createElement('SafeAreaView', {}, children),
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: { background: '#000', text: '#fff', textSecondary: '#aaa', primary: '#07f', card: '#111', surfaceVariant: '#222', inputBorder: '#333', divider: '#333' },
  }),
}));
jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ wardId: 'w1', wardLanguage: 'pt-BR', user: null, userName: null }),
}));
jest.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: null }),
  useMutation: () => ({ mutate: jest.fn() }),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));
jest.mock('../lib/supabase', () => ({ supabase: {} }));
jest.mock('../lib/activityLog', () => ({ logAction: jest.fn() }));
jest.mock('../hooks/useSpeeches', () => ({
  useWardManagePrayers: () => ({ managePrayers: true, isLoading: false }),
}));

async function render() {
  await rtlRender(React.createElement(WhatsAppTemplateScreen));
}
function editorValue() {
  return screen.getByTestId('template-editor').props.value as string;
}

describe('Settings → WhatsApp templates: the informal-name placeholder', () => {
  it('offers the informal-name chip on every speech tab', async () => {
    await render();
    for (const tab of ['speech_1', 'speech_2', 'speech_3']) {
      await fireEvent.press(screen.getByTestId(`template-tab-${tab}`));
      expect(screen.getByTestId(`template-chip-${INFORMAL_TOKEN}`)).toBeTruthy();
      expect(screen.getByTestId(`template-chip-${FULL_NAME_TOKEN}`)).toBeTruthy();
    }
  });

  it('offers it on the prayer tabs too, alongside the name and date chips', async () => {
    await render();
    for (const tab of ['opening_prayer', 'closing_prayer']) {
      await fireEvent.press(screen.getByTestId(`template-tab-${tab}`));
      expect(screen.getByTestId(`template-chip-${INFORMAL_TOKEN}`)).toBeTruthy();
      expect(screen.getByTestId(`template-chip-${FULL_NAME_TOKEN}`)).toBeTruthy();
      expect(screen.getByTestId('template-chip-{data}')).toBeTruthy();
      // Prayers still do not offer the speech-only tokens.
      expect(screen.queryByTestId('template-chip-{titulo}')).toBeNull();
    }
  });

  it('inserts the canonical token when the chip is tapped', async () => {
    await render();
    await fireEvent.changeText(screen.getByTestId('template-editor'), '');
    await fireEvent.press(screen.getByTestId(`template-chip-${INFORMAL_TOKEN}`));
    expect(editorValue()).toBe(INFORMAL_TOKEN);
  });

  it('previews the full name and the informal name as different people-ish values', async () => {
    await render();
    await fireEvent.changeText(screen.getByTestId('template-editor'), `${FULL_NAME_TOKEN}/${INFORMAL_TOKEN}`);
    const preview = screen.getByTestId('template-preview');
    expect(preview).toHaveTextContent('Maria Silva/Maria');
  });
});

describe('the informal-name chip is labelled in the app language', () => {
  it('has a localized label in all three locales', () => {
    expect((ptBR as Record<string, any>).whatsapp.placeholderInformalName).toBe('{nome informal}');
    expect((enUS as Record<string, any>).whatsapp.placeholderInformalName).toBe('{informal name}');
    expect((esLA as Record<string, any>).whatsapp.placeholderInformalName).toBe('{nombre informal}');
  });
});
