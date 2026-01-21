// MossGrid Types

export interface Todo {
  id: string;
  title: string;
  memo: string | null;
  sort_order: number;
  is_deleted: number; // 0 or 1
  deleted_at: number | null;
  updated_at: number;
  updated_by: string;
  dirty: number; // 0 or 1
}

export interface Habit {
  id: string;
  name: string;
  memo: string | null;
  sort_order: number;
  is_archived: number; // 0 or 1
  updated_at: number;
  updated_by: string;
  dirty: number;
}

export interface HabitRuleHistory {
  id: string;
  habit_id: string;
  type: 'daily' | 'weekdays' | 'monthdays';
  weekdays_mask: number | null; // bitmask: Sun=1, Mon=2, Tue=4, Wed=8, Thu=16, Fri=32, Sat=64
  monthdays_json: string | null; // e.g., "[1,15,28]"
  effective_from_habit_day: string; // YYYY-MM-DD
  updated_at: number;
  updated_by: string;
  dirty: number;
}

export interface HabitCompletion {
  habit_id: string;
  habit_day: string; // YYYY-MM-DD
  done: number; // 0 or 1
  updated_at: number;
  updated_by: string;
  dirty: number;
}

export interface SyncState {
  device_id: string;
  sync_key: string;
  last_server_seq: number;
}

// API types
export interface ChangeLogEntry {
  server_seq: number;
  entity_type: 'todo' | 'habit' | 'rule' | 'completion';
  entity_key: string;
  payload_json: string;
}
