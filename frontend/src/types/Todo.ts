export interface Todo {
  todoId: number,
  userId: string,
  taskText: string,
  isCompleted: boolean,
  createdAt: string,
  completedAt?: string | null,
  displayOrder: number,
}
