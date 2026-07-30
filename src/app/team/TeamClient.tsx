'use client';
import React, { useState, useEffect } from 'react';
import { getWorkspaceMembers, removeMember, updateMemberRole, createInviteLink, directInviteByEmail } from '@/app/actions/team';
import { Users, UserPlus, Link as LinkIcon, Trash2, Mail, Shield, User } from 'lucide-react';
import styles from '../settings/Settings.module.css'; // Reusing some card styles

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

interface Member {
  user_id: string;
  role: string;
  created_at: string;
  profiles: Profile;
}

interface Props {
  workspaceId: string;
  currentUserRole: string;
  currentUserId: string;
}

export default function TeamClient({ workspaceId, currentUserRole, currentUserId }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const isAdmin = currentUserRole === 'owner' || currentUserRole === 'admin';

  useEffect(() => {
    fetchMembers();
  }, [workspaceId]);

  async function fetchMembers() {
    setIsLoading(true);
    const data = await getWorkspaceMembers(workspaceId);
    setMembers(data as unknown as Member[]);
    setIsLoading(false);
  }

  async function handleDirectInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    
    setMessage(null);
    const res = await directInviteByEmail(workspaceId, inviteEmail);
    if (res.error) {
      setMessage({ type: 'error', text: res.error });
    } else {
      setMessage({ type: 'success', text: 'User added successfully!' });
      setInviteEmail('');
      fetchMembers();
    }
  }

  async function handleGenerateLink() {
    setMessage(null);
    const res = await createInviteLink(workspaceId);
    if (res.error) {
      setMessage({ type: 'error', text: res.error });
    } else {
      const link = `${window.location.origin}/invite/${res.token}`;
      setInviteLink(link);
    }
  }

  async function copyToClipboard() {
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink);
      setMessage({ type: 'success', text: 'Invite link copied to clipboard!' });
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm('Are you sure you want to remove this member?')) return;
    const res = await removeMember(workspaceId, userId);
    if (res.error) {
      setMessage({ type: 'error', text: res.error });
    } else {
      fetchMembers();
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    const res = await updateMemberRole(workspaceId, userId, newRole);
    if (res.error) {
      setMessage({ type: 'error', text: res.error });
    } else {
      fetchMembers();
    }
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
        <Users size={28} color="var(--accent)" />
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)' }}>Team Settings</h1>
      </div>

      {message && (
        <div style={{ 
          padding: '12px 16px', 
          borderRadius: '8px', 
          marginBottom: '24px',
          background: message.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
          color: message.type === 'error' ? '#ef4444' : '#10b981',
          border: `1px solid ${message.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
        }}>
          {message.text}
        </div>
      )}

      {isAdmin && (
        <div className={styles.card} style={{ marginBottom: '32px' }}>
          <h2 className={styles.cardTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus size={18} /> Invite Members
          </h2>
          <p className={styles.cardDesc}>Add team members directly via email or share an invite link.</p>
          
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Direct Add */}
            <form onSubmit={handleDirectInvite} style={{ display: 'flex', gap: '12px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input 
                  type="email" 
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="name@company.com"
                  className={styles.input}
                  style={{ paddingLeft: '40px' }}
                />
              </div>
              <button type="submit" className={styles.btnPrimary} style={{ whiteSpace: 'nowrap' }}>
                Add directly
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border)' }} />
              <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>OR</span>
              <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border)' }} />
            </div>

            {/* Invite Link */}
            <div>
              {!inviteLink ? (
                <button type="button" onClick={handleGenerateLink} className={styles.btnSecondary} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center' }}>
                  <LinkIcon size={16} /> Generate Invite Link
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input 
                    type="text" 
                    readOnly
                    value={inviteLink}
                    className={styles.input}
                    style={{ flex: 1, background: 'var(--bg-hover)' }}
                  />
                  <button type="button" onClick={copyToClipboard} className={styles.btnSecondary}>
                    Copy
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Workspace Members</h2>
        <p className={styles.cardDesc}>Manage roles and access for members of your workspace.</p>

        {isLoading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading members...</div>
        ) : (
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {members.map(member => (
              <div key={member.user_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-hover)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', overflow: 'hidden' }}>
                    {member.profiles?.avatar_url ? (
                      <img src={member.profiles.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      member.profiles?.full_name ? member.profiles.full_name[0].toUpperCase() : 'U'
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {member.profiles?.full_name || 'Unknown User'}
                      {member.profiles?.id === currentUserId && <span style={{ fontSize: '12px', background: 'var(--accent)', color: '#fff', padding: '2px 8px', borderRadius: '12px' }}>You</span>}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {isAdmin && member.profiles?.id !== currentUserId && member.role !== 'owner' ? (
                    <select 
                      value={member.role || 'member'} 
                      onChange={(e) => handleRoleChange(member.user_id, e.target.value)}
                      className={styles.input}
                      style={{ padding: '6px 12px', height: 'auto', minWidth: '100px' }}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '14px', background: 'var(--bg-elevated)', padding: '6px 12px', borderRadius: '6px' }}>
                      {member.role === 'owner' || member.role === 'admin' ? <Shield size={14} /> : <User size={14} />}
                      <span style={{ textTransform: 'capitalize' }}>{member.role || 'Member'}</span>
                    </div>
                  )}

                  {isAdmin && member.profiles?.id !== currentUserId && member.role !== 'owner' && (
                    <button 
                      onClick={() => handleRemoveMember(member.user_id)}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      title="Remove member"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
