import * as React from 'react';
import { shallow } from 'zustand/shallow';

import { Box, Button, Input, Modal, ModalClose, ModalDialog, Option, Select, Typography } from '@mui/joy';

import { ChatModelId, ChatModels } from '@/lib/data';
import { Link } from './util/Link';
import { NoSSR } from './util/NoSSR';
import { useSettingsStore } from '@/lib/store';


export const isValidOpenAIApiKey = (apiKey?: string) =>
  !!apiKey && apiKey.startsWith('sk-') && apiKey.length > 40;

export const isValidPineconeApiKey = (apiKey: string): boolean => {
  const uuidRegex: RegExp = new RegExp(
    '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
    'i'
  );
  return uuidRegex.test(apiKey);
}


/**
 * Component that allows the User to modify the application settings,
 * persisted on the client via localStorage.
 *
 * @param {boolean} open Whether the Settings modal is open
 * @param {() => void} onClose Call this to close the dialog from outside
 */
export function SettingsModal({ open, onClose }: { open: boolean, onClose: () => void; }) {
  const { apiKey, setApiKey, dbApiKey, setDbApiKey, chatModelId, setChatModelId } = useSettingsStore(state => state, shallow);

  const handleApiKeyChange = (e: React.ChangeEvent) =>
    setApiKey((e.target as HTMLInputElement).value);

  const handleDbApiKeyChange = (e: React.ChangeEvent) =>
    setDbApiKey((e.target as HTMLInputElement).value);

  const handleGptModelChange = (e: React.FocusEvent | React.MouseEvent | React.KeyboardEvent | null, value: string | null) =>
    setChatModelId((value || 'gpt-4') as ChatModelId);

  const handleApiKeyDown = (e: React.KeyboardEvent) =>
    (e.key === 'Enter') && onClose();

  const handleDbApiKeyDown = (e: React.KeyboardEvent) =>
    (e.key === 'Enter') && onClose();

  const needsApiKey = !!process.env.REQUIRE_USER_API_KEYS;
  const isValidKey = isValidOpenAIApiKey(apiKey);
  const isValidDbKey = isValidPineconeApiKey(dbApiKey);

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog sx={{ minWidth: '40vw' }}>
        <ModalClose />
        <Typography level='h5'>Settings</Typography>

        <Box sx={{ mt: 3, minWidth: 300 }}>

          <Typography sx={{ mb: 1 }}>
            Enter <Link href='https://platform.openai.com/account/api-keys'>OpenAI API Key</Link> {needsApiKey ? '(required)' : '(not required)'}
          </Typography>

          <Input variant='outlined' placeholder={'sk-...'} error={needsApiKey && !isValidKey}
            value={apiKey} onChange={handleApiKeyChange} onKeyDown={handleApiKeyDown} />

          {!needsApiKey && (
            <Typography level='body2' sx={{ mt: 1, mb: 1 }}>
              This box lets you override the default API key
            </Typography>
          )}


          <Typography sx={{ mb: 1 }}>
            Enter <Link href='https://platform.openai.com/account/api-keys'>Pinecone API Key</Link> {needsApiKey ? '(required)' : '(not required)'}
          </Typography>

          <Input variant='outlined' placeholder={'...'} error={needsApiKey && !isValidDbKey}
            value={dbApiKey} onChange={handleDbApiKeyChange} onKeyDown={handleDbApiKeyDown} />

          {!needsApiKey && (
            <Typography level='body2' sx={{ mt: 1, mb: 1 }}>
              This box lets you override the default DB API key
            </Typography>
          )}

          <Typography sx={{ mt: 3, mb: 1 }}>
            Select Model
          </Typography>

          <NoSSR>
            <Select
              variant='outlined'
              value={chatModelId}
              onChange={handleGptModelChange}
            >
              <Option value={'gpt-4'}>GPT-4</Option>
              <Option value={'gpt-3.5-turbo'}>GPT-3.5 Turbo</Option>
              {/*<Option value={'gpt-4-32k'}>GPT-4-32k (not out yet)</Option>*/}
            </Select>

            {(chatModelId in ChatModels) && (
              <Typography level='body2' sx={{ mt: 1, mb: 1 }}>
                {ChatModels[chatModelId].description}
              </Typography>
            )}
          </NoSSR>

          <Button variant='solid' color={isValidKey ? 'primary' : 'neutral'} sx={{ mt: 3 }} onClick={onClose}>
            Close
          </Button>

        </Box>

      </ModalDialog>
    </Modal>
  );
}