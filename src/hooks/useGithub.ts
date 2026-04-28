import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAllRecentRepos, validateToken, fetchPrCount, fetchRecentActions, rerunWorkflow, fetchUserProfile, fetchUserOrgs } from "../services/github";

export function useGithubUser(token: string | null) {
  return useQuery({
    queryKey: ["user", token],
    queryFn: () => fetchUserProfile(token!),
    enabled: !!token,
    staleTime: Infinity,
  });
}

export function useGithubOrgs(token: string | null) {
  return useQuery({
    queryKey: ["orgs", token],
    queryFn: () => fetchUserOrgs(token!),
    enabled: !!token,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export function useGithubRepos(token: string | null) {
  return useQuery({
    queryKey: ["repos", token],
    queryFn: () => fetchAllRecentRepos(token!),
    enabled: !!token,
    refetchInterval: 1000 * 15,
    retry: false
  });
}

export function usePrCount(token: string | null, owner: string, name: string, visible: boolean) {
  return useQuery({
    queryKey: ["pr-count", owner, name],
    queryFn: () => fetchPrCount(token!, owner, name),
    enabled: !!token && visible,
    refetchInterval: 1000 * 60 * 5,
  });
}

export function useRecentActions(token: string | null, owner: string, name: string, enabled: boolean) {
  return useQuery({
    queryKey: ["recent-actions", owner, name],
    queryFn: () => fetchRecentActions(token!, owner, name),
    enabled: !!token && enabled,
    staleTime: 1000 * 30, 
  });
}

export function useRerunWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ token, owner, name, runId }: { token: string; owner: string; name: string; runId: number }) => 
      rerunWorkflow(token, owner, name, runId),
    onSuccess: (_, { owner, name }) => {
      queryClient.invalidateQueries({ queryKey: ["recent-actions", owner, name] });
    },
  });
}

export function useValidateToken() {
  return useMutation({
    mutationFn: validateToken,
  });
}
