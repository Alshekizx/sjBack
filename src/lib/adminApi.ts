import { supabase, supabaseUrl, supabaseAnonKey } from './supabase';

const baseUrl = `${supabaseUrl}/functions/v1/make-server-f63d7d22/admin`;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Your administrator session has expired. Please sign in again.');
  const response = await fetch(`${baseUrl}/${path}`, {
    ...init,
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  if (path === 'admin-users' && init?.method === 'POST' && [404, 405].includes(response.status)) {
    throw new Error('The deployed admin service does not support login account creation yet. Deploy the updated make-server-f63d7d22 Supabase function, then try again.');
  }
  const body = await response.json().catch(() => { throw new Error('The server returned an unexpected response. Please try again.'); });
  if (!response.ok) throw new Error(body.error || 'Unable to complete the request.');
  if (path === 'admin-users' && response.ok) {
    const accounts = Array.isArray(body) ? body : [body];
    if (accounts.some(account => account?.auth_account !== true)) {
      throw new Error('This admin service is still using administrator records that do not grant login access. Deploy the updated make-server-f63d7d22 Supabase function. Then recreate the administrator with a password, or assign access to their existing Auth account.');
    }
  }
  return body;
}

export const adminApi = {
  create: <T>(collection: string, record: unknown) => request<T>(collection, { method: 'POST', body: JSON.stringify(record) }),
  list: <T>(collection: string) => request<T[]>(collection),
  save: <T extends { id: string }>(collection: string, record: T) => request<T>(`${collection}/${record.id}`, { method: 'PUT', body: JSON.stringify(record) }),
  remove: (collection: string, id: string) => request<{ ok: boolean }>(`${collection}/${id}`, { method: 'DELETE' }),
};
