import React, { useState } from "react";
import { TextInput, Button, Paper, Title, Text, Stack, Container } from "@mantine/core";

interface TokenFormProps {
  onSave: (token: string) => void;
  loading: boolean;
  error?: string;
}

export function TokenForm({ onSave, loading, error }: TokenFormProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSave(input.trim());
    }
  };

  return (
    <Container size="xs" mt={100}>
      <Stack align="center" gap="lg">
        <div style={{ textAlign: "center" }}>
          <Title order={2}>GitHub Access Token</Title>
          <Text c="dimmed" mt="xs">
            Para listar seus repositórios, precisamos de um Personal Access Token (Classic) com permissão de leitura de repositórios e organizações.
          </Text>
        </div>

        <Paper withBorder shadow="md" p="xl" radius="md" w="100%">
          <form onSubmit={handleSubmit}>
            <Stack>
              <TextInput
                required
                placeholder="ghp_..."
                value={input}
                onChange={(e) => setInput(e.currentTarget.value)}
                error={error}
                disabled={loading}
                label="Personal Access Token"
              />
              
              <Button type="submit" loading={loading} fullWidth color="indigo">
                Salvar Token
              </Button>
            </Stack>
          </form>
        </Paper>

        <Text size="xs" c="dimmed">
          O token é salvo apenas no armazenamento local do seu navegador.
        </Text>
      </Stack>
    </Container>
  );
}
