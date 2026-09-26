import React from "react";
import { Modal, Text, Group, Badge, Loader, Timeline, Avatar, ThemeIcon, ActionIcon, Tooltip } from "@mantine/core";
import { CircleX, Play, RefreshCw } from "lucide-react";
import { GithubRepo } from "../types/github";
import { useCancelWorkflow, useRecentActions, useRerunWorkflow } from "../hooks/useGithub";

interface ActionsModalProps {
  repo: GithubRepo | null;
  token: string | null;
  opened: boolean;
  onClose: () => void;
}

const ActionLinks = ({
  token,
  owner,
  name,
  runId,
  status,
}: {
  token: string | null;
  owner: string;
  name: string;
  runId: number;
  status: string;
}) => {
  const { mutate: rerunWorkflow, isPending: isRerunning } = useRerunWorkflow();
  const { mutate: cancelWorkflow, isPending: isCancelling } = useCancelWorkflow();
  const canCancel = status === "in_progress" || status === "queued";

  const handleRerun = () => {
    if (token && window.confirm("Deseja reexecutar esta action?")) {
      rerunWorkflow({ token, owner, name, runId });
    }
  };

  const handleCancel = () => {
    if (token && window.confirm("Deseja cancelar esta action?")) {
      cancelWorkflow({ token, owner, name, runId });
    }
  };

  return (
    <Group gap={4}>
      {canCancel && (
        <ActionIcon
          variant="subtle"
          color="red"
          size="sm"
          aria-label="Cancelar"
          onClick={handleCancel}
          loading={isCancelling}
          disabled={!token || isRerunning}
        >
          <CircleX size={14} />
        </ActionIcon>
      )}
      <ActionIcon
        variant="subtle"
        color="gray"
        size="sm"
        aria-label="Rerun"
        onClick={handleRerun}
        loading={isRerunning}
        disabled={!token || isCancelling}
      >
        <Play size={14} />
      </ActionIcon>
    </Group>
  );
};

export function ActionsModal({ repo, token, opened, onClose }: ActionsModalProps) {
  const { data: actions, isLoading, isFetching, refetch } = useRecentActions(
    token, 
    repo?.owner.login ?? "", 
    repo?.name ?? "", 
    opened // Só busca quando o modal está aberto
  );

  const getStatusColor = (status: string, conclusion: string | null) => {
    if (status === "in_progress" || status === "queued") return "yellow";
    if (conclusion === "success") return "green";
    if (conclusion === "failure") return "red";
    if (conclusion === "cancelled") return "gray";
    return "blue";
  };

  const getStatusIcon = (status: string, conclusion: string | null) => {
    if (status === "in_progress" || status === "queued") {
      return (
        <ThemeIcon size={20} color="yellow" radius="xl">
          <Loader size={12} color="white" />
        </ThemeIcon>
      );
    }
    if (conclusion === "success") {
      return (
        <ThemeIcon size={20} color="green" radius="xl">
          <svg style={{ width: 12, height: 12 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </ThemeIcon>
      );
    }
    if (conclusion === "failure") {
      return (
        <ThemeIcon size={20} color="red" radius="xl">
          <CircleX size={12} />
        </ThemeIcon>
      );
    }
    return (
      <ThemeIcon size={20} color="gray" radius="xl">
        <div style={{ width: 8, height: 8, backgroundColor: 'white', borderRadius: '50%' }} />
      </ThemeIcon>
    );
  };

  return (
    <Modal 
      centered
      opened={opened} 
      onClose={onClose} 
      title={
        <Group gap="xs" align="center">
          <Text fw={700}>Actions: {repo?.name}</Text>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              aria-label="Atualizar actions"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              <RefreshCw
                size={14}
                style={{
                  animation: isFetching ? "actions-modal-refresh-spin 1s linear infinite" : undefined,
                }}
              />
            </ActionIcon>
        </Group>
      }
      size="lg"
    >
      <style>{`
        @keyframes actions-modal-refresh-spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
      {isLoading ? (
        <Group justify="center" p="xl">
          <Loader />
        </Group>
      ) : !actions || actions.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">Nenhum workflow executado recentemente.</Text>
      ) : (
        <Timeline active={-1} bulletSize={24} lineWidth={2}>
          {actions.map((action) => (
            <Timeline.Item 
              key={action.id} 
              bullet={getStatusIcon(action.status, action.conclusion)}
              title={
                <Group gap="xs" justify="space-between" align="center">
                  <Group gap="xs">
                    <Text
                      c="dimmed"
                      size="xs" 
              
                      
                    >
                      {action.name}
                    </Text>
                    <Badge 
                      size="xs" 
                      color="gray"
                      variant="light"
                    >
                      {action.head_branch || action.conclusion || action.status}
                    </Badge>
                  </Group>
                </Group>
              }
            >
              <Text size="xs" mt={4}         component="a"
                      href={action.html_url}
                      target="_blank"
                      style={{ color: "inherit", textDecoration: "none" }}
                      rel="noreferrer" styles={{
                        root: {
                          cursor: "pointer",
                        },
                      }}
                      onMouseEnter={(event) => {
                        event.currentTarget.style.textDecoration = "underline";
                      }}
                      onMouseLeave={(event) => {
                        event.currentTarget.style.textDecoration = "none";
                      }}
                    >
                      {action.display_title}
                    </Text>
              
              <Group gap="xs" mt={4}>
                <Avatar src={action.actor.avatar_url} size={20} radius="xl" />
                <Text size="xs" c="dimmed">
                  por {action.actor.login}
                </Text>
                <Text size="xs" c="dimmed">•</Text>
                <Text size="xs" c="dimmed">
                  {new Date(action.created_at).toLocaleString("pt-BR")}
                </Text>
                {repo && (
                  <ActionLinks
                    token={token}
                    owner={repo.owner.login}
                    name={repo.name}
                    runId={action.id}
                    status={action.status}
                  />
                )}
              </Group>
            </Timeline.Item>
          ))}
        </Timeline>
      )}
    </Modal>
  );
}
