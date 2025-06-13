
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { Site, SiteFile } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import Button from '../components/Button';

const HostedSitePreviewPage: React.FC = () => {
  const { siteSlug } = useParams<{ siteSlug: string }>();
  const [site, setSite] = useState<Site | null>(null);
  const [files, setFiles] = useState<Record<string, string>>({}); // { 'index.html': content, ... }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [iframeSrcDoc, setIframeSrcDoc] = useState<string>('');

  const fetchSiteData = useCallback(async () => {
    if (!siteSlug) {
      setError("Site slug is missing.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Fetch site details by slug (publicly accessible based on RLS)
      const { data: siteData, error: siteError } = await supabase
        .from('hosted_sites')
        .select('id, site_name, public_link_slug') // Select only needed public fields
        .eq('public_link_slug', siteSlug)
        .single();

      if (siteError || !siteData) {
        throw siteError || new Error('Site not found.');
      }
      setSite(siteData as Site);

      // Fetch files for this site (publicly accessible based on RLS)
      const { data: filesData, error: filesError } = await supabase
        .from('site_files')
        .select('file_name, content')
        .eq('site_id', siteData.id);

      if (filesError) throw filesError;

      const filesMap: Record<string, string> = {};
      (filesData as Pick<SiteFile, 'file_name' | 'content'>[]).forEach(file => {
        filesMap[file.file_name] = file.content;
      });
      setFiles(filesMap);

    } catch (err: any) {
      setError(err.message || 'Failed to load site data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [siteSlug]);

  useEffect(() => {
    fetchSiteData();
  }, [fetchSiteData]);
  
  useEffect(() => {
    if (files['index.html']) {
      const htmlContent = files['index.html'] || '<p>index.html not found.</p>';
      const cssContent = files['styles.css'] || '';
      const jsContent = files['script.js'] || '';

      // Construct srcDoc. This method embeds CSS and JS directly.
      // Assumes index.html links to styles.css and script.js with relative paths.
      // More robust parsing would be needed to handle arbitrary <link> and <script> tags.
      // For this example, we directly embed.
      const fullHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${site?.site_name || 'Preview'}</title>
            <style>
              ${cssContent}
            </style>
        </head>
        <body>
            ${htmlContent}
            <script>
              ${jsContent}
            </script>
        </body>
        </html>
      `;
      setIframeSrcDoc(fullHtml);
    } else if (!loading && Object.keys(files).length > 0) {
        // Files loaded, but no index.html
        setIframeSrcDoc('<html><body><h1>Error: index.html not found for this site.</h1></body></html>');
    }

  }, [files, site, loading]);


  if (loading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-gray-900 z-50">
        <LoadingSpinner size={12} />
        <p className="mt-4 text-lg text-gray-300">Loading Live Preview...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-4">
        <div className="bg-gray-800 p-8 rounded-lg shadow-xl text-center">
            <AlertTriangle size={48} className="mx-auto text-red-500 mb-4" />
            <h2 className="text-2xl font-semibold text-red-400 mb-2">Error Loading Preview</h2>
            <p className="text-gray-300 mb-6">{error}</p>
            <Link to="/dashboard">
                <Button variant="primary" leftIcon={<ArrowLeft size={18}/>}>
                    Back to Dashboard
                </Button>
            </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900 fixed inset-0">
        <div className="bg-gray-800 p-2 flex justify-between items-center shadow-md">
            <span className="text-lg font-semibold text-gray-100 ml-2">
                Live Preview: {site?.site_name || 'Loading...'}
            </span>
            <Link to={site ? `/server/${site.id}` : "/dashboard"}>
                 <Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={16}/>}>
                    Back to Editor
                </Button>
            </Link>
        </div>
      <iframe
        srcDoc={iframeSrcDoc}
        title="Hosted Site Preview"
        className="w-full h-full border-0 flex-grow"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms" // Security sandbox
      />
    </div>
  );
};

export default HostedSitePreviewPage;
