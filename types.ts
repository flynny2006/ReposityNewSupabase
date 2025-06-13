
import { Session, User } from '@supabase/supabase-js';

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  primaryIdentity: BoongleMailIdentity | null;
  setPrimaryIdentity: React.Dispatch<React.SetStateAction<BoongleMailIdentity | null>>;
}

export interface BoongleMailIdentity {
  id: string;
  user_id: string;
  email_address: string;
  display_name: string | null;
  created_at: string;
}

export interface Email {
  id: string;
  sender_email_address: string;
  recipient_email_address: string;
  subject: string;
  body: string;
  sent_at: string;
}

export interface EmailUserMailbox {
  id: string;
  email_id: string;
  boongle_identity_id: string;
  folder: 'inbox' | 'sent' | 'trash' | 'archive';
  is_read: boolean;
  associated_at: string;
  email_details?: Email; // Joined data
}

export type MailFolder = 'inbox' | 'sent'; // Simplified for now
