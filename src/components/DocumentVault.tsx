/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FileText, Upload, Trash2, Download, Search, Folder, ShieldAlert,
  FileCheck, FileKey, FileWarning, AlertCircle
} from 'lucide-react';
import { Document, UserRole } from '../types.js';

interface DocumentVaultProps {
  userRole: UserRole;
}

// Mock initial data
const INITIAL_DOCS: Document[] = [
  { id: '1', title: 'Company Handbook 2026', category: 'Policy', uploadedAt: '2026-01-15', uploaderEmail: 'hr@example.com', url: '#' },
  { id: '2', title: 'Tax Declaration Form', category: 'Tax', uploadedAt: '2026-02-01', uploaderEmail: 'hr@example.com', url: '#' },
  { id: '3', title: 'Code of Conduct', category: 'Policy', uploadedAt: '2026-03-10', uploaderEmail: 'hr@example.com', url: '#' },
];

export function DocumentVault({ userRole }: DocumentVaultProps) {
  const [documents, setDocuments] = useState<Document[]>(INITIAL_DOCS);
  const [search, setSearch] = useState('');

  const filteredDocs = documents.filter(d => 
    d.title.toLowerCase().includes(search.toLowerCase()) || 
    d.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  const getIcon = (category: string) => {
    switch(category) {
      case 'Policy': return <FileText className="h-5 w-5 text-indigo-500" />;
      case 'Tax': return <FileCheck className="h-5 w-5 text-emerald-500" />;
      case 'Legal': return <FileKey className="h-5 w-5 text-amber-500" />;
      default: return <FileWarning className="h-5 w-5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Document Vault</h2>
          <p className="text-sm text-slate-500">Secure repository for company policies, legal forms, and tax documentation.</p>
        </div>
        {userRole === 'HR' && (
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition">
            <Upload className="h-4 w-4" />
            Upload Document
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input 
          type="text"
          placeholder="Search documents by title or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.map(doc => (
          <div key={doc.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-200 transition group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-indigo-50 transition">
                {getIcon(doc.category)}
              </div>
              {userRole === 'HR' && (
                <button 
                  onClick={() => handleDelete(doc.id)}
                  className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1">{doc.title}</h3>
            <p className="text-xs text-slate-500 mb-4">{doc.category} • Uploaded {doc.uploadedAt}</p>
            <a href={doc.url} className="flex items-center gap-2 text-indigo-600 font-bold text-xs hover:text-indigo-800">
              <Download className="h-4 w-4" />
              Download File
            </a>
          </div>
        ))}
      </div>

      {filteredDocs.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
          <Folder className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No documents found.</p>
        </div>
      )}
    </div>
  );
}
