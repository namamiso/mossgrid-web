import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { Todo, Habit, HabitRuleHistory, HabitCompletion, SyncState } from './types';
import { getHabitDay, isHabitActiveOnDay } from './utils/habitDay';
import * as syncApi from './api/sync';
import type { TodoDto, HabitDto, HabitRuleHistoryDto, HabitCompletionDto } from './api/sync';

// Generate UUID
function uuid(): string {
  return crypto.randomUUID();
}

// Get current epoch seconds
function now(): number {
  return Math.floor(Date.now() / 1000);
}

// Local storage keys
const STORAGE_KEYS = {
  todos: 'mossgrid_todos',
  habits: 'mossgrid_habits',
  rules: 'mossgrid_rules',
  completions: 'mossgrid_completions',
  syncState: 'mossgrid_sync_state',
};

// Initialize sync state
function initSyncState(): SyncState {
  const stored = localStorage.getItem(STORAGE_KEYS.syncState);
  if (stored) {
    return JSON.parse(stored);
  }
  const state: SyncState = {
    device_id: uuid(),
    sync_key: '',
    last_server_seq: 0,
  };
  localStorage.setItem(STORAGE_KEYS.syncState, JSON.stringify(state));
  return state;
}

// Load from localStorage
function loadData<T>(key: string): T[] {
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : [];
}

// Save to localStorage
function saveData<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// LWW: Returns true if remote should win
function shouldApplyRemote(
  localUpdatedAt: number,
  localUpdatedBy: string,
  remoteUpdatedAt: number,
  remoteUpdatedBy: string
): boolean {
  if (remoteUpdatedAt > localUpdatedAt) return true;
  if (remoteUpdatedAt < localUpdatedAt) return false;
  return remoteUpdatedBy > localUpdatedBy;
}

interface StoreContextType {
  // Data
  todos: Todo[];
  habits: Habit[];
  rules: HabitRuleHistory[];
  completions: HabitCompletion[];
  syncState: SyncState;
  selectedDate: string;
  isSyncing: boolean;
  lastSyncResult: 'success' | 'error' | null;

  // Actions
  setSelectedDate: (date: string) => void;

  // Todo actions
  addTodo: (title: string, memo?: string) => void;
  updateTodo: (id: string, updates: Partial<Pick<Todo, 'title' | 'memo' | 'sort_order'>>) => void;
  deleteTodo: (id: string) => void;
  restoreTodo: (id: string) => void;
  reorderTodos: (fromIndex: number, toIndex: number) => void;

  // Habit actions
  addHabit: (name: string, type: 'daily' | 'weekdays' | 'monthdays', weekdaysMask?: number, monthdays?: number[]) => void;
  updateHabit: (id: string, updates: Partial<Pick<Habit, 'name' | 'memo' | 'sort_order'>>) => void;
  archiveHabit: (id: string) => void;
  toggleCompletion: (habitId: string, habitDay: string) => void;

  // Computed
  getActiveHabits: (date: string) => Habit[];
  getCompletionRate: (date: string) => number;
  isCompleted: (habitId: string, habitDay: string) => boolean;

  // Sync
  setSyncKey: (key: string) => void;
  sync: () => Promise<boolean>;
  repairData: () => Promise<boolean>;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [todos, setTodos] = useState<Todo[]>(() => loadData(STORAGE_KEYS.todos));
  const [habits, setHabits] = useState<Habit[]>(() => loadData(STORAGE_KEYS.habits));
  const [rules, setRules] = useState<HabitRuleHistory[]>(() => loadData(STORAGE_KEYS.rules));
  const [completions, setCompletions] = useState<HabitCompletion[]>(() => loadData(STORAGE_KEYS.completions));
  const [syncState, setSyncState] = useState<SyncState>(initSyncState);
  const [selectedDate, setSelectedDate] = useState<string>(getHabitDay());
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<'success' | 'error' | null>(null);

  // Refs for sync to access latest state
  const todosRef = useRef(todos);
  const habitsRef = useRef(habits);
  const rulesRef = useRef(rules);
  const completionsRef = useRef(completions);
  const syncStateRef = useRef(syncState);

  useEffect(() => { todosRef.current = todos; }, [todos]);
  useEffect(() => { habitsRef.current = habits; }, [habits]);
  useEffect(() => { rulesRef.current = rules; }, [rules]);
  useEffect(() => { completionsRef.current = completions; }, [completions]);
  useEffect(() => { syncStateRef.current = syncState; }, [syncState]);

  // Persist on change
  useEffect(() => { saveData(STORAGE_KEYS.todos, todos); }, [todos]);
  useEffect(() => { saveData(STORAGE_KEYS.habits, habits); }, [habits]);
  useEffect(() => { saveData(STORAGE_KEYS.rules, rules); }, [rules]);
  useEffect(() => { saveData(STORAGE_KEYS.completions, completions); }, [completions]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.syncState, JSON.stringify(syncState)); }, [syncState]);

  // Sync functions
  const pushDirtyData = useCallback(async (): Promise<boolean> => {
    const state = syncStateRef.current;
    if (!state.sync_key) return true;

    const dirtyTodos = todosRef.current.filter(t => t.dirty === 1).map((t): TodoDto => ({
      id: t.id,
      title: t.title,
      memo: t.memo,
      sort_order: t.sort_order,
      is_deleted: t.is_deleted,
      deleted_at: t.deleted_at,
      updated_at: t.updated_at,
      updated_by: t.updated_by,
    }));

    const dirtyHabits = habitsRef.current.filter(h => h.dirty === 1).map((h): HabitDto => ({
      id: h.id,
      name: h.name,
      memo: h.memo,
      sort_order: h.sort_order,
      is_archived: h.is_archived,
      updated_at: h.updated_at,
      updated_by: h.updated_by,
    }));

    const dirtyRules = rulesRef.current.filter(r => r.dirty === 1).map((r): HabitRuleHistoryDto => ({
      id: r.id,
      habit_id: r.habit_id,
      type: r.type,
      weekdays_mask: r.weekdays_mask,
      monthdays_json: r.monthdays_json,
      effective_from_habit_day: r.effective_from_habit_day,
      updated_at: r.updated_at,
      updated_by: r.updated_by,
    }));

    const dirtyCompletions = completionsRef.current.filter(c => c.dirty === 1).map((c): HabitCompletionDto => ({
      habit_id: c.habit_id,
      habit_day: c.habit_day,
      done: c.done,
      updated_at: c.updated_at,
      updated_by: c.updated_by,
    }));

    if (dirtyTodos.length === 0 && dirtyHabits.length === 0 &&
        dirtyRules.length === 0 && dirtyCompletions.length === 0) {
      return true;
    }

    try {
      await syncApi.push({
        sync_key: state.sync_key,
        device_id: state.device_id,
        todos: dirtyTodos,
        habits: dirtyHabits,
        habit_rule_histories: dirtyRules,
        habit_completions: dirtyCompletions,
      });

      // Clear dirty flags
      setTodos(prev => prev.map(t => t.dirty === 1 ? { ...t, dirty: 0 } : t));
      setHabits(prev => prev.map(h => h.dirty === 1 ? { ...h, dirty: 0 } : h));
      setRules(prev => prev.map(r => r.dirty === 1 ? { ...r, dirty: 0 } : r));
      setCompletions(prev => prev.map(c => c.dirty === 1 ? { ...c, dirty: 0 } : c));

      return true;
    } catch (e) {
      console.error('Push failed:', e);
      return false;
    }
  }, []);

  const pullChanges = useCallback(async (fromSeq = 0): Promise<boolean> => {
    const state = syncStateRef.current;
    if (!state.sync_key) return true;

    try {
      let afterSeq = fromSeq || state.last_server_seq;

      while (true) {
        const response = await syncApi.pull({
          sync_key: state.sync_key,
          device_id: state.device_id,
          after_server_seq: afterSeq,
        });

        if (response.changes.length === 0) {
          setSyncState(prev => ({ ...prev, last_server_seq: response.latest_server_seq }));
          break;
        }

        // Apply changes
        for (const change of response.changes) {
          const payload = JSON.parse(change.payload_json);

          switch (change.entity_type) {
            case 'todo': {
              const remote = payload as TodoDto;
              setTodos(prev => {
                const local = prev.find(t => t.id === remote.id);
                if (local && !shouldApplyRemote(local.updated_at, local.updated_by, remote.updated_at, remote.updated_by)) {
                  return prev;
                }
                const newTodo: Todo = {
                  id: remote.id,
                  title: remote.title,
                  memo: remote.memo ?? null,
                  sort_order: remote.sort_order,
                  is_deleted: remote.is_deleted,
                  deleted_at: remote.deleted_at ?? null,
                  updated_at: remote.updated_at,
                  updated_by: remote.updated_by,
                  dirty: 0,
                };
                if (local) {
                  return prev.map(t => t.id === remote.id ? newTodo : t);
                }
                return [...prev, newTodo];
              });
              break;
            }
            case 'habit': {
              const remote = payload as HabitDto;
              setHabits(prev => {
                const local = prev.find(h => h.id === remote.id);
                if (local && !shouldApplyRemote(local.updated_at, local.updated_by, remote.updated_at, remote.updated_by)) {
                  return prev;
                }
                const newHabit: Habit = {
                  id: remote.id,
                  name: remote.name,
                  memo: remote.memo ?? null,
                  sort_order: remote.sort_order,
                  is_archived: remote.is_archived,
                  updated_at: remote.updated_at,
                  updated_by: remote.updated_by,
                  dirty: 0,
                };
                if (local) {
                  return prev.map(h => h.id === remote.id ? newHabit : h);
                }
                return [...prev, newHabit];
              });
              break;
            }
            case 'rule': {
              const remote = payload as HabitRuleHistoryDto;
              setRules(prev => {
                const local = prev.find(r => r.id === remote.id);
                if (local && !shouldApplyRemote(local.updated_at, local.updated_by, remote.updated_at, remote.updated_by)) {
                  return prev;
                }
                const newRule: HabitRuleHistory = {
                  id: remote.id,
                  habit_id: remote.habit_id,
                  type: remote.type as 'daily' | 'weekdays' | 'monthdays',
                  weekdays_mask: remote.weekdays_mask ?? null,
                  monthdays_json: remote.monthdays_json ?? null,
                  effective_from_habit_day: remote.effective_from_habit_day,
                  updated_at: remote.updated_at,
                  updated_by: remote.updated_by,
                  dirty: 0,
                };
                if (local) {
                  return prev.map(r => r.id === remote.id ? newRule : r);
                }
                return [...prev, newRule];
              });
              break;
            }
            case 'completion': {
              const remote = payload as HabitCompletionDto;
              setCompletions(prev => {
                const local = prev.find(c => c.habit_id === remote.habit_id && c.habit_day === remote.habit_day);
                if (local && !shouldApplyRemote(local.updated_at, local.updated_by, remote.updated_at, remote.updated_by)) {
                  return prev;
                }
                const newCompletion: HabitCompletion = {
                  habit_id: remote.habit_id,
                  habit_day: remote.habit_day,
                  done: remote.done,
                  updated_at: remote.updated_at,
                  updated_by: remote.updated_by,
                  dirty: 0,
                };
                if (local) {
                  return prev.map(c =>
                    c.habit_id === remote.habit_id && c.habit_day === remote.habit_day ? newCompletion : c
                  );
                }
                return [...prev, newCompletion];
              });
              break;
            }
          }

          afterSeq = change.server_seq;
        }

        setSyncState(prev => ({ ...prev, last_server_seq: afterSeq }));

        if (response.changes.length < 500) {
          break;
        }
      }

      return true;
    } catch (e) {
      console.error('Pull failed:', e);
      return false;
    }
  }, []);

  const sync = useCallback(async (): Promise<boolean> => {
    const state = syncStateRef.current;
    if (!state.sync_key) {
      setLastSyncResult('error');
      return false;
    }

    setIsSyncing(true);
    try {
      // Initialize
      await syncApi.initSync(state.sync_key, state.device_id);

      // Push then Pull
      const pushOk = await pushDirtyData();
      if (!pushOk) {
        setLastSyncResult('error');
        return false;
      }

      const pullOk = await pullChanges();
      setLastSyncResult(pullOk ? 'success' : 'error');
      return pullOk;
    } catch (e) {
      console.error('Sync failed:', e);
      setLastSyncResult('error');
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [pushDirtyData, pullChanges]);

  const repairData = useCallback(async (): Promise<boolean> => {
    const state = syncStateRef.current;
    if (!state.sync_key) return false;

    setIsSyncing(true);
    try {
      await syncApi.initSync(state.sync_key, state.device_id);

      // Reset last_server_seq to pull all data
      setSyncState(prev => ({ ...prev, last_server_seq: 0 }));

      const pullOk = await pullChanges(0);
      setLastSyncResult(pullOk ? 'success' : 'error');
      return pullOk;
    } catch (e) {
      console.error('Repair failed:', e);
      setLastSyncResult('error');
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [pullChanges]);

  // Auto-sync on mount and periodically
  useEffect(() => {
    if (syncState.sync_key) {
      sync();
    }

    const interval = setInterval(() => {
      if (syncStateRef.current.sync_key) {
        pushDirtyData();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Todo actions
  const addTodo = useCallback((title: string, memo = '') => {
    const maxOrder = todosRef.current.filter(t => t.is_deleted === 0).reduce((max, t) => Math.max(max, t.sort_order), 0);
    const todo: Todo = {
      id: uuid(),
      title,
      memo,
      sort_order: maxOrder + 1,
      is_deleted: 0,
      deleted_at: null,
      updated_at: now(),
      updated_by: syncStateRef.current.device_id,
      dirty: 1,
    };
    setTodos(prev => [...prev, todo]);
  }, []);

  const updateTodo = useCallback((id: string, updates: Partial<Pick<Todo, 'title' | 'memo' | 'sort_order'>>) => {
    setTodos(prev => prev.map(t =>
      t.id === id ? { ...t, ...updates, updated_at: now(), updated_by: syncStateRef.current.device_id, dirty: 1 } : t
    ));
  }, []);

  const deleteTodo = useCallback((id: string) => {
    setTodos(prev => prev.map(t =>
      t.id === id ? { ...t, is_deleted: 1, deleted_at: now(), updated_at: now(), updated_by: syncStateRef.current.device_id, dirty: 1 } : t
    ));
  }, []);

  const restoreTodo = useCallback((id: string) => {
    const maxOrder = todosRef.current.filter(t => t.is_deleted === 0).reduce((max, t) => Math.max(max, t.sort_order), 0);
    setTodos(prev => prev.map(t =>
      t.id === id ? { ...t, is_deleted: 0, deleted_at: null, sort_order: maxOrder + 1, updated_at: now(), updated_by: syncStateRef.current.device_id, dirty: 1 } : t
    ));
  }, []);

  const reorderTodos = useCallback((fromIndex: number, toIndex: number) => {
    setTodos(prev => {
      const activeTodos = prev.filter(t => t.is_deleted === 0).sort((a, b) => a.sort_order - b.sort_order);
      const [moved] = activeTodos.splice(fromIndex, 1);
      activeTodos.splice(toIndex, 0, moved);

      const updatedIds = new Map<string, number>();
      activeTodos.forEach((t, i) => updatedIds.set(t.id, i + 1));

      return prev.map(t => {
        const newOrder = updatedIds.get(t.id);
        if (newOrder !== undefined && newOrder !== t.sort_order) {
          return { ...t, sort_order: newOrder, updated_at: now(), updated_by: syncStateRef.current.device_id, dirty: 1 };
        }
        return t;
      });
    });
  }, []);

  // Habit actions
  const addHabit = useCallback((
    name: string,
    type: 'daily' | 'weekdays' | 'monthdays',
    weekdaysMask?: number,
    monthdays?: number[]
  ) => {
    const maxOrder = habitsRef.current.filter(h => h.is_archived === 0).reduce((max, h) => Math.max(max, h.sort_order), 0);
    const habitId = uuid();
    const habit: Habit = {
      id: habitId,
      name,
      memo: null,
      sort_order: maxOrder + 1,
      is_archived: 0,
      updated_at: now(),
      updated_by: syncStateRef.current.device_id,
      dirty: 1,
    };
    setHabits(prev => [...prev, habit]);

    const rule: HabitRuleHistory = {
      id: uuid(),
      habit_id: habitId,
      type,
      weekdays_mask: type === 'weekdays' ? (weekdaysMask ?? 0) : null,
      monthdays_json: type === 'monthdays' ? JSON.stringify(monthdays ?? []) : null,
      effective_from_habit_day: getHabitDay(),
      updated_at: now(),
      updated_by: syncStateRef.current.device_id,
      dirty: 1,
    };
    setRules(prev => [...prev, rule]);
  }, []);

  const updateHabit = useCallback((id: string, updates: Partial<Pick<Habit, 'name' | 'memo' | 'sort_order'>>) => {
    setHabits(prev => prev.map(h =>
      h.id === id ? { ...h, ...updates, updated_at: now(), updated_by: syncStateRef.current.device_id, dirty: 1 } : h
    ));
  }, []);

  const archiveHabit = useCallback((id: string) => {
    setHabits(prev => prev.map(h =>
      h.id === id ? { ...h, is_archived: 1, updated_at: now(), updated_by: syncStateRef.current.device_id, dirty: 1 } : h
    ));
  }, []);

  const toggleCompletion = useCallback((habitId: string, habitDay: string) => {
    setCompletions(prev => {
      const existing = prev.find(c => c.habit_id === habitId && c.habit_day === habitDay);
      if (existing) {
        return prev.map(c =>
          c.habit_id === habitId && c.habit_day === habitDay
            ? { ...c, done: c.done === 1 ? 0 : 1, updated_at: now(), updated_by: syncStateRef.current.device_id, dirty: 1 }
            : c
        );
      }
      return [...prev, {
        habit_id: habitId,
        habit_day: habitDay,
        done: 1,
        updated_at: now(),
        updated_by: syncStateRef.current.device_id,
        dirty: 1,
      }];
    });
  }, []);

  // Computed
  const getActiveHabits = useCallback((date: string): Habit[] => {
    return habits
      .filter(h => h.is_archived === 0)
      .filter(h => {
        const habitRules = rules
          .filter(r => r.habit_id === h.id && r.effective_from_habit_day <= date)
          .sort((a, b) => b.effective_from_habit_day.localeCompare(a.effective_from_habit_day));

        if (habitRules.length === 0) return false;

        const rule = habitRules[0];
        return isHabitActiveOnDay(rule.type, rule.weekdays_mask, rule.monthdays_json, date);
      })
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [habits, rules]);

  const getCompletionRate = useCallback((date: string): number => {
    const active = getActiveHabits(date);
    if (active.length === 0) return 0;

    const completed = active.filter(h => {
      const c = completions.find(c => c.habit_id === h.id && c.habit_day === date);
      return c?.done === 1;
    }).length;

    return completed / active.length;
  }, [getActiveHabits, completions]);

  const isCompleted = useCallback((habitId: string, habitDay: string): boolean => {
    const c = completions.find(c => c.habit_id === habitId && c.habit_day === habitDay);
    return c?.done === 1;
  }, [completions]);

  const setSyncKey = useCallback((key: string) => {
    setSyncState(prev => ({ ...prev, sync_key: key, last_server_seq: 0 }));
  }, []);

  return (
    <StoreContext.Provider value={{
      todos,
      habits,
      rules,
      completions,
      syncState,
      selectedDate,
      isSyncing,
      lastSyncResult,
      setSelectedDate,
      addTodo,
      updateTodo,
      deleteTodo,
      restoreTodo,
      reorderTodos,
      addHabit,
      updateHabit,
      archiveHabit,
      toggleCompletion,
      getActiveHabits,
      getCompletionRate,
      isCompleted,
      setSyncKey,
      sync,
      repairData,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within StoreProvider');
  }
  return context;
}
