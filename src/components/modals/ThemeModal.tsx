import React from 'react';
import { X } from 'lucide-react';
import ThemeSelector from '../theme/ThemeSelector';

interface Props {
  onClose: () => void;
}

export default function ThemeModal({ onClose }: Props) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '450px', backgroundColor: 'var(--bg-page, #fff)', borderRadius: '12px', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Themes</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: '24px 20px' }}>
          <ThemeSelector />
        </div>
      </div>
    </div>
  );
}
