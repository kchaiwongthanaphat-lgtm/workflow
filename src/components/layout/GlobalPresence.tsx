'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

interface PresenceContextType {
  onlineUsers: any[];
}

const PresenceContext = createContext<PresenceContextType>({ onlineUsers: [] });

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);

  useEffect(() => {
    const supabase = createClient();
    const presenceChannel = supabase.channel(`workspace-presence-global`);
    
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const users = Object.values(state).map((s: any) => s[0]);
        // deduplicate by user id
        const uniqueUsers = Array.from(new Map(users.map(u => [u.id, u])).values());
        setOnlineUsers(uniqueUsers);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          await presenceChannel.track({
            id: user.id,
            email: user.email,
            full_name: profile?.full_name,
            avatar_url: profile?.avatar_url,
          });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, []);

  return (
    <PresenceContext.Provider value={{ onlineUsers }}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  return useContext(PresenceContext);
}
