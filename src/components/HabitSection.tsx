import { useState } from 'react';
import { useStore } from '../store';
import { isFutureDay } from '../utils/habitDay';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export function HabitSection() {
  const {
    selectedDate,
    getActiveHabits,
    isCompleted,
    toggleCompletion,
    addHabit,
  } = useStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'daily' | 'weekdays' | 'monthdays'>('daily');
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [selectedMonthdays, setSelectedMonthdays] = useState<number[]>([]);

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

  return (
    <div
      className="px-8 py-6 flex flex-col min-h-0 max-h-[30vh]"
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
        {activeHabits.length === 0 ? (
          <div className="text-sm py-2" style={{ color: 'var(--text-muted)' }}>この日の習慣はありません</div>
        ) : (
          activeHabits.map(habit => {
            const completed = isCompleted(habit.id, selectedDate);
            return (
              <div
                key={habit.id}
                className="flex items-center gap-3 py-2"
              >
                <button
                  onClick={() => !isFuture && toggleCompletion(habit.id, selectedDate)}
                  disabled={isFuture}
                  className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${isFuture ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  style={{
                    backgroundColor: completed ? 'var(--accent-green)' : 'transparent',
                    border: completed ? 'none' : '2px solid var(--border-primary)',
                    color: 'white'
                  }}
                >
                  {completed && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <span style={{ color: completed ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                  {habit.name}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Add button */}
      {!showAddForm ? (
        <button
          onClick={() => setShowAddForm(true)}
          className="mt-3 flex items-center gap-2 text-sm transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          <span
            className="w-5 h-5 rounded flex items-center justify-center text-xs"
            style={{ border: '1px dashed var(--border-primary)', color: 'var(--text-muted)' }}
          >+</span>
          習慣を追加
        </button>
      ) : (
        <div className="mt-3 p-3 rounded-lg space-y-3" style={{ backgroundColor: 'var(--bg-secondary)' }}>
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
                  className="w-8 h-8 rounded text-sm transition-colors"
                  style={{
                    backgroundColor: selectedWeekdays.includes(i) ? 'var(--accent-green)' : 'var(--bg-tertiary)',
                    color: selectedWeekdays.includes(i) ? 'white' : 'var(--text-secondary)'
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
                  className="h-7 rounded text-xs transition-colors"
                  style={{
                    backgroundColor: selectedMonthdays.includes(day) ? 'var(--accent-green)' : 'var(--bg-tertiary)',
                    color: selectedMonthdays.includes(day) ? 'white' : 'var(--text-secondary)'
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
              className="flex-1 px-3 py-2 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--accent-green)' }}
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
              className="px-3 py-2 rounded transition-colors"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
