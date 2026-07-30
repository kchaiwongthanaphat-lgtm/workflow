'use client';
import React, { useMemo, useState, memo } from 'react';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Column, Task } from '@/types/kanban';
import KanbanTask from './KanbanTask';
import styles from './Kanban.module.css';
import { createTask } from '@/app/actions/kanban';
import { Plus, Pencil, X, GripHorizontal } from 'lucide-react';
import ColumnModal from './ColumnModal';

// Map column names to dot colors
const dotColorMap: Record<string, string> = {
  'To Do': 'var(--dot-todo)',
  'In Progress': 'var(--dot-progress)',
  'In Review': 'var(--dot-review)',
  'Done': 'var(--dot-done)',
};

interface Props {
  column: Column;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

const KanbanColumn = memo(function KanbanColumn({ column, tasks, onTaskClick }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);

  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: {
      type: 'Column',
      column,
    },
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    createTask(column.id, newTaskTitle, tasks.length + 1);
    setNewTaskTitle('');
    setIsAdding(false);
  };

  const dotColor = column.color || dotColorMap[column.name] || '#64748b';

  if (isDragging) {
    return (
      <div ref={setNodeRef} style={{...style, opacity: 0.3}} className={styles.column}></div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className={styles.column}>
      <div className={styles.columnHeader}>
        <div className={styles.columnTitleGroup}>
          <div {...attributes} {...listeners} style={{ cursor: 'grab', display: 'flex', alignItems: 'center', color: 'var(--text-tertiary)', padding: '2px', marginRight: '4px', borderRadius: '4px' }} onMouseEnter={e => e.currentTarget.style.background='var(--bg-hover)'} onMouseLeave={e => e.currentTarget.style.background='transparent'} title="Drag to reorder">
            <GripHorizontal size={14} />
          </div>
          <div className={styles.columnDot} style={{background: dotColor}} />
          <span className={styles.columnTitle}>{column.name}</span>
          <span className={styles.taskCount}>{tasks.length}</span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button className={styles.columnAddBtn} onClick={() => setIsEditModalOpen(true)} title="Edit Column">
            <Pencil size={14} />
          </button>
          <button className={styles.columnAddBtn} onClick={() => setIsAdding(true)} title="Add Task">
            <Plus size={16} />
          </button>
        </div>
      </div>
      
      <div className={styles.columnContent}>
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <KanbanTask key={task.id} task={task} onTaskClick={onTaskClick} />
          ))}
        </SortableContext>
        
        {isAdding ? (
          <form onSubmit={handleAddTask} className={styles.addTaskForm}>
            <div className={styles.addTaskHeader}>
              <input 
                type="text" 
                autoFocus
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                placeholder="Task Name..." 
                className={styles.addTaskInput}
              />
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button type="submit" className={styles.btnSave}>
                  Save ↵
                </button>
                <button type="button" onClick={() => setIsAdding(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', display: 'flex' }}>
                  <X size={16} />
                </button>
              </div>
            </div>
          </form>
        ) : (
          <button onClick={() => setIsAdding(true)} className={styles.addTaskBtn}>+ Add a card</button>
        )}
      </div>

      {isEditModalOpen && (
        <ColumnModal 
          column={column} 
          onClose={() => setIsEditModalOpen(false)} 
          onUpdate={() => {}} // Supabase Realtime handles it
        />
      )}
    </div>
  );
});

export default KanbanColumn;
