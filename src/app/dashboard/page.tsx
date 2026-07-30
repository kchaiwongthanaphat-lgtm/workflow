import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import DashboardClient from './DashboardClient';
import styles from './Dashboard.module.css';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  // Fetch workspaces where user is a member
  const { data: workspacesData } = await supabase
    .from('workspace_members')
    .select('workspace_id, workspaces(name)')
    .eq('user_id', user.id);

  if (!workspacesData || workspacesData.length === 0) {
    return (
      <div className={styles.container}>
        <h1>Welcome to Velo</h1>
        <p>Please create or join a workspace first.</p>
      </div>
    );
  }

  const cookieStore = await cookies();
  const activeWorkspaceIdCookie = cookieStore.get('activeWorkspaceId')?.value;
  
  const matchedWorkspaceData = activeWorkspaceIdCookie
    ? workspacesData.find(w => w.workspace_id === activeWorkspaceIdCookie)
    : null;

  const activeData = matchedWorkspaceData || workspacesData[0];
  const activeWorkspace = activeData.workspaces as any;
  const activeWorkspaceId = activeData.workspace_id;

  // Fetch all boards in workspace
  const { data: boards } = await supabase
    .from('boards')
    .select('*')
    .eq('workspace_id', activeWorkspaceId);

  return (
    <div className={styles.container}>

      
      <DashboardClient 
        userEmail={user.email!}
        workspaceId={activeWorkspaceId}
        workspaceName={activeWorkspace.name}
        boards={boards || []}
      />
    </div>
  );
}
