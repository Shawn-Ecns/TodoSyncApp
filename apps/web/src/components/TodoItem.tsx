import type { Todo } from "@todo-sync/shared";

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}

function formatDueDate(iso: string): string {
  const d = new Date(iso);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours().toString().padStart(2, "0");
  const mins = d.getMinutes().toString().padStart(2, "0");
  return `${month}/${day} ${hours}:${mins}`;
}

export function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  return (
    <div className={`group flex items-center gap-3 p-4 glass rounded-xl transition-all duration-200 glass-hover ${
      todo.completed ? "opacity-60" : ""
    }`}>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => onToggle(todo.id, !todo.completed)}
      />

      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium ${
            todo.completed
              ? "line-through text-gray-400"
              : "text-gray-800"
          }`}
        >
          {todo.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {todo.dueDate && (
            <span className="inline-flex items-center gap-1 text-xs text-primary/70">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatDueDate(todo.dueDate)}
            </span>
          )}
          {todo.description && (
            <p className="text-xs text-gray-500 truncate">
              {todo.description}
            </p>
          )}
        </div>
      </div>

      <button
        onClick={() => onDelete(todo.id)}
        className="text-gray-300 hover:text-danger transition-all p-1.5 rounded-lg hover:bg-danger/10 opacity-0 group-hover:opacity-100"
        title="删除"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}
