import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import AppLayout from '@/components/layout/AppLayout';
import TeamClient from './TeamClient';

export default async function TeamPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  // Get user's workspaces
  const { data: workspaces } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id);

  if (!workspaces || workspaces.length === 0) {
    redirect('/login');
  }

  const cookieStore = await cookies();
  const activeWorkspaceIdCookie = cookieStore.get('activeWorkspaceId')?.value;
  
  const matchedWorkspace = activeWorkspaceIdCookie
    ? workspaces.find(w => w.workspace_id === activeWorkspaceIdCookie)
    : null;

  const activeWorkspace = matchedWorkspace || workspaces[0];
  const defaultWorkspaceId = activeWorkspace.workspace_id;
  const userRole = activeWorkspace.role || 'member';

  // Get workspace name
  const { data: wsData } = await supabase
    .from('workspaces')
    .select('name')
    .eq('id', defaultWorkspaceId)
    .single();
    
  const workspaceName = wsData?.name || 'My Workspace';

  // Get boards for the sidebar
  const { data: boards } = await supabase
    .from('boards')
    .select('id, name')
    .eq('workspace_id', defaultWorkspaceId)
    .order('created_at', { ascending: true });

  return (
    <AppLayout 
      userEmail={user.email || 'User'} 
      workspaceName={workspaceName} 
      boards={boards || []} 
      activeBoardName="Team Management"
    >
      <div style={{ padding: '32px', flex: 1, overflowY: 'auto' }}>
        <TeamClient 
          workspaceId={defaultWorkspaceId} 
          currentUserRole={userRole}
          currentUserId={user.id}
        />
      </div>
    </AppLayout>
  );
}
