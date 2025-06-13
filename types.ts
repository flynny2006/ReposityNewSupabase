
import { User as SupabaseUser } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  credits: number;
  updated_at: string;
}

export interface Site {
  id: string;
  user_id: string;
  site_name: string;
  public_link_slug: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface SiteFile {
  id: string;
  site_id: string;
  file_name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface AuthContextType {
  user: SupabaseUser | null;
  profile: UserProfile | null;
  loadingAuth: boolean;
  credits: number;
  setCredits: React.Dispatch<React.SetStateAction<number>>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

export enum SitePageTab {
  Console = 'Console',
  Files = 'Files',
  Backups = 'Backups',
  Configuration = 'Configuration',
}
