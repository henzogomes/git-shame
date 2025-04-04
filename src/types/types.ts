/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

// GitHub data interfaces
export interface GitHubRepo {
  name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
}

export interface GitHubProfile {
  username: string;
  name: string | null;
  bio: string | null;
  followers: number;
  following: number;
  publicRepos: number;
  accountCreatedAt: string;
  company: string | null;
  location: string | null;
  topRepos: {
    name: string;
    description: string | null;
    stars: number;
    forks: number;
    language: string | null;
  }[];
}

// Cache entry interface
export interface CacheEntry {
  username: string;
  timestamp: number; // Unix timestamp in milliseconds
  language: "en-US" | "pt-BR";
  result: string;
  model: string;
}

// Add empty export to make it a module
export {};
