import type { Todo } from '../types/Todo';
import { apiFetch } from './apiHelper';

export function fetchTodos() {
  return apiFetch<Todo[]>('/api/todos');
}

export function addTodo(taskText: string) {
  return apiFetch<Todo>('/api/todos', {
    method: 'POST',
    body: JSON.stringify({ taskText }),
  });
}

export function toggleTodo(id: number) {
  return apiFetch<Todo>(`/api/todos/${id}/toggle`, { method: 'PUT' });
}

export function deleteTodo(id: number) {
  return apiFetch<void>(`/api/todos/${id}`, { method: 'DELETE' });
}

export function clearCompleted() {
  return apiFetch<void>('/api/todos/completed', { method: 'DELETE' });
}
