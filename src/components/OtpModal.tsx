import { useEffect, useMemo, useState } from "react";
import { ActionIcon, Alert, Group, Modal, Paper, Stack, Text, TextInput } from "@mantine/core";

type SupportedAlgorithm = "SHA-1" | "SHA-256" | "SHA-512";

interface ParsedOtpAuthUri {
  algorithm: SupportedAlgorithm;
  digits: number;
  issuer?: string;
  label: string;
  period: number;
  secret: string;
}

interface OtpModalProps {
  opened: boolean;
  onClose: () => void;
}

interface SavedOtpEntry {
  id: string;
  config: ParsedOtpAuthUri;
}

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function parseOtpAuthUri(uri: string): ParsedOtpAuthUri {
  const parsedUrl = new URL(uri.trim());

  if (parsedUrl.protocol !== "otpauth:" || parsedUrl.hostname !== "totp") {
    throw new Error("Use uma URI no formato otpauth://totp/...");
  }

  const secret = parsedUrl.searchParams.get("secret")?.trim();

  if (!secret) {
    throw new Error("A URI precisa conter o parâmetro secret.");
  }

  const digits = Number(parsedUrl.searchParams.get("digits") ?? "6");
  const period = Number(parsedUrl.searchParams.get("period") ?? "30");
  const algorithmParam = (parsedUrl.searchParams.get("algorithm") ?? "SHA1").toUpperCase();
  const algorithmMap: Record<string, SupportedAlgorithm> = {
    SHA1: "SHA-1",
    SHA256: "SHA-256",
    SHA512: "SHA-512",
  };

  if (!Number.isInteger(digits) || digits < 6 || digits > 10) {
    throw new Error("O parâmetro digits deve ser um inteiro entre 6 e 10.");
  }

  if (!Number.isInteger(period) || period <= 0) {
    throw new Error("O parâmetro period deve ser um inteiro positivo.");
  }

  const algorithm = algorithmMap[algorithmParam];

  if (!algorithm) {
    throw new Error("Algoritmo não suportado. Use SHA1, SHA256 ou SHA512.");
  }

  return {
    algorithm,
    digits,
    issuer: parsedUrl.searchParams.get("issuer")?.trim() || undefined,
    label: decodeURIComponent(parsedUrl.pathname.replace(/^\//, "")) || "OTP",
    period,
    secret,
  };
}

function decodeBase32(secret: string): Uint8Array {
  const normalized = secret.toUpperCase().replace(/=+$/g, "").replace(/\s+/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const character of normalized) {
    const index = BASE32_ALPHABET.indexOf(character);

    if (index === -1) {
      throw new Error("O secret da URI não está em Base32 válido.");
    }

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Uint8Array.from(bytes);
}

async function generateTotp(config: ParsedOtpAuthUri, timestamp: number): Promise<string> {
  const counter = Math.floor(timestamp / 1000 / config.period);
  const keyData = decodeBase32(config.secret);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: { name: config.algorithm } },
    false,
    ["sign"]
  );

  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  const high = Math.floor(counter / 2 ** 32);
  const low = counter >>> 0;

  view.setUint32(0, high);
  view.setUint32(4, low);

  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, buffer));
  const offset = signature[signature.length - 1] & 15;
  const binaryCode =
    ((signature[offset] & 127) << 24) |
    ((signature[offset + 1] & 255) << 16) |
    ((signature[offset + 2] & 255) << 8) |
    (signature[offset + 3] & 255);

  return (binaryCode % 10 ** config.digits).toString().padStart(config.digits, "0");
}

export function OtpModal({ opened, onClose }: OtpModalProps) {
  const [otpAuthUri, setOtpAuthUri] = useState("");
  const [savedEntries, setSavedEntries] = useState<SavedOtpEntry[]>([]);
  const [otpValues, setOtpValues] = useState<Record<string, string>>({});
  const [secondsRemainingById, setSecondsRemainingById] = useState<Record<string, number>>({});
  const [generationError, setGenerationError] = useState<string | null>(null);

  const { parsedConfig, parseError } = useMemo(() => {
    const trimmedUri = otpAuthUri.trim();

    if (!trimmedUri) {
      return { parsedConfig: null, parseError: null };
    }

    try {
      return { parsedConfig: parseOtpAuthUri(trimmedUri), parseError: null };
    } catch (error) {
      return {
        parsedConfig: null,
        parseError: error instanceof Error ? error.message : "URI inválida.",
      };
    }
  }, [otpAuthUri]);

  useEffect(() => {
    if (!opened || savedEntries.length === 0) {
      setOtpValues({});
      setSecondsRemainingById({});
      setGenerationError(null);
      return;
    }

    let cancelled = false;

    const updateTotps = async () => {
      const now = Date.now();

      try {
        const nextOtps = await Promise.all(
          savedEntries.map(async (entry) => ({
            id: entry.id,
            otp: await generateTotp(entry.config, now),
            secondsRemaining:
              entry.config.period - (Math.floor(now / 1000) % entry.config.period),
          }))
        );

        if (!cancelled) {
          setOtpValues(
            Object.fromEntries(nextOtps.map((entry) => [entry.id, entry.otp]))
          );
          setSecondsRemainingById(
            Object.fromEntries(
              nextOtps.map((entry) => [entry.id, entry.secondsRemaining])
            )
          );
          setGenerationError(null);
        }
      } catch (generationError) {
        if (!cancelled) {
          setOtpValues({});
          setSecondsRemainingById({});
          setGenerationError(
            generationError instanceof Error
              ? generationError.message
              : "Não foi possível gerar o OTP."
          );
        }
      }
    };

    void updateTotps();
    const intervalId = window.setInterval(() => {
      void updateTotps();
    }, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [opened, savedEntries]);

  const error = parseError ?? generationError;

  const handleAddOtp = () => {
    if (!parsedConfig) {
      return;
    }

    const entryId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    setSavedEntries((currentEntries) => [
      ...currentEntries,
      { id: entryId, config: parsedConfig },
    ]);
    setOtpAuthUri("");
    setGenerationError(null);
  };

  return (
    <Modal opened={opened} onClose={onClose} centered title="Gerador de OTP" size="lg">
      <Stack gap="md">
        <Group align="end" wrap="nowrap">
          <TextInput
            style={{ flex: 1 }}
            label="Novo"
            placeholder="otpauth://totp/aaa:?secret=bbb&issuer=ccc"
            value={otpAuthUri}
            onChange={(event) => setOtpAuthUri(event.currentTarget.value)}
          />

          {parsedConfig && !error && (
            <ActionIcon
              aria-label="Adicionar OTP"
              color="blue"
              size="lg"
              variant="filled"
              onClick={handleAddOtp}
            >
              +
            </ActionIcon>
          )}
        </Group>

        {error ? (
          <Alert color="red" title="URI inválida">
            {error}
          </Alert>
        ) : savedEntries.length > 0 ? (
          <Stack gap="xs">
            {savedEntries.map((entry) => (
              <Paper key={entry.id} withBorder p="md">
                <Stack gap="xs">
                  <Group justify="space-between" align="flex-end">
                    <div>
                      <Text size="sm" c="dimmed">
                        {entry.config.issuer || "Sem issuer"}
                      </Text>
                      <Text fw={600}>{entry.config.label}</Text>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <Text size="xs" c="dimmed">
                        expira em {secondsRemainingById[entry.id] ?? "-"}s
                      </Text>
                      <Text size="xs" c="dimmed">
                        {entry.config.algorithm} • {entry.config.digits} d
                      </Text>
                    </div>
                  </Group>

                  <Paper
                    withBorder
                    style={{
                      fontSize: "2rem",
                      letterSpacing: "0.2em",
                      padding: "1rem",
                      textAlign: "center",
                      fontFamily: "monospace",
                      fontWeight: 700,
                    }}
                  >
                    {otpValues[entry.id] ?? "------"}
                  </Paper>
                </Stack>
              </Paper>
            ))}
          </Stack>
        ) : (
          <Text c="dimmed" size="sm">
            Insira uma URI otpauth://totp válida e clique em + para salvar na lista.
          </Text>
        )}
      </Stack>
    </Modal>
  );
}
