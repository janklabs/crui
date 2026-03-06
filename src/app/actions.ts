"use server"

import {
  checkRegistryStatus,
  getManifest,
  listRepositories,
  listTags,
} from "~/lib/registry"
import type {
  ManifestResult,
  RegistryStatus,
  TagsResponse,
} from "~/lib/registry"
import { clearSession, getSession, setSession } from "~/lib/session"

const CATALOG_PAGE_SIZE = 100

export async function getRegistryStatusAction(): Promise<RegistryStatus> {
  const credentials = await getSession()
  return checkRegistryStatus(credentials)
}

export interface LoginResult {
  success: boolean
  error?: string
}

export async function loginAction(
  username: string,
  password: string,
): Promise<LoginResult> {
  const credentials = { username, password }
  const status = await checkRegistryStatus(credentials)

  if (status.authenticated) {
    await setSession(username, password)
    return { success: true }
  }

  return {
    success: false,
    error: status.error ?? "Authentication failed",
  }
}

export async function logoutAction(): Promise<void> {
  await clearSession()
}

export async function fetchAllRepositoriesAction(): Promise<string[]> {
  const credentials = await getSession()
  const allRepos: string[] = []
  let last: string | undefined
  do {
    const result = await listRepositories(credentials, CATALOG_PAGE_SIZE, last)
    allRepos.push(...result.repositories)
    if (!result.hasMore) break
    last = result.last
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  } while (true)
  return allRepos
}

export async function fetchTagsAction(repoName: string): Promise<TagsResponse> {
  const credentials = await getSession()
  return listTags(repoName, credentials)
}

export async function fetchManifestAction(
  repoName: string,
  reference: string,
): Promise<ManifestResult> {
  const credentials = await getSession()
  return getManifest(repoName, reference, credentials)
}
