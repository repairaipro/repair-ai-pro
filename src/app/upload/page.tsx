
'use client';
import { useState } from 'react';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const sigRes = await fetch('/api/cloudinary/sign', { method: 'POST' });
      const { signature, timestamp, apiKey, cloudName, folder } = await sigRes.json();

      const form = new FormData();
      form.append('file', file);
      form.append('api_key', apiKey);
      form.append('timestamp', String(timestamp));
      form.append('signature', signature);
      form.append('folder', folder);

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: 'POST',
        body: form,
      });
      const data = await uploadRes.json();
      if (data.secure_url) setUploadedUrl(data.secure_url);
      else setError('Upload failed: ' + JSON.stringify(data));
    } catch (e: any) {
      setError(e.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto card space-y-4">
      <h1 className="text-2xl font-bold">Upload Media</h1>
      <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <button className="btn btn-primary" onClick={handleUpload} disabled={!file || loading}>{loading ? 'Uploading...' : 'Upload to Cloudinary'}</button>
      {uploadedUrl && (
        <div className="space-y-2">
          <p className="text-sm">Uploaded:</p>
          <a className="text-blue-600 underline break-all" href={uploadedUrl} target="_blank" rel="noreferrer">{uploadedUrl}</a>
          <p className="text-xs text-gray-500">Copy this URL into the AI chat to analyze.</p>
        </div>
      )}
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  );
}
