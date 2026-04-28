import { GithubOrg, GithubRepo, GithubUser } from "../types/github";

const BASE_URL = "https://api.github.com";
const PER_PAGE = 100;

export async function validateToken(token: string): Promise<boolean> {
  const response = await fetch(`${BASE_URL}/user`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.ok;
}

export async function fetchUserProfile(token: string): Promise<GithubUser> {
  const response = await fetch(`${BASE_URL}/user`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Failed to fetch user profile");
  return response.json();
}

export async function fetchUserOrgs(token: string): Promise<GithubOrg[]> {
  const response = await fetch(`${BASE_URL}/user/orgs`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Failed to fetch orgs");
  return response.json();
}

export async function fetchPersonalRepos(token: string): Promise<GithubRepo[]> {
  let page = 1;
  let allRepos: GithubRepo[] = [];
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await fetch(
      `${BASE_URL}/user/repos?sort=pushed&direction=desc&per_page=${PER_PAGE}&type=owner&page=${page}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) break;

    const repos: GithubRepo[] = await response.json();
    if (!Array.isArray(repos)) break;

    allRepos = [...allRepos, ...repos];

    if (repos.length < PER_PAGE) {
      hasNextPage = false;
    } else {
      page++;
    }
  }

  return allRepos;
}

export async function fetchOrgRepos(token: string, orgName: string): Promise<GithubRepo[]> {
  let page = 1;
  let allRepos: GithubRepo[] = [];
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await fetch(
      `${BASE_URL}/orgs/${orgName}/repos?sort=pushed&direction=desc&per_page=${PER_PAGE}&page=${page}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) break;

    const repos: GithubRepo[] = await response.json();
    if (!Array.isArray(repos)) break;

    allRepos = [...allRepos, ...repos];

    if (repos.length < PER_PAGE) {
      hasNextPage = false;
    } else {
      page++;
    }
  }

  return allRepos;
}

export async function fetchAllRecentRepos(token: string): Promise<GithubRepo[]> {
  const orgs = await fetchUserOrgs(token);
  
  const repoPromises = [
    fetchPersonalRepos(token),
    ...orgs.map((org) => fetchOrgRepos(token, org.login))
  ];
  
  const results = await Promise.all(repoPromises);
  
  const allRepos = results.flat();

  const uniqueRepos = Array.from(new Map(allRepos.map(repo => [repo.id, repo])).values());

  // Ordena por pushed_at
  return uniqueRepos.sort((a, b) => {
    return new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime();
  });
}

export async function fetchPrCount(token: string, owner: string, name: string): Promise<number> {
  const query = `
    query {
      repository(owner: "${owner}", name: "${name}") {
        pullRequests(states: OPEN) {
          totalCount
        }
      }
    }
  `;

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) return 0;
  
  const data = await response.json();
  return data.data?.repository?.pullRequests?.totalCount ?? 0;
}

export interface WorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  html_url: string;
  display_title: string;
  actor: {
    login: string;
    avatar_url: string;
  };
}

export async function fetchRecentActions(token: string, owner: string, name: string): Promise<WorkflowRun[]> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${name}/actions/runs?per_page=5`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) return [];
  
  const data = await response.json();
  return data.workflow_runs || [];
}

export async function rerunWorkflow(token: string, owner: string, name: string, runId: number): Promise<boolean> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${name}/actions/runs/${runId}/rerun`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return response.ok;
}
