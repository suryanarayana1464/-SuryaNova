/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { api } from '../api.js';
import { ResourceEvent } from '../types.js';

export function ResourceCalendar() {
  const [events, setEvents] = useState<ResourceEvent[]>([]);

  useEffect(() => {
    api.getResourceEvents().then(setEvents).catch(console.error);
  }, []);

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <CalendarIcon className="h-5 w-5 text-indigo-500" />
        <h3 className="font-bold text-slate-900 text-lg">Resource Calendar</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
            <thead>
                <tr>
                    <th className="p-3 border-b text-xs text-slate-500 uppercase">Resource</th>
                    <th className="p-3 border-b text-xs text-slate-500 uppercase">Event</th>
                    <th className="p-3 border-b text-xs text-slate-500 uppercase">Time</th>
                </tr>
            </thead>
            <tbody>
                {events.length === 0 ? (
                    <tr>
                        <td colSpan={3} className="p-6 text-center text-sm text-slate-500">No events found.</td>
                    </tr>
                ) : (
                    events.map(event => (
                        <tr key={event.id} className="hover:bg-slate-50">
                            <td className="p-3 border-b text-sm font-semibold text-slate-800 capitalize">{event.resourceName} ({event.type})</td>
                            <td className="p-3 border-b text-sm text-slate-700">{event.title}</td>
                            <td className="p-3 border-b text-xs text-slate-500">
                                {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(event.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                        </tr>
                    ))
                )}
            </tbody>
        </table>
      </div>
    </div>
  );
}
