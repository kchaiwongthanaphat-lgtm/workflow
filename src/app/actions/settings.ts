'use server';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateProfile(fullName: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', user.id);
    
  if (error) {
    console.error('Error updating profile:', error);
    return { error: error.message };
  }
  
  revalidatePath('/settings');
  revalidatePath('/');
  return { success: true };
}

export async function updateWorkspace(workspaceId: string, name: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('workspaces')
    .update({ name })
    .eq('id', workspaceId);
    
  if (error) {
    console.error('Error updating workspace:', error);
    return { error: error.message };
  }

  revalidatePath('/settings');
  revalidatePath('/');
  return { success: true };
}
