
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { supabase, getMailIdentitiesForUser, getEmailsForIdentity, sendBoongleEmail, markEmailAsRead, subscribeToNewEmails, unsubscribeFromChannel, createMailIdentity } from '../supabaseService';
import { BoongleMailIdentity, EmailUserMailbox, MailFolder } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';

// Icons
const InboxIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-5 h-5"}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.25 2.25v3.75a2.25 2.25 0 01-2.25 2.25H2.25v-6zM2.25 13.5V6a2.25 2.25 0 012.25-2.25h15A2.25 2.25 0 0121.75 6v7.5m-18 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
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
  const location = useLocation();
  const { user, signOut: authSignOut } = useAuth();

  const [mailIdentities, setMailIdentities] = useState<BoongleMailIdentity[]>([]);
  const [currentIdentity, setCurrentIdentity] = useState<BoongleMailIdentity | null>(null);
  const [emails, setEmails] = useState<EmailUserMailbox[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<MailFolder>('inbox');
  const [selectedEmail, setSelectedEmail] = useState<EmailUserMailbox | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // General loading for page data
  const [isIdentityLoading, setIsIdentityLoading] = useState(true); // Specific for identity fetching
  const [error, setError] = useState<string | null>(null);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isAddingIdentity, setIsAddingIdentity] = useState(false);
  const [newIdentityUsername, setNewIdentityUsername] = useState('');

  const realtimeChannelRef = React.useRef<RealtimeChannel | null>(null);

  const fetchIdentities = useCallback(async () => {
    if (!user) return;
    setIsIdentityLoading(true);
    setError(null);
    try {
      const identities = await getMailIdentitiesForUser(user.id);
      setMailIdentities(identities);
      if (identities.length > 0) {
        if (accountIndex < identities.length && accountIndex >= 0) {
          setCurrentIdentity(identities[accountIndex]);
        } else {
          setCurrentIdentity(identities[0]); // Default to first identity
          if (location.pathname !== `/app/mails=0`) {
             navigate(`/app/mails=0`, { replace: true });
          }
        }
      } else {
        setCurrentIdentity(null);
        // Error will be shown by the dedicated "No Identities" screen
      }
    } catch (e: any) {
      setError(e.message || "Failed to fetch mail identities.");
      console.error("Error in fetchIdentities:", e);
      setCurrentIdentity(null);
    } finally {
      setIsIdentityLoading(false);
      setIsLoading(false); // General loading can be set false after identities attempt
    }
  }, [user, accountIndex, navigate, location.pathname]);

  const fetchEmails = useCallback(async () => {
    if (!currentIdentity) {
      setEmails([]);
      return;
    }
    setIsLoading(true); // Use general loading for emails
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
      fetchEmails();
      
      unsubscribeFromChannel(realtimeChannelRef.current);
      const channel = subscribeToNewEmails(currentIdentity.id, (payload) => {
        console.log('Realtime new email payload:', payload);
        if (payload.new && payload.new.folder === selectedFolder ) {
           const newEmailEntry = payload.new as EmailUserMailbox;
           if(newEmailEntry.email_details) {
             if (payload.eventType === 'INSERT' && selectedFolder === 'inbox') {
                setEmails(prevEmails => [newEmailEntry, ...prevEmails].sort((a,b) => new Date(b.email_details!.sent_at).getTime() - new Date(a.email_details!.sent_at).getTime() ));
             } else if (payload.eventType === 'UPDATE') {
                setEmails(prevEmails => prevEmails.map(e => e.id === newEmailEntry.id ? newEmailEntry : e).sort((a,b) => new Date(b.email_details!.sent_at).getTime() - new Date(a.email_details!.sent_at).getTime()));
             } else { // e.g. sent mail might not need prepend to inbox
                fetchEmails();
             }
           } else {
             console.warn("Realtime update missing email_details, refetching folder.");
             fetchEmails(); 
           }
        }
      });
      realtimeChannelRef.current = channel;
      return () => {
        unsubscribeFromChannel(realtimeChannelRef.current);
      };
    }
  }, [currentIdentity, selectedFolder, fetchEmails]); // fetchEmails is a dependency

  const handleSelectEmail = async (email: EmailUserMailbox) => {
    setSelectedEmail(email);
    setIsComposing(false); // Ensure compose mode is off
    if (!email.is_read && email.folder === 'inbox') {
      try {
        await markEmailAsRead(email.id);
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
      if (selectedFolder === 'sent') fetchEmails();
      else setSelectedFolder('sent'); // Switch to sent folder after sending
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
    // Set a local loading for this action if needed, or use main isLoading
    const creatingIdentityLoading = true; // Placeholder for specific loader
    try {
      const { data, error: rpcError } = await createMailIdentity(newIdentityUsername.trim());
      if (rpcError) throw rpcError;
      if (data) {
        // Refetch all identities to update the list and currentIdentity
        await fetchIdentities(); 
        setNewIdentityUsername('');
        setIsAddingIdentity(false);
        // Navigate to the new identity if desired, or let fetchIdentities handle it
        // For simplicity, fetchIdentities will reset to 0 or current index.
        // To specifically go to the new one:
        // const newIdx = mailIdentities.findIndex(id => id.id === data.id);
        // if (newIdx !== -1) navigate(`/app/mails=${newIdx}`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to create new identity.");
    } finally {
      // End specific loader
    }
  };
  
  const EmailListItem: React.FC<{ email: EmailUserMailbox; onSelect: () => void; isSelected: boolean }> = ({ email, onSelect, isSelected }) => {
    const detail = email.email_details;
    if (!detail) return <div className="p-3 border-b border-gray-200 text-sm text-red-500">Error: Email data missing</div>;

    const displayName = selectedFolder === 'inbox' ? detail.sender_email_address : detail.recipient_email_address;
    const subjectDisplay = detail.subject || '(no subject)';
    const snippet = detail.body?.substring(0,50) + (detail.body && detail.body.length > 50 ? "..." : "");


    return (
      <div 
        onClick={onSelect}
        className={`p-3 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors ${isSelected ? 'bg-blue-50' : ''} ${!email.is_read && email.folder === 'inbox' ? 'bg-white' : 'bg-gray-50'}`}
        role="button"
        tabIndex={0}
        onKeyPress={(e) => e.key === 'Enter' && onSelect()}
        aria-selected={isSelected}
      >
        <div className="flex justify-between items-center text-sm mb-1">
          <p className={`truncate max-w-[150px] sm:max-w-[200px] ${!email.is_read && email.folder === 'inbox' ? 'font-bold text-gray-800' : 'font-medium text-gray-700'}`}>{displayName}</p>
          <p className={`text-xs whitespace-nowrap ${!email.is_read && email.folder === 'inbox' ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>{new Date(detail.sent_at).toLocaleDateString()}</p>
        </div>
        <p className={`text-sm truncate ${!email.is_read && email.folder === 'inbox' ? 'text-gray-700 font-semibold' : 'text-gray-600'}`}>{subjectDisplay}</p>
        <p className={`text-xs truncate mt-0.5 ${!email.is_read && email.folder === 'inbox' ? 'text-gray-600' : 'text-gray-500'}`}>{snippet}</p>
      </div>
    );
  };
  
  if (!user) {
      navigate('/auth', {replace: true}); // Should be handled by ProtectedRoute, but as a safeguard
      return <div className="p-4 text-center">Redirecting to login...</div>;
  }

  // Handle case where identities are loading or user has no identities
  if (isIdentityLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 text-gray-700">
        Loading your Boongle Mail identities...
      </div>
    );
  }
  
  if (!mailIdentities.length && !isIdentityLoading) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        <header className="bg-white shadow-sm p-3 flex items-center justify-between shrink-0">
          <BoongleLogoSm />
          <button
            onClick={() => authSignOut().then(() => navigate('/auth'))}
            className="px-3 py-1.5 text-sm text-white bg-blue-500 hover:bg-blue-600 rounded-md"
          >
            Sign Out
          </button>
        </header>
        <div className="flex-grow flex flex-col items-center justify-center p-6 text-center">
          <UserCircleIcon className="w-24 h-24 text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Boongle Mail Identities Found</h2>
          <p className="text-gray-600 mb-4 max-w-md">
            It seems you don't have any Boongle Mail addresses (like yourname@boongle.com) set up yet. 
            You need one to send and receive Boongle Mails.
          </p>
          {error && <p className="text-red-500 bg-red-100 p-3 rounded-md text-sm text-center mb-4">{error}</p>}
          {mailIdentities.length < 3 ? (
            <button
              onClick={() => setIsAddingIdentity(true)}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition"
            >
              Create Your First Boongle Mail Identity
            </button>
          ) : (
            <p className="text-red-500">You have reached the maximum number of identities (3).</p>
          )}
        </div>
        {isAddingIdentity && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Boongle Mail Identity</h3>
              <form onSubmit={handleAddNewIdentity} className="space-y-4">
                <div>
                  <label htmlFor="newIdentity" className="block text-sm font-medium text-gray-700">
                    Choose your Boongle Username
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <input
                      id="newIdentity"
                      type="text"
                      value={newIdentityUsername}
                      onChange={(e) => setNewIdentityUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                      required
                      className="flex-1 block w-full min-w-0 px-3 py-2 border border-gray-300 rounded-l-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="your.username"
                    />
                    <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                      @boongle.com
                    </span>
                  </div>
                  {mailIdentities.length < 3 && <p className="mt-1 text-xs text-gray-500">You can add {3 - mailIdentities.length} more {3 - mailIdentities.length === 1 ? 'identity' : 'identities'}.</p>}
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <div className="flex justify-end space-x-3">
                  <button type="button" onClick={() => {setIsAddingIdentity(false); setError(null);}} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">Cancel</button>
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
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="bg-white shadow-sm p-3 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <button onClick={() => navigate('/')} aria-label="Go to Homepage" className="p-1 hover:bg-gray-100 rounded-full">
             <BoongleLogoSm />
          </button>
        </div>
        <div className="flex items-center space-x-3">
           {currentIdentity ? (
            <div className="relative">
              <button 
                onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                className="flex items-center space-x-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-sm text-gray-700"
                aria-haspopup="true"
                aria-expanded={isAccountDropdownOpen}
              >
                <UserCircleIcon className="w-5 h-5 text-gray-500" />
                <span>{currentIdentity.display_name || currentIdentity.email_address}</span>
                <ChevronDownIcon className={`w-4 h-4 transform transition-transform ${isAccountDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isAccountDropdownOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200" role="menu">
                  {mailIdentities.map((identity, idx) => (
                    <button
                      key={identity.id}
                      role="menuitem"
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
                        role="menuitem"
                        onClick={() => { setIsAddingIdentity(true); setIsAccountDropdownOpen(false); setError(null); }}
                        className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <PlusIcon /> <span>Add new identity</span>
                      </button>
                  )}
                </div>
              )}
            </div>
          ) : <div className="text-sm text-gray-500">No identity selected.</div>}
          <button
            onClick={() => authSignOut().then(() => navigate('/auth'))}
            className="px-3 py-1.5 text-sm text-white bg-blue-500 hover:bg-blue-600 rounded-md"
          >
            Sign Out
          </button>
        </div>
      </header>

      <div className="flex-grow flex overflow-hidden">
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
                onClick={() => {setSelectedFolder(folder); setSelectedEmail(null); setIsComposing(false);}}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm hover:bg-gray-100 transition
                            ${selectedFolder === folder ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600'}`}
                aria-current={selectedFolder === folder ? "page" : undefined}
              >
                {folder === 'inbox' ? <InboxIcon /> : <SentIcon />}
                <span className="hidden sm:inline capitalize">{folder}</span>
              </button>
            ))}
          </div>
        </nav>

        <div className="flex-grow flex bg-white overflow-hidden">
          {(!selectedEmail || isComposing) && (
             <div className={`w-full md:w-2/5 border-r border-gray-200 overflow-y-auto ${selectedEmail && !isComposing ? 'hidden md:block' : 'block'}`}>
              <div className="p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                <h2 className="text-xl font-semibold text-gray-800 capitalize">{selectedFolder}</h2>
                <p className="text-sm text-gray-500">{emails.length} {emails.length === 1 ? "email" : "emails"}</p>
              </div>
              {isLoading && !emails.length ? (
                <div className="p-4 text-center text-gray-500">Loading emails...</div>
              ) : error && !emails.length ? ( // Only show general error if no emails are loaded, specific error can be shown by modal
                <div className="p-4 text-center text-red-500">{error}</div>
              ) : emails.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No emails in {selectedFolder}.</div>
              ) : (
                <div>{emails.map(email => <EmailListItem key={email.id} email={email} onSelect={() => handleSelectEmail(email)} isSelected={selectedEmail?.id === email.id}/>)}</div>
              )}
            </div>
          )}

          <main className="flex-grow p-2 sm:p-6 overflow-y-auto bg-white">
            {isComposing ? (
              <ComposeView identity={currentIdentity} onSubmit={handleComposeSubmit} onCancel={() => setIsComposing(false)} />
            ) : selectedEmail && selectedEmail.email_details ? (
              <EmailDetailView email={selectedEmail} onBackToList={() => setSelectedEmail(null)} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-500">
                <InboxIcon className="w-24 h-24 text-gray-300 mb-4" />
                <p className="text-xl">Select an email to read</p>
                <p className="text-sm">or</p>
                <button onClick={() => {setIsComposing(true); setSelectedEmail(null);}} className="mt-2 text-blue-500 hover:underline">Compose a new mail</button>
              </div>
            )}
          </main>
        </div>
      </div>
       {isAddingIdentity && !(!mailIdentities.length && !isIdentityLoading) /* Show modal only if not on the dedicated 'no identities' page */ && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Boongle Mail Identity</h3>
            <form onSubmit={handleAddNewIdentity} className="space-y-4">
              <div>
                <label htmlFor="newIdentityModal" className="block text-sm font-medium text-gray-700">
                  New Boongle Username
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    id="newIdentityModal"
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
                 {mailIdentities.length < 3 && <p className="mt-1 text-xs text-gray-500">You can add {3 - mailIdentities.length} more {3 - mailIdentities.length === 1 ? 'identity' : 'identities'}.</p>}
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="flex justify-end space-x-3">
                <button type="button" onClick={() => {setIsAddingIdentity(false); setError(null);}} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">Cancel</button>
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

interface EmailDetailViewProps {
  email: EmailUserMailbox;
  onBackToList: () => void;
}
const EmailDetailView: React.FC<EmailDetailViewProps> = ({ email, onBackToList }) => {
  const detail = email.email_details;
  if (!detail) return <div className="p-6 text-red-500">Error: Email content not available.</div>;
  
  return (
    <div className="space-y-4">
       <button onClick={onBackToList} className="md:hidden mb-4 flex items-center text-sm text-blue-600 hover:underline">
          <ArrowLeftIcon className="w-4 h-4 mr-1" /> Back to list
        </button>
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 break-words">{detail.subject || '(no subject)'}</h1>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-gray-200 space-y-2 sm:space-y-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-semibold shrink-0">
            {detail.sender_email_address.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 break-all">{detail.sender_email_address}</p>
            <p className="text-xs text-gray-500 break-all">To: {detail.recipient_email_address}</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 self-start sm:self-center shrink-0">{new Date(detail.sent_at).toLocaleString()}</p>
      </div>
      <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap break-words" dangerouslySetInnerHTML={{ __html: detail.body?.replace(/\n/g, '<br />') || '' }}>
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
  const [formError, setFormError] = useState<string|null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!identity) {
        setFormError("Sending identity not available. Please select an account.");
        return;
    }
    if (!to.match(/^[a-zA-Z0-9._-]+@boongle\.com$/)) {
        setFormError('Recipient must be a valid @boongle.com address (e.g. user@boongle.com).');
        return;
    }
    
    setIsSending(true);
    const success = await onSubmit(to, subject, body);
    setIsSending(false);
    if (success) {
      setTo(''); setSubject(''); setBody('');
      onCancel(); 
    } else {
      setFormError("Failed to send email. Please try again."); // Generic error, specific error might be set by MailPage's setError
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 h-full flex flex-col">
      <h2 className="text-xl font-semibold text-gray-800">Compose New Email</h2>
      {formError && <p className="text-red-500 bg-red-100 p-2 rounded-md text-sm">{formError}</p>}
      <div>
        <label htmlFor="from" className="block text-sm font-medium text-gray-700">From</label>
        <input
          id="from"
          type="text"
          disabled
          value={identity?.email_address || 'No identity selected'}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 sm:text-sm"
          aria-readonly="true"
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
          aria-required="true"
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
      <div className="flex-grow flex flex-col">
        <label htmlFor="body" className="block text-sm font-medium text-gray-700">Body</label>
        <textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={10}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm flex-grow resize-none"
          placeholder="Write your email here..."
          aria-required="true"
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
