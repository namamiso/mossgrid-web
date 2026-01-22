import { useState, useRef } from 'react';
import { useStore } from '../store';

export function TodoSection() {
  const { todos, addTodo, deleteTodo, updateTodo, reorderTodos } = useStore();
  const [newTitle, setNewTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editMemo, setEditMemo] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);

  const activeTodos = todos
    .filter(t => t.is_deleted === 0)
    .sort((a, b) => a.sort_order - b.sort_order);

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    addTodo(newTitle.trim());
    setNewTitle('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  const openEdit = (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (todo) {
      setEditingId(id);
      setEditTitle(todo.title);
      setEditMemo(todo.memo || '');
    }
  };

  const saveEdit = () => {
    if (editingId) {
      updateTodo(editingId, { title: editTitle, memo: editMemo || null });
      setEditingId(null);
    }
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragOverIndex.current = index;
  };

  const handleDragEnd = () => {
    if (dragIndex !== null && dragOverIndex.current !== null && dragIndex !== dragOverIndex.current) {
      reorderTodos(dragIndex, dragOverIndex.current);
    }
    setDragIndex(null);
    dragOverIndex.current = null;
  };

  return (
    <div
      className="px-8 py-6 flex-1 flex flex-col min-h-0"
      style={{ borderTop: '1px solid var(--border-primary)' }}
    >
      {/* Todo list */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {activeTodos.map((todo, index) => (
          <div
            key={todo.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`group flex items-center gap-2 py-2 px-2 rounded transition-colors ${
              dragIndex === index ? 'opacity-50' : ''
            }`}
            style={{ backgroundColor: 'transparent' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {/* Delete button */}
            <button
              onClick={() => deleteTodo(todo.id)}
              className="p-1 transition-colors"
              style={{ color: 'var(--accent-red)' }}
              title="削除"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>

            {/* Title */}
            <button
              onClick={() => openEdit(todo.id)}
              className="flex-1 text-left truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              {todo.title || <span style={{ color: 'var(--text-muted)' }}>(空)</span>}
            </button>

            {/* Drag handle */}
            <div className="cursor-grab opacity-0 group-hover:opacity-100 p-1" style={{ color: 'var(--text-muted)' }}>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm8-16a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* Add todo input */}
      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value.slice(0, 100))}
          onKeyDown={handleKeyDown}
          placeholder="新しいToDo..."
          className="flex-1 px-3 py-2 rounded"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-primary)',
            color: 'var(--text-primary)'
          }}
          maxLength={100}
        />
        <button
          onClick={handleAdd}
          disabled={!newTitle.trim()}
          className="px-4 py-2 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: 'var(--accent-green)' }}
        >
          追加
        </button>
      </div>

      {/* Edit modal */}
      {editingId && (
        <div
          className="fixed inset-0 flex items-end sm:items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
        >
          <div
            className="w-full sm:max-w-md sm:rounded-lg p-4 space-y-4"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>ToDo編集</h3>
            <input
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value.slice(0, 100))}
              placeholder="タイトル"
              className="w-full px-3 py-2 rounded"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-primary)',
                color: 'var(--text-primary)'
              }}
              maxLength={100}
              autoFocus
            />
            <textarea
              value={editMemo}
              onChange={e => setEditMemo(e.target.value.slice(0, 100))}
              placeholder="メモ"
              className="w-full px-3 py-2 rounded h-24 resize-none"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-primary)',
                color: 'var(--text-primary)'
              }}
              maxLength={100}
            />
            <div className="flex gap-2">
              <button
                onClick={saveEdit}
                className="flex-1 px-4 py-2 text-white rounded transition-colors"
                style={{ backgroundColor: 'var(--accent-green)' }}
              >
                保存
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="px-4 py-2 rounded transition-colors"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
