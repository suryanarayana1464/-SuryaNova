/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { Project } from '../types.js';
import { CheckCircle2, Circle, ClipboardList } from 'lucide-react';

export function ProjectTaskManagement() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(data);
    } catch (err) {
      console.error('Failed to fetch projects', err);
    } finally {
      setLoading(false);
    }
  };

  const updateTask = async (taskId: string, status?: 'todo' | 'in-progress' | 'completed', completionPercentage?: number, performanceReviewLinkId?: string) => {
    try {
        await api.updateTask(taskId, {status, completionPercentage, performanceReviewLinkId});
        fetchProjects();
    } catch(err) {
        console.error('Failed to update task', err);
    }
  }

  if (loading) return <div className="text-sm text-slate-500">Loading projects...</div>;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <ClipboardList className="h-5 w-5 text-indigo-500" />
        <h3 className="font-bold text-slate-900 text-lg">Projects & Tasks</h3>
      </div>
      
      <div className="space-y-6">
        {projects.length === 0 ? <p className="text-sm text-slate-500">No projects found.</p> : projects.map(project => (
            <div key={project.id} className="border-t border-slate-100 pt-4">
                <h4 className="font-semibold text-slate-800">{project.title}</h4>
                <p className="text-xs text-slate-500 mb-2">{project.description}</p>
                <div className="space-y-2">
                    {project.tasks.map(task => (
                        <div key={task.id} className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg text-sm">
                            <button onClick={() => updateTask(task.id, task.status === 'completed' ? 'todo' : 'completed')}>
                                {task.status === 'completed' ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5 text-slate-300" />}
                            </button>
                            <span className={`flex-1 ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-800'}`}>{task.title}</span>
                            <input 
                                type="number" 
                                min="0" 
                                max="100" 
                                value={task.completionPercentage} 
                                onChange={(e) => updateTask(task.id, undefined, parseInt(e.target.value))}
                                className="w-16 p-1 text-xs border rounded"
                            />
                            <span>%</span>
                            <input 
                                type="text"
                                placeholder="Review ID"
                                value={task.performanceReviewLinkId || ''}
                                onChange={(e) => updateTask(task.id, undefined, undefined, e.target.value)}
                                className="w-24 p-1 text-xs border rounded"
                            />
                        </div>
                    ))}
                </div>
            </div>
        ))}
      </div>
    </div>
  );
}
