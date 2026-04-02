import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Todo } from "@todo-sync/shared";
import api from "../lib/api";

// ==================== Types ====================

type ViewMode = "month" | "week" | "day";

// ==================== Date Helpers ====================

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function getMonthDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const start = addDays(first, -startOffset);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(addDays(start, i));
  }
  return days;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatMonthYear(date: Date): string {
  return `${date.getFullYear()}\u5e74${date.getMonth() + 1}\u6708`;
}

function formatWeekRange(start: Date): string {
  const end = addDays(start, 6);
  return `${start.getMonth() + 1}/${start.getDate()} \u2013 ${end.getMonth() + 1}/${end.getDate()}`;
}

function formatDayHeader(date: Date): string {
  const weekdays = ["\u5468\u65e5", "\u5468\u4e00", "\u5468\u4e8c", "\u5468\u4e09", "\u5468\u56db", "\u5468\u4e94", "\u5468\u516d"];
  return `${date.getMonth() + 1}\u6708${date.getDate()}\u65e5 ${weekdays[date.getDay()]}`;
}

const DAY_NAMES = ["\u65e5", "\u4e00", "\u4e8c", "\u4e09", "\u56db", "\u4e94", "\u516d"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function getTodosForDay(todos: Todo[], date: Date): Todo[] {
  return todos.filter((t) => {
    if (!t.dueDate) return false;
    return isSameDay(new Date(t.dueDate), date);
  });
}

function parseTodoHour(todo: Todo): number | null {
  if (!todo.dueDate) return null;
  const d = new Date(todo.dueDate);
  const h = d.getHours();
  const m = d.getMinutes();
  if (h === 0 && m === 0) return null;
  return h;
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const CELL_SIZE = Math.floor((SCREEN_WIDTH - 32 - 12) / 7); // 16px padding each side + 2px gaps

// ==================== Dot indicators ====================

function TodoDots({ count }: { count: number }) {
  if (count === 0) return null;
  const dots = Math.min(count, 3);
  const colors = ["#6366f1", "#ec4899", "#22c55e"];
  return (
    <View style={dotStyles.container}>
      {Array.from({ length: dots }, (_, i) => (
        <View key={i} style={[dotStyles.dot, { backgroundColor: colors[i % 3] }]} />
      ))}
      {count > 3 && <Text style={dotStyles.more}>+{count - 3}</Text>}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 2, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  more: { fontSize: 8, color: "#9ca3af", marginLeft: 1 },
});

// ==================== Compact Todo Item ====================

function CompactTodoItem({
  todo,
  onToggle,
}: {
  todo: Todo;
  onToggle: (id: string, completed: boolean) => void;
}) {
  return (
    <TouchableOpacity
      style={[
        compactStyles.item,
        todo.completed && compactStyles.itemCompleted,
      ]}
      onPress={() => onToggle(todo.id, !todo.completed)}
      activeOpacity={0.7}
    >
      <View style={[compactStyles.dot, todo.completed && compactStyles.dotCompleted]} />
      <Text
        style={[compactStyles.text, todo.completed && compactStyles.textCompleted]}
        numberOfLines={1}
      >
        {todo.title}
      </Text>
    </TouchableOpacity>
  );
}

const compactStyles = StyleSheet.create({
  item: { flexDirection: "row", alignItems: "center", paddingVertical: 2, gap: 4 },
  itemCompleted: { opacity: 0.5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#6366f1" },
  dotCompleted: { backgroundColor: "#22c55e" },
  text: { fontSize: 11, color: "#1f2937", flex: 1 },
  textCompleted: { textDecorationLine: "line-through", color: "#9ca3af" },
});

// ==================== Day Todo Block (for day view) ====================

function DayTodoBlock({
  todo,
  onToggle,
  showTime = false,
}: {
  todo: Todo;
  onToggle: (id: string, completed: boolean) => void;
  showTime?: boolean;
}) {
  const time = todo.dueDate ? new Date(todo.dueDate) : null;
  const timeStr =
    showTime && time
      ? `${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}`
      : null;

  return (
    <TouchableOpacity
      style={[
        dayBlockStyles.container,
        todo.completed ? dayBlockStyles.completed : dayBlockStyles.active,
      ]}
      onPress={() => onToggle(todo.id, !todo.completed)}
      activeOpacity={0.7}
    >
      <View style={[dayBlockStyles.checkbox, todo.completed && dayBlockStyles.checkboxChecked]}>
        {todo.completed && <Text style={dayBlockStyles.checkMark}>{"\u2713"}</Text>}
      </View>
      <Text
        style={[dayBlockStyles.title, todo.completed && dayBlockStyles.titleCompleted]}
        numberOfLines={1}
      >
        {todo.title}
      </Text>
      {timeStr && <Text style={dayBlockStyles.time}>{timeStr}</Text>}
    </TouchableOpacity>
  );
}

const dayBlockStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
    marginBottom: 4,
    borderWidth: 1,
  },
  active: {
    backgroundColor: "rgba(99,102,241,0.1)",
    borderColor: "rgba(99,102,241,0.2)",
  },
  completed: {
    backgroundColor: "rgba(34,197,94,0.1)",
    borderColor: "rgba(34,197,94,0.2)",
    opacity: 0.7,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "rgba(99,102,241,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#6366f1",
    borderColor: "#6366f1",
  },
  checkMark: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },
  title: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: "#1f2937",
  },
  titleCompleted: {
    textDecorationLine: "line-through",
    color: "#9ca3af",
  },
  time: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "500",
  },
});

// ==================== Month View ====================

function MonthView({
  currentDate,
  todos,
  onDayPress,
}: {
  currentDate: Date;
  todos: Todo[];
  onDayPress: (date: Date) => void;
}) {
  const today = startOfDay(new Date());
  const days = useMemo(
    () => getMonthDays(currentDate.getFullYear(), currentDate.getMonth()),
    [currentDate]
  );

  return (
    <View style={monthStyles.card}>
      {/* Day name headers */}
      <View style={monthStyles.headerRow}>
        {DAY_NAMES.map((name) => (
          <View key={name} style={monthStyles.headerCell}>
            <Text style={monthStyles.headerText}>{name}</Text>
          </View>
        ))}
      </View>

      {/* Day cells - 6 rows of 7 */}
      {Array.from({ length: 6 }, (_, row) => (
        <View key={row} style={monthStyles.row}>
          {days.slice(row * 7, row * 7 + 7).map((day, col) => {
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const isToday = isSameDay(day, today);
            const dayTodos = getTodosForDay(todos, day);

            return (
              <TouchableOpacity
                key={col}
                style={[
                  monthStyles.cell,
                  isToday && monthStyles.cellToday,
                ]}
                onPress={() => onDayPress(day)}
                activeOpacity={0.6}
              >
                <Text
                  style={[
                    monthStyles.dayNumber,
                    isToday && monthStyles.dayNumberToday,
                    !isCurrentMonth && monthStyles.dayNumberOther,
                  ]}
                >
                  {day.getDate()}
                </Text>
                <TodoDots count={dayTodos.length} />
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const monthStyles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.65)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    padding: 8,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  headerRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  headerCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
  },
  headerText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
  },
  cell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
    minHeight: 48,
    borderRadius: 10,
    margin: 1,
  },
  cellToday: {
    backgroundColor: "rgba(99,102,241,0.12)",
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.25)",
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1f2937",
  },
  dayNumberToday: {
    color: "#6366f1",
    fontWeight: "700",
  },
  dayNumberOther: {
    opacity: 0.35,
  },
});

// ==================== Week View ====================

function WeekView({
  currentDate,
  todos,
  onToggle,
}: {
  currentDate: Date;
  todos: Todo[];
  onToggle: (id: string, completed: boolean) => void;
}) {
  const today = startOfDay(new Date());
  const weekStart = useMemo(() => getWeekStart(currentDate), [currentDate]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  return (
    <ScrollView
      style={{ marginHorizontal: 16 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {weekDays.map((day, i) => {
        const isToday = isSameDay(day, today);
        const dayTodos = getTodosForDay(todos, day);

        return (
          <View
            key={i}
            style={[
              weekStyles.dayCard,
              isToday && weekStyles.dayCardToday,
            ]}
          >
            <View style={weekStyles.dayHeader}>
              <Text style={[weekStyles.dayName, isToday && weekStyles.dayNameToday]}>
                {DAY_NAMES[day.getDay()]}
              </Text>
              <Text style={[weekStyles.dayNum, isToday && weekStyles.dayNumToday]}>
                {day.getDate()}
              </Text>
              <Text style={weekStyles.todoCount}>
                {dayTodos.length > 0 ? `${dayTodos.length}\u9879` : ""}
              </Text>
            </View>
            {dayTodos.length > 0 ? (
              <View style={weekStyles.todoList}>
                {dayTodos.map((todo) => (
                  <CompactTodoItem key={todo.id} todo={todo} onToggle={onToggle} />
                ))}
              </View>
            ) : (
              <Text style={weekStyles.noTodos}>{"\u65e0\u5f85\u529e"}</Text>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const weekStyles = StyleSheet.create({
  dayCard: {
    backgroundColor: "rgba(255,255,255,0.55)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    padding: 12,
    marginBottom: 8,
  },
  dayCardToday: {
    backgroundColor: "rgba(255,255,255,0.75)",
    borderColor: "rgba(99,102,241,0.3)",
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  dayName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
  },
  dayNameToday: {
    color: "#6366f1",
  },
  dayNum: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
  },
  dayNumToday: {
    color: "#6366f1",
  },
  todoCount: {
    fontSize: 11,
    color: "#9ca3af",
    marginLeft: "auto",
  },
  todoList: {
    gap: 2,
  },
  noTodos: {
    fontSize: 12,
    color: "#9ca3af",
    fontStyle: "italic",
  },
});

// ==================== Day View ====================

function DayView({
  currentDate,
  todos,
  onToggle,
}: {
  currentDate: Date;
  todos: Todo[];
  onToggle: (id: string, completed: boolean) => void;
}) {
  const dayTodos = useMemo(
    () => getTodosForDay(todos, currentDate),
    [todos, currentDate]
  );

  const allDayTodos = useMemo(
    () => dayTodos.filter((t) => parseTodoHour(t) === null),
    [dayTodos]
  );

  const timedTodos = useMemo(() => {
    const map = new Map<number, Todo[]>();
    for (const t of dayTodos) {
      const hour = parseTodoHour(t);
      if (hour === null) continue;
      if (!map.has(hour)) map.set(hour, []);
      map.get(hour)!.push(t);
    }
    return map;
  }, [dayTodos]);

  return (
    <ScrollView
      style={{ marginHorizontal: 16 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      <View style={dayViewStyles.card}>
        {/* All Day section */}
        {allDayTodos.length > 0 && (
          <View style={dayViewStyles.allDaySection}>
            <Text style={dayViewStyles.allDayLabel}>{"\u5168\u5929"}</Text>
            {allDayTodos.map((todo) => (
              <DayTodoBlock key={todo.id} todo={todo} onToggle={onToggle} />
            ))}
          </View>
        )}

        {/* 24h timeline */}
        {HOURS.map((hour) => {
          const hourTodos = timedTodos.get(hour) || [];
          return (
            <View key={hour} style={dayViewStyles.hourRow}>
              <View style={dayViewStyles.hourLabelBox}>
                <Text style={dayViewStyles.hourLabel}>
                  {String(hour).padStart(2, "0")}:00
                </Text>
              </View>
              <View style={dayViewStyles.hourContent}>
                {hourTodos.map((todo) => (
                  <DayTodoBlock
                    key={todo.id}
                    todo={todo}
                    onToggle={onToggle}
                    showTime
                  />
                ))}
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const dayViewStyles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.65)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  allDaySection: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  allDayLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  hourRow: {
    flexDirection: "row",
    minHeight: 44,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  hourLabelBox: {
    width: 50,
    paddingRight: 8,
    paddingTop: 4,
    alignItems: "flex-end",
  },
  hourLabel: {
    fontSize: 11,
    color: "#9ca3af",
    fontWeight: "500",
  },
  hourContent: {
    flex: 1,
    paddingLeft: 8,
    paddingVertical: 2,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: "rgba(0,0,0,0.08)",
  },
});

// ==================== Main Calendar Screen ====================

export function CalendarScreen() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState<Date>(() => startOfDay(new Date()));

  // Fetch todos (same query key as TodoListScreen, shared cache)
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

  // Toggle mutation
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

  const activeTodos = useMemo(
    () => todos.filter((t) => !t.deletedAt),
    [todos]
  );

  const handleToggle = useCallback(
    (id: string, completed: boolean) => {
      toggleMutation.mutate({ id, completed });
    },
    [toggleMutation]
  );

  const goToday = useCallback(() => setCurrentDate(startOfDay(new Date())), []);

  const goPrev = useCallback(() => {
    setCurrentDate((d) => {
      if (view === "month") return new Date(d.getFullYear(), d.getMonth() - 1, 1);
      if (view === "week") return addDays(d, -7);
      return addDays(d, -1);
    });
  }, [view]);

  const goNext = useCallback(() => {
    setCurrentDate((d) => {
      if (view === "month") return new Date(d.getFullYear(), d.getMonth() + 1, 1);
      if (view === "week") return addDays(d, 7);
      return addDays(d, 1);
    });
  }, [view]);

  const handleDayPress = useCallback((date: Date) => {
    setCurrentDate(date);
    setView("day");
  }, []);

  const headerTitle = useMemo(() => {
    if (view === "month") return formatMonthYear(currentDate);
    if (view === "week") return formatWeekRange(getWeekStart(currentDate));
    return formatDayHeader(currentDate);
  }, [view, currentDate]);

  return (
    <LinearGradient
      colors={["#667eea", "#764ba2", "#f093fb"]}
      style={calStyles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Header / Toolbar */}
      <View style={calStyles.toolbar}>
        <Text style={calStyles.title}>{headerTitle}</Text>

        <View style={calStyles.navRow}>
          <TouchableOpacity style={calStyles.navBtn} onPress={goPrev} activeOpacity={0.7}>
            <Text style={calStyles.navBtnText}>{"\u25c0"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={calStyles.navBtn} onPress={goToday} activeOpacity={0.7}>
            <Text style={calStyles.navBtnTextLabel}>{"\u4eca\u5929"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={calStyles.navBtn} onPress={goNext} activeOpacity={0.7}>
            <Text style={calStyles.navBtnText}>{"\u25b6"}</Text>
          </TouchableOpacity>
        </View>

        {/* View switcher */}
        <View style={calStyles.viewSwitch}>
          {(["month", "week", "day"] as ViewMode[]).map((v) => (
            <TouchableOpacity
              key={v}
              style={[calStyles.viewBtn, view === v && calStyles.viewBtnActive]}
              onPress={() => setView(v)}
              activeOpacity={0.7}
            >
              <Text style={[calStyles.viewBtnText, view === v && calStyles.viewBtnTextActive]}>
                {v === "month" ? "\u6708" : v === "week" ? "\u5468" : "\u65e5"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      {view === "month" && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={() => refetch()} tintColor="#fff" />
          }
        >
          <MonthView
            currentDate={currentDate}
            todos={activeTodos}
            onDayPress={handleDayPress}
          />
        </ScrollView>
      )}
      {view === "week" && (
        <WeekView
          currentDate={currentDate}
          todos={activeTodos}
          onToggle={handleToggle}
        />
      )}
      {view === "day" && (
        <DayView
          currentDate={currentDate}
          todos={activeTodos}
          onToggle={handleToggle}
        />
      )}
    </LinearGradient>
  );
}

const calStyles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  toolbar: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.15)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  navRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  navBtn: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  navBtnText: {
    color: "#fff",
    fontSize: 14,
  },
  navBtnTextLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  viewSwitch: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    padding: 3,
    alignSelf: "center",
  },
  viewBtn: {
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderRadius: 10,
  },
  viewBtnActive: {
    backgroundColor: "#6366f1",
    shadowColor: "#6366f1",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  viewBtnText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
    fontWeight: "600",
  },
  viewBtnTextActive: {
    color: "#fff",
  },
});
