import React, { useEffect, useState } from "react";
import { MantineProvider, Container, Button, Group, TextInput, Paper, Text, Stack, useMantineColorScheme, Center, Anchor } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import browser from "webextension-polyfill";
import "../global.css";
import "./Newtab.css";

import { OtpModal } from "../components/OtpModal";
import { RepoGrid } from "../components/RepoGrid";
import { useGithubRepos, useGithubUser, useGithubOrgs } from "../hooks/useGithub";

// Instância do React Query Client
const queryClient = new QueryClient();

const NewTabContent = () => {
  const [token, setToken] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [otpModalOpened, setOtpModalOpened] = useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const { colorScheme } = useMantineColorScheme();

  // Hooks do React Query
  const { data: repos = [], isLoading: reposLoading } = useGithubRepos(token);
  const { data: user } = useGithubUser(token);
  const { data: orgs = [] } = useGithubOrgs(token);

  // Load token on mount and listen for changes
  useEffect(() => {
    // Initial load
    browser.storage.sync.get("ghToken").then((res) => {
      if (res.ghToken) {
        setToken(res.ghToken);
      } else {
        browser.storage.local.get("ghToken").then((localRes) => {
          if (localRes.ghToken) {
            setToken(localRes.ghToken);
          }
        });
      }
    });

    // Listen for changes from Popup or other parts
    const handleStorageChange = (changes: any, area: string) => {
      if ((area === "local" || area === "sync") && changes.ghToken) {
        setToken(changes.ghToken.newValue || null);
        if (!changes.ghToken.newValue) {
          queryClient.removeQueries({ queryKey: ["repos"] });
        }
      }
    };

    browser.storage.onChanged.addListener(handleStorageChange);
    return () => {
      browser.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  // Focus input when repos load
  useEffect(() => {
    if (token && !reposLoading && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [token, reposLoading]);

  // Lógica de Filtragem (Simples)
  const filteredRepos = repos.filter((repo) => {
    const query = searchQuery.toLowerCase();
    const nameMatch = repo.name.toLowerCase().includes(query);
    const orgMatch = repo.owner.login.toLowerCase().includes(query);
    return nameMatch || orgMatch;
  });

  const bgColor = colorScheme === 'dark' ? 'var(--mantine-color-dark-8)' : 'var(--mantine-color-gray-2)';

  return (
    <div style={{ backgroundColor: bgColor, minHeight: "100vh", paddingBottom: "2rem" }}>
      {/* Main Content */}
      <Container size="xl" pt="xl">
        {!token ? (
          <Center style={{ height: '80vh' }}>
            <Paper p="xl" radius="md" withBorder style={{ textAlign: 'center' }}>
              <Text c="dimmed">
                Please configure your GitHub Personal Access Token in the extension popup to get started.
              </Text>
              <Anchor href="https://github.com/settings/tokens/new?description=custom-new-page&scopes=repo,read:project&default_expires_at=90">Create Classic PAT</Anchor>
            </Paper>
          </Center>
        ) : (
          <Stack gap="lg">
            {user && (
              <>
                <Group justify="space-between" align="flex-start">
                  <Group>
                    <Button 
                      component="a" 
                      href={`https://github.com/${user.login}?tab=repositories`}
                      target="_blank"
                      variant="default"
                      size="xs"
                    >
                      My Repos
                    </Button>
                    {orgs.map((org) => (
                      <Button
                        key={org.id}
                        component="a"
                        href={`https://github.com/orgs/${org.login}/repositories`}
                        target="_blank"
                        variant="default"
                        size="xs"
                        leftSection={<img src={org.avatar_url} alt={org.login} style={{ width: 16, height: 16, borderRadius: '50%' }} />}
                      >
                        {org.login}
                      </Button>
                    ))}
                  </Group>

                  <Button variant="default" size="xs" onClick={() => setOtpModalOpened(true)}>
                    OTP
                  </Button>
                </Group>

                <OtpModal opened={otpModalOpened} onClose={() => setOtpModalOpened(false)} />
              </>
            )}

            <Paper py="xs" px="md" shadow="sm" radius="md">
              <Group align="center" gap="md">
                  <div style={{ flex: 1, position: 'relative' }}>
                  <TextInput
                    ref={searchInputRef}
                    placeholder="Pesquisar repositórios ou organizações..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.currentTarget.value)}
                    size="md"
                    leftSection={
                      <svg style={{ width: 16, height: 16, color: 'gray' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    }
                    variant="unstyled"
                  />
                </div>
                
                <Group gap="xs" style={{ borderLeft: '1px solid var(--mantine-color-gray-2)', paddingLeft: 10 }} visibleFrom="sm">
                  <Text size="sm" c="dimmed">
                    {filteredRepos.length} repos
                  </Text>
                </Group>
              </Group>
            </Paper>
            
            <RepoGrid repos={filteredRepos} loading={reposLoading} token={token} />
          </Stack>
        )}
      </Container>
    </div>
  );
};

export default function NewTab() {
  return (
    <MantineProvider defaultColorScheme="dark">
      <QueryClientProvider client={queryClient}>
        <NewTabContent />
      </QueryClientProvider>
    </MantineProvider>
  );
}
