import * as React from 'react';

import { Container, useTheme } from '@mui/joy';

import { ChatArea } from '@/components/ChatArea';
import { isValidOpenAIApiKey, SettingsModal } from '@/components/SettingsModal';
import { useSettingsStore } from '@/lib/store';


export default function Home() {
  const theme = useTheme();

  const { apiKey, dbApiKey } = useSettingsStore(state => ({ apiKey: state.apiKey, dbApiKey: state.dbApiKey }));
  const [settingsShown, setSettingsShown] = React.useState(false);

  const apiValid = isValidOpenAIApiKey(apiKey);
  const dbApiValid = !!dbApiKey;
  const bothValid = apiValid && dbApiValid;

  React.useEffect(() => {
    // show the settings at startup if the API key is not present
    if (!!process.env.REQUIRE_USER_API_KEYS && !bothValid)
      setSettingsShown(true);
  }, [bothValid]);

  return (
    <Container maxWidth='xl' disableGutters sx={{
      boxShadow: theme.vars.shadow.lg,
    }}>

      <ChatArea onShowSettings={() => setSettingsShown(true)} />

      <SettingsModal open={settingsShown} onClose={() => setSettingsShown(false)} />

    </Container>
  );
}