
import { createClient, Session, User, SupabaseClient, PostgrestSingleResponse, RealtimeChannel } from '@supabase/supabase-js';
import { BoongleMailIdentity, Email, EmailUserMailbox } from './types';

const supabaseUrl = 'https://hxjjthpzydookxvrmgnd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4amp0aHB6eWRvb2t4dnJtZ25kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3OTk0OTEsImV4cCI6MjA2NTM3NTQ5MX0.LSPhdbmpucbj1s90_nrXdmBijxno33gX-pFlyy0FRCY';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// --- Auth ---
export const getSession = async (): Promise<Session | null> => {
  const { data, error } = await supabase.auth.getSession();
  if (error) console.error('Error getting session:', error);
  return data.session;
};

export const getUser = async (): Promise<User | null> => {
  const { data, error } = await supabase.auth.getUser();
  if (error) console.error('Error getting user:', error);
  return data.user;
};

export const onAuthStateChange = (callback: (event: string, session: Session | null) => void) => {
  const { data: authListener } = supabase.auth.onAuthStateChange(callback);
  return authListener;
};

export const signUpUser = async (email: string, password: string) => {
  return supabase.auth.signUp({ email, password });
};

export const signInUser = async (email: string, password: string) => {
  return supabase.auth.signInWithPassword({ email, password });
};

export const signOutUser = async () => {
  return supabase.auth.signOut();
};

// --- Boongle Mail Identities ---
export const createMailIdentity = async (username: string, displayName?: string): Promise<PostgrestSingleResponse<BoongleMailIdentity>> => {
  const emailAddress = `${username}@boongle.com`;
  return supabase.rpc('create_boongle_mail_identity', {
    p_email_address: emailAddress,
    p_display_name: displayName || username,
  });
};

export const getMailIdentitiesForUser = async (userId: string): Promise<BoongleMailIdentity[]> => {
  const { data, error } = await supabase
    .from('boongle_mail_identities')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) {
    console.error('Error fetching mail identities:', error);
    return [];
  }
  return data || [];
};

// --- Emails ---
export const sendBoongleEmail = async (senderIdentityId: string, recipientBoongleEmail: string, subject: string, body: string): Promise<PostgrestSingleResponse<string>> => {
  if (!recipientBoongleEmail.endsWith('@boongle.com')) {
    throw new Error('Recipient email must be a @boongle.com address.');
  }
  return supabase.rpc('send_boongle_email', {
    p_sender_identity_id: senderIdentityId,
    p_recipient_boongle_email: recipientBoongleEmail,
    p_subject: subject,
    p_body: body,
  });
};

export const getEmailsForIdentity = async (identityId: string, folder: 'inbox' | 'sent'): Promise<EmailUserMailbox[]> => {
  const { data, error } = await supabase
    .from('email_user_mailbox')
    .select(`
      *,
      email_details:emails(*)
    `)
    .eq('boongle_identity_id', identityId)
    .eq('folder', folder)
    .order('associated_at', { ascending: false });

  if (error) {
    console.error(`Error fetching ${folder}:`, error);
    return [];
  }
  return (data as EmailUserMailbox[]) || [];
};

export const markEmailAsRead = async (mailboxEntryId: string): Promise<PostgrestSingleResponse<null>> => {
  return supabase
    .from('email_user_mailbox')
    .update({ is_read: true })
    .eq('id', mailboxEntryId);
};

// --- Realtime ---
export const subscribeToNewEmails = (
  identityId: string, 
  callback: (payload: any) => void
): RealtimeChannel => {
  const channel = supabase
    .channel(`new-emails-${identityId}`)
    .on(
      'postgres_changes',
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'email_user_mailbox', 
        filter: `boongle_identity_id=eq.${identityId}` 
      },
      async (payload) => {
        // Fetch the full email details for the new mailbox entry
        if (payload.new && payload.new.email_id) {
            const { data: emailData, error: emailError } = await supabase
                .from('emails')
                .select('*')
                .eq('id', payload.new.email_id)
                .single();
            if (emailError) {
                console.error("Error fetching email details for realtime update:", emailError);
                callback(payload); // send payload as is
            } else {
                callback({ ...payload, new: { ...payload.new, email_details: emailData }});
            }
        } else {
            callback(payload);
        }
      }
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Subscribed to new emails for identity ${identityId}`);
      }
      if (err) {
        console.error(`Error subscribing to new emails for identity ${identityId}:`, err);
      }
    });
  return channel;
};

export const unsubscribeFromChannel = (channel: RealtimeChannel | null) => {
  if (channel) {
    supabase.removeChannel(channel);
  }
};
