import React, { useState } from "react";
import { Table, Text, Group, Avatar, Button, Tooltip, Skeleton, Stack, Badge, Loader, ActionIcon, Paper, useMantineColorScheme } from "@mantine/core";
import { GithubRepo } from "../types/github";
import { usePrCount } from "../hooks/useGithub";
import { ActionsModal } from "./ActionsModal";
import { CreatePrModal } from "./CreatePrModal";
import { useInViewport } from "@mantine/hooks";

interface RepoGridProps {
  repos: GithubRepo[];
  loading: boolean;
  token: string | null;
}

// Componente para exibir contagem de PRs
const PrCountBadge = ({ repo, token, owner, name, onOpenPrModal }: { repo: GithubRepo; token: string | null; owner: string; name: string; onOpenPrModal: (repo: GithubRepo) => void }) => {
  const { ref, inViewport } = useInViewport();
  const { data: count, isLoading } = usePrCount(token, owner, name, inViewport);

  if (isLoading) return <Loader ref={ref} size={12} color="gray" />;
  
  if (!count || count === 0) return (
    <Badge
      ref={ref}
      size="sm"
      variant="light"
      color="gray"
      style={{ cursor: 'pointer' }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onOpenPrModal(repo);
      }}
    >
      Criar PR
    </Badge>
  );
  
  return (
    <Badge 
      ref={ref} 
      size="sm" 
      variant="light" 
      color="green"
      component="a"
      href={`https://github.com/${owner}/${name}/pulls`}
      target="_blank"
      rel="noopener noreferrer"
      style={{ cursor: 'pointer', textDecoration: 'none' }}
    >
      {count} Open
    </Badge>
  );
}

// Componente auxiliar para o botão de copiar compacto
const CopyActionButton = ({ text, label }: { text: string; label: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Tooltip label={copied ? "Copiado!" : `Copiar ${label}`} withArrow position="top">
      <Button 
        variant={copied ? "light" : "subtle"} 
        color={copied ? "green" : "gray"}
        size="compact-xs" 
        onClick={handleCopy}
        style={{ fontSize: 11, height: 24 }}
      >
        {copied ? "OK" : label}
      </Button>
    </Tooltip>
  );
};

export function RepoGrid({ repos, loading, token }: RepoGridProps) {
  const [selectedRepo, setSelectedRepo] = useState<GithubRepo | null>(null);
  const [selectedPrRepo, setSelectedPrRepo] = useState<GithubRepo | null>(null);
  const { colorScheme } = useMantineColorScheme();

  if (loading) {
    return (
      <Stack gap="xs">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} height={50} radius="sm" />
        ))}
      </Stack>
    );
  }

  if (repos.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        Nenhum repositório encontrado.
      </Text>
    );
  }

  const rows = repos.map((repo) => (
    <Table.Tr key={repo.id}>
      <Table.Td>
        <Group gap="sm" wrap="nowrap">
          <Avatar src={repo.owner.avatar_url} size="md" radius="sm" alt={repo.owner.login} />
          <div style={{ minWidth: 0 }}>
            <Group gap={6} align="center">
              <Text 
                component="a" 
                href={repo.html_url} 
                target="_blank" 
                rel="noopener noreferrer"
                fw={600} 
                size="sm" 
                c="indigo"
                style={{ textDecoration: 'none' }}
                truncate
              >
                {repo.name}
              </Text>
              <Badge 
                size="xs" 
                variant="light" 
                color={repo.private ? "orange" : "gray"}
                style={{ textTransform: 'capitalize' }}
              >
                {repo.private ? "Private" : "Public"}
              </Badge>
            </Group>
            <Text size="xs" c="dimmed" truncate w={300}>
              {repo.description || "Sem descrição"}
            </Text>
          </div>
        </Group>
      </Table.Td>
      
      <Table.Td width={100}>
        <PrCountBadge repo={repo} token={token} owner={repo.owner.login} name={repo.name} onOpenPrModal={setSelectedPrRepo} />
      </Table.Td>

      <Table.Td width={100}>
        <Tooltip label="Ver Actions Recentes" withArrow>
          <ActionIcon 
            variant="light" 
            color="blue" 
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSelectedRepo(repo);
            }}
          >
            <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </ActionIcon>
        </Tooltip>
      </Table.Td>

      <Table.Td width={150}>
        <Text size="xs" c="dimmed">
          {new Date(repo.pushed_at).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
          })}
        </Text>
      </Table.Td>

      <Table.Td width={140}>
        <Group gap={4} wrap="nowrap">
          <CopyActionButton text={repo.clone_url} label="HTTPS" />
          <CopyActionButton text={repo.ssh_url} label="SSH" />
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <>
      <Paper shadow="sm" radius="md" withBorder style={{ overflow: "hidden" }}>
        <Table verticalSpacing="sm" highlightOnHover striped>
          <Table.Thead bg={colorScheme === 'dark' ? 'dark.6' : 'gray.0'}>
            <Table.Tr>
              <Table.Th>Repositório</Table.Th>
              <Table.Th>PRs</Table.Th>
              <Table.Th>Actions</Table.Th>
              <Table.Th>Pushed At</Table.Th>
              <Table.Th>Clone</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      </Paper>

      <ActionsModal 
        repo={selectedRepo} 
        token={token} 
        opened={!!selectedRepo} 
        onClose={() => setSelectedRepo(null)} 
      />

      <CreatePrModal
        repo={selectedPrRepo}
        token={token}
        opened={!!selectedPrRepo}
        onClose={() => setSelectedPrRepo(null)}
      />
    </>
  );
}
