import { ipcMain } from 'electron';
import { getSecure } from './secure-store';
import { assertRateLimit, logSecurityEvent } from './security';

const ASANA_BASE_URL = 'https://app.asana.com/api/1.0';
const ASANA_GID_RE = /^\d+$/;

function sanitizeAsanaTaskId(taskId: string): string {
  if (!ASANA_GID_RE.test(taskId)) throw new Error('Invalid Asana task ID');
  return taskId;
}

function sanitizeAsanaComment(text: string): string {
  const normalized = typeof text === 'string' ? text.trim() : '';
  if (!normalized) throw new Error('Comment cannot be empty');
  return normalized.slice(0, 5_000);
}

export async function asanaFetch(path: string, options: RequestInit = {}) {
  const token = getSecure('asana.token');
  if (!token) throw new Error('Asana token not configured. Go to Settings.');

  const response = await fetch(`${ASANA_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Asana API error ${response.status}: ${error}`);
  }

  return response.json();
}

export function registerAsanaHandlers() {
  ipcMain.handle('asana:get-tasks', async (_event, options?: { daysAhead?: number; limit?: number }) => {
    try {
      const me = await asanaFetch('/users/me');
      const workspaceId = me.data.workspaces[0]?.gid;
      if (!workspaceId) throw new Error('No Asana workspace found');
      const limit = options?.limit || 100;

      // Use user_task_list endpoint — returns ALL My Tasks regardless of due date
      const taskListResult = await asanaFetch(`/users/me/user_task_list?workspace=${workspaceId}&opt_fields=gid`);
      const taskListGid = taskListResult.data?.gid;
      if (!taskListGid) throw new Error('Could not find user task list');

      const result = await asanaFetch(
        `/user_task_lists/${taskListGid}/tasks?completed_since=now&opt_fields=gid,name,completed,due_on,projects.gid,projects.name,tags.gid,tags.name,notes,custom_fields.name,custom_fields.display_value&limit=${limit}`
      );
      return { success: true, data: result.data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(
    'asana:add-comment',
    async (event, taskId: string, text: string) => {
      try {
        assertRateLimit('asana:add-comment', event.sender.id, 500);
        const sanitizedTaskId = sanitizeAsanaTaskId(taskId);
        const sanitizedComment = sanitizeAsanaComment(text);
        logSecurityEvent('asana.addComment', {
          senderId: event.sender.id,
          taskId: sanitizedTaskId,
          textLength: sanitizedComment.length,
        });
        const result = await asanaFetch(`/tasks/${sanitizedTaskId}/stories`, {
          method: 'POST',
          body: JSON.stringify({ data: { text: sanitizedComment } }),
        });
        return { success: true, data: result.data };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }
  );

  ipcMain.handle(
    'asana:complete-task',
    async (event, taskId: string, completed: boolean) => {
      try {
        assertRateLimit('asana:complete-task', event.sender.id, 500);
        const sanitizedTaskId = sanitizeAsanaTaskId(taskId);
        logSecurityEvent('asana.completeTask', {
          senderId: event.sender.id,
          taskId: sanitizedTaskId,
          completed,
        });
        const result = await asanaFetch(`/tasks/${sanitizedTaskId}`, {
          method: 'PUT',
          body: JSON.stringify({ data: { completed } }),
        });
        return { success: true, data: result.data };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }
  );
}
