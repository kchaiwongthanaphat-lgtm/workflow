import AppLayout from '@/components/layout/AppLayout';
import SettingsClient from './SettingsClient';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    redirect('/login');
  }

  const userEmail = data.user.email || '';

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', data.user.id)
    .single();

  const { data: workspaces } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', data.user.id);

  let workspaceName = 'My Workspace';
  let defaultWorkspaceId = '';
  let allBoards: { id: string; name: string }[] = [];

  if (workspaces && workspaces.length > 0) {
    defaultWorkspaceId = workspaces[0].workspace_id;
    const { data: wsData } = await supabase
      .from('workspaces')
      .select('name')
      .eq('id', defaultWorkspaceId)
      .single();
    if (wsData) workspaceName = wsData.name;

    const { data: boardsList } = await supabase
      .from('boards')
      .select('id, name')
      .eq('workspace_id', defaultWorkspaceId)
      .order('created_at');
    
    if (boardsList) allBoards = boardsList;
  }

  return (
    <AppLayout 
      userEmail={userEmail}
      workspaceName={workspaceName}
      boards={allBoards}
      activeBoardName="Settings"
    >
      <SettingsClient 
        userEmail={userEmail}
        initialName={profile?.full_name || ''}
        initialAvatarUrl={profile?.avatar_url || null}
        workspaceId={defaultWorkspaceId}
        initialWorkspaceName={workspaceName}
      />
    </AppLayout>
  );
}
