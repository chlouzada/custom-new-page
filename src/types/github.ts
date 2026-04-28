export interface GithubOrg {
  login: string;
  id: number;
  avatar_url: string;
  description: string;
}

export interface GithubUser {
  login: string;
  id: number;
  avatar_url: string;
  name: string;
  html_url: string;
}

export interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string;
  updated_at: string;
  pushed_at: string;
  stargazers_count: number;
  language: string;
  private: boolean;
  clone_url: string;
  ssh_url: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}
