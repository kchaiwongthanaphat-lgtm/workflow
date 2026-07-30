'use client';
import React, { useState } from 'react';
import { Column } from '@/types/kanban';
import { X, Trash2, Check, Loader2 } from 'lucide-react';
import { updateColumn, deleteColumn } from '@/app/actions/kanban';
import { THEME_COLORS } from '@/utils/theme';

interface Props {
  column: Column;
  onClose: () => void;
  onUpdate: () => void; // Trigger refresh
}

export default function ColumnModal({ column, onClose, onUpdate }: Props) {
  const [name, setName] = useState(column.name);
  const [color, setColor] = useState(column.color || '#64748b'); // Default to gray
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    const res = await updateColumn(column.id, name, color);
    setIsSaving(false);
    if (res.success) {
      onUpdate();
      onClose();
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const res = await deleteColumn(column.id);
    setIsDeleting(false);
    if (res.success) {
      onUpdate();
      onClose();
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '400px', backgroundColor: 'var(--bg-page, #fff)', borderRadius: '12px', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Edit Column</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>
        
        <div style={{ padding: '20px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: 'var(--text-primary)' }}>Column Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '14px' }}
              placeholder="e.g. In Progress"
            />
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: 'var(--text-primary)' }}>Dot Color</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {THEME_COLORS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setColor(t.color)}
                  style={{
                    width: '32px', height: '32px', borderRadius: '50%', background: t.color, border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                    outline: color === t.color ? `2px solid ${t.color}` : 'none',
                    outlineOffset: '2px',
                    transition: 'transform 0.15s',
                    transform: color === t.color ? 'scale(1.1)' : 'scale(1)'
                  }}
                >
                  {color === t.color && <Check size={14} />}
                </button>
              ))}
              
              <div style={{ position: 'relative', width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--border)', cursor: 'pointer' }} title="Custom Color">
                <input 
                  type="color" 
                  value={color} 
                  onChange={e => setColor(e.target.value)}
                  style={{
                    position: 'absolute',
                    top: '-10px',
                    left: '-10px',
                    width: '52px',
                    height: '52px',
                    padding: 0,
                    border: 'none',
                    cursor: 'pointer'
                  }}
                />
              </div>
            </div>
          </div>
          
          {showDeleteConfirm ? (
            <div style={{ padding: '12px', background: '#fee2e2', borderRadius: '8px', marginBottom: '20px' }}>
              <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#991b1b', fontWeight: 500 }}>
                Are you sure? This will delete all tasks inside this column!
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={handleDelete}
                  disabled={isDeleting}
                  style={{ flex: 1, padding: '8px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 500, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                >
                  {isDeleting ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />} Delete
                </button>
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  style={{ flex: 1, padding: '8px', background: '#f87171', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 500, cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '14px', fontWeight: 500, padding: 0 }}
            >
              <Trash2 size={16} /> Delete Column
            </button>
          )}
        </div>
        
        <div style={{ padding: '16px 20px', background: 'var(--bg-hover)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button 
            onClick={onClose}
            style={{ padding: '8px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 500 }}
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            style={{ padding: '8px 16px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {isSaving && <Loader2 size={16} className="spin" />}
            Save Changes
          </button>
        </div>
      </div>
      
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
