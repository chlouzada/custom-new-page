import React, { useEffect, useState } from 'react';
import { MantineProvider, Container, Title, Group, Text, SegmentedControl, useMantineColorScheme, Stack, Button, PasswordInput } from '@mantine/core';
import browser from "webextension-polyfill";
import "../global.css";

function PopupContent() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [ghToken, setGhToken] = useState('');
  const [storedToken, setStoredToken] = useState('');

  useEffect(() => {
    browser.storage.sync.get(['ghToken']).then((result) => {
      if (result.ghToken) {
        setGhToken(result.ghToken as string);
        setStoredToken(result.ghToken as string);
      } else {
        browser.storage.local.get(['ghToken']).then((localResult) => {
          if (localResult.ghToken) {
            setGhToken(localResult.ghToken as string);
            setStoredToken(localResult.ghToken as string);
          }
        });
      }
    });
  }, []);

  const handleTokenChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setGhToken(event.target.value);
  };

  const saveToken = () => {
    browser.storage.local.set({ ghToken });
    browser.storage.sync.set({ ghToken });
    setStoredToken(ghToken);
  };

  const clearInput = () => {
    setGhToken('');
  };

  return (
    <Container p="md" style={{ width: 300, minHeight: 150 }}>
      <Stack gap="md">
        <Title order={4} c="indigo">Extension Settings</Title>

        <PasswordInput 
          label="GitHub Token"
          placeholder="ghp_..."
          value={ghToken}
          onChange={handleTokenChange}
        />

        {ghToken !== storedToken && (
          <Button fullWidth onClick={saveToken}>
            Save
          </Button>
        )}

        {storedToken && (
           <Button fullWidth color="red" variant="outline" onClick={() => {
             setGhToken('');
             setStoredToken('');
             browser.storage.local.remove('ghToken');
             browser.storage.sync.remove('ghToken');
           }}>
             Delete Token
           </Button>
        )}

        <Group justify="space-between">
            <Text size="sm" fw={500}>Appearance</Text>
            <SegmentedControl
                size="xs"
                value={colorScheme}
                onChange={(value) => setColorScheme(value as any)}
                data={[
                    { label: 'Light', value: 'light' },
                    { label: 'Dark', value: 'dark' },
                ]}
            />
        </Group>
      </Stack>
    </Container>
  );
}

export default function Popup() {
  return (
    <MantineProvider defaultColorScheme="dark">
      <PopupContent />
    </MantineProvider>
  );
}
