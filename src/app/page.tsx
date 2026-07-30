import AppLayout from '@/components/layout/AppLayout';
import BoardView from '@/components/board/BoardView';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function Home() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    redirect('/login');
  }

  const userEmail = data.user.email || '';

  // Fetch user's workspaces
  const { data: workspaces } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', data.user.id);

  let initialColumns: any[] = [];
  let initialTasks: any[] = [];
  let workspaceName = 'My Workspace';
  let boardName = 'Main Board';
  let allBoards: { id: string; name: string }[] = [];
  let ownerIds: string[] = [];

  let isProvisioned = false;

  if (!workspaces || workspaces.length === 0) {
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { error: insertProfileErr } = await supabaseAdmin.from('profiles').upsert({ 
      id: data.user.id, 
      full_name: data.user.email?.split('@')[0] 
    }, { onConflict: 'id' });
    
    if (insertProfileErr) console.error("Profile upsert error:", JSON.stringify(insertProfileErr));
    
    const { data: workspaceData, error: wsError } = await supabaseAdmin.from('workspaces').insert({ name: 'My Workspace' }).select().maybeSingle();
    
    if (workspaceData) {
      const { error: memberError } = await supabaseAdmin.from('workspace_members').insert({ workspace_id: workspaceData.id, user_id: data.user.id, role: 'owner' });
      
      if (!memberError) {
        const { data: boardData } = await supabaseAdmin.from('boards').insert({ workspace_id: workspaceData.id, name: 'Main Board' }).select().maybeSingle();
        if (boardData) {
          await supabaseAdmin.from('lists').insert([
            { board_id: boardData.id, name: 'To Do', position: 1 },
            { board_id: boardData.id, name: 'In Progress', position: 2 },
            { board_id: boardData.id, name: 'Done', position: 3 }
          ]);
        }
        isProvisioned = true;
      } else {
        console.error("Workspace member insert failed:", JSON.stringify(memberError));
      }
    } else {
      console.error("Workspace provisioning failed:", JSON.stringify(wsError));
    }

    if (isProvisioned) {
      redirect('/');
    }
  }

  if (workspaces && workspaces.length > 0) {
    const cookieStore = await cookies();
    const activeWorkspaceIdCookie = cookieStore.get('activeWorkspaceId')?.value;
    
    // Check if the cookie matches one of their workspaces
    const matchedWorkspace = activeWorkspaceIdCookie 
      ? workspaces.find(w => w.workspace_id === activeWorkspaceIdCookie)
      : null;

    const defaultWorkspaceId = matchedWorkspace 
      ? matchedWorkspace.workspace_id 
      : workspaces[0].workspace_id;

    // Fetch workspace name
    const { data: wsData } = await supabase
      .from('workspaces')
      .select('name')
      .eq('id', defaultWorkspaceId)
      .single();
    if (wsData) workspaceName = wsData.name;

    // Fetch ALL boards for sidebar
    const { data: boardsList } = await supabase
      .from('boards')
      .select('id, name')
      .eq('workspace_id', defaultWorkspaceId)
      .order('created_at');
    
    if (boardsList && boardsList.length > 0) {
      allBoards = boardsList;
      const boardId = boardsList[0].id;
      boardName = boardsList[0].name;

      // Fetch workspace owners
      const { data: owners } = await supabase
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', defaultWorkspaceId)
        .in('role', ['owner', 'admin']);
      ownerIds = owners?.map(o => o.user_id) || [];

      // Fetch lists
      const { data: lists } = await supabase
        .from('lists')
        .select('*')
        .eq('board_id', boardId)
        .order('position');

      if (lists) {
        initialColumns = lists;

        const listIds = lists.map(l => l.id);
        if (listIds.length > 0) {
          const { data: tasks } = await supabase
            .from('tasks')
            .select(`
              *,
              task_assignees(user_id, profiles(full_name, avatar_url)),
              task_tags(tag_id, tags(name, color)),
              subtasks(id, title, is_completed)
            `)
            .in('list_id', listIds)
            .order('position');
            
          if (tasks) {
            initialTasks = tasks;
          }
        }
      }
    }
  }

  return (
    <AppLayout 
      userEmail={userEmail}
      workspaceName={workspaceName}
      boards={allBoards}
      activeBoardName={boardName}
    >
      <BoardView
        currentUserId={data.user.id}
        boardName={boardName}
        initialColumns={initialColumns}
        initialTasks={initialTasks}
        workspaceOwners={ownerIds}
      />
    </AppLayout>
  );
}
