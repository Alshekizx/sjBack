import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { supabase } from './supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || `https://${projectId}.supabase.co`;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || publicAnonKey;
const baseUrl = `${supabaseUrl}/functions/v1/make-server-f63d7d22/admin`;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Your administrator session has expired. Please sign in again.');
  const response = await fetch(`${baseUrl}/${path}`, {
    ...init,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  const body = await response.json().catch(() => { throw new Error('The server returned an unexpected response. Please try again.'); });
  if (!response.ok) throw new Error(body.error || 'Unable to complete the request.');
  return body;
}

export const adminApi = {
  list: <T>(collection: string) => request<T[]>(collection),
  save: <T extends { id: string }>(collection: string, record: T) => request<T>(`${collection}/${record.id}`, { method: 'PUT', body: JSON.stringify(record) }),
  remove: (collection: string, id: string) => request<{ ok: boolean }>(`${collection}/${id}`, { method: 'DELETE' }),
};
