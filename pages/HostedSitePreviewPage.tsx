
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { Site, SiteFile } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

// Utility to escape HTML for use in attributes or text nodes if necessary (e.g. title)
function escapeHtml(unsafe: string): string {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

const HostedSitePreviewPage: React.FC = () => {
  const { siteSlug } = useParams<{ siteSlug: string }>();
  const [site, setSite] = useState<Site | null>(null);
  const [files, setFiles] = useState<Record<string, string>>({}); // { 'index.html': content, ... }
  const [initialLoading, setInitialLoading] = useState(true); // For fetching site/file data
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  const initialSrcDoc = '<html><body style="font-family: sans-serif; color: #333; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;"><p>Initializing preview...</p></body></html>';
  const [iframeSrcDoc, setIframeSrcDoc] = useState<string>(initialSrcDoc);

  const fetchSiteData = useCallback(async () => {
    if (!siteSlug) {
      setFetchError("Site slug is missing.");
      setInitialLoading(false);
      return;
    }
    setInitialLoading(true);
    setFetchError(null);
    try {
      const { data: siteData, error: siteError } = await supabase
        .from('hosted_sites')
        .select('id, site_name, public_link_slug')
        .eq('public_link_slug', siteSlug)
        .single();

      if (siteError || !siteData) {
        throw siteError || new Error('Site not found.');
      }
      setSite(siteData as Site);

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
      setFetchError(err.message || 'Failed to load site data.');
      setSite(null); // Ensure site is null on error
      setFiles({});   // Ensure files are empty on error
      console.error(err);
    } finally {
      setInitialLoading(false);
    }
  }, [siteSlug]);

  useEffect(() => {
    fetchSiteData();
  }, [fetchSiteData]);
  
  useEffect(() => {
    if (initialLoading) {
      // Don't construct srcDoc while initial site data is loading
      // The iframe will show its initial "Initializing preview..." or the spinner will be visible
      return;
    }

    if (fetchError) {
      // Critical error fetching site data
      setIframeSrcDoc(`<html><body style="font-family: sans-serif; color: #333; text-align: center; padding-top: 2rem; margin: 0;"><h1>Error Loading Site</h1><p>${escapeHtml(fetchError)}</p><p>Please check the URL or try again later.</p></body></html>`);
      return;
    }

    if (Object.keys(files).length > 0 && files['index.html']) {
      const htmlFileContent = files['index.html'];
      const cssFileContent = files['styles.css'] || '';
      const jsFileContent = files['script.js'] || '';
      const siteTitle = site?.site_name || 'Hosted Site';

      // Construct srcDoc. This method embeds CSS and JS directly.
      // The user's full index.html (htmlFileContent) is placed in the body.
      // Any <link> or <script> tags in their index.html pointing to local files (like styles.css, script.js)
      // will not resolve in srcDoc, but the content is directly injected here.
      const fullHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${escapeHtml(siteTitle)}</title>
            <style type="text/css">
              ${cssFileContent}
            </style>
        </head>
        <body>
            ${htmlFileContent}
            <script type="text/javascript">
              ${jsFileContent}
            </script>
        </body>
        </html>
      `;
      setIframeSrcDoc(fullHtml);
    } else if (Object.keys(files).length > 0 && !files['index.html']) {
        // Files loaded, but no index.html
        setIframeSrcDoc('<html><body style="font-family: sans-serif; color: #333; text-align: center; padding-top: 2rem; margin: 0;"><h1>Preview Error</h1><p><strong>index.html</strong> not found for this site.</p><p>Please ensure an index.html file exists in your site files.</p></body></html>');
    } else if (!fetchError) {
        // No files, no error, potentially an empty site or just initialized
        setIframeSrcDoc('<html><body style="font-family: sans-serif; color: #333; text-align: center; padding-top: 2rem; margin: 0;"><p>Site content is not available or is empty.</p></body></html>');
    }

  }, [files, site, initialLoading, fetchError]);


  if (initialLoading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white z-[9999]">
        <LoadingSpinner size={12} color="text-gray-400" />
        <p className="mt-3 text-sm text-gray-500">Loading Site...</p>
      </div>
    );
  }

  // If not initialLoading, always render the iframe.
  // The iframeSrcDoc will contain either the site content or an appropriate error/status message.
  return (
    <iframe
      srcDoc={iframeSrcDoc}
      title={site?.site_name || 'Hosted Site'} // For accessibility, not visibly displayed by default
      className="w-screen h-screen border-0 fixed inset-0 bg-white" // bg-white for clean loading
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms" // Security sandbox
    />
  );
};

export default HostedSitePreviewPage;
