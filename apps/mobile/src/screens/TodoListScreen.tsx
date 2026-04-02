import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Todo } from "@todo-sync/shared";
import { filterActiveTodos, sortTodos } from "@todo-sync/shared";
import { useAuthStore } from "../stores/authStore";
import { connectSocket, disconnectSocket } from "../lib/socket";
import api from "../lib/api";

function formatDueDate(iso: string): string {
  const d = new Date(iso);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const h = d.getHours();
  const m = d.getMinutes();
  if (h === 0 && m === 0) return `${month}/${day}`;
  return `${month}/${day} ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function isDueSoon(iso: string): boolean {
  const due = new Date(iso).getTime();
  const now = Date.now();
  return due > now && due - now < 24 * 60 * 60 * 1000;
}

function isOverdue(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}

export function TodoListScreen() {
  const queryClient = useQueryClient();
  const { user, accessToken, logout } = useAuthStore();
  const [newTitle, setNewTitle] = useState("");
  const [showDateInput, setShowDateInput] = useState(false);
  const [dueDateText, setDueDateText] = useState("");

  // Fetch todos
  const {
    data: todos = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["todos"],
    queryFn: async () => {
      const { data } = await api.get<{ todos: Todo[] }>("/api/v1/todos");
      return data.todos;
    },
  });

  const activeTodos = sortTodos(filterActiveTodos(todos));

  // Create todo
  const createMutation = useMutation({
    mutationFn: async ({ title, dueDate }: { title: string; dueDate: string | null }) => {
      const { data } = await api.post<{ todo: Todo }>("/api/v1/todos", { title, dueDate });
      return data.todo;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["todos"] }),
  });

  // Toggle todo
  const toggleMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { data } = await api.patch<{ todo: Todo }>(`/api/v1/todos/${id}`, { completed });
      return data.todo;
    },
    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey: ["todos"] });
      queryClient.setQueryData<Todo[]>(["todos"], (old) =>
        (old || []).map((t) => (t.id === id ? { ...t, completed } : t))
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["todos"] }),
  });

  // Delete todo
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/todos/${id}`);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["todos"] });
      queryClient.setQueryData<Todo[]>(["todos"], (old) =>
        (old || []).map((t) =>
          t.id === id ? { ...t, deletedAt: new Date().toISOString() } : t
        )
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["todos"] }),
  });

  // Socket.IO sync
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

    return () => {
      disconnectSocket();
    };
  }, [accessToken, queryClient]);

  const handleAdd = useCallback(() => {
    if (!newTitle.trim()) return;
    let dueDate: string | null = null;
    if (dueDateText.trim()) {
      const parsed = new Date(dueDateText.trim());
      if (!isNaN(parsed.getTime())) {
        dueDate = parsed.toISOString();
      } else {
        Alert.alert("\u65e5\u671f\u683c\u5f0f\u9519\u8bef", "\u8bf7\u4f7f\u7528\u683c\u5f0f: 2026-04-02 14:00");
        return;
      }
    }
    createMutation.mutate({ title: newTitle.trim(), dueDate });
    setNewTitle("");
    setDueDateText("");
    setShowDateInput(false);
  }, [newTitle, dueDateText, createMutation]);

  const handleDelete = useCallback(
    (id: string) => {
      Alert.alert("\u5220\u9664", "\u786e\u5b9a\u8981\u5220\u9664\u8fd9\u4e2a\u5f85\u529e\u5417\uff1f", [
        { text: "\u53d6\u6d88", style: "cancel" },
        { text: "\u5220\u9664", style: "destructive", onPress: () => deleteMutation.mutate(id) },
      ]);
    },
    [deleteMutation]
  );

  const handleLogout = async () => {
    disconnectSocket();
    await logout();
  };

  const completedCount = activeTodos.filter((t) => t.completed).length;

  return (
    <LinearGradient
      colors={["#667eea", "#764ba2", "#f093fb"]}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Todo Sync</Text>
          <Text style={styles.headerEmail}>{user?.email}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>{"\u9000\u51fa"}</Text>
        </TouchableOpacity>
      </View>

      {/* Input Card */}
      <View style={styles.inputCard}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={"\u6dfb\u52a0\u65b0\u5f85\u529e..."}
            placeholderTextColor="#9ca3af"
            value={newTitle}
            onChangeText={setNewTitle}
            onSubmitEditing={handleAdd}
            returnKeyType="done"
            maxLength={500}
          />
          <TouchableOpacity
            style={styles.dateToggle}
            onPress={() => setShowDateInput(!showDateInput)}
            activeOpacity={0.7}
          >
            <Text style={styles.dateToggleText}>
              {showDateInput ? "\u2716" : "\ud83d\udcc5"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addButton, !newTitle.trim() && styles.addButtonDisabled]}
            onPress={handleAdd}
            disabled={!newTitle.trim()}
            activeOpacity={0.8}
          >
            <Text style={styles.addButtonText}>{"\u6dfb\u52a0"}</Text>
          </TouchableOpacity>
        </View>
        {showDateInput && (
          <TextInput
            style={styles.dateInput}
            placeholder="2026-04-02 14:00"
            placeholderTextColor="#9ca3af"
            value={dueDateText}
            onChangeText={setDueDateText}
          />
        )}
      </View>

      {/* Stats */}
      <Text style={styles.stats}>
        {activeTodos.length} {"\u4e2a\u5f85\u529e"} {"\u00b7"} {completedCount} {"\u5df2\u5b8c\u6210"}
      </Text>

      {/* List */}
      <FlatList
        data={activeTodos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          { paddingBottom: 100 },
          activeTodos.length === 0 ? styles.emptyList : undefined,
        ]}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={() => refetch()} tintColor="#fff" />
        }
        renderItem={({ item }) => (
          <View style={styles.todoItem}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => toggleMutation.mutate({ id: item.id, completed: !item.completed })}
            >
              <View
                style={[
                  styles.checkboxInner,
                  item.completed && styles.checkboxChecked,
                ]}
              >
                {item.completed && <Text style={styles.checkMark}>{"\u2713"}</Text>}
              </View>
            </TouchableOpacity>
            <View style={styles.todoContent}>
              <Text
                style={[
                  styles.todoTitle,
                  item.completed && styles.todoTitleCompleted,
                ]}
              >
                {item.title}
              </Text>
              {item.description ? (
                <Text style={styles.todoDesc} numberOfLines={1}>
                  {item.description}
                </Text>
              ) : null}
              {item.dueDate ? (
                <Text
                  style={[
                    styles.dueDateText,
                    !item.completed && isOverdue(item.dueDate) && styles.dueDateOverdue,
                    !item.completed && !isOverdue(item.dueDate) && isDueSoon(item.dueDate) && styles.dueDateSoon,
                  ]}
                >
                  {"\ud83d\udcc5"} {formatDueDate(item.dueDate)}
                  {!item.completed && isOverdue(item.dueDate) ? " \u5df2\u8fc7\u671f" : ""}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={() => handleDelete(item.id)}>
              <Text style={styles.deleteText}>{"\u5220\u9664"}</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>{"\u2705"}</Text>
              <Text style={styles.emptyText}>{"\u6682\u65e0\u5f85\u529e\u4e8b\u9879"}</Text>
              <Text style={styles.emptySubtext}>{"\u6dfb\u52a0\u4e00\u4e2a\u5f00\u59cb\u5427"}</Text>
            </View>
          ) : null
        }
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.15)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  headerEmail: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  logoutText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  inputCard: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: "rgba(255,255,255,0.65)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  inputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: "#1f2937",
  },
  dateToggle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.6)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  dateToggleText: {
    fontSize: 18,
  },
  addButton: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    justifyContent: "center",
    shadowColor: "#6366f1",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  dateInput: {
    marginTop: 8,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1f2937",
  },
  stats: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "500",
  },
  todoItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.65)",
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  checkbox: {
    marginRight: 12,
  },
  checkboxInner: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "rgba(99,102,241,0.4)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  checkboxChecked: {
    backgroundColor: "#6366f1",
    borderColor: "#6366f1",
  },
  checkMark: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  todoContent: {
    flex: 1,
  },
  todoTitle: {
    fontSize: 15,
    color: "#1f2937",
    fontWeight: "500",
  },
  todoTitleCompleted: {
    textDecorationLine: "line-through",
    color: "#9ca3af",
  },
  todoDesc: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  dueDateText: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 3,
  },
  dueDateOverdue: {
    color: "#ef4444",
  },
  dueDateSoon: {
    color: "#f59e0b",
  },
  deleteText: {
    color: "#ef4444",
    fontSize: 13,
    fontWeight: "500",
  },
  empty: {
    alignItems: "center",
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 18,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
  },
  emptySubtext: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    marginTop: 4,
  },
  emptyList: {
    flex: 1,
  },
});
