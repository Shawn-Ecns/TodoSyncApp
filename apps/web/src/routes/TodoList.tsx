import { useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Todo } from "@todo-sync/shared";
import { filterActiveTodos, sortTodos } from "@todo-sync/shared";
import { TodoItem } from "../components/TodoItem.js";
import { TodoForm } from "../components/TodoForm.js";
import { Calendar } from "../components/Calendar.js";
import { useAuthStore } from "../stores/authStore.js";
import { useOfflineStore } from "../stores/offlineQueue.js";
import { connectSocket, disconnectSocket } from "../lib/socket.js";
import api from "../lib/api.js";

export function TodoList() {
  const queryClient = useQueryClient();
  const { user, accessToken, logout } = useAuthStore();
  const { isOnline, setOnline } = useOfflineStore();

  const { data: todos = [], isLoading } = useQuery({
    queryKey: ["todos"],
    queryFn: async () => {
      const { data } = await api.get<{ todos: Todo[] }>("/api/v1/todos");
      return data.todos;
    },
  });

  const activeTodos = sortTodos(filterActiveTodos(todos));

  const createMutation = useMutation({
    mutationFn: async (input: { title: string; description?: string; dueDate?: string }) => {
      const { data } = await api.post<{ todo: Todo }>("/api/v1/todos", input);
      return data.todo;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["todos"] });
      const previous = queryClient.getQueryData<Todo[]>(["todos"]);
      const optimistic: Todo = {
        id: crypto.randomUUID(),
        userId: user?.id || "",
        title: input.title,
        description: input.description || null,
        completed: false,
        position: (previous?.length ?? 0),
        dueDate: input.dueDate || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };
      queryClient.setQueryData<Todo[]>(["todos"], (old) => [...(old || []), optimistic]);
      return { previous };
    },
    onError: (_err, _input, context) => {
      if (context?.previous) queryClient.setQueryData(["todos"], context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["todos"] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: { id: string; completed?: boolean; title?: string }) => {
      const { data } = await api.patch<{ todo: Todo }>(`/api/v1/todos/${id}`, input);
      return data.todo;
    },
    onMutate: async ({ id, ...input }) => {
      await queryClient.cancelQueries({ queryKey: ["todos"] });
      const previous = queryClient.getQueryData<Todo[]>(["todos"]);
      queryClient.setQueryData<Todo[]>(["todos"], (old) =>
        (old || []).map((t) => (t.id === id ? { ...t, ...input, updatedAt: new Date().toISOString() } : t))
      );
      return { previous };
    },
    onError: (_err, _input, context) => {
      if (context?.previous) queryClient.setQueryData(["todos"], context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["todos"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/api/v1/todos/${id}`); },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["todos"] });
      const previous = queryClient.getQueryData<Todo[]>(["todos"]);
      queryClient.setQueryData<Todo[]>(["todos"], (old) =>
        (old || []).map((t) => t.id === id ? { ...t, deletedAt: new Date().toISOString() } : t)
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(["todos"], context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["todos"] }),
  });

  useEffect(() => {
    if (!accessToken) return;
    const socket = connectSocket(accessToken);
    socket.on("todo:created", (todo: Todo) => {
      queryClient.setQueryData<Todo[]>(["todos"], (old) => [...(old || []), todo]);
    });
    socket.on("todo:updated", (todo: Todo) => {
      queryClient.setQueryData<Todo[]>(["todos"], (old) =>
        (old || []).map((t) => (t.id === todo.id ? todo : t))
      );
    });
    socket.on("todo:deleted", ({ id, deletedAt }: { id: string; deletedAt: string }) => {
      queryClient.setQueryData<Todo[]>(["todos"], (old) =>
        (old || []).map((t) => (t.id === id ? { ...t, deletedAt } : t))
      );
    });
    return () => { disconnectSocket(); };
  }, [accessToken, queryClient]);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setOnline]);

  const handleAdd = useCallback(
    (title: string, description?: string, dueDate?: string) =>
      createMutation.mutate({ title, description, dueDate }),
    [createMutation]
  );
  const handleToggle = useCallback(
    (id: string, completed: boolean) => updateMutation.mutate({ id, completed }),
    [updateMutation]
  );
  const handleDelete = useCallback(
    (id: string) => deleteMutation.mutate(id),
    [deleteMutation]
  );

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      try { await api.post("/api/v1/auth/logout", { refreshToken }); } catch {}
    }
    disconnectSocket();
    logout();
  };

  const completedCount = activeTodos.filter((t) => t.completed).length;
  const totalCount = activeTodos.length;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="glass-strong shadow-sm shrink-0">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent text-white flex items-center justify-center text-sm font-bold shadow-md">
              T
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800">Todo Sync</h1>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
              isOnline ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                isOnline ? "bg-success animate-pulse" : "bg-danger"
              }`} />
              {isOnline ? "在线" : "离线"}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors px-2 py-1 rounded-lg hover:bg-white/50"
            >
              退出
            </button>
          </div>
        </div>
      </header>

      {/* Main — Left/Right split */}
      <main className="flex-1 flex max-w-[1600px] mx-auto w-full px-6 py-6 gap-6 overflow-hidden">
        {/* Left: Todo List */}
        <div className="w-[560px] shrink-0 flex flex-col gap-5 overflow-y-auto pr-2">
          {/* Input card */}
          <div className="glass rounded-2xl p-5 shadow-lg shrink-0">
            <TodoForm onAdd={handleAdd} />
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between px-1 shrink-0">
            <span className="text-sm text-white/70 font-medium">
              {totalCount} 个待办 · {completedCount} 已完成
            </span>
            {totalCount > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white/80 rounded-full transition-all duration-500"
                    style={{ width: `${(completedCount / totalCount) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-white/60 font-medium">
                  {Math.round((completedCount / totalCount) * 100)}%
                </span>
              </div>
            )}
          </div>

          {/* Todo list */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block w-7 h-7 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              <p className="text-white/50 text-sm mt-3">加载中...</p>
            </div>
          ) : activeTodos.length === 0 ? (
            <div className="text-center py-12 glass rounded-2xl">
              <div className="text-4xl mb-3">✨</div>
              <p className="text-lg font-medium text-gray-600">暂无待办事项</p>
              <p className="text-sm text-gray-400 mt-1">添加一个开始吧</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeTodos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: Calendar */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          <Calendar todos={activeTodos} onToggle={handleToggle} />
        </div>
      </main>
    </div>
  );
}
