import { useState } from 'react';
import { useStore } from '../store';
import { isFutureDay } from '../utils/habitDay';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export function HabitSection() {
  const {
    selectedDate,
    habits,
    rules,
    getActiveHabits,
    isCompleted,
    toggleCompletion,
    addHabit,
    updateHabit,
    archiveHabit,
    reorderHabits,
  } = useStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'daily' | 'weekdays' | 'monthdays'>('daily');
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [selectedMonthdays, setSelectedMonthdays] = useState<number[]>([]);

  // Edit modal state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editMemo, setEditMemo] = useState('');

  // Drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const activeHabits = getActiveHabits(selectedDate);
  const isFuture = isFutureDay(selectedDate);

  const handleAddHabit = () => {
    if (!newName.trim()) return;

    let weekdaysMask = 0;
    if (newType === 'weekdays') {
      selectedWeekdays.forEach(day => {
        weekdaysMask |= (1 << day);
      });
    }

    addHabit(
      newName.trim(),
      newType,
      newType === 'weekdays' ? weekdaysMask : undefined,
      newType === 'monthdays' ? selectedMonthdays : undefined
    );

    // Reset form
    setNewName('');
    setNewType('daily');
    setSelectedWeekdays([]);
    setSelectedMonthdays([]);
    setShowAddForm(false);
  };

  const toggleWeekday = (day: number) => {
    setSelectedWeekdays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const toggleMonthday = (day: number) => {
    setSelectedMonthdays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const openEdit = (id: string) => {
    const habit = habits.find(h => h.id === id);
    if (habit) {
      setEditingId(id);
      setEditName(habit.name);
      setEditMemo(habit.memo || '');
    }
  };

  const saveEdit = () => {
    if (editingId) {
      updateHabit(editingId, { name: editName, memo: editMemo || null });
      setEditingId(null);
    }
  };

  const handleArchive = () => {
    if (editingId) {
      archiveHabit(editingId);
      setEditingId(null);
    }
  };

  // Get habit rule info for display
  const getHabitRuleInfo = (habitId: string): string => {
    const habitRules = rules
      .filter(r => r.habit_id === habitId)
      .sort((a, b) => b.effective_from_habit_day.localeCompare(a.effective_from_habit_day));

    if (habitRules.length === 0) return '';

    const rule = habitRules[0];
    if (rule.type === 'daily') return '毎日';
    if (rule.type === 'weekdays' && rule.weekdays_mask !== null) {
      const days = WEEKDAYS.filter((_, i) => (rule.weekdays_mask! & (1 << i)) !== 0);
      return days.join('・');
    }
    if (rule.type === 'monthdays' && rule.monthdays_json) {
      const days = JSON.parse(rule.monthdays_json) as number[];
      return `毎月 ${days.join(', ')}日`;
    }
    return '';
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Make drag image transparent
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      reorderHabits(dragIndex, dragOverIndex);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // Get display order for smooth animation
  const getDisplayItems = () => {
    if (dragIndex === null || dragOverIndex === null || dragIndex === dragOverIndex) {
      return activeHabits;
    }
    const items = [...activeHabits];
    const [dragged] = items.splice(dragIndex, 1);
    items.splice(dragOverIndex, 0, dragged);
    return items;
  };

  const displayItems = getDisplayItems();

  return (
    <div
      className="px-8 py-6 flex flex-col min-h-0 max-h-[30vh] relative"
      style={{ borderTop: '1px solid var(--border-primary)' }}
    >
      {/* Header */}
      <div className="flex-shrink-0 mb-3">
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          選択日: {selectedDate}
        </div>
      </div>

      {/* Habit list */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {displayItems.length === 0 ? (
          <div className="text-sm py-2" style={{ color: 'var(--text-muted)' }}>この日の習慣はありません</div>
        ) : (
          displayItems.map((habit, index) => {
            const originalIndex = activeHabits.findIndex(h => h.id === habit.id);
            const isDragging = originalIndex === dragIndex;
            const completed = isCompleted(habit.id, selectedDate);

            return (
              <div
                key={habit.id}
                draggable
                onDragStart={(e) => handleDragStart(e, originalIndex)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`group flex items-center gap-3 py-2 px-2 rounded transition-all duration-200 ${
                  isDragging ? 'opacity-50 scale-95' : ''
                }`}
                style={{ backgroundColor: 'transparent' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <button
                  onClick={() => !isFuture && toggleCompletion(habit.id, selectedDate)}
                  disabled={isFuture}
                  className={`w-5 h-5 rounded flex items-center justify-center transition-all ${isFuture ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  style={{
                    backgroundColor: completed ? 'var(--accent-green)' : 'transparent',
                    border: completed ? 'none' : '2px solid var(--border-primary)',
                    color: 'white'
                  }}
                  onMouseEnter={e => {
                    if (!isFuture && !completed) {
                      e.currentTarget.style.borderColor = 'var(--accent-green)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!completed) {
                      e.currentTarget.style.borderColor = 'var(--border-primary)';
                    }
                  }}
                >
                  {completed && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => openEdit(habit.id)}
                  className="flex-1 text-left truncate transition-colors"
                  style={{ color: completed ? 'var(--text-muted)' : 'var(--text-primary)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-blue)'}
                  onMouseLeave={e => e.currentTarget.style.color = completed ? 'var(--text-muted)' : 'var(--text-primary)'}
                >
                  {habit.name}
                </button>
                {/* Drag handle */}
                <div className="cursor-grab opacity-0 group-hover:opacity-100 p-1" style={{ color: 'var(--text-muted)' }}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm8-16a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
                  </svg>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add button - floating */}
      <button
        onClick={() => setShowAddForm(true)}
        className="absolute bottom-4 right-12 w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg transition-all hover:scale-110"
        style={{ backgroundColor: 'var(--accent-green)' }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--accent-green-hover)'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--accent-green)'}
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Add form modal */}
      {showAddForm && (
        <div
          className="fixed inset-0 flex items-end sm:items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddForm(false);
              setNewName('');
              setNewType('daily');
              setSelectedWeekdays([]);
              setSelectedMonthdays([]);
            }
          }}
        >
        <div className="w-full sm:max-w-md sm:rounded-lg p-4 space-y-3" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>習慣を追加</h3>
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value.slice(0, 100))}
            placeholder="習慣名"
            className="w-full px-3 py-2 rounded"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-primary)',
              color: 'var(--text-primary)'
            }}
            maxLength={100}
            autoFocus
          />

          <select
            value={newType}
            onChange={e => setNewType(e.target.value as 'daily' | 'weekdays' | 'monthdays')}
            className="w-full px-3 py-2 rounded"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-primary)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="daily">毎日</option>
            <option value="weekdays">曜日指定</option>
            <option value="monthdays">日付指定</option>
          </select>

          {newType === 'weekdays' && (
            <div className="flex gap-1 flex-wrap">
              {WEEKDAYS.map((day, i) => (
                <button
                  key={i}
                  onClick={() => toggleWeekday(i)}
                  className="w-8 h-8 rounded text-sm transition-all"
                  style={{
                    backgroundColor: selectedWeekdays.includes(i) ? 'var(--accent-green)' : 'var(--bg-tertiary)',
                    color: selectedWeekdays.includes(i) ? 'white' : 'var(--text-secondary)'
                  }}
                  onMouseEnter={e => {
                    if (!selectedWeekdays.includes(i)) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!selectedWeekdays.includes(i)) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                    }
                  }}
                >
                  {day}
                </button>
              ))}
            </div>
          )}

          {newType === 'monthdays' && (
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                <button
                  key={day}
                  onClick={() => toggleMonthday(day)}
                  className="h-7 rounded text-xs transition-all"
                  style={{
                    backgroundColor: selectedMonthdays.includes(day) ? 'var(--accent-green)' : 'var(--bg-tertiary)',
                    color: selectedMonthdays.includes(day) ? 'white' : 'var(--text-secondary)'
                  }}
                  onMouseEnter={e => {
                    if (!selectedMonthdays.includes(day)) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!selectedMonthdays.includes(day)) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                    }
                  }}
                >
                  {day}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleAddHabit}
              disabled={!newName.trim() || (newType === 'weekdays' && selectedWeekdays.length === 0) || (newType === 'monthdays' && selectedMonthdays.length === 0)}
              className="flex-1 px-3 py-2 text-white rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--accent-green)' }}
              onMouseEnter={e => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.backgroundColor = 'var(--accent-green-hover)';
                }
              }}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--accent-green)'}
            >
              追加
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewName('');
                setNewType('daily');
                setSelectedWeekdays([]);
                setSelectedMonthdays([]);
              }}
              className="px-3 py-2 rounded transition-all"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
            >
              キャンセル
            </button>
          </div>
        </div>
        </div>
      )}

      {/* Edit modal */}
      {editingId && (
        <div
          className="fixed inset-0 flex items-end sm:items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEditingId(null);
            }
          }}
        >
          <div
            className="w-full sm:max-w-md sm:rounded-lg p-4 space-y-4"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>習慣編集</h3>
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value.slice(0, 100))}
              placeholder="習慣名"
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
              onChange={e => setEditMemo(e.target.value.slice(0, 500))}
              placeholder="メモ"
              className="w-full px-3 py-2 rounded h-24 resize-none"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-primary)',
                color: 'var(--text-primary)'
              }}
              maxLength={500}
            />
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
              スケジュール: {getHabitRuleInfo(editingId)}
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveEdit}
                className="flex-1 px-4 py-2 text-white rounded transition-all"
                style={{ backgroundColor: 'var(--accent-green)' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--accent-green-hover)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--accent-green)'}
              >
                保存
              </button>
              <button
                onClick={handleArchive}
                className="px-4 py-2 rounded transition-all"
                style={{ backgroundColor: 'var(--accent-red)', color: 'white' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                アーカイブ
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="px-4 py-2 rounded transition-all"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
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
