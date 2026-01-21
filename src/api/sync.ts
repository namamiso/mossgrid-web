// MossGrid Sync API Client

const API_BASE_URL = 'https://mossgrid-api.hanpenneko.workers.dev';

// Request/Response types
export interface InitRequest {
  sync_key: string;
  device_id: string;
}

export interface InitResponse {
  ok: boolean;
}

export interface TodoDto {
  id: string;
  title: string;
  memo?: string | null;
  sort_order: number;
  is_deleted: number;
  deleted_at?: number | null;
  updated_at: number;
  updated_by: string;
}

export interface HabitDto {
  id: string;
  name: string;
  memo?: string | null;
  sort_order: number;
  is_archived: number;
  updated_at: number;
  updated_by: string;
}

export interface HabitRuleHistoryDto {
  id: string;
  habit_id: string;
  type: string;
  weekdays_mask?: number | null;
  monthdays_json?: string | null;
  effective_from_habit_day: string;
  updated_at: number;
  updated_by: string;
}

export interface HabitCompletionDto {
  habit_id: string;
  habit_day: string;
  done: number;
  updated_at: number;
  updated_by: string;
}

export interface PushRequest {
  sync_key: string;
  device_id: string;
  todos?: TodoDto[];
  habits?: HabitDto[];
  habit_rule_histories?: HabitRuleHistoryDto[];
  habit_completions?: HabitCompletionDto[];
}

export interface PushResponse {
  ok: boolean;
  latest_server_seq: number;
}

export interface PullRequest {
  sync_key: string;
  device_id: string;
  after_server_seq: number;
}

export interface ChangeLogEntry {
  server_seq: number;
  entity_type: 'todo' | 'habit' | 'rule' | 'completion';
  entity_key: string;
  payload_json: string;
}

export interface PullResponse {
  changes: ChangeLogEntry[];
  latest_server_seq: number;
}

// API functions
async function request<T>(endpoint: string, body: object): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

export async function initSync(syncKey: string, deviceId: string): Promise<InitResponse> {
  return request<InitResponse>('/init', { sync_key: syncKey, device_id: deviceId });
}

export async function push(req: PushRequest): Promise<PushResponse> {
  return request<PushResponse>('/push', req);
}

export async function pull(req: PullRequest): Promise<PullResponse> {
  return request<PullResponse>('/pull', req);
}
