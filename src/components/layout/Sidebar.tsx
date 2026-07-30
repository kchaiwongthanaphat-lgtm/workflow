'use client';

import React from 'react';
import Link from 'next/link';
import { Settings, LogOut } from 'lucide-react';
import styles from './Sidebar.module.css';
import { createClient } from '@/utils/supabase/client';
import Image from 'next/image';

interface SidebarProps {
  userEmail: string;
  workspaceName: string;
  boards: { id: string; name: string }[];
  activeBoardName: string;
}

export default function Sidebar({ userEmail, workspaceName, boards, activeBoardName }: SidebarProps) {
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <aside className={styles.sidebar}>
      {/* App Logo */}
      <div className={styles.logoContainer}>
        <div className={styles.logoAvatar} style={{ position: 'relative' }}>
          <Image src="/logo.svg" alt="Velo Logo" fill style={{ objectFit: 'contain', filter: 'invert(1) drop-shadow(0px 2px 4px rgba(0,0,0,0.5))' }} sizes="120px" priority />
        </div>
        <div className={styles.logoInfo}>
          <span className={styles.logoEmail}>{workspaceName}</span>
        </div>
      </div>

      {/* Boards from DB */}
      <div className={styles.navSection}>
        <div className={styles.sectionLabel}>Boards</div>
        <div className={styles.navList}>
          {boards.map((board, i) => {
            const colors = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];
            const isActive = board.name === activeBoardName;
            return (
                <Link
                  key={board.id} 
                  href="/"
                  style={{ textDecoration: 'none' }}
              >
                <div 
                  className={`${styles.projectItem} ${isActive ? styles.projectItemActive : ''}`}
                >
                  <div className={styles.projectDot} style={{background: colors[i % colors.length]}} />
                  <span>{board.name}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Workspace Section */}
      <div className={styles.navSection} style={{ marginTop: '24px' }}>
        <div className={styles.sectionLabel}>Workspace</div>
        <div className={styles.navList}>
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <div className={styles.projectItem}>
              <div className={styles.projectDot} style={{background: 'var(--accent)'}} />
              <span>Dashboard</span>
            </div>
          </Link>
          <Link href="/team" style={{ textDecoration: 'none' }}>
            <div className={styles.projectItem}>
              <div className={styles.projectDot} style={{background: 'var(--dot-progress)'}} />
              <span>Team</span>
            </div>
          </Link>
        </div>
      </div>

    </aside>
  );
}
