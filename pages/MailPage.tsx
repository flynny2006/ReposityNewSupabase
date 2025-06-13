
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { supabase, getMailIdentitiesForUser, getEmailsForIdentity, sendBoongleEmail, markEmailAsRead, subscribeToNewEmails, unsubscribeFromChannel, createMailIdentity } from '../supabaseService';
import { BoongleMailIdentity, EmailUserMailbox, MailFolder } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';

// Icons
const InboxIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-5 h-5"}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.25 2.25v3.75a2.25 2.25 0 01-2.25 2.25H2.25v-6zM2.25 13.5V6a2.25 2.25 0 012.25-2.25h15A2.25 2.25 0 0121.75 6v7.5m-18 0 μέσω 18m-18 0H9m12.75 0h-4.86a2.25 2.25 0 00-2.25 2.25v3.75a2.25 2.25 0 002.25 2.25h4.86M17.25 13.5v-7.5a2.25 2.25 0 00-2.25-2.25H9M9 13.5V21" /></svg>
);
const SentIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-5 h-5"}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
);
const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-5 h-5"}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
);
const UserCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-5 h-5"}><path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);
const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-4 h-4"}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
);
const ArrowLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-5 h-5"}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
);
const BoongleLogoSm: React.FC = () => (
  <h1 className="text-2xl font-bold tracking-tight">
    <span className="text-blue-600">B</span><span className="text-red-500">o</span><span className="text-yellow-400">o</span><span className="text-blue-600">n</span><span className="text-green-500">g</span><span className="text-red-500">l</span><span className="text-gray-700">e</span>
    <span className="text-xl text-gray-600 ml-1">Mails</span>
  </h1>
);

const MailPage: React.FC = () => {
  const { accountIndex: accountIndexStr } = useParams<{ accountIndex: string }>();
  const accountIndex = parseInt(accountIndexStr || '0', 10);
  const navigate = useNavigate();
  const { user, signOut: authSignOut } = useAuth();

  const [mailIdentities, setMailIdentities] = useState<BoongleMailIdentity[]>([]);
  const [currentIdentity, setCurrentIdentity] = useState<BoongleMailIdentity | null>(null);
  const [emails, setEmails] = useState<EmailUserMailbox[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<MailFolder>('inbox');
  const [selectedEmail, setSelectedEmail] = useState<EmailUserMailbox | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isAddingIdentity, setIsAddingIdentity] = useState(false);
  const [newIdentityUsername, setNewIdentityUsername] = useState('');

  const realtimeChannelRef = React.useRef<RealtimeChannel | null>(null);

  const fetchIdentities = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const identities = await getMailIdentitiesForUser(user.id);
      setMailIdentities(identities);
      if (identities.length > 0 && accountIndex < identities.length) {
        setCurrentIdentity(identities[accountIndex]);
      } else if (identities.length > 0) {
        setCurrentIdentity(identities[0]);
        navigate(`/app/mails=0`, { replace: true });
      } else {
        // No identities, possibly prompt to create one or handle as error
        setError("No mail identities found. Please create one.");
        setCurrentIdentity(null);
      }
    } catch (e: any) {
      setError(e.message || "Failed to fetch mail identities.");
    } finally {
      setIsLoading(false);
    }
  }, [user, accountIndex, navigate]);

  const fetchEmails = useCallback(async () => {
    if (!currentIdentity) {
      setEmails([]); // Clear emails if no identity
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const fetchedEmails = await getEmailsForIdentity(currentIdentity.id, selectedFolder);
      setEmails(fetchedEmails);
    } catch (e: any) {
      setError(e.message || `Failed to fetch ${selectedFolder}.`);
      setEmails([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentIdentity, selectedFolder]);
  
  useEffect(() => {
    fetchIdentities();
  }, [fetchIdentities]);

  useEffect(() => {
    if (currentIdentity) {
      fetchEmails(); // Fetch emails when identity or folder changes
      
      // Cleanup previous channel
      unsubscribeFromChannel(realtimeChannelRef.current);

      // Subscribe to new emails for the current identity
      const channel = subscribeToNewEmails(currentIdentity.id, (payload) => {
        console.log('Realtime new email payload:', payload);
        if (payload.new && payload.new.folder === 'inbox' && selectedFolder === 'inbox') {
           // Ensure email_details is present
           const newEmailEntry = payload.new as EmailUserMailbox;
           if(newEmailEntry.email_details) { // Check if email_details was successfully fetched by the service
             setEmails(prevEmails => [newEmailEntry, ...prevEmails]);
           } else {
             // Fallback: refetch if details are missing, or handle partially.
             // For simplicity, refetching ensures data consistency.
             console.warn("Realtime update missing email_details, refetching inbox.");
             fetchEmails(); 
           }
        } else if (payload.eventType === 'UPDATE' && payload.new.folder === selectedFolder) {
            // Handle updates like read status. This requires more specific handling.
            // For now, a full refetch on update might be simpler if not too frequent.
            fetchEmails();
        }
      });
      realtimeChannelRef.current = channel;

      return () => {
        unsubscribeFromChannel(realtimeChannelRef.current);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdentity, selectedFolder]); // fetchEmails is memoized

  const handleSelectEmail = async (email: EmailUserMailbox) => {
    setSelectedEmail(email);
    if (!email.is_read && email.folder === 'inbox') {
      try {
        await markEmailAsRead(email.id);
        // Update local state optimistically or refetch
        setEmails(prev => prev.map(e => e.id === email.id ? {...e, is_read: true} : e));
      } catch (err) {
        console.error("Failed to mark email as read:", err);
      }
    }
  };

  const handleComposeSubmit = async (to: string, subject: string, body: string) => {
    if (!currentIdentity) {
      setError("No active sending identity.");
      return false;
    }
    setIsLoading(true);
    try {
      await sendBoongleEmail(currentIdentity.id, to, subject, body);
      setIsComposing(false);
      if (selectedFolder === 'sent') fetchEmails(); // Refresh sent items
      return true;
    } catch (e: any) {
      setError(e.message || "Failed to send email.");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNewIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newIdentityUsername.trim()) return;
    if (mailIdentities.length >= 3) {
      setError("You can only have up to 3 mail identities.");
      return;
    }
    setIsLoading(true);
    try {
      const { data, error: rpcError } = await createMailIdentity(newIdentityUsername.trim());
      if (rpcError) throw rpcError;
      if (data) {
        setMailIdentities(prev => [...prev, data]);
        setNewIdentityUsername('');
        setIsAddingIdentity(false);
        // Optionally switch to the new identity
        // navigate(`/app/mails=${mailIdentities.length}`); 
      }
    } catch (err: any) {
      setError(err.message || "Failed to create new identity.");
    } finally {
      setIsLoading(false);
    }
  };

  const formattedDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  const EmailListItem: React.FC<{ email: EmailUserMailbox; onSelect: () => void; isSelected: boolean }> = ({ email, onSelect, isSelected }) => {
    const detail = email.email_details;
    if (!detail) return <div className="p-3 border-b border-gray-200 text-sm text-red-500">Error: Email data missing</div>;

    const displayName = selectedFolder === 'inbox' ? detail.sender_email_address : detail.recipient_email_address;
    return (
      <div 
        onClick={onSelect}
        className={`p-3 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors ${isSelected ? 'bg-blue-50' : ''} ${!email.is_read && email.folder === 'inbox' ? 'font-semibold text-gray-800' : 'text-gray-600'}`}
      >
        <div className="flex justify-between items-center text-sm mb-1">
          <p className="truncate max-w-[150px] sm:max-w-[200px]">{displayName}</p>
          <p className={`text-xs ${!email.is_read && email.folder === 'inbox' ? 'text-blue-600' : 'text-gray-500'}`}>{new Date(detail.sent_at).toLocaleDateString()}</p>
        </div>
        <p className={`text-sm truncate ${!email.is_read && email.folder === 'inbox' ? 'text-gray-700' : 'text-gray-500'}`}>{detail.subject || '(no subject)'}</p>
      </div>
    );
  };
  
  if (!user) return <div className="p-4 text-center">Redirecting to login...</div>;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm p-3 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <BoongleLogoSm />
        </div>
        <div className="flex items-center space-x-3">
           {currentIdentity && (
            <div className="relative">
              <button 
                onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                className="flex items-center space-x-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-sm text-gray-700"
              >
                <UserCircleIcon className="w-5 h-5 text-gray-500" />
                <span>{currentIdentity.display_name || currentIdentity.email_address}</span>
                <ChevronDownIcon className={`w-4 h-4 transform transition-transform ${isAccountDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isAccountDropdownOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                  {mailIdentities.map((identity, idx) => (
                    <button
                      key={identity.id}
                      onClick={() => {
                        navigate(`/app/mails=${idx}`);
                        setIsAccountDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm ${identity.id === currentIdentity.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'}`}
                    >
                      {identity.display_name || identity.email_address}
                    </button>
                  ))}
                  {mailIdentities.length < 3 && (
                     <button
                        onClick={() => { setIsAddingIdentity(true); setIsAccountDropdownOpen(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <PlusIcon /> <span>Add new identity</span>
                      </button>
                  )}
                </div>
              )}
            </div>
          )}
          <button
            onClick={() => authSignOut().then(() => navigate('/auth'))}
            className="px-3 py-1.5 text-sm text-white bg-blue-500 hover:bg-blue-600 rounded-md"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-grow flex overflow-hidden">
        {/* Sidebar */}
        <nav className="w-20 sm:w-56 bg-white border-r border-gray-200 p-4 space-y-3 shrink-0 flex flex-col">
          <button
            onClick={() => { setIsComposing(true); setSelectedEmail(null); }}
            className="w-full flex items-center justify-center sm:justify-start space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg text-sm font-medium transition"
          >
            <PlusIcon className="w-5 h-5"/>
            <span className="hidden sm:inline">Compose</span>
          </button>
          <div className="flex-grow space-y-1">
            {(['inbox', 'sent'] as MailFolder[]).map(folder => (
              <button
                key={folder}
                onClick={() => {setSelectedFolder(folder); setSelectedEmail(null);}}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm hover:bg-gray-100 transition
                            ${selectedFolder === folder ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600'}`}
              >
                {folder === 'inbox' ? <InboxIcon /> : <SentIcon />}
                <span className="hidden sm:inline capitalize">{folder}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Email List / Detail View */}
        <div className="flex-grow flex bg-white overflow-hidden">
          {(!selectedEmail || isComposing) && (
             <div className={`w-full md:w-2/5 border-r border-gray-200 overflow-y-auto ${selectedEmail && !isComposing ? 'hidden md:block' : 'block'}`}>
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800 capitalize">{selectedFolder}</h2>
                <p className="text-sm text-gray-500">{emails.length} emails</p>
              </div>
              {isLoading && !emails.length ? (
                <div className="p-4 text-center text-gray-500">Loading emails...</div>
              ) : error ? (
                <div className="p-4 text-center text-red-500">{error}</div>
              ) : emails.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No emails in {selectedFolder}.</div>
              ) : (
                <div>{emails.map(email => <EmailListItem key={email.id} email={email} onSelect={() => handleSelectEmail(email)} isSelected={selectedEmail?.id === email.id}/>)}</div>
              )}
            </div>
          )}

          {/* Email Detail or Compose View */}
          <main className="flex-grow p-2 sm:p-6 overflow-y-auto">
            {isComposing ? (
              <ComposeView identity={currentIdentity} onSubmit={handleComposeSubmit} onCancel={() => setIsComposing(false)} />
            ) : selectedEmail && selectedEmail.email_details ? (
              <EmailDetailView email={selectedEmail} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-500">
                <InboxIcon className="w-24 h-24 text-gray-300 mb-4" />
                <p className="text-xl">Select an email to read</p>
                <p>or</p>
                <button onClick={() => setIsComposing(true)} className="mt-2 text-blue-500 hover:underline">Compose a new mail</button>
              </div>
            )}
          </main>
        </div>
      </div>
      {/* Modals */}
       {isAddingIdentity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Boongle Mail Identity</h3>
            <form onSubmit={handleAddNewIdentity} className="space-y-4">
              <div>
                <label htmlFor="newIdentity" className="block text-sm font-medium text-gray-700">
                  New Boongle Username
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    id="newIdentity"
                    type="text"
                    value={newIdentityUsername}
                    onChange={(e) => setNewIdentityUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                    required
                    className="flex-1 block w-full min-w-0 px-3 py-2 border border-gray-300 rounded-l-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="new.username"
                  />
                  <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                    @boongle.com
                  </span>
                </div>
                 {mailIdentities.length >= 2 && <p className="mt-1 text-xs text-orange-600">You can add {3 - mailIdentities.length} more identities.</p>}
              </div>
              <div className="flex justify-end space-x-3">
                <button type="button" onClick={() => setIsAddingIdentity(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">Cancel</button>
                <button type="submit" disabled={isLoading || mailIdentities.length >=3} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50">
                  {isLoading ? 'Adding...' : 'Add Identity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


const EmailDetailView: React.FC<{ email: EmailUserMailbox }> = ({ email }) => {
  const detail = email.email_details;
  if (!detail) return <div className="p-6 text-red-500">Error: Email content not available.</div>;
  
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
       <button onClick={() => navigate(0)} className="md:hidden mb-4 flex items-center text-sm text-blue-600 hover:underline">
          <ArrowLeftIcon className="w-4 h-4 mr-1" /> Back to list
        </button>
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">{detail.subject || '(no subject)'}</h1>
      </div>
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-semibold">
            {detail.sender_email_address.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">{detail.sender_email_address}</p>
            <p className="text-xs text-gray-500">To: {detail.recipient_email_address}</p>
          </div>
        </div>
        <p className="text-xs text-gray-500">{new Date(detail.sent_at).toLocaleString()}</p>
      </div>
      <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: detail.body.replace(/\n/g, '<br />') }}>
      </div>
    </div>
  );
};

interface ComposeViewProps {
  identity: BoongleMailIdentity | null;
  onSubmit: (to: string, subject: string, body: string) => Promise<boolean>;
  onCancel: () => void;
}

const ComposeView: React.FC<ComposeViewProps> = ({ identity, onSubmit, onCancel }) => {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string|null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identity) {
        setError("Sending identity not available.");
        return;
    }
    if (!to.endsWith('@boongle.com')) {
        setError('Recipient must be a @boongle.com address.');
        return;
    }
    setError(null);
    setIsSending(true);
    const success = await onSubmit(to, subject, body);
    setIsSending(false);
    if (success) {
      setTo(''); setSubject(''); setBody(''); // Clear form on successful send
      onCancel(); // Close compose view
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 h-full flex flex-col">
      <h2 className="text-xl font-semibold text-gray-800">Compose New Email</h2>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div>
        <label htmlFor="from" className="block text-sm font-medium text-gray-700">From</label>
        <input
          id="from"
          type="text"
          disabled
          value={identity?.email_address || 'Loading...'}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 sm:text-sm"
        />
      </div>
      <div>
        <label htmlFor="to" className="block text-sm font-medium text-gray-700">To</label>
        <input
          id="to"
          type="email"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="recipient@boongle.com"
        />
      </div>
      <div>
        <label htmlFor="subject" className="block text-sm font-medium text-gray-700">Subject</label>
        <input
          id="subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="Email subject"
        />
      </div>
      <div className="flex-grow">
        <label htmlFor="body" className="block text-sm font-medium text-gray-700">Body</label>
        <textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={10}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm h-full resize-none"
          placeholder="Write your email here..."
        />
      </div>
      <div className="flex justify-end space-x-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">
          Cancel
        </button>
        <button type="submit" disabled={isSending || !identity} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50">
          {isSending ? 'Sending...' : 'Send Email'}
        </button>
      </div>
    </form>
  );
};

export default MailPage;
