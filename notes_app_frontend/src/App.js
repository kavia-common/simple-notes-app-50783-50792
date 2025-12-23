import React, { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

// Utility to generate IDs
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// PUBLIC_INTERFACE
export default function App() {
  /**
   * Notes App - Frontend only
   * - Shows list of notes with title, preview, and timestamps
   * - Add, edit, delete with modal-like inline form
   * - Search/filter by title/content
   * - Persist to localStorage
   * - Validation: non-empty title
   * - Accessibility: Enter submit, Esc cancel, focus management
   * - Light, modern UI using accents #3b82f6 (primary) and #06b6d4 (success)
   */
  const [notes, setNotes] = useState([]);
  const [query, setQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('notes_app__notes');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setNotes(parsed);
        }
      }
    } catch {
      // ignore malformed storage
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem('notes_app__notes', JSON.stringify(notes));
    } catch {
      // ignore quota or others
    }
  }, [notes]);

  // Derived filtered list
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(n =>
      n.title.toLowerCase().includes(q) ||
      (n.content || '').toLowerCase().includes(q)
    );
  }, [notes, query]);

  // Handlers
  const handleCreate = (values) => {
    const now = new Date().toISOString();
    const newNote = {
      id: uid(),
      title: values.title.trim(),
      content: values.content?.trim() || '',
      createdAt: now,
      updatedAt: now
    };
    setNotes(prev => [newNote, ...prev]);
    setIsAdding(false);
  };

  const handleUpdate = (id, values) => {
    const now = new Date().toISOString();
    setNotes(prev => prev.map(n => n.id === id ? {
      ...n,
      title: values.title.trim(),
      content: values.content?.trim() || '',
      updatedAt: now
    } : n));
    setEditingId(null);
  };

  const handleDelete = (id) => {
    const note = notes.find(n => n.id === id);
    const name = note?.title ? `"${note.title}"` : 'this note';
    // Confirmation
    // eslint-disable-next-line no-restricted-globals
    const ok = window.confirm(`Delete ${name}? This cannot be undone.`);
    if (ok) setNotes(prev => prev.filter(n => n.id !== id));
  };

  // Keyboard shortcuts: Esc closes add/edit
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setIsAdding(false);
        setEditingId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="notes-app">
      <header className="topbar" role="banner">
        <div className="brand">
          <span className="dot" aria-hidden="true" />
          <h1 className="title">Simple Notes</h1>
        </div>
        <div className="actions">
          <SearchBox value={query} onChange={setQuery} />
          <button
            className="btn primary"
            onClick={() => { setIsAdding(true); setEditingId(null); }}
            aria-haspopup="dialog"
          >
            + New Note
          </button>
        </div>
      </header>

      <main className="container" role="main">
        {isAdding && (
          <Card ariaLabel="Add note">
            <NoteForm
              autoFocus
              submitLabel="Add"
              onCancel={() => setIsAdding(false)}
              onSubmit={handleCreate}
            />
          </Card>
        )}

        <section aria-label="Notes list" className="notes-list">
          {filtered.length === 0 ? (
            <EmptyState query={query} onCreate={() => setIsAdding(true)} />
          ) : (
            filtered.map(note => (
              <Card key={note.id}>
                {editingId === note.id ? (
                  <NoteForm
                    initialTitle={note.title}
                    initialContent={note.content}
                    submitLabel="Save"
                    autoFocus
                    onCancel={() => setEditingId(null)}
                    onSubmit={(vals) => handleUpdate(note.id, vals)}
                  />
                ) : (
                  <NoteView
                    note={note}
                    onEdit={() => { setEditingId(note.id); setIsAdding(false); }}
                    onDelete={() => handleDelete(note.id)}
                  />
                )}
              </Card>
            ))
          )}
        </section>
      </main>

      <footer className="footer" role="contentinfo">
        <span>Local-only demo • Your notes are saved in your browser</span>
      </footer>
    </div>
  );
}

/**
 * Card component - visual container
 */
function Card({ children, ariaLabel }) {
  return (
    <div className="card" role="group" aria-label={ariaLabel}>
      {children}
    </div>
  );
}

/**
 * SearchBox - filter input
 */
function SearchBox({ value, onChange }) {
  return (
    <label className="search" aria-label="Search notes">
      <span className="icon" aria-hidden="true">🔎</span>
      <input
        type="search"
        placeholder="Search notes..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Search by title or content"
      />
      {value && (
        <button className="clear" onClick={() => onChange('')} aria-label="Clear search">
          ✕
        </button>
      )}
    </label>
  );
}

/**
 * NoteForm - add/edit form
 */
function NoteForm({
  initialTitle = '',
  initialContent = '',
  submitLabel = 'Save',
  onSubmit,
  onCancel,
  autoFocus = false,
}) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [error, setError] = useState('');
  const titleRef = useRef(null);

  useEffect(() => {
    if (autoFocus && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [autoFocus]);

  const submit = () => {
    if (!title.trim()) {
      setError('Title cannot be empty.');
      titleRef.current?.focus();
      return;
    }
    onSubmit({ title, content });
    setTitle('');
    setContent('');
    setError('');
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      // Allow Cmd/Ctrl+Enter to submit
      e.preventDefault();
      submit();
    }
  };

  return (
    <form
      className="note-form"
      onSubmit={(e) => { e.preventDefault(); submit(); }}
      onKeyDown={onKeyDown}
      aria-label="Note form"
    >
      <div className="form-row">
        <input
          ref={titleRef}
          type="text"
          placeholder="Note title"
          value={title}
          aria-invalid={!!error}
          aria-describedby={error ? 'title-error' : undefined}
          onChange={(e) => { setTitle(e.target.value); if (error) setError(''); }}
        />
      </div>
      <div className="form-row">
        <textarea
          placeholder="Write your note..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
        />
      </div>
      {error && <div id="title-error" className="error" role="alert">{error}</div>}
      <div className="form-actions">
        <button type="submit" className="btn success">{submitLabel}</button>
        <button
          type="button"
          className="btn ghost"
          onClick={onCancel}
          aria-label="Cancel editing"
        >
          Cancel
        </button>
      </div>
      <div className="hint">Tip: Press Ctrl/Cmd + Enter to submit. Press Esc to cancel.</div>
    </form>
  );
}

/**
 * NoteView - read-only card view
 */
function NoteView({ note, onEdit, onDelete }) {
  const created = new Date(note.createdAt);
  const updated = new Date(note.updatedAt);
  const isEdited = note.createdAt !== note.updatedAt;

  return (
    <div className="note-view">
      <div className="note-header">
        <h3 className="note-title">{note.title}</h3>
        <div className="note-actions">
          <button className="btn ghost" onClick={onEdit} aria-label={`Edit note ${note.title}`}>Edit</button>
          <button className="btn danger" onClick={onDelete} aria-label={`Delete note ${note.title}`}>Delete</button>
        </div>
      </div>
      {note.content && (
        <p className="note-preview">
          {note.content.length > 240 ? `${note.content.slice(0, 240)}…` : note.content}
        </p>
      )}
      <div className="meta">
        <span title={created.toLocaleString()}>Created {timeAgo(created)}</span>
        {isEdited && (
          <span title={updated.toLocaleString()}> • Updated {timeAgo(updated)}</span>
        )}
      </div>
    </div>
  );
}

function timeAgo(date) {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return `${m} min${m > 1 ? 's' : ''} ago`;
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    return `${h} hour${h > 1 ? 's' : ''} ago`;
  }
  const d = Math.floor(diff / 86400);
  return `${d} day${d > 1 ? 's' : ''} ago`;
}

/**
 * Empty State
 */
function EmptyState({ query, onCreate }) {
  return (
    <div className="empty">
      {query ? (
        <>
          <h3>No notes found</h3>
          <p>Try a different search term or clear the search.</p>
          <button className="btn ghost" onClick={onCreate}>+ Create a new note</button>
        </>
      ) : (
        <>
          <h3>Welcome! Create your first note</h3>
          <p>Capture ideas, todos, or reminders. Notes are stored in your browser.</p>
          <button className="btn primary" onClick={onCreate}>+ New Note</button>
        </>
      )}
    </div>
  );
}
