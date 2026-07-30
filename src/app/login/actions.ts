'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: 'Invalid email or password' }
  }

  const next = formData.get('next') as string;
  revalidatePath('/', 'layout')
  redirect(next || '/')
}

export async function signup(formData: FormData) {
  try {
    const supabase = await createClient()

    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const teamName = formData.get('teamName') as string;

    const adminSupabase = createAdminClient();

    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: teamName }
    })

    if (authError) {
      console.error('Signup Error Full:', authError);
      // Ensure we always return a string!
      const errorMsg = typeof authError.message === 'string' ? authError.message : JSON.stringify(authError);
      return { error: errorMsg || 'Authentication error during signup.' }
    }

    // Now that the user is created and confirmed, sign them in
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // If auto-confirm is enabled for MVP.
    if (authData.user) {
      // 1. Create Profile
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        full_name: email.split('@')[0], // dummy name
      });
      if (profileError) console.error('Profile creation error:', profileError);

      // 2. Create Workspace
      const { data: workspaceData, error: wsError } = await supabase
        .from('workspaces')
        .insert({ name: teamName || 'My Team' })
        .select()
        .single();
      
      if (wsError) console.error('Workspace creation error:', wsError);

      if (workspaceData) {
        // 3. Add to Workspace Members
        await supabase.from('workspace_members').insert({
          workspace_id: workspaceData.id,
          user_id: authData.user.id,
          role: 'admin',
        });
        
        // 4. Create default board
        const { data: boardData } = await supabase
          .from('boards')
          .insert({ workspace_id: workspaceData.id, name: 'Main Board' })
          .select()
          .single();
          
        if (boardData) {
          // Create default lists
          await supabase.from('lists').insert([
            { board_id: boardData.id, name: 'To Do', position: 1 },
            { board_id: boardData.id, name: 'In Progress', position: 2 },
            { board_id: boardData.id, name: 'Done', position: 3 }
          ]);
        }
      }
    }

  } catch (err: any) {
    // Next.js redirect() throws an error to work, we must re-throw it!
    if (err.message === 'NEXT_REDIRECT') {
      throw err;
    }
    console.error('Unhandled Signup Exception:', err);
    return { error: err.message || 'An unexpected error occurred during signup.' };
  }

  const next = formData.get('next') as string;
  revalidatePath('/', 'layout');
  redirect(next || '/');
}
