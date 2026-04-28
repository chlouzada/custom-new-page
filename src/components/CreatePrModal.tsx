import React, { useState } from "react";
import { Modal, Select, Button, Stack, TextInput, Group } from "@mantine/core";
import { useGithubBranches, useCreatePullRequest } from "../hooks/useGithub";
import { GithubRepo } from "../types/github";

interface CreatePrModalProps {
  repo: GithubRepo | null;
  token: string | null;
  opened: boolean;
  onClose: () => void;
}

export function CreatePrModal({ repo, token, opened, onClose }: CreatePrModalProps) {
  const [head, setHead] = useState<string | null>(null);
  const [base, setBase] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [prUrl, setPrUrl] = useState<string | null>(null);

  const { data: branches = [], isLoading } = useGithubBranches(
    token,
    repo?.owner.login || "",
    repo?.name || "",
    opened && !!repo
  );

  const createPr = useCreatePullRequest();

  const handleCreate = async () => {
    if (!repo || !token || !head || !base || !title) return;
    try {
      const pr = await createPr.mutateAsync({
        token,
        owner: repo.owner.login,
        name: repo.name,
        title,
        head,
        base,
      });
      setPrUrl(pr.html_url);
    } catch (error) {
      console.error(error);
      // Handle error (maybe show a toast/notification)
    }
  };

  const branchOptions = branches.map((b: any) => ({ value: b.name, label: b.name }));

  return (
    <Modal opened={opened} onClose={() => {
      onClose();
      // Reset state after close
      setTimeout(() => {
        setHead(null);
        setBase(null);
        setTitle("");
        setPrUrl(null);
      }, 300);
    }} title={`Criar PR em ${repo?.name}`} centered>
      {prUrl ? (
        <Stack>
          <Button component="a" href={prUrl} target="_blank" rel="noopener noreferrer" color="green">
            Ir até o PR
          </Button>
          <Button variant="light" onClick={onClose}>
            Fechar
          </Button>
        </Stack>
      ) : (
        <Stack>
          <TextInput
            label="Título do PR"
            placeholder="Implementa nova feature"
            value={title}
            onChange={(e) => setTitle(e.currentTarget.value)}
            required
          />
          <Select
            label="De onde vem (Head)"
            placeholder="ex: feature-branch"
            data={branchOptions}
            value={head}
            onChange={setHead}
            searchable
            disabled={isLoading}
          />
          <Select
            label="Para onde vai (Base)"
            placeholder="ex: main"
            data={branchOptions}
            value={base}
            onChange={setBase}
            searchable
            disabled={isLoading}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose}>Cancelar</Button>
            <Button 
              onClick={handleCreate} 
              loading={createPr.isPending}
              disabled={!head || !base || !title || head === base}
            >
              Criar PR
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}