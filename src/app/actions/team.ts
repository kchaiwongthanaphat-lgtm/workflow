'use server';
import { createClient, createAdminClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export async function getWorkspaceMembers(workspaceId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('workspace_members')
    .select(`
      user_id,
      role,
      profiles:user_id ( id, full_name, avatar_url )
    `)
    .eq('workspace_id', workspaceId);

  if (error) {
    console.error('Error fetching members:', error);
    return [];
  }
  return data || [];
}

export async function removeMember(workspaceId: string, userId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('workspace_members')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId);

  if (error) {
    return { error: error.message };
  }
  return { success: true };
}

export async function updateMemberRole(workspaceId: string, userId: string, newRole: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('workspace_members')
    .update({ role: newRole })
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId);

  if (error) {
    return { error: error.message };
  }
  return { success: true };
}

export async function createInviteLink(workspaceId: string) {
  const supabase = await createClient();
  // Generate random token
  const token = crypto.randomBytes(16).toString('hex');
  
  const { data, error } = await supabase
    .from('workspace_invites')
    .insert({
      workspace_id: workspaceId,
      token,
      created_by: (await supabase.auth.getUser()).data.user?.id
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }
  return { success: true, token: data.token };
}

export async function getInviteDetails(token: string) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: 'Missing admin key in environment.' };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('workspace_invites')
    .select(`
      id,
      token,
      workspaces:workspace_id ( id, name )
    `)
    .eq('token', token)
    .maybeSingle();

  if (error) {
    return { error: `Database Error: ${error.message}` };
  }
  if (!data) {
    return { error: `Invite not found for token: ${token}` };
  }
  return { success: true, invite: data };
}

export async function joinWorkspace(token: string) {
  const supabase = await createClient();
  const { data: userResponse } = await supabase.auth.getUser();
  if (!userResponse.user) {
    return { error: 'You must be logged in to join.' };
  }

  // Get invite details
  const { data: invite, error: inviteError } = await supabase
    .from('workspace_invites')
    .select('workspace_id')
    .eq('token', token)
    .maybeSingle();

  if (inviteError || !invite) {
    return { error: 'Invalid or expired invite.' };
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('workspace_id', invite.workspace_id)
    .eq('user_id', userResponse.user.id)
    .maybeSingle();

  if (existing) {
    return { success: true, message: 'You are already a member of this workspace.', workspaceId: invite.workspace_id };
  }

  // Add member
  const { error: insertError } = await supabase
    .from('workspace_members')
    .insert({
      workspace_id: invite.workspace_id,
      user_id: userResponse.user.id,
      role: 'member'
    });

  if (insertError) {
    return { error: insertError.message };
  }

  return { success: true, workspaceId: invite.workspace_id };
}

export async function switchWorkspaceAction(formData: FormData) {
  const workspaceId = formData.get('workspaceId') as string;
  if (workspaceId) {
    const cookieStore = await cookies();
    cookieStore.set('activeWorkspaceId', workspaceId, { path: '/' });
  }
}

export async function directInviteByEmail(workspaceId: string, email: string) {
  const supabase = await createClient();
  
  // Since we cannot easily query auth.users by email directly, we rely on the profiles table.
  // This assumes your profiles table has an 'email' column or similar.
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email.trim().toLowerCase());

  if (profileError || !profiles || profiles.length === 0) {
    return { error: 'User not found. They must sign up first before being added directly, or use an invite link.' };
  }

  const userId = profiles[0].id;

  // Check if already a member
  const { data: existing } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    return { error: 'User is already a member.' };
  }

  const { error: insertError } = await supabase
    .from('workspace_members')
    .insert({
      workspace_id: workspaceId,
      user_id: userId,
      role: 'member'
    });

  if (insertError) {
    return { error: insertError.message };
  }
  return { success: true };
}
