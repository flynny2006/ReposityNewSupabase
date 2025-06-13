
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { Site, SiteFile, SitePageTab } from '../types';
import CodeEditor from '../components/CodeEditor';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { Terminal, FileText, Settings, Shield, Save, Plus, Trash2, Edit, Eye, ArrowLeft, AlertTriangle } from 'lucide-react';

const ServerDetailPage: React.FC = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const [site, setSite] = useState<Site | null>(null);
  const [files, setFiles] = useState<SiteFile[]>([]);
  const [activeTab, setActiveTab] = useState<SitePageTab>(SitePageTab.Files);
  const [selectedFile, setSelectedFile] = useState<SiteFile | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isCreateFileModalOpen, setIsCreateFileModalOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');


  const fetchSiteDetails = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    setError(null);
    try {
      const { data: siteData, error: siteError } = await supabase
        .from('hosted_sites')
        .select('*')
        .eq('id', siteId)
        .single();
      if (siteError) throw siteError;
      setSite(siteData as Site);

      const { data: filesData, error: filesError } = await supabase
        .from('site_files')
        .select('*')
        .eq('site_id', siteId);
      if (filesError) throw filesError;
      setFiles(filesData as SiteFile[]);

      // Auto-select index.html if available
      const htmlFile = (filesData as SiteFile[]).find(f => f.file_name === 'index.html');
      if (htmlFile && activeTab === SitePageTab.Files) {
         setSelectedFile(htmlFile);
         setFileContent(htmlFile.content);
      }

    } catch (err: any) {
      setError('Failed to load site details: ' + err.message);
      console.error(err);
      setSite(null);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [siteId, activeTab]);

  useEffect(() => {
    fetchSiteDetails();
  }, [fetchSiteDetails]);

  const handleFileSelect = (file: SiteFile) => {
    setSelectedFile(file);
    setFileContent(file.content);
  };

  const handleSaveFile = async () => {
    if (!selectedFile) return;
    setSaving(true);
    setError(null);
    try {
      const { error: saveError } = await supabase
        .from('site_files')
        .update({ content: fileContent, updated_at: new Date().toISOString() })
        .eq('id', selectedFile.id);
      if (saveError) throw saveError;
      // Update local files state
      setFiles(files.map(f => f.id === selectedFile.id ? {...f, content: fileContent, updated_at: new Date().toISOString()} : f));
      alert('File saved successfully!');
    } catch (err: any) {
      setError('Failed to save file: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateFile = async () => {
    if (!siteId || !newFileName.trim()) {
      setError("File name cannot be empty.");
      return;
    }
    // Basic validation for file extension
    if (!/\.(html|css|js)$/i.test(newFileName.trim())) {
        setError("Invalid file name. Must end with .html, .css, or .js");
        return;
    }
    if (files.find(f => f.file_name === newFileName.trim())) {
        setError(`File "${newFileName.trim()}" already exists.`);
        return;
    }

    setSaving(true); // Use saving state for creating as well
    setError(null);
    try {
        const { data, error: createError } = await supabase
            .from('site_files')
            .insert({ site_id: siteId, file_name: newFileName.trim(), content: `// New file: ${newFileName.trim()}` })
            .select()
            .single();
        
        if (createError) throw createError;
        if (data) {
            setFiles([...files, data as SiteFile]);
            setSelectedFile(data as SiteFile);
            setFileContent((data as SiteFile).content);
            setIsCreateFileModalOpen(false);
            setNewFileName('');
        }
    } catch (err: any) {
        setError('Failed to create file: ' + err.message);
    } finally {
        setSaving(false);
    }
  };

  const handleDeleteFile = async (fileToDelete: SiteFile) => {
    if (!window.confirm(`Are you sure you want to delete "${fileToDelete.file_name}"? This action cannot be undone.`)) {
        return;
    }
    setSaving(true);
    setError(null);
    try {
        const { error: deleteError } = await supabase
            .from('site_files')
            .delete()
            .eq('id', fileToDelete.id);
        if (deleteError) throw deleteError;
        
        setFiles(files.filter(f => f.id !== fileToDelete.id));
        if (selectedFile?.id === fileToDelete.id) {
            setSelectedFile(null);
            setFileContent('');
        }
        alert('File deleted successfully!');
    } catch (err: any) {
        setError('Failed to delete file: ' + err.message);
    } finally {
        setSaving(false);
    }
  };

  const getFileLanguage = (fileName: string): 'html' | 'css' | 'javascript' => {
    if (fileName.endsWith('.html')) return 'html';
    if (fileName.endsWith('.css')) return 'css';
    if (fileName.endsWith('.js')) return 'javascript';
    return 'html'; // default
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size={12} />
      </div>
    );
  }

  if (error && !site) { // Critical error, site couldn't be loaded
    return (
       <div className="bg-gray-800 p-8 rounded-lg shadow-xl text-center">
            <AlertTriangle size={48} className="mx-auto text-red-500 mb-4" />
            <h2 className="text-2xl font-semibold text-red-400 mb-2">Error Loading Site</h2>
            <p className="text-gray-300 mb-6">{error}</p>
            <Button onClick={() => navigate('/dashboard')} leftIcon={<ArrowLeft size={18}/>}>
                Back to Dashboard
            </Button>
        </div>
    );
  }
  
  if (!site) {
     return <p className="text-center text-xl text-gray-400">Site not found or you do not have permission to view it.</p>;
  }


  const TABS = [
    { name: SitePageTab.Files, icon: FileText },
    { name: SitePageTab.Console, icon: Terminal },
    { name: SitePageTab.Backups, icon: Shield, disabled: true },
    { name: SitePageTab.Configuration, icon: Settings, disabled: true },
  ];


  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} leftIcon={<ArrowLeft size={16}/>} className="mb-2 sm:mb-0 mr-3">
                Dashboard
            </Button>
            <h1 className="text-3xl font-bold inline align-middle">{site.site_name}</h1>
            <Link to={`/read/${site.public_link_slug}`} target="_blank" rel="noopener noreferrer" className="ml-3 text-sm text-primary-400 hover:text-primary-300 inline-flex items-center">
                <Eye size={16} className="mr-1"/> View Live Site
            </Link>
        </div>
        {activeTab === SitePageTab.Files && selectedFile && (
          <Button onClick={handleSaveFile} isLoading={saving} leftIcon={<Save size={18}/>} className="mt-4 sm:mt-0">
            Save {selectedFile.file_name}
          </Button>
        )}
      </div>

      {error && <p className="bg-red-500/20 text-red-400 p-3 rounded-md mb-4 text-sm flex items-center"><AlertTriangle size={18} className="mr-2"/>{error}</p>}


      <div className="flex border-b border-gray-700 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.name}
            onClick={() => !tab.disabled && setActiveTab(tab.name)}
            disabled={tab.disabled}
            className={`flex items-center px-4 py-3 -mb-px border-b-2 text-sm font-medium transition-colors
              ${activeTab === tab.name 
                ? 'border-primary-500 text-primary-400' 
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}
              ${tab.disabled ? 'opacity-50 cursor-not-allowed' : ''}  
            `}
          >
            <tab.icon size={18} className="mr-2" /> {tab.name} {tab.disabled && "(Soon)"}
          </button>
        ))}
      </div>

      {activeTab === SitePageTab.Files && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-3 bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">Files</h3>
                <Button size="sm" variant="ghost" onClick={() => setIsCreateFileModalOpen(true)} leftIcon={<Plus size={16}/>}>
                    New File
                </Button>
            </div>
            {files.length === 0 ? (
                <p className="text-gray-500 text-sm">No files yet.</p>
            ) : (
            <ul className="space-y-1">
              {files.map((file) => (
                <li key={file.id}>
                  <button
                    onClick={() => handleFileSelect(file)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex justify-between items-center
                      ${selectedFile?.id === file.id ? 'bg-primary-600 text-white' : 'hover:bg-gray-700 text-gray-300'}`}
                  >
                    <span className="truncate">{file.file_name}</span>
                    {!['index.html', 'styles.css', 'script.js'].includes(file.file_name) && ( // Prevent deleting default core files for simplicity
                         <Trash2 size={16} className="text-red-400 hover:text-red-300 flex-shrink-0 ml-2" onClick={(e) => { e.stopPropagation(); handleDeleteFile(file); }}/>
                    )}
                  </button>
                </li>
              ))}
            </ul>
            )}
          </div>
          <div className="md:col-span-9 bg-gray-800 p-1 rounded-lg shadow">
            {selectedFile ? (
              <CodeEditor
                value={fileContent}
                onValueChange={setFileContent}
                language={getFileLanguage(selectedFile.file_name)}
                height="calc(100vh - 300px)" // Adjust height as needed
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-gray-500">
                <FileText size={48} className="mb-4"/>
                <p>Select a file to view or edit its content.</p>
                <p className="text-sm">Or, create a new file using the button on the left.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === SitePageTab.Console && (
        <div className="bg-gray-800 p-6 rounded-lg shadow min-h-[400px]">
          <h3 className="text-xl font-semibold mb-2">Console</h3>
          <p className="text-gray-400">Live server console output will appear here. (Feature coming soon)</p>
          <div className="mt-4 p-4 bg-black rounded text-sm font-mono text-gray-500 h-64 overflow-y-auto">
            [INFO] Server listening on port 3000...<br/>
            [LOG] Static assets loaded.
          </div>
        </div>
      )}
      {(activeTab === SitePageTab.Backups || activeTab === SitePageTab.Configuration) && (
         <div className="bg-gray-800 p-6 rounded-lg shadow min-h-[400px] flex flex-col items-center justify-center text-gray-500">
            {activeTab === SitePageTab.Backups && <Shield size={48} className="mb-4"/>}
            {activeTab === SitePageTab.Configuration && <Settings size={48} className="mb-4"/>}
            <h3 className="text-xl font-semibold mb-2">{activeTab}</h3>
            <p>This feature is currently under development and will be available soon!</p>
        </div>
      )}


    <Modal isOpen={isCreateFileModalOpen} onClose={() => setIsCreateFileModalOpen(false)} title="Create New File">
        <div className="space-y-4">
           {error && <p className="bg-red-500/20 text-red-400 p-3 rounded-md text-sm">{error}</p>}
          <div>
            <label htmlFor="newFileName" className="block text-sm font-medium text-gray-300 mb-1">File Name (e.g., about.html, custom.css)</label>
            <input
              id="newFileName"
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="example.js"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => {setIsCreateFileModalOpen(false); setError(null);}} disabled={saving}>Cancel</Button>
            <Button onClick={handleCreateFile} isLoading={saving} disabled={!newFileName.trim()}>
              Create File
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default ServerDetailPage;
