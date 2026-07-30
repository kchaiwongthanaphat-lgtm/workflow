export type Id = string;

export interface Task {
  id: string;
  list_id: string;
  title: string;
  description: string | null;
  position: number;
  priority: string | null;
  start_date: string | null;
  due_date: string | null;
  time_estimate: number | null; // in minutes
  created_at: string;
  cover_image?: string | null;
  task_assignees?: any[];
  task_tags?: any[];
  subtasks?: any[];
}

export interface Tag {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface TaskTag {
  id: string;
  task_id: string;
  tag_id: string;
  created_at: string;
}

export interface TaskAssignee {
  id: string;
  task_id: string;
  user_id: string;
  created_at: string;
}

export interface Attachment {
  id: string;
  task_id: string;
  file_name: string;
  file_type: string;
  drive_file_id: string;
  drive_web_view_link: string;
  created_at: string;
}

export type Column = {
  id: string;
  board_id: string;
  name: string;
  position: number;
  color?: string | null;
};

export interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string | null;
  message: string;
  link_url: string | null;
  is_read: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, any>;
  created_at: string;
}
