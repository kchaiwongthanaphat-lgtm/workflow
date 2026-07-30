import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ThemeProvider from '../theme/ThemeProvider';
import { PresenceProvider } from './GlobalPresence';
import styles from './AppLayout.module.css';

interface AppLayoutProps {
  children: React.ReactNode;
  userEmail?: string;
  workspaceName?: string;
  boards?: { id: string; name: string }[];
  activeBoardName?: string;
}

export default function AppLayout({ children, userEmail, workspaceName, boards, activeBoardName }: AppLayoutProps) {
  return (
    <ThemeProvider>
      <PresenceProvider>
        <div className={styles.layout}>
          <Sidebar 
            userEmail={userEmail || ''} 
            workspaceName={workspaceName || 'Workspace'} 
            boards={boards || []}
            activeBoardName={activeBoardName || ''}
          />
          <div className={styles.main}>
            <Topbar activeBoardName={activeBoardName || 'Board'} />
            <div className={styles.content}>
              {children}
            </div>
          </div>
        </div>
      </PresenceProvider>
    </ThemeProvider>
  );
}
