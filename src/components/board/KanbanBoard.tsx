'use client';
import React, { useState, useMemo, useEffect, useId } from 'react';
import { 
  DndContext, 
  DragOverlay, 
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent
} from '@dnd-kit/core';
import { SortableContext, arrayMove } from '@dnd-kit/sortable';
import { Column, Task } from '@/types/kanban';
import KanbanColumn from './KanbanColumn';
import KanbanTask from './KanbanTask';
import TaskModal from './TaskModal';
import styles from './Kanban.module.css';
import { moveTask, createColumn, updateColumnPositions, updateTaskPositions } from '@/app/actions/kanban';
import { createClient } from '@/utils/supabase/client';

interface Props {
  currentUserId?: string;
  columns: Column[];
  setColumns: React.Dispatch<React.SetStateAction<Column[]>>;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  searchQuery?: string;
  myTasksOnly?: boolean;
  priorityFilter?: string;
}

export default function KanbanBoard({ 
  currentUserId,
  columns, 
  setColumns,
  tasks, 
  setTasks,
  searchQuery = '',
  myTasksOnly = false,
  priorityFilter = ''
}: Props) {
  const [activeColumn, setActiveColumn] = useState<Column | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');

  // Stable ID to prevent hydration mismatch with DndKit
  const dndId = useId();

  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  // Real-time listener is now lifted to BoardView.tsx
  // We don't need to listen here.

  // Filter tasks by search query and filters
  const filteredTasks = useMemo(() => {
    let result = tasks;

    if (myTasksOnly && currentUserId) {
      result = result.filter(t => 
        t.task_assignees?.some((a: any) => a.user_id === currentUserId)
      );
    }

    if (priorityFilter) {
      result = result.filter(t => t.priority === priorityFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.title.toLowerCase().includes(q) || 
        (t.description && t.description.toLowerCase().includes(q))
      );
    }

    return result;
  }, [tasks, searchQuery, myTasksOnly, priorityFilter, currentUserId]);

  const columnsId = useMemo(() => columns.map((col) => col.id), [columns]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  function onDragStart(event: DragStartEvent) {
    if (event.active.data.current?.type === 'Column') {
      setActiveColumn(event.active.data.current.column);
      return;
    }
    if (event.active.data.current?.type === 'Task') {
      setActiveTask(event.active.data.current.task);
      return;
    }
  }

  async function onDragEnd(event: DragEndEvent) {
    setActiveColumn(null);
    setActiveTask(null);

    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    if (active.data.current?.type === 'Column') {
      const activeColumnIndex = columns.findIndex((col) => col.id === activeId);
      const overColumnIndex = columns.findIndex((col) => col.id === overId);
      const newColumns = arrayMove(columns, activeColumnIndex, overColumnIndex);
      
      setColumns(newColumns);
      
      // Background sync outside the updater to prevent React warnings
      updateColumnPositions(newColumns.map((c, i) => ({ id: c.id, position: i })));
      return;
    }

    if (active.data.current?.type === 'Task') {
      // Find the dragged task
      const task = tasks.find(t => t.id === activeId);
      if (task) {
        // Collect all tasks from the source and destination columns (or just the whole board)
        const sourceListId = active.data.current?.task.list_id;
        const targetListId = task.list_id;
        
        const updates: {id: string, list_id: string, position: number}[] = [];
        
        const affectedListIds = Array.from(new Set([sourceListId, targetListId].filter(Boolean)));
        
        affectedListIds.forEach(listId => {
          const colTasks = tasks.filter(t => t.list_id === listId);
          colTasks.forEach((t, i) => {
            updates.push({ id: t.id, list_id: t.list_id, position: i });
          });
        });

        // Send the bulk update to the server
        if (updates.length > 0) {
           updateTaskPositions(updates);
           // Also log the move if it changed lists (optional, handled in update previously but we can skip or do it on client)
        }
      }
    }
  }

  async function onDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === 'Task';
    const isOverTask = over.data.current?.type === 'Task';
    const isOverColumn = over.data.current?.type === 'Column';

    if (!isActiveTask) return;

    if (isActiveTask && isOverTask) {
      setTasks((tasks) => {
        const activeIndex = tasks.findIndex((t) => t.id === activeId);
        const overIndex = tasks.findIndex((t) => t.id === overId);

        if (tasks[activeIndex].list_id !== tasks[overIndex].list_id) {
          const newTasks = [...tasks];
          newTasks[activeIndex].list_id = tasks[overIndex].list_id;
          return arrayMove(newTasks, activeIndex, overIndex);
        }
        return arrayMove(tasks, activeIndex, overIndex);
      });
    }

    if (isActiveTask && isOverColumn) {
      setTasks((tasks) => {
        const activeIndex = tasks.findIndex((t) => t.id === activeId);
        const newTasks = [...tasks];
        newTasks[activeIndex].list_id = overId;
        return arrayMove(newTasks, activeIndex, newTasks.length - 1); 
      });
    }
  }

  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnName.trim() || columns.length === 0) return;
    const boardId = columns[0].board_id;
    const res = await createColumn(boardId, newColumnName, columns.length, '#64748b'); // Default gray
    if (res.error) {
      alert('Failed to create column: ' + res.error);
    } else {
      setNewColumnName('');
      setIsAddingColumn(false);
    }
  };

  return (
    <div className={styles.boardContainer}>
      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className={styles.columnsWrapper}>
          {columns.length === 0 ? (
            <div className={styles.emptyBoard}>
              <h3 className={styles.emptyTitle}>No columns found</h3>
              <p style={{color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 400, marginBottom: 24}}>
                Your workspace is not fully set up yet. Please log out and sign up again.
              </p>
              <button onClick={handleLogout} className={styles.btnPrimary}>
                Log out
              </button>
            </div>
          ) : (
            <SortableContext items={columnsId}>
              {columns.map((col) => (
                <KanbanColumn 
                  key={col.id} 
                  column={col} 
                  tasks={filteredTasks.filter(task => task.list_id === col.id)}
                  onTaskClick={(t) => setSelectedTask(t)}
                />
              ))}
            </SortableContext>
          )}

          {columns.length > 0 && (
            <div style={{ minWidth: '300px', flexShrink: 0, padding: '0 8px' }}>
              {isAddingColumn ? (
                <form onSubmit={handleAddColumn} style={{ background: 'var(--bg-white)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input 
                    type="text" 
                    autoFocus
                    value={newColumnName}
                    onChange={e => setNewColumnName(e.target.value)}
                    placeholder="New Column Name" 
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '14px', width: '100%' }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="submit" disabled={!newColumnName.trim()} style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 500, cursor: 'pointer', flex: 1 }}>
                      Add Column
                    </button>
                    <button type="button" onClick={() => setIsAddingColumn(false)} style={{ padding: '8px 16px', background: 'var(--bg-hover)', color: 'var(--text-primary)', border: 'none', borderRadius: '8px', fontWeight: 500, cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button 
                  onClick={() => setIsAddingColumn(true)}
                  style={{ width: '100%', padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border)', borderRadius: '12px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                >
                  + Add another column
                </button>
              )}
            </div>
          )}
        </div>

        <DragOverlay>
          {activeColumn && (
            <KanbanColumn 
              column={activeColumn} 
              tasks={filteredTasks.filter(task => task.list_id === activeColumn.id)} 
            />
          )}
          {activeTask && <KanbanTask task={activeTask} />}
        </DragOverlay>
      </DndContext>

      {selectedTask && (
        <TaskModal 
          task={selectedTask} 
          columns={columns}
          onClose={() => setSelectedTask(null)}
          onUpdate={(updatedTask) => {
            setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
            setSelectedTask(updatedTask);
          }}
        />
      )}
    </div>
  );
}
