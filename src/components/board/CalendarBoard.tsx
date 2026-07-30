'use client';
import React, { useState } from 'react';
import { Calendar, dateFnsLocalizer, Event } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Task, Column } from '@/types/kanban';
import TaskModal from './TaskModal';
import styles from './Kanban.module.css';
import { createClient } from '@/utils/supabase/client';

const locales = {
  'en-US': enUS,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

interface CalendarBoardProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  columns: Column[];
  currentUserId?: string;
}

export default function CalendarBoard({ tasks, setTasks, columns, currentUserId }: CalendarBoardProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Filter out tasks without due dates and map them to calendar events
  const events = tasks
    .filter(t => t.due_date)
    .map(t => {
      const start = new Date(t.due_date!);
      const end = new Date(t.due_date!);
      return {
        id: t.id,
        title: t.title,
        start,
        end,
        resource: t,
        allDay: true
      };
    });

  const handleSelectEvent = (event: any) => {
    setSelectedTask(event.resource);
  };

  const handleNavigate = (newDate: Date) => {
    setCurrentDate(newDate);
  };

  return (
    <div style={{ 
      background: 'var(--bg-surface)', 
      backdropFilter: 'var(--glass-blur)',
      WebkitBackdropFilter: 'var(--glass-blur)',
      borderRadius: 'var(--radius-xl)', 
      padding: '24px', 
      flex: 1, 
      minHeight: 0, 
      width: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      boxShadow: 'var(--shadow-md)', 
      border: '1px solid var(--border-light)' 
    }}>
      <style>{`
        .rbc-calendar {
          font-family: inherit;
          color: var(--text);
          height: 100%;
          width: 100%;
        }
        
        /* Header Row */
        .rbc-header {
          padding: 12px 8px;
          font-weight: 600;
          font-size: 14px;
          color: var(--text-secondary);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
          border-left: none !important;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* Views */
        .rbc-month-view, .rbc-time-view, .rbc-agenda-view {
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.02);
        }

        /* Day Cells */
        .rbc-day-bg {
          border-color: rgba(255, 255, 255, 0.05) !important;
          transition: background-color 0.2s;
        }
        .rbc-day-bg:hover {
          background-color: rgba(255, 255, 255, 0.03);
        }
        .rbc-month-row {
          border-color: rgba(255, 255, 255, 0.05) !important;
        }

        /* Off Range */
        .rbc-off-range-bg {
          background: rgba(0, 0, 0, 0.2);
        }

        /* Today Highlight */
        .rbc-today {
          background: rgba(99, 102, 241, 0.08) !important;
        }
        .rbc-date-cell.rbc-now {
          font-weight: bold;
          color: var(--accent);
        }

        /* Date Numbers */
        .rbc-date-cell {
          padding: 8px 8px 2px 8px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-muted);
        }

        /* Events (Tasks) */
        .rbc-event {
          background: var(--accent-gradient);
          border-radius: var(--radius-sm);
          padding: 4px 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 12px;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          transition: transform var(--transition-fast), box-shadow var(--transition-fast);
        }
        .rbc-event:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
          z-index: 5;
        }
        .rbc-event.rbc-selected {
          background: #4f46e5;
          box-shadow: var(--shadow-glow);
        }

        /* Toolbar / Navigation */
        .rbc-toolbar {
          margin-bottom: 24px;
          align-items: center;
        }
        
        .rbc-toolbar-label {
          font-size: 20px;
          font-weight: 700;
          color: var(--text);
          letter-spacing: -0.5px;
        }

        .rbc-btn-group {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          padding: 4px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .rbc-btn-group button {
          color: var(--text-secondary);
          border: none;
          background: transparent;
          border-radius: 6px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s ease;
          box-shadow: none !important;
        }

        .rbc-btn-group button:hover:not(.rbc-active) {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text);
        }

        .rbc-btn-group button.rbc-active {
          background: var(--surface);
          color: var(--text);
          box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        /* Agenda View */
        .rbc-agenda-view table.rbc-agenda-table {
          border: none;
        }
        .rbc-agenda-view table.rbc-agenda-table tbody > tr > td {
          border-color: rgba(255, 255, 255, 0.05);
          padding: 12px;
        }
      `}</style>
      
      <div style={{ flex: 1, minHeight: 0 }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          date={currentDate}
          onNavigate={handleNavigate}
          style={{ height: '70vh', minHeight: '600px', width: '100%' }}
          onSelectEvent={handleSelectEvent}
          views={['month', 'week', 'agenda']}
        />
      </div>

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
