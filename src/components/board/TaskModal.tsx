'use client';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Calendar, User, Flag, Clock, Maximize2, 
  FileText, CheckSquare, Link as LinkIcon, Paperclip, 
  ChevronRight, Play, MoreHorizontal, MessageSquare,
  Search, Bell, Settings, Share, PanelRightClose,
  Bold, Italic, Strikethrough, Link2, List, Heading,
  Trash2, Image as ImageIcon, Underline, Minus, Plus
} from 'lucide-react';
import styles from './TaskModal.module.css';
import { Column, Task, Tag } from '@/types/kanban';
import { 
  getTaskAssignees, assignUserToTask, unassignUserFromTask, getTaskTags, addTagToTask, removeTagFromTask, createTag, getAttachments, createAttachment, getComments, addComment, updateTask, deleteAttachment, getProfiles, getWorkspaceTags, moveTask,
  getSubtasks, addSubtask, toggleSubtask, deleteSubtask
} from '@/app/actions/kanban';
import { uploadFileToDrive } from '@/app/actions/drive';
import { RichTextEditor } from './RichTextEditor';
import Image from 'next/image';

interface CommentType {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  activity_type?: string;
  profiles: {
    full_name: string;
    avatar_url?: string;
  } | null;
}

const getLocalDatetime = (dateString?: string | null) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

interface TaskModalProps {
  task: Task;
  columns: Column[];
  onClose: () => void;
  onUpdate: (updatedTask: Task) => void;
}

export default function TaskModal({ task, columns, onClose, onUpdate }: TaskModalProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  
  const [comments, setComments] = useState<CommentType[]>([]);
  const [newComment, setNewComment] = useState('');

  const [isAssigneeOpen, setIsAssigneeOpen] = useState(false);
  const [isTagOpen, setIsTagOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  const [profiles, setProfiles] = useState<any[]>([]);
  const [assignees, setAssignees] = useState<any[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [taskTags, setTaskTags] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadComments = () => {
    let mounted = true;
    getComments(task.id).then(data => {
      if (mounted) setComments(data as any);
    });
    return () => { mounted = false; };
  };

  useEffect(() => {
    return loadComments();
  }, [task.id]);

  const refreshComments = () => {
    getComments(task.id).then(data => setComments(data as any));
  };

  // Fetch initial data
  useEffect(() => {
    async function loadData() {
      const [profilesData, assigneesData, tagsData, attachmentsData, workspaceTagsData, subtasksData] = await Promise.all([
        getProfiles(),
        getTaskAssignees(task.id),
        getTaskTags(task.id),
        getAttachments(task.id),
        getWorkspaceTags(),
        getSubtasks(task.id)
      ]);
      setProfiles(profilesData);
      setAssignees(assigneesData);
      setTaskTags(tagsData);
      setAttachments(attachmentsData);
      setAvailableTags(workspaceTagsData);
      setSubtasks(subtasksData);
    }
    loadData();
  }, [task.id]);

  const toggleAssignee = async (userId: string) => {
    const isAssigned = assignees.find(a => a.user_id === userId);
    if (isAssigned) {
      const success = await unassignUserFromTask(task.id, userId);
      if (success) {
        setAssignees(prev => prev.filter(a => a.user_id !== userId));
        refreshComments();
      }
    } else {
      const success = await assignUserToTask(task.id, userId);
      if (success) {
        const userProfile = profiles.find(p => p.id === userId);
        setAssignees(prev => [...prev, { user_id: userId, profiles: userProfile }]);
        refreshComments();
      }
    }
  };

  const toggleTag = async (tag: Tag) => {
    const isTagged = taskTags.find(t => t.tag_id === tag.id);
    if (isTagged) {
      await removeTagFromTask(task.id, tag.id, tag.name);
      setTaskTags(prev => prev.filter(t => t.tag_id !== tag.id));
      refreshComments();
    } else {
      await addTagToTask(task.id, tag.id, tag.name);
      setTaskTags(prev => [...prev, { tag_id: tag.id, tags: tag }]);
      refreshComments();
    }
  };

  const handleAddTag = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTagName.trim()) {
      const name = newTagName.trim();
      const colors = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#84cc16'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      const newTag = await createTag(name, color);
      if (newTag) {
        await addTagToTask(task.id, newTag.id, newTag.name);
        setTaskTags(prev => [...prev, { tag_id: newTag.id, tags: newTag }]);
        setAvailableTags(prev => [...prev, newTag]);
        refreshComments();
      }
      setNewTagName('');
    }
  };

  const handleRemoveTag = async (tagId: string, tagName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await removeTagFromTask(task.id, tagId, tagName);
    setTaskTags(prev => prev.filter(t => t.tag_id !== tagId));
    refreshComments();
  };

  const handleAddSubtask = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newSubtaskTitle.trim()) {
      const title = newSubtaskTitle.trim();
      setNewSubtaskTitle(''); // Clear input instantly
      
      // Temporary optimistic item so the UI feels instant
      const tempId = 'temp-' + Date.now();
      const tempSubtask = { id: tempId, title, is_completed: false, task_id: task.id };
      setSubtasks(prev => [...prev, tempSubtask]);

      const res = await addSubtask(task.id, title);
      if (res.success && res.data) {
        // Replace temp subtask with the real one from DB
        setSubtasks(prev => prev.map(s => s.id === tempId ? res.data : s));
        refreshComments();
      } else if (res.error) {
        // Remove temp item if failed
        setSubtasks(prev => prev.filter(s => s.id !== tempId));
        alert('Failed to add subtask: ' + res.error);
      }
    }
  };

  const handleToggleSubtask = async (subtaskId: string, isCompleted: boolean, title: string) => {
    // Optimistic UI update for instant feedback
    setSubtasks(prev => prev.map(s => s.id === subtaskId ? { ...s, is_completed: isCompleted } : s));
    
    // Background network request
    await toggleSubtask(task.id, subtaskId, isCompleted, title);
    refreshComments();
  };

  const handleDeleteSubtask = async (subtaskId: string, title: string) => {
    // Optimistic UI update for instant feedback
    setSubtasks(prev => prev.filter(s => s.id !== subtaskId));
    
    // Background network request
    await deleteSubtask(task.id, subtaskId, title);
    refreshComments();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setIsUploading(true);
    
    const formData = new FormData();
    formData.append('file', file);
    
    const result = await uploadFileToDrive(formData);
    
    if (result.success && result.fileId) {
      const newAttachment = await createAttachment(
        task.id, 
        file.name, 
        file.type, 
        result.fileId, 
        result.webViewLink || ''
      );
      if (newAttachment) {
        setAttachments(prev => [...prev, newAttachment]);
        refreshComments();
      }
    } else {
      alert('Upload failed: ' + result.error);
    }
    setIsUploading(false);
  };

  // Handle outside click
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleSaveDescription = async () => {
    if (description !== task.description) {
      await updateTask(task.id, { description });
      onUpdate({ ...task, description });
      refreshComments();
    }
  };

  const handleTitleChange = async (e: React.FocusEvent<HTMLInputElement>) => {
    const newTitle = e.target.value.trim();
    if (newTitle && newTitle !== task.title) {
      await updateTask(task.id, { title: newTitle });
      onUpdate({ ...task, title: newTitle });
      refreshComments();
    } else {
      setTitle(task.title); 
    }
  };

  const handleSetCover = async (e: React.MouseEvent, driveFileId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const newCover = task.cover_image === driveFileId ? null : driveFileId;
    await updateTask(task.id, { cover_image: newCover });
    onUpdate({ ...task, cover_image: newCover });
  };

  const handleDeleteAttachment = async (e: React.MouseEvent, attachmentId: string, driveFileId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this attachment?')) {
      const success = await deleteAttachment(attachmentId);
      if (success) {
        setAttachments(attachments.filter(a => a.id !== attachmentId));
        refreshComments();
        if (task.cover_image === driveFileId) {
          await updateTask(task.id, { cover_image: null });
          onUpdate({ ...task, cover_image: null });
        }
      }
    }
  };

  const currentColumn = columns.find(c => c.id === task.list_id) || columns[0];

  const handleStatusChange = async (newColumnId: string) => {
    if (newColumnId === task.list_id) return;
    await moveTask(task.id, newColumnId, task.position);
    onUpdate({ ...task, list_id: newColumnId });
    refreshComments();
    setIsStatusOpen(false);
  };

  const handlePriorityChange = async (newPriority: string) => {
    await updateTask(task.id, { priority: newPriority });
    onUpdate({ ...task, priority: newPriority });
    refreshComments();
    setIsPriorityOpen(false);
  };

  const handleDateChange = async (type: 'start_date' | 'due_date', value: string) => {
    await updateTask(task.id, { [type]: value || null });
    onUpdate({ ...task, [type]: value || null });
    refreshComments();
  };

  const handleAddComment = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newComment.trim()) {
      const res = await addComment(task.id, newComment.trim());
      if (res.success && res.comment) {
        setComments(prev => [...prev, res.comment as any]);
        setNewComment('');
      }
    }
  };

  const modalContent = (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        
        {/* Left Panel */}
        <div className={styles.mainPanel}>
          {task.cover_image && (
            <div className={styles.coverImage}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={`https://drive.google.com/thumbnail?id=${task.cover_image}&sz=w1200-h400`} 
                alt="Cover" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            </div>
          )}
          <div className={styles.header}>
            <div className={styles.breadcrumb}>
              <span style={{ color: '#4f46e5', fontWeight: 600 }}>■</span> Team Space
              <ChevronRight size={14} className={styles.breadcrumbIcon} />
              <span className={styles.breadcrumbIcon}>Project 1</span>
              <span style={{ marginLeft: '12px', color: '#52525b' }}>+</span>
              <span style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
                 <span style={{color: '#71717a'}}>Created {new Date(task.created_at).toLocaleDateString()}</span>
              </span>
            </div>

            <div className={styles.titleWrapper}>
              <button style={{background: 'transparent', border: '1px solid #3f3f46', color: '#a1a1aa', padding: '4px 8px', borderRadius: 4, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4}}>
                <CheckSquare size={12}/> Task
              </button>
            </div>

            <input 
              type="text" 
              className={styles.title}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleChange}
              placeholder="Task Name"
            />
          </div>

          <div className={styles.properties}>
            {/* Status */}
            <div className={styles.propRow}>
              <span className={styles.propLabel}><CheckSquare size={14} /> Status</span>
              <div style={{ position: 'relative' }}>
                <span className={styles.statusValue} onClick={() => setIsStatusOpen(!isStatusOpen)} style={{ cursor: 'pointer' }}>
                  {currentColumn?.name || 'UNKNOWN'}
                </span>
                {isStatusOpen && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: '#18181b', border: '1px solid #2a2a2e', borderRadius: 6, padding: 4, zIndex: 10, width: 150 }}>
                    {columns.map(col => (
                      <div key={col.id} onClick={() => handleStatusChange(col.id)} style={{ padding: '6px 12px', fontSize: 12, color: '#e4e4e7', cursor: 'pointer', borderRadius: 4 }}>
                        {col.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Assignees */}
            <div className={styles.propRow}>
              <span className={styles.propLabel}><User size={14} /> Assignees</span>
              <div style={{ position: 'relative' }}>
                <div className={styles.propValue} onClick={() => setIsAssigneeOpen(!isAssigneeOpen)}>
                  {assignees.length === 0 ? (
                    <span style={{ color: '#52525b' }}>Empty</span>
                  ) : (
                    <div style={{ display: 'flex', gap: 4 }}>
                      {assignees.map(a => {
                        const profile = a.profiles || a;
                        return (
                          <div key={a.user_id} title={profile?.full_name} style={{width: 20, height: 20, borderRadius: '50%', background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'white', overflow: 'hidden', position: 'relative'}}>
                            {profile?.avatar_url ? (
                              <Image src={profile.avatar_url} alt="Avatar" fill style={{ objectFit: 'cover' }} sizes="20px" />
                            ) : (
                              profile?.full_name?.charAt(0) || 'U'
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {isAssigneeOpen && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: '#18181b', border: '1px solid #2a2a2e', borderRadius: 6, padding: 8, zIndex: 10, width: 200, maxHeight: 200, overflowY: 'auto' }}>
                    {profiles.map(p => {
                      const isAssigned = assignees.find(a => a.user_id === p.id);
                      return (
                        <div key={p.id} onClick={() => toggleAssignee(p.id)} style={{ padding: '6px 8px', fontSize: 12, color: '#e4e4e7', cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 8, background: isAssigned ? '#27272a' : 'transparent' }}>
                          <div style={{width: 16, height: 16, borderRadius: '50%', background: '#3f3f46', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: 'white', overflow: 'hidden', position: 'relative'}}>
                            {p.avatar_url ? (
                              <Image src={p.avatar_url} alt="Avatar" fill style={{ objectFit: 'cover' }} sizes="16px" />
                            ) : (
                              p.full_name?.charAt(0) || 'U'
                            )}
                          </div>
                          {p.full_name || p.email}
                          {isAssigned && <CheckSquare size={12} style={{marginLeft: 'auto', color: '#4f46e5'}}/>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            <div className={styles.propRow}>
              <span className={styles.propLabel}><Flag size={14} /> Tags</span>
              <div style={{ position: 'relative' }}>
                <div className={styles.propValue} onClick={() => setIsTagOpen(!isTagOpen)}>
                  {taskTags.length === 0 ? (
                    <span style={{ color: '#52525b' }}>Empty</span>
                  ) : (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {taskTags.map((t: any) => (
                        <span key={t.tag_id} style={{ background: t.tags?.color + '20', color: t.tags?.color, padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                          {t.tags?.name}
                          <X size={10} style={{cursor: 'pointer'}} onClick={(e) => handleRemoveTag(t.tag_id, t.tags?.name, e)} />
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {isTagOpen && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: '#18181b', border: '1px solid #2a2a2e', borderRadius: 6, padding: 8, zIndex: 10, width: 200 }}>
                    <input 
                      type="text" 
                      placeholder="Type & press Enter to create"
                      value={newTagName}
                      onChange={e => setNewTagName(e.target.value)}
                      onKeyDown={handleAddTag}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: 4, background: '#27272a', border: '1px solid #3f3f46', color: '#fff', fontSize: 12, marginBottom: 8 }}
                      autoFocus
                    />
                    <div style={{ maxHeight: 150, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {availableTags.map(tag => {
                        const isTagged = taskTags.find(t => t.tag_id === tag.id);
                        return (
                          <div 
                            key={tag.id} 
                            onClick={() => toggleTag(tag)}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', cursor: 'pointer', borderRadius: 4, background: isTagged ? '#27272a' : 'transparent' }}
                          >
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: tag.color }} />
                            <span style={{ fontSize: 12, color: '#e4e4e7', flex: 1 }}>{tag.name}</span>
                            {isTagged && <CheckSquare size={12} style={{ color: '#4f46e5' }} />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Due Date */}
            <div className={styles.propRow}>
              <span className={styles.propLabel}><Calendar size={14} /> Due Date</span>
              <div className={styles.propValue} style={{ padding: 0 }}>
                <input 
                  type="datetime-local" 
                  value={getLocalDatetime(task.due_date)} 
                  onChange={(e) => {
                    const val = e.target.value ? new Date(e.target.value).toISOString() : '';
                    handleDateChange('due_date', val);
                  }}
                  className={styles.dateInput}
                />
              </div>
            </div>

            {/* Priority */}
            <div className={styles.propRow}>
              <span className={styles.propLabel}><Flag size={14} /> Priority</span>
              <div style={{ position: 'relative' }}>
                <div className={styles.propValue} onClick={() => setIsPriorityOpen(!isPriorityOpen)} style={{ cursor: 'pointer' }}>
                  <Flag size={14} color={task.priority === 'Urgent' ? '#ef4444' : task.priority === 'High' ? '#f59e0b' : task.priority === 'Normal' ? '#3b82f6' : '#a1a1aa'} fill="currentColor" /> 
                  {task.priority || 'Normal'}
                </div>
                {isPriorityOpen && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: '#18181b', border: '1px solid #2a2a2e', borderRadius: 6, padding: 4, zIndex: 10, width: 120 }}>
                    {['Urgent', 'High', 'Normal', 'Low'].map(p => (
                      <div key={p} onClick={() => handlePriorityChange(p)} style={{ padding: '6px 12px', fontSize: 12, color: '#e4e4e7', cursor: 'pointer', borderRadius: 4, display: 'flex', gap: 8, alignItems: 'center' }}>
                         <Flag size={12} color={p === 'Urgent' ? '#ef4444' : p === 'High' ? '#f59e0b' : p === 'Normal' ? '#3b82f6' : '#a1a1aa'} fill="currentColor" /> {p}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>


          </div>

          <div className={styles.content}>
            <RichTextEditor 
              content={description}
              onChange={setDescription}
              onBlur={handleSaveDescription}
            />

            {/* Subtasks / Checklist */}
            <div style={{ marginTop: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 14, color: '#e4e4e7', fontWeight: 500 }}>
                <CheckSquare size={16} color="#71717a" /> Checklist
                {subtasks.length > 0 && (
                  <span style={{color: '#52525b', fontSize: 12, marginLeft: 'auto'}}>
                    {Math.round((subtasks.filter(s => s.is_completed).length / subtasks.length) * 100)}%
                  </span>
                )}
              </div>
              
              {subtasks.length > 0 && (
                <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, marginBottom: 20, overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)' }}>
                  <div style={{ 
                    height: '100%', 
                    background: 'linear-gradient(90deg, #4f46e5, #818cf8)', 
                    boxShadow: '0 0 10px rgba(99, 102, 241, 0.5)',
                    width: `${(subtasks.filter(s => s.is_completed).length / subtasks.length) * 100}%`,
                    transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                  }} />
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {subtasks.map(sub => (
                  <div key={sub.id} className={styles.subtaskItem}>
                    <input 
                      type="checkbox" 
                      className={styles.subtaskCheckbox}
                      checked={sub.is_completed}
                      onChange={(e) => handleToggleSubtask(sub.id, e.target.checked, sub.title)}
                    />
                    <span style={{ flex: 1, fontSize: 14, color: sub.is_completed ? 'var(--text-tertiary)' : 'var(--text-primary)', textDecoration: sub.is_completed ? 'line-through' : 'none', transition: 'all 0.2s ease' }}>
                      {sub.title}
                    </span>
                    <button 
                      className={styles.subtaskDeleteBtn}
                      onClick={() => handleDeleteSubtask(sub.id, sub.title)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                
                <div className={styles.subtaskInputWrapper}>
                  <Plus size={18} color="var(--text-tertiary)" />
                  <input 
                    type="text" 
                    placeholder="Add a new checklist item..."
                    value={newSubtaskTitle}
                    onChange={e => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={handleAddSubtask}
                    style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}
                  />
                </div>
              </div>
            </div>

            <div className={styles.attachmentsSection} style={{ marginTop: 32, padding: '16px 0', borderTop: '1px solid #2a2a2e' }}>
               <div className={styles.attachmentsHeader} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 14, color: '#e4e4e7', fontWeight: 500 }}>
                  <Paperclip size={16} color="#71717a" /> Attachments <span style={{color: '#52525b', fontSize: 12}}>{attachments.length}</span>
               </div>
               
               {attachments.length > 0 && (
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 16, marginBottom: 24 }}>
                   {attachments.map(att => {
                     const isImage = att.file_type?.startsWith('image/');
                     return (
                       <a key={att.id} href={att.drive_web_view_link} target="_blank" rel="noreferrer" 
                         className={styles.attachmentCard}
                         style={{ 
                           display: 'flex', 
                           flexDirection: 'column',
                           background: '#18181b', 
                           borderRadius: 8, 
                           border: '1px solid #2a2a2e', 
                           color: '#e4e4e7', 
                           textDecoration: 'none', 
                           fontSize: 12,
                           overflow: 'hidden',
                           position: 'relative'
                         }}
                       >
                         {/* Hover Actions */}
                         <div className={styles.attachmentActions}>
                            {isImage && (
                              <button 
                                className={styles.attActionBtn} 
                                title="Set as Cover"
                                onClick={(e) => handleSetCover(e, att.drive_file_id)}
                              >
                                <ImageIcon size={14} color={task.cover_image === att.drive_file_id ? '#4f46e5' : '#e4e4e7'} />
                              </button>
                            )}
                            <button 
                              className={styles.attActionBtn} 
                              title="Delete"
                              onClick={(e) => handleDeleteAttachment(e, att.id, att.drive_file_id)}
                            >
                              <Trash2 size={14} color="#ef4444" />
                            </button>
                         </div>

                         {isImage ? (
                           <div style={{ width: '100%', height: 100, background: '#101012', position: 'relative' }}>
                             {/* eslint-disable-next-line @next/next/no-img-element */}
                             <img 
                               src={`https://drive.google.com/thumbnail?id=${att.drive_file_id}&sz=w400-h400`} 
                               alt={att.file_name} 
                               style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                             />
                           </div>
                         ) : (
                           <div style={{ width: '100%', height: 100, background: '#101012', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                             <FileText size={32} color="#52525b" />
                           </div>
                         )}
                         <div style={{ padding: '10px 12px', borderTop: '1px solid #2a2a2e', background: '#18181b' }}>
                           <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{att.file_name}</div>
                           <div style={{ fontSize: 10, color: '#71717a', marginTop: 2 }}>{isImage ? 'Image' : 'File'}</div>
                         </div>
                       </a>
                     );
                   })}
                 </div>
               )}

               <label className={styles.dropzone} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '24px', border: '1px dashed #3f3f46', borderRadius: 8, background: '#18181b', color: '#a1a1aa', fontSize: 12, cursor: 'pointer' }}>
                 <input type="file" style={{ display: 'none' }} onChange={handleFileUpload} disabled={isUploading} />
                 {isUploading ? (
                   <span>Uploading...</span>
                 ) : (
                   <span>Click to upload file to Google Drive</span>
                 )}
               </label>
            </div>
          </div>
        </div>

        {/* Right Panel - Activity */}
        <div className={styles.sidePanel}>
          <div className={styles.sideHeader}>
            Activity
            <button className={styles.closeBtn} onClick={onClose}>
              <X size={20} />
            </button>
          </div>
          
          <div className={styles.activityContent}>
                <div className={styles.commentsList}>
                  {comments.map((comment) => {
                    const isSystem = comment.activity_type && comment.activity_type !== 'comment';
                    let meta: any = {};
                    if (isSystem && comment.content) {
                      try {
                        meta = JSON.parse(comment.content);
                      } catch(e) {}
                    }
                    
                    if (isSystem) {
                      return (
                        <div key={comment.id} className={styles.systemLog}>
                          <div className={styles.systemLogDot} />
                          <div className={styles.systemLogContent}>
                            <span className={styles.systemLogAuthor}>{comment.profiles?.full_name || 'Someone'}</span>
                            {' '}
                            {comment.activity_type === 'move' && 'moved this task to another column.'}
                            {comment.activity_type === 'attachment' && `attached a file: ${meta.file_name || 'file'}.`}
                            {comment.activity_type === 'update_description' && 'updated the description.'}
                            {comment.activity_type === 'update_due_date' && 'changed the due date.'}
                            {comment.activity_type === 'update_priority' && `set priority to ${meta.priority}.`}
                            {comment.activity_type === 'assign_user' && 'assigned someone to this task.'}
                            {comment.activity_type === 'unassign_user' && 'removed an assignee.'}
                            <span className={styles.systemLogTime}>
                              {' '}· {new Date(comment.created_at).toLocaleDateString()} {new Date(comment.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={comment.id} className={styles.commentItem}>
                        <div className={styles.commentAvatar} style={{ position: 'relative', overflow: 'hidden' }}>
                          {comment.profiles?.avatar_url ? (
                            <Image src={comment.profiles.avatar_url} alt="Avatar" fill style={{ objectFit: 'cover' }} sizes="28px" />
                          ) : (
                            (comment.profiles?.full_name || '?')[0].toUpperCase()
                          )}
                        </div>
                        <div className={styles.commentContent}>
                          <div className={styles.commentHeader}>
                            <span className={styles.commentAuthor}>{comment.profiles?.full_name || 'Unknown User'}</span>
                            <span className={styles.commentTime}>{new Date(comment.created_at).toLocaleString()}</span>
                          </div>
                          <div className={styles.commentText}>{comment.content}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
          </div>

          <div className={styles.commentBox}>
            <div className={styles.commentInputWrapper}>
              <input 
                type="text" 
                className={styles.commentInput} 
                placeholder="Write a comment... (Press Enter)" 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={handleAddComment}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(modalContent, document.body);
}
