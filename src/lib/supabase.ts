import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || `https://${projectId}.supabase.co`;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || publicAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type AdminRole = 'super_admin' | 'admin' | 'page_manager' | 'content_manager' | 'support_manager';

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: AdminRole;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  academic_level: string;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  email: string;
  full_name: string;
  academic_level?: string;
  subscription_status: 'active' | 'expired' | 'trial' | 'none';
  created_at: string;
  is_active: boolean;
}

export interface DashboardStats {
  total_students: number;
  active_subscriptions: number;
  total_courses: number;
  pending_tickets: number;
  monthly_revenue: number;
  new_students_this_month: number;
}
