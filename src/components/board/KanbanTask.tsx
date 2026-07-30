'use client';
import React, { useState, useRef, useEffect, memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/types/kanban';
import styles from './Kanban.module.css';
import { MoreHorizontal, Edit2, Trash2, Calendar, Flag } from 'lucide-react';
import { deleteTask } from '@/app/actions/kanban';
import Image from 'next/image';

interface Props {
  task: Task;
  onTaskClick?: (task: Task) => void;
}

const stripHtml = (html?: string | null) => {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '').trim();
};

const KanbanTask = memo(function KanbanTask({ task, onTaskClick }: Props) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const assignees = task.task_assignees || [];
  const tags = task.task_tags || [];

  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: {
      type: 'Task',
      task,
    },
  });


  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    if (confirm('Are you sure you want to delete this task?')) {
      setIsDeleting(true);
      await deleteTask(task.id);
      setIsDeleting(false);
    }
  };

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
    opacity: isDeleting ? 0.5 : 1,
    zIndex: isDragging ? 1000 : (isMenuOpen ? 99 : 1),
    position: (isDragging || isMenuOpen) ? 'relative' as const : 'static' as const,
  };

  const priorityColors: Record<string, string> = {
    Urgent: '#ef4444',
    High: '#f97316',
    Medium: '#eab308',
    Low: '#3b82f6',
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (isDragging) {
    return (
      <div 
        ref={setNodeRef}
        style={style}
        className={`${styles.taskCard} ${styles.taskDragActive}`} 
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={styles.taskCard}
      onClick={() => {
        if (onTaskClick) onTaskClick(task);
      }}
    >
      {task.cover_image && (
        <div 
          className={styles.taskCover} 
          style={{ backgroundImage: `url(https://drive.google.com/thumbnail?id=${task.cover_image}&sz=w400-h200)` }} 
        />
      )}
      <div className={styles.taskHeader}>
        <div className={styles.taskTitle}>{task.title}</div>
        
        <div 
          className={styles.taskMenuContainer} 
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div 
            className={styles.taskMenuButton} 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <MoreHorizontal size={16} />
          </div>
          
          {isMenuOpen && (
            <div className={styles.taskDropdown}>
              <div 
                className={styles.taskDropdownItem} 
                onClick={(e) => { 
                  e.stopPropagation();
                  setIsMenuOpen(false); 
                  if(onTaskClick) onTaskClick(task); 
                }}
              >
                <Edit2 size={14} /> Edit
              </div>
              <div 
                className={`${styles.taskDropdownItem} ${styles.delete}`} 
                onClick={handleDelete}
              >
                <Trash2 size={14} /> Delete
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Tags */}
      {tags.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', padding: '0 12px', marginBottom: '8px' }}>
          {tags.map((t: any) => {
            // Note: tags come mapped with { tag_id, tags: {name, color} } from the join
            const tagData = t.tags || t; 
            return (
              <span key={t.id || t.tag_id} style={{ background: tagData.color + '20', color: tagData.color, padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>
                {tagData.name}
              </span>
            );
          })}
        </div>
      )}
      
      {/* Description if exists */}
      {stripHtml(task.description) && (
        <div className={styles.taskDesc}>{stripHtml(task.description)}</div>
      )}

      {/* Footer with Meta */}
      {(task.due_date || task.priority || assignees.length > 0) && (
        <div className={styles.taskFooter}>
          <div className={styles.taskMeta}>
            {task.due_date && (
              <div className={styles.metaItem} title="Due Date">
                <Calendar size={12} />
                <span>{formatDate(task.due_date)}</span>
              </div>
            )}
            {task.priority && (
              <div className={styles.metaItem} title="Priority" style={{ color: priorityColors[task.priority] || 'inherit' }}>
                <Flag size={12} />
                <span>{task.priority}</span>
              </div>
            )}
          </div>
          
          {assignees.length > 0 && (
            <div className={styles.avatars}>
              {assignees.map((a: any) => {
                const profile = a.profiles || a;
                return (
                  <div 
                    key={a.id || a.user_id} 
                    className={styles.miniAvatar} 
                    title={profile?.full_name || 'User'}
                    style={{ 
                      backgroundColor: '#e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      color: '#475569',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      overflow: 'hidden',
                      position: 'relative'
                    }}
                  >
                    {profile?.avatar_url ? (
                      <Image 
                        src={profile.avatar_url} 
                        alt="Avatar" 
                        fill 
                        style={{ objectFit: 'cover' }} 
                      />
                    ) : (
                      (profile?.full_name || '?').substring(0, 2)
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default KanbanTask;
