'use client';
import React, { useEffect, useState, useRef } from 'react';
import { ChevronRight, User, Settings, Palette, Trash2, LogOut, Bell, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { getNotifications, markNotificationAsRead } from '@/app/actions/kanban';
import Image from 'next/image';
import ThemeModal from '@/components/modals/ThemeModal';
import styles from './Topbar.module.css';

interface TopbarProps {
  activeBoardName: string;
}

export default function Topbar({ activeBoardName }: TopbarProps) {
  const router = useRouter();
  const supabase = createClient();
  const [fullName, setFullName] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();
        
      if (data) {
        setFullName(data.full_name || user.email?.split('@')[0] || '');
        setAvatarUrl(data.avatar_url);
      } else {
        setFullName(user.email?.split('@')[0] || '');
      }
    };
    fetchProfile();

    const fetchNotifs = async () => {
      const notifs = await getNotifications();
      setNotifications(notifs);
    };
    fetchNotifs();

    let channel: any;
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const channelName = `notifications-${user.id}-${Date.now()}`;
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setNotifications(prev => [payload.new, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
              setNotifications(prev => prev.map(n => n.id === payload.new.id ? { ...n, ...payload.new } : n));
            }
          }
        )
        .subscribe();
    };
    setupRealtime();

    const handleProfileUpdate = () => fetchProfile();
    window.addEventListener('profile-updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate);
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const handleReadNotif = async (id: string) => {
    await markNotificationAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <header className={styles.topbar}>
      <div className={styles.breadcrumb}>
        <span className={styles.breadcrumbLink}>My Pages</span>
        <ChevronRight size={14} className={styles.breadcrumbSep} />
        <span className={styles.breadcrumbCurrent}>{activeBoardName}</span>
      </div>

      <div className={styles.actions} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button 
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className={styles.profileBtn}
            style={{ background: 'transparent', border: 'none', color: '#a1a1aa', position: 'relative' }}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <div style={{ position: 'absolute', top: -2, right: -2, width: 14, height: 14, background: '#ef4444', color: 'white', fontSize: 9, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </div>
            )}
          </button>
          
          {isNotifOpen && (
            <div className={styles.dropdown} style={{ width: 320, right: 0, padding: 0 }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #2a2a2e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>Notifications</span>
              </div>
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: '#71717a', fontSize: 13 }}>No notifications yet.</div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} onClick={() => !n.is_read && handleReadNotif(n.id)} style={{ padding: '12px 16px', borderBottom: '1px solid #2a2a2e', display: 'flex', gap: 12, cursor: n.is_read ? 'default' : 'pointer', background: n.is_read ? 'transparent' : 'rgba(79, 70, 229, 0.1)', transition: 'background 0.2s' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#3f3f46', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
                        {n.actor?.avatar_url ? (
                          <Image src={n.actor.avatar_url} alt="avatar" fill style={{objectFit: 'cover'}} sizes="32px"/>
                        ) : (
                          <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize: 14, color:'white'}}>
                            {n.actor?.full_name?.[0] || 'U'}
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: '#e4e4e7', lineHeight: 1.4 }}>
                          <span style={{ fontWeight: 600 }}>{n.actor?.full_name || 'Someone'}</span> {n.message}
                        </div>
                        <div style={{ fontSize: 11, color: '#71717a', marginTop: 4 }}>
                          {new Date(n.created_at).toLocaleString()}
                        </div>
                      </div>
                      {!n.is_read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4f46e5', alignSelf: 'center' }} />}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={styles.profileBtn}
          title="Profile"
        >
          {avatarUrl ? (
            <Image src={avatarUrl} alt="Avatar" fill style={{ objectFit: 'cover' }} sizes="32px" />
          ) : fullName ? (
            <span className={styles.profileInitials}>{fullName.charAt(0).toUpperCase()}</span>
          ) : (
            <User size={18} />
          )}
        </button>

        {isDropdownOpen && (
          <div className={styles.dropdown}>
            <div className={styles.dropdownHeader}>
              <div style={{ position: 'relative' }}>
                <div className={styles.dropdownAvatar} style={{ overflow: 'hidden', position: 'relative' }}>
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt="Avatar" fill style={{ objectFit: 'cover' }} sizes="40px" />
                  ) : fullName ? fullName.charAt(0).toUpperCase() : <User size={16} />}
                </div>
                <div className={styles.onlineIndicator}></div>
              </div>
              <div className={styles.dropdownUserInfo}>
                <span className={styles.dropdownName}>{fullName || 'User'}</span>
                <span className={styles.dropdownStatus}>Online</span>
              </div>
            </div>

            <div className={styles.dropdownDivider}></div>

            <div className={styles.dropdownItem} onClick={() => { setIsDropdownOpen(false); router.push('/settings'); }}>
              <Settings size={16} /> Settings
            </div>
            <div className={styles.dropdownItem} onClick={() => { setIsDropdownOpen(false); setShowThemeModal(true); }}>
              <Palette size={16} /> Themes
            </div>
            <div className={styles.dropdownDivider}></div>

            <div className={styles.dropdownItem}>
              <Trash2 size={16} /> Trash
            </div>
            <div className={styles.dropdownItem} onClick={handleLogout}>
              <LogOut size={16} /> Log out
            </div>
          </div>
        )}
        </div>
      </div>
      
      {showThemeModal && <ThemeModal onClose={() => setShowThemeModal(false)} />}
    </header>
  );
}
