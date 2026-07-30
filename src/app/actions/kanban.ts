'use server';
import { createClient, createAdminClient } from '@/utils/supabase/server';
import { deleteFileFromDrive } from './drive';

export async function moveTask(taskId: string, newListId: string, newPosition: number) {
  const supabase = await createClient();
  
  const { data: currentTask } = await supabase.from('tasks').select('list_id').eq('id', taskId).single();
  
  const { error } = await supabase
    .from('tasks')
    .update({ list_id: newListId, position: newPosition })
    .eq('id', taskId);

  if (error) {
    console.error('Error moving task:', error);
    return { error: error.message };
  }
  
  if (currentTask && currentTask.list_id !== newListId) {
    await addActivityLog(taskId, 'move', { to_list_id: newListId });
  }
  
  return { success: true };
}

export async function updateTaskPositions(updates: { id: string, list_id: string, position: number }[]) {
  const supabase = await createClient();
  
  const promises = updates.map(u => 
    supabase.from('tasks').update({ list_id: u.list_id, position: u.position }).eq('id', u.id)
  );
  
  await Promise.all(promises);
  return { success: true };
}

export async function createTask(
  listId: string, 
  title: string, 
  position: number,
  priority?: string,
  startDate?: string,
  dueDate?: string
) {
  const supabase = await createClient();
  
  const insertData: any = {
    list_id: listId,
    title,
    position
  };

  if (priority) insertData.priority = priority;
  if (startDate) insertData.start_date = startDate;
  if (dueDate) insertData.due_date = dueDate;

  const { data, error } = await supabase
    .from('tasks')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error creating task:', error);
    return { error: error.message };
  }
  return { success: true, task: data };
}

export async function updateTask(taskId: string, updates: any) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId);

  if (error) {
    console.error('Error updating task:', error);
    return { error: error.message };
  }

  if (updates.description !== undefined) {
    await addActivityLog(taskId, 'update_description', {});
  }
  if (updates.due_date !== undefined) {
    await addActivityLog(taskId, 'update_due_date', { due_date: updates.due_date });
  }
  if (updates.priority !== undefined) {
    await addActivityLog(taskId, 'update_priority', { priority: updates.priority });
  }

  return { success: true };
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient();
  
  // Delete all attachments from Google Drive
  const { data: attachments } = await supabase.from('attachments').select('drive_file_id').eq('task_id', taskId);
  if (attachments && attachments.length > 0) {
    for (const attachment of attachments) {
      if (attachment.drive_file_id) {
        await deleteFileFromDrive(attachment.drive_file_id);
      }
    }
  }

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);

  if (error) {
    console.error('Error deleting task:', error);
    return { error: error.message };
  }
  return { success: true };
}

export async function getComments(taskId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('comments')
    .select(`
      id,
      content,
      created_at,
      user_id,
      activity_type,
      profiles:user_id ( full_name )
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
  return data || [];
}

export async function addComment(taskId: string, content: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('comments')
    .insert({
      task_id: taskId,
      user_id: user.id,
      content
    })
    .select(`
      id,
      content,
      created_at,
      user_id,
      activity_type,
      profiles:user_id ( full_name )
    `)
    .single();

  if (error) {
    console.error('Error adding comment:', error);
    return { error: error.message };
  }
  return { success: true, comment: data };
}

export async function addActivityLog(taskId: string, activityType: string, metadata: any = {}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('comments')
    .insert({
      task_id: taskId,
      user_id: user.id,
      content: JSON.stringify(metadata),
      activity_type: activityType
    });

  if (error) {
    console.error('Error adding activity log:', error);
    return { error: error.message };
  }
  return { success: true };
}

export async function getProfiles() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('profiles').select('*');
  return data || [];
}

export async function getTaskAssignees(taskId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('task_assignees')
    .select('*, profiles:user_id(full_name)')
    .eq('task_id', taskId);
  return data || [];
}

export async function assignUserToTask(taskId: string, userId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('task_assignees').insert({ task_id: taskId, user_id: userId });
  if (!error) {
    await addActivityLog(taskId, 'assign_user', { assigned_user_id: userId });
    
    const { data: task } = await supabase.from('tasks').select('title').eq('id', taskId).single();
    if (task) {
      await createNotification(userId, `assigned you to task "${task.title}"`);
    }
  }
  return !error;
}

export async function unassignUserFromTask(taskId: string, userId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('task_assignees').delete().match({ task_id: taskId, user_id: userId });
  if (!error) {
    await addActivityLog(taskId, 'unassign_user', { unassigned_user_id: userId });
  }
  return !error;
}

// --- NOTIFICATIONS ---

export async function createNotification(userId: string, message: string, linkUrl?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  if (userId === user.id) return { success: true }; // Don't notify self

  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      actor_id: user.id,
      message,
      link_url: linkUrl || null
    });
    
  return { success: !error };
}

export async function markNotificationAsRead(id: string) {
  const supabase = await createClient();
  await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  return { success: true };
}

export async function getNotifications() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  
  const { data } = await supabase
    .from('notifications')
    .select('*, actor:actor_id(full_name, avatar_url)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);
    
  return data || [];
}

export async function getAttachments(taskId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from('attachments').select('*').eq('task_id', taskId);
  return data || [];
}

export async function createAttachment(taskId: string, fileName: string, fileType: string, driveFileId: string, driveWebViewLink: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from('attachments').insert({
    task_id: taskId,
    file_name: fileName,
    file_type: fileType,
    drive_file_id: driveFileId,
    drive_web_view_link: driveWebViewLink
  }).select().single();
  
  if (error) {
    console.error('Error saving attachment:', error);
    return null;
  }
  
  await addActivityLog(taskId, 'attachment', { file_name: fileName });
  
  return data;
}

export async function deleteAttachment(id: string) {
  const supabase = await createClient();
  
  const { data: attachment } = await supabase.from('attachments').select('drive_file_id').eq('id', id).single();
  
  if (attachment?.drive_file_id) {
    await deleteFileFromDrive(attachment.drive_file_id);
  }

  const { error } = await supabase.from('attachments').delete().eq('id', id);
  return !error;
}

export async function updateColumn(columnId: string, name: string, color: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('lists').update({ name, color }).eq('id', columnId);
  if (error) {
    console.error('Error updating column:', error);
    return { error: error.message };
  }
  return { success: true };
}

export async function deleteColumn(columnId: string) {
  const supabase = await createClient();
  
  const { data: tasks } = await supabase.from('tasks').select('id').eq('list_id', columnId);
  if (tasks && tasks.length > 0) {
    for (const task of tasks) {
      await deleteTask(task.id);
    }
  }
  
  const { error } = await supabase.from('lists').delete().eq('id', columnId);
  if (error) {
    console.error('Error deleting column:', error);
    return { error: error.message };
  }
  return { success: true };
}

export async function createColumn(boardId: string, name: string, position: number, color?: string) {
  const supabase = await createClient();
  const insertData: any = {
    board_id: boardId,
    name,
    position
  };
  if (color) insertData.color = color;

  const { data, error } = await supabase.from('lists').insert(insertData).select().single();
  if (error) {
    console.error('Error creating column:', error);
    return { error: error.message };
  }
  return { success: true, column: data };
}

export async function updateColumnPositions(updates: { id: string, position: number }[]) {
  const supabase = await createClient();
  // Supabase doesn't have a built-in bulk update, so we do it one by one for now
  // For production, a Postgres function or upsert would be better.
  const promises = updates.map(u => 
    supabase.from('lists').update({ position: u.position }).eq('id', u.id)
  );
  
  await Promise.all(promises);
  return { success: true };
}

// --- TAGS ---

export async function getWorkspaceTags() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('tags').select('*').order('name');
  if (error) { console.error('get tags err:', error); return []; }
  return data || [];
}

export async function getTaskTags(taskId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('task_tags')
    .select(`
      tag_id,
      tags (*)
    `)
    .eq('task_id', taskId);
  if (error) { console.error('get task tags err:', error); return []; }
  return data ? data.map((d: any) => d.tags) : [];
}

export async function createTag(name: string, color: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tags')
    .insert({ name, color })
    .select()
    .single();
  if (error) { console.error('create tag err:', error); return null; }
  return data;
}

export async function addTagToTask(taskId: string, tagId: string, tagName?: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('task_tags')
    .insert({ task_id: taskId, tag_id: tagId });
  if (!error && tagName) {
    await addActivityLog(taskId, 'add_tag', { tag_name: tagName });
  }
  return { success: !error };
}

export async function removeTagFromTask(taskId: string, tagId: string, tagName?: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('task_tags')
    .delete()
    .match({ task_id: taskId, tag_id: tagId });
  if (!error && tagName) {
    await addActivityLog(taskId, 'remove_tag', { tag_name: tagName });
  }
  return { success: !error };
}

// --- SUBTASKS ---

export async function getSubtasks(taskId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('subtasks')
    .select('*')
    .eq('task_id', taskId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) { console.error('get subtasks err:', error); return []; }
  return data || [];
}

export async function addSubtask(taskId: string, title: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from('subtasks')
    .insert({ task_id: taskId, title })
    .select()
    .single();
  
  if (error) {
    console.error('Error adding subtask:', error);
    return { error: error.message };
  } else {
    await addActivityLog(taskId, 'add_subtask', { subtask_title: title });
  }
  return { success: true, data };
}

export async function toggleSubtask(taskId: string, subtaskId: string, isCompleted: boolean, title?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from('subtasks')
    .update({ is_completed: isCompleted })
    .eq('id', subtaskId);
    
  if (!error && title) {
    await addActivityLog(taskId, isCompleted ? 'complete_subtask' : 'uncomplete_subtask', { subtask_title: title });
  }
  return { success: !error };
}

export async function deleteSubtask(taskId: string, subtaskId: string, title?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from('subtasks')
    .delete()
    .eq('id', subtaskId);
    
  if (!error && title) {
    await addActivityLog(taskId, 'delete_subtask', { subtask_title: title });
  }
  return { success: !error };
}
