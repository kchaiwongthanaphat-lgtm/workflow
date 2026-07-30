'use client';

import React, { useState, useEffect } from 'react';
import KanbanBoard from '@/components/board/KanbanBoard';
import CalendarBoard from '@/components/board/CalendarBoard';
import styles from '@/app/page.module.css';
import { createClient } from '@/utils/supabase/client';
import { Column, Task } from '@/types/kanban';
import { Search, SlidersHorizontal, Plus, LayoutGrid, Calendar, Crown } from 'lucide-react';
import { createTask } from '@/app/actions/kanban';
import Image from 'next/image';

import { usePresence } from '@/components/layout/GlobalPresence';

interface BoardViewProps {
  currentUserId: string;
  boardName: string;
  initialColumns: Column[];
  initialTasks: Task[];
  workspaceOwners?: string[];
}

export default function BoardView({ currentUserId, boardName, initialColumns, initialTasks, workspaceOwners = [] }: BoardViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [myTasksOnly, setMyTasksOnly] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'calendar'>('kanban');

  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const { onlineUsers } = usePresence();
  const supabase = createClient();

  useEffect(() => {
    const uniqueSuffix = Date.now();
    const channel = supabase
      .channel(`board-tasks-changes-${uniqueSuffix}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newTask = payload.new as Task;
            setTasks(prev => {
              if (prev.find(t => t.id === newTask.id)) return prev;
              return [...prev, newTask];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedTask = payload.new as Task;
            setTasks(prev => prev.map(t => 
              t.id === updatedTask.id 
                ? { ...t, ...updatedTask }
                : t
            ));
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(t => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    const listsChannel = supabase
      .channel(`board-lists-changes-${uniqueSuffix}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lists' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newList = payload.new as Column;
            setColumns(prev => {
              if (prev.find(c => c.id === newList.id)) return prev;
              return [...prev, newList].sort((a, b) => a.position - b.position);
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedList = payload.new as Column;
            setColumns(prev => prev.map(c => c.id === updatedList.id ? updatedList : c).sort((a, b) => a.position - b.position));
          } else if (payload.eventType === 'DELETE') {
            setColumns(prev => prev.filter(c => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(listsChannel);
    };
  }, [supabase, boardName]);

  const totalTasks = tasks.length;

  // Quick add task to first column
  async function handleQuickAdd() {
    if (initialColumns.length === 0) return;
    const title = prompt('Task title:');
    if (!title?.trim()) return;
    await createTask(initialColumns[0].id, title, totalTasks + 1);
  }

  return (
    <div className={styles.page}>
      {/* Project Header */}
      <div className={styles.projectHeader}>
        <div className={styles.projectInfo}>
          <div className={styles.projectLeft}>
            <div className={styles.projectIcon}>{boardName.charAt(0)}</div>
            <h1 className={styles.projectTitle}>{boardName}</h1>
            <span className={styles.taskCountBadge}>{totalTasks} tasks</span>
            
            {/* Live Presence Avatars */}
            <div style={{ display: 'flex', alignItems: 'center', marginLeft: 16 }}>
              {onlineUsers.map((user, i) => (
                <div 
                  key={user.id} 
                  className={styles.onlineUserAvatar}
                  style={{ 
                    width: 28, 
                    height: 28, 
                    borderRadius: '50%', 
                    background: '#3f3f46', 
                    marginLeft: i > 0 ? -8 : 0,
                    border: '2px solid var(--background)',
                    position: 'relative',
                    zIndex: 10 - i,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    color: 'white',
                    fontWeight: 600
                  }}
                >
                  <div className={styles.onlineTooltip}>
                    {user.full_name || user.email}
                  </div>
                  <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {user.avatar_url ? (
                      <Image src={user.avatar_url} alt="Avatar" fill style={{ objectFit: 'cover' }} sizes="28px" />
                    ) : (
                      (user.full_name || user.email || 'U').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, background: '#10b981', borderRadius: '50%', border: '1.5px solid var(--background)', zIndex: 2 }} />
                  {workspaceOwners.includes(user.id) && (
                    <div style={{ position: 'absolute', top: -4, right: -4, background: '#f59e0b', borderRadius: '50%', padding: 2, zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                      <Crown size={10} color="#fff" />
                    </div>
                  )}
                </div>
              ))}
              {onlineUsers.length > 0 && (
                <span style={{ fontSize: 12, color: '#a1a1aa', marginLeft: 8 }}>online</span>
              )}
            </div>
          </div>
        </div>
        
        <div className={styles.tabsRow}>
          <div className={styles.tabs}>
            <button 
              className={`${styles.tab} ${viewMode === 'kanban' ? styles.tabActive : ''}`}
              onClick={() => setViewMode('kanban')}
            >
              <LayoutGrid size={14} style={{marginRight: 6}} /> Kanban
            </button>
            <button 
              className={`${styles.tab} ${viewMode === 'calendar' ? styles.tabActive : ''}`}
              onClick={() => setViewMode('calendar')}
            >
              <Calendar size={14} style={{marginRight: 6}} /> Calendar
            </button>
          </div>
          <div className={styles.tabActions}>
            {/* Filters */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginRight: '8px' }}>
              <button 
                className={`${styles.filterBtn} ${myTasksOnly ? styles.filterActive : ''}`} 
                onClick={() => setMyTasksOnly(!myTasksOnly)}
              >
                My Tasks
              </button>
              <select 
                className={styles.filterBtn}
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                style={{
                  background: 'transparent',
                  color: 'inherit',
                  cursor: 'pointer'
                }}
              >
                <option value="" style={{ background: '#0a0a0f' }}>All Priorities</option>
                <option value="Urgent" style={{ background: '#0a0a0f' }}>Urgent</option>
                <option value="High" style={{ background: '#0a0a0f' }}>High</option>
                <option value="Medium" style={{ background: '#0a0a0f' }}>Medium</option>
                <option value="Low" style={{ background: '#0a0a0f' }}>Low</option>
              </select>
            </div>

            {/* Search */}
            {isSearchOpen ? (
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onBlur={() => { if (!searchQuery) setIsSearchOpen(false); }}
                placeholder="Search tasks..."
                className={styles.searchInput}
              />
            ) : (
              <button className={styles.filterBtn} onClick={() => setIsSearchOpen(true)}>
                <Search size={14} /> Search
              </button>
            )}
            
            {/* New Task */}
            <button className={styles.newTaskBtn} onClick={handleQuickAdd}>
              <Plus size={14} /> New Task
            </button>
          </div>
        </div>
      </div>
      
      {/* Board */}
      <div className={styles.boardArea}>
        {viewMode === 'kanban' ? (
          <KanbanBoard 
            currentUserId={currentUserId}
            columns={columns}
            setColumns={setColumns}
            tasks={tasks}
            setTasks={setTasks}
            searchQuery={searchQuery}
            myTasksOnly={myTasksOnly}
            priorityFilter={priorityFilter}
          />
        ) : (
          <CalendarBoard 
            tasks={tasks}
            setTasks={setTasks}
            columns={columns}
            currentUserId={currentUserId}
          />
        )}
      </div>
    </div>
  );
}
