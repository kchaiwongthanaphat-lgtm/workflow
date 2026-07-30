'use client';
import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { createClient } from '@/utils/supabase/client';
import { Task } from '@/types/kanban';
import { isPast, parseISO, format } from 'date-fns';
import { CheckCircle2, ListTodo, Timer, AlertCircle, TrendingUp, Calendar as CalendarIcon, User as UserIcon } from 'lucide-react';
import Image from 'next/image';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import styles from './Dashboard.module.css';

interface DashboardClientProps {
  userEmail: string;
  workspaceId: string;
  workspaceName: string;
  boards: any[];
}

export default function DashboardClient({ userEmail, workspaceId, workspaceName, boards }: DashboardClientProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchDashboardData() {
      // For a real app, you might want to fetch all tasks across all boards in the workspace, 
      // or just tasks assigned to this user.
      if (boards.length === 0) {
        setLoading(false);
        return;
      }
      
      const boardIds = boards.map(b => b.id);
      
      // Fetch all lists for these boards to get list_id
      const { data: lists } = await supabase
        .from('lists')
        .select('id, name')
        .in('board_id', boardIds);
        
      if (!lists || lists.length === 0) {
        setLoading(false);
        return;
      }
      
      const listIds = lists.map(l => l.id);
      const listMap = lists.reduce((acc, curr) => {
        acc[curr.id] = curr.name;
        return acc;
      }, {} as Record<string, string>);

      // Fetch tasks in those lists with assignees
      const { data: allTasks } = await supabase
        .from('tasks')
        .select(`
          *,
          task_assignees (
            user_id,
            profiles:user_id (
              full_name,
              avatar_url
            )
          )
        `)
        .in('list_id', listIds);
        
      if (allTasks) {
        // Attach list_name to tasks for easy charting
        const tasksWithListName = allTasks.map(t => ({
          ...t,
          list_name: listMap[t.list_id] || 'Unknown'
        }));
        setTasks(tasksWithListName as any);
      }
      
      setLoading(false);
    }
    fetchDashboardData();
  }, [boards]);

  if (loading) {
    return (
      <div className={styles.dashboardLayout}>
        <Sidebar userEmail={userEmail} workspaceName={workspaceName} boards={boards} activeBoardName="Dashboard" />
        <main className={styles.mainContent}>
          <Topbar activeBoardName="Dashboard" />
          <div className={styles.loadingState}>Loading Dashboard...</div>
        </main>
      </div>
    );
  }

  // Calculate stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => (t as any).list_name.toLowerCase().includes('done')).length;
  const inProgressTasks = totalTasks - completedTasks;
  
  // Calculate Overdue
  const overdueTasks = tasks.filter(t => t.due_date && isPast(parseISO(t.due_date)) && !(t as any).list_name.toLowerCase().includes('done'));
  
  // Data for Pie Chart (Tasks by List)
  const listCounts = tasks.reduce((acc, task) => {
    const listName = (task as any).list_name;
    acc[listName] = (acc[listName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const pieData = Object.keys(listCounts).map(name => ({
    name,
    value: listCounts[name]
  }));

  // Data for Priority Bar Chart
  const priorityCounts = tasks.reduce((acc, task) => {
    const prio = task.priority || 'No Priority';
    acc[prio] = (acc[prio] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const priorityData = Object.keys(priorityCounts).map(name => ({
    name,
    count: priorityCounts[name]
  }));
  
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
  const PRIORITY_COLORS: Record<string, string> = {
    'High': '#ef4444',
    'Medium': '#f59e0b',
    'Low': '#10b981',
    'No Priority': '#9ca3af'
  };

  return (
    <div className={styles.dashboardLayout}>
      <Sidebar userEmail={userEmail} workspaceName={workspaceName} boards={boards} activeBoardName="Dashboard" />
      <main className={styles.mainContent}>
        <Topbar activeBoardName="Dashboard" />
        
        <div className={styles.dashboardScroll}>
          <header className={styles.header}>
            <h1 className={styles.title}>Welcome back, {userEmail.split('@')[0]}!</h1>
            <p className={styles.subtitle}>Here is your summary for <strong>{workspaceName}</strong></p>
          </header>

          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <div className={styles.statLabel}>Total Tasks</div>
                <ListTodo size={20} className={styles.statIcon} style={{color: 'var(--accent)'}} />
              </div>
              <div className={styles.statValue}>{totalTasks}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <div className={styles.statLabel}>Completed</div>
                <CheckCircle2 size={20} className={styles.statIcon} style={{color: '#10b981'}} />
              </div>
              <div className={styles.statValue}>{completedTasks}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <div className={styles.statLabel}>In Progress</div>
                <Timer size={20} className={styles.statIcon} style={{color: '#f59e0b'}} />
              </div>
              <div className={styles.statValue}>{inProgressTasks}</div>
            </div>
            <div className={`${styles.statCard} ${overdueTasks.length > 0 ? styles.alertCard : ''}`}>
              <div className={styles.statHeader}>
                <div className={styles.statLabel}>Overdue</div>
                <AlertCircle size={20} className={styles.statIcon} style={{color: '#ef4444'}} />
              </div>
              <div className={styles.statValue}>{overdueTasks.length}</div>
            </div>
          </div>

          <div className={styles.chartsGrid}>
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Tasks by Status</h3>
              <div className={styles.chartContainer}>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className={styles.emptyChart}>No data available</div>
                )}
              </div>
            </div>

            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}><TrendingUp size={18} /> Tasks by Priority</h3>
              <div className={styles.chartContainer}>
                {priorityData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={priorityData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                      <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                      <YAxis stroke="#9ca3af" fontSize={12} allowDecimals={false} />
                      <Tooltip 
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        contentStyle={{ backgroundColor: '#1e1e2d', borderColor: '#2b2b40', borderRadius: '8px', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={60}>
                        {priorityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className={styles.emptyChart}>No data available</div>
                )}
              </div>
            </div>
          </div>

          <div className={styles.chartCard} style={{ marginTop: '24px' }}>
            <h3 className={styles.chartTitle}><CalendarIcon size={18} /> Upcoming & Overdue Tasks</h3>
            <div className={styles.upcomingList}>
              {tasks
                .filter(t => t.due_date && !(t as any).list_name.toLowerCase().includes('done'))
                .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
                .slice(0, 8)
                .map(task => {
                  const isOverdue = isPast(parseISO(task.due_date!));
                  const assignees = (task as any).task_assignees || [];
                  const priorityColor = PRIORITY_COLORS[task.priority || 'No Priority'];

                  return (
                    <div key={task.id} className={`${styles.upcomingItem} ${isOverdue ? styles.upcomingOverdue : ''}`}>
                      <div className={styles.upcomingInfo}>
                        <div className={styles.upcomingTitleWrapper}>
                          <div className={styles.upcomingTitle}>{task.title}</div>
                          {task.priority && (
                            <span className={styles.priorityBadge} style={{ backgroundColor: `${priorityColor}20`, color: priorityColor }}>
                              {task.priority}
                            </span>
                          )}
                        </div>
                        <div className={styles.upcomingMeta}>
                          <span className={styles.upcomingListBadge}>{(task as any).list_name}</span>
                          <span className={`${styles.upcomingDate} ${isOverdue ? styles.overdueDate : ''}`}>
                            <Timer size={14} /> {format(parseISO(task.due_date!), 'MMM d, yyyy')}
                            {isOverdue && ' (Overdue)'}
                          </span>
                        </div>
                      </div>
                      
                      <div className={styles.upcomingAssignees}>
                        {assignees.slice(0, 3).map((a: any, i: number) => (
                          <div key={a.user_id} className={styles.miniAvatar} style={{ zIndex: 3 - i }}>
                            {a.profiles?.avatar_url ? (
                              <Image src={a.profiles.avatar_url} alt="avatar" fill sizes="24px" style={{objectFit: 'cover'}} />
                            ) : (
                              <span>{a.profiles?.full_name?.charAt(0) || <UserIcon size={12}/>}</span>
                            )}
                          </div>
                        ))}
                        {assignees.length > 3 && (
                          <div className={styles.miniAvatarMore}>+{assignees.length - 3}</div>
                        )}
                      </div>
                    </div>
                  )
                })
              }
                {tasks.filter(t => t.due_date).length === 0 && (
                  <div className={styles.emptyList}>No upcoming tasks with due dates.</div>
                )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
