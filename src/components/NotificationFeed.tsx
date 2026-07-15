/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Bell, AlertCircle, Info, DollarSign, Calendar } from 'lucide-react';
import { api } from '../api.js';
import { Notification } from '../types.js';

export function NotificationFeed() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const getIcon = (type: string) => {
    switch(type) {
      case 'leave': return <Calendar className="h-4 w-4 text-indigo-500" />;
      case 'salary': return <DollarSign className="h-4 w-4 text-emerald-500" />;
      default: return <Info className="h-4 w-4 text-slate-500" />;
    }
  };

  if (loading) return null;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="h-5 w-5 text-slate-400" />
        <h3 className="font-bold text-slate-900 text-sm">Notifications</h3>
      </div>
      <div className="space-y-4">
        {notifications.length === 0 ? (
          <p className="text-xs text-slate-400">No new notifications.</p>
        ) : (
          notifications.map(n => (
            <div key={n.id} className="flex gap-3 items-start border-b border-slate-50 pb-3 last:border-0 last:pb-0">
              <div className="p-1.5 bg-slate-50 rounded-lg shrink-0">
                {getIcon(n.type)}
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-800 leading-relaxed">{n.message}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{new Date(n.timestamp).toLocaleTimeString()}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
