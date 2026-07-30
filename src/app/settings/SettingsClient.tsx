'use client';

import React, { useState, useCallback } from 'react';
import { User, Briefcase, Save, Loader2, Upload, X, Globe } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '@/utils/cropImage';
import ThemeSelector from '@/components/theme/ThemeSelector';
import { updateProfile, updateWorkspace } from '@/app/actions/settings';
import styles from './Settings.module.css';

interface Props {
  userEmail: string;
  initialName: string;
  initialAvatarUrl: string | null;
  workspaceId: string;
  initialWorkspaceName: string;
}

export default function SettingsClient({ userEmail, initialName, initialAvatarUrl, workspaceId, initialWorkspaceName }: Props) {
  const [activeTab, setActiveTab] = useState<'profile' | 'workspace' | 'preferences'>('profile');
  const supabase = createClient();
  
  // Form states
  const [fullName, setFullName] = useState(initialName);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [workspaceName, setWorkspaceName] = useState(initialWorkspaceName);
  
  // Status states
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Cropper states
  const [showCropper, setShowCropper] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    
    const res = await updateProfile(fullName);
    if (res.error) {
      setMessage({ type: 'error', text: res.error });
    } else {
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      window.dispatchEvent(new Event('profile-updated'));
    }
    
    setIsSaving(false);
  };

  const handleSaveWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;
    
    setIsSaving(true);
    setMessage(null);
    
    const res = await updateWorkspace(workspaceId, workspaceName);
    if (res.error) {
      setMessage({ type: 'error', text: res.error });
    } else {
      setMessage({ type: 'success', text: 'Workspace updated successfully!' });
    }
    
    setIsSaving(false);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result?.toString() || null);
        setShowCropper(true);
      });
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSaveCroppedImage = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    
    setUploadingAvatar(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      
      const fileName = `${user.id}-${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedBlob, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      
      setAvatarUrl(publicUrl);
      setShowCropper(false);
      setImageSrc(null);
      setMessage({ type: 'success', text: 'Avatar updated successfully!' });
      
      // Dispatch event to update Topbar immediately
      window.dispatchEvent(new Event('profile-updated'));
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Failed to upload avatar: ' + err.message });
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>Manage your account and workspace preferences.</p>
      </div>

      <div className={styles.layout}>
        <div className={styles.sidebar}>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'profile' ? styles.activeTab : ''}`}
            onClick={() => { setActiveTab('profile'); setMessage(null); }}
          >
            <User size={18} />
            My Profile
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'workspace' ? styles.activeTab : ''}`}
            onClick={() => { setActiveTab('workspace'); setMessage(null); }}
          >
            <Briefcase size={18} />
            Workspace
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'preferences' ? styles.activeTab : ''}`}
            onClick={() => { setActiveTab('preferences'); setMessage(null); }}
          >
            <Globe size={18} />
            Preferences
          </button>
        </div>

        <div className={styles.content}>
          {message && (
            <div className={`${styles.alert} ${message.type === 'error' ? styles.alertError : styles.alertSuccess}`}>
              {message.text}
            </div>
          )}

          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className={styles.card}>
              <h2 className={styles.cardTitle}>Profile Information</h2>
              <p className={styles.cardDesc}>Update your account's profile information and email address.</p>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', padding: '24px' }}>
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt="Avatar" 
                    style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} 
                  />
                ) : (
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 'bold' }}>
                    {fullName ? fullName.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <div>
                  <button 
                    type="button"
                    onClick={() => document.getElementById('avatar-upload')?.click()} 
                    style={{ padding: '8px 16px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 500 }}
                  >
                    <Upload size={16} /> Change Avatar
                  </button>
                  <input 
                    id="avatar-upload"
                    type="file" 
                    accept="image/*" 
                    style={{ display: 'none' }}
                    onChange={onFileChange}
                  />
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.label}>Email Address</label>
                <input 
                  type="email" 
                  value={userEmail} 
                  disabled 
                  className={styles.inputDisabled}
                />
                <span className={styles.helpText}>Your email address is used for login and cannot be changed here.</span>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Full Name</label>
                <input 
                  type="text" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)}
                  className={styles.input}
                  placeholder="e.g. John Doe"
                  required
                />
              </div>

              <div className={styles.footer}>
                <button type="submit" disabled={isSaving || fullName === initialName} className={styles.btnPrimary}>
                  {isSaving ? <Loader2 size={16} className={styles.spin} /> : <Save size={16} />}
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {activeTab === 'workspace' && (
            <form onSubmit={handleSaveWorkspace} className={styles.card}>
              <h2 className={styles.cardTitle}>Workspace Settings</h2>
              <p className={styles.cardDesc}>Manage your workspace details and branding.</p>

              <div className={styles.formGroup}>
                <label className={styles.label}>Workspace Name</label>
                <input 
                  type="text" 
                  value={workspaceName} 
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className={styles.input}
                  placeholder="e.g. Acme Corp"
                  required
                />
              </div>

              <div className={styles.footer}>
                <button type="submit" disabled={isSaving || workspaceName === initialWorkspaceName} className={styles.btnPrimary}>
                  {isSaving ? <Loader2 size={16} className={styles.spin} /> : <Save size={16} />}
                  Save Workspace
                </button>
              </div>
            </form>
          )}

          {activeTab === 'preferences' && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>App Preferences</h2>
              <p className={styles.cardDesc}>Customize your experience across the application.</p>

              <div style={{ padding: '24px' }}>
                <ThemeSelector />
              </div>
            </div>
          )}
        </div>
      </div>

      {showCropper && imageSrc && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '500px', backgroundColor: 'var(--bg-page)', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Crop Avatar</h3>
              <button onClick={() => { setShowCropper(false); setImageSrc(null); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <div style={{ position: 'relative', width: '100%', height: '400px', backgroundColor: '#000' }}>
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            
            <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Zoom</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  style={{ flex: 1, accentColor: 'var(--accent)' }}
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button 
                  onClick={() => { setShowCropper(false); setImageSrc(null); }}
                  disabled={uploadingAvatar}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'var(--bg-elevated)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 500 }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveCroppedImage}
                  disabled={uploadingAvatar}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}
                >
                  {uploadingAvatar ? <Loader2 size={16} className={styles.spin} /> : <Save size={16} />}
                  {uploadingAvatar ? 'Saving...' : 'Save Avatar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
