
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Site } from '../types';
import Button from '../components/Button';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import { PlusCircle, Globe, Edit3, Trash2, Coins, AlertTriangle } from 'lucide-react';
import { DEFAULT_FILES, NEW_SITE_COST } from '../constants';

const DashboardPage: React.FC = () => {
  const { user, credits, setCredits, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [sites, setSites] = useState<Site[]>([]);
  const [loadingSites, setLoadingSites] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [creatingSite, setCreatingSite] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSites = useCallback(async () => {
    if (!user) return;
    setLoadingSites(true);
    try {
      const { data, error: sitesError } = await supabase
        .from('hosted_sites')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (sitesError) throw sitesError;
      setSites(data as Site[]);
    } catch (err: any) {
      setError('Failed to load sites: ' + err.message);
      console.error(err);
    } finally {
      setLoadingSites(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  const generateSlug = (name: string) => {
    const randomString = Math.random().toString(36).substring(2, 8);
    return `${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${randomString}`;
  };

  const handleCreateSite = async () => {
    if (!user || !newSiteName.trim()) {
      setError("Site name cannot be empty.");
      return;
    }
    if (credits < NEW_SITE_COST) {
      setError(`Insufficient credits. You need ${NEW_SITE_COST} credits to host a new site.`);
      return;
    }

    setCreatingSite(true);
    setError(null);
    try {
      const public_link_slug = generateSlug(newSiteName);
      const { data: siteData, error: siteError } = await supabase
        .from('hosted_sites')
        .insert([{ user_id: user.id, site_name: newSiteName, public_link_slug }])
        .select()
        .single();

      if (siteError) throw siteError;
      if (!siteData) throw new Error("Failed to create site entry.");

      const newSiteId = siteData.id;

      const filePromises = Object.entries(DEFAULT_FILES).map(([fileName, content]) =>
        supabase.from('site_files').insert({
          site_id: newSiteId,
          file_name: fileName,
          content: content,
        })
      );
      await Promise.all(filePromises);
      
      // Deduct credits
      const newCreditAmount = credits - NEW_SITE_COST;
      const { error: creditError } = await supabase
        .from('profiles')
        .update({ credits: newCreditAmount })
        .eq('id', user.id);

      if (creditError) {
        // Attempt to roll back site creation if credit update fails (simplified)
        console.error("Failed to update credits, attempting to clean up site:", creditError);
        await supabase.from('hosted_sites').delete().eq('id', newSiteId);
        throw new Error("Failed to update credits. Site creation aborted.");
      }
      
      setCredits(newCreditAmount); // Update local state
      await refreshProfile(); // Refresh profile to ensure sync
      
      setNewSiteName('');
      setIsModalOpen(false);
      fetchSites(); // Refresh site list
      navigate(`/server/${newSiteId}`);
    } catch (err: any) {
      setError('Failed to create site: ' + err.message);
      console.error(err);
    } finally {
      setCreatingSite(false);
    }
  };
  
  const handleDeleteSite = async (siteId: string, siteName: string) => {
    if (!window.confirm(`Are you sure you want to delete the site "${siteName}"? This action cannot be undone.`)) {
      return;
    }
    setLoadingSites(true); // Indicate activity
    try {
      const { error: deleteError } = await supabase
        .from('hosted_sites')
        .delete()
        .eq('id', siteId);
      if (deleteError) throw deleteError;
      setSites(sites.filter(site => site.id !== siteId));
      // Note: Credits for deleted sites are not refunded in this version.
    } catch (err: any) {
      setError('Failed to delete site: ' + err.message);
    } finally {
      setLoadingSites(false);
    }
  };


  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">My Dashboard</h1>
        <Button onClick={() => setIsModalOpen(true)} leftIcon={<PlusCircle size={20}/>}>
          Host New Website
        </Button>
      </div>

      {error && <p className="bg-red-500/20 text-red-400 p-3 rounded-md mb-4 text-sm flex items-center"><AlertTriangle size={18} className="mr-2"/>{error}</p>}
      
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl mb-8">
        <h2 className="text-2xl font-semibold mb-2 flex items-center">
            <Coins className="w-7 h-7 mr-2 text-yellow-400"/>Credits
        </h2>
        <p className="text-5xl font-bold text-primary-400">{credits}</p>
        <p className="text-sm text-gray-400 mt-1">You earn 1 credit every 5 seconds. Hosting a new site costs {NEW_SITE_COST} credits (conceptual daily cost applied on creation).</p>
      </div>

      <h2 className="text-2xl font-semibold mb-4">My Hosted Sites</h2>
      {loadingSites ? (
        <div className="flex justify-center items-center h-40">
          <LoadingSpinner size={10} />
        </div>
      ) : sites.length === 0 ? (
        <p className="text-gray-400 bg-gray-800 p-6 rounded-lg text-center">
          You haven't hosted any websites yet. Click "Host New Website" to get started!
        </p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sites.map((site) => (
            <div key={site.id} className="bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-primary-500/20 transition-all duration-300 transform hover:-translate-y-1">
              <h3 className="text-xl font-semibold text-primary-400 mb-2 truncate">{site.site_name}</h3>
              <p className="text-sm text-gray-500 mb-1">Slug: {site.public_link_slug}</p>
              <p className="text-xs text-gray-500 mb-4">Created: {new Date(site.created_at).toLocaleDateString()}</p>
              <div className="flex space-x-2">
                <Button variant="ghost" size="sm" onClick={() => navigate(`/read/${site.public_link_slug}`)} leftIcon={<Globe size={16}/>}>
                  View Live
                </Button>
                <Button variant="secondary" size="sm" onClick={() => navigate(`/server/${site.id}`)} leftIcon={<Edit3 size={16}/>}>
                  Manage
                </Button>
                 <Button variant="danger" size="sm" onClick={() => handleDeleteSite(site.id, site.site_name)} leftIcon={<Trash2 size={16}/>}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Host a New Website">
        <div className="space-y-4">
           {error && <p className="bg-red-500/20 text-red-400 p-3 rounded-md text-sm">{error}</p>}
          <div>
            <label htmlFor="siteName" className="block text-sm font-medium text-gray-300 mb-1">Site Name</label>
            <input
              id="siteName"
              type="text"
              value={newSiteName}
              onChange={(e) => setNewSiteName(e.target.value)}
              placeholder="My Awesome Project"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <p className="text-sm text-gray-400">This will cost {NEW_SITE_COST} credits.</p>
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={creatingSite}>Cancel</Button>
            <Button onClick={handleCreateSite} isLoading={creatingSite} disabled={!newSiteName.trim() || credits < NEW_SITE_COST}>
              Create Site
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DashboardPage;
