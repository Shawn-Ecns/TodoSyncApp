import { useState, useMemo, useCallback } from "react";
import type { Todo } from "@todo-sync/shared";

// ==================== Types ====================

type ViewMode = "month" | "week" | "day";

interface CalendarProps {
  todos: Todo[];
  onToggle: (id: string, completed: boolean) => void;
}

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
  const startOffset = first.getDay(); // 0=Sun
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
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatWeekRange(start: Date): string {
  const end = addDays(start, 6);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}, ${end.getFullYear()}`;
}

function formatDayHeader(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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
  // Treat midnight with no minutes as "all day"
  if (h === 0 && m === 0) return null;
  return h;
}

// ==================== Sub-components ====================

function NavButton({
  onClick,
  children,
  title,
}: {
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="px-3 py-1.5 rounded-lg glass text-gray-600 hover:text-gray-800 hover:bg-white/50 transition-all duration-200 text-sm font-medium"
    >
      {children}
    </button>
  );
}

function ViewButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
        active
          ? "bg-gradient-to-r from-[#6366f1] to-[#818cf8] text-white shadow-md shadow-primary/25"
          : "glass text-gray-600 hover:text-gray-800 hover:bg-white/50"
      }`}
    >
      {children}
    </button>
  );
}

function TodoDots({ count }: { count: number }) {
  if (count === 0) return null;
  const dots = Math.min(count, 3);
  const colors = ["bg-primary", "bg-[#ec4899]", "bg-[#22c55e]"];
  return (
    <div className="flex items-center justify-center gap-0.5 mt-0.5">
      {Array.from({ length: dots }, (_, i) => (
        <span key={i} className={`w-1.5 h-1.5 rounded-full ${colors[i % 3]}`} />
      ))}
      {count > 3 && (
        <span className="text-[9px] text-gray-400 ml-0.5">+{count - 3}</span>
      )}
    </div>
  );
}

function CompactTodoItem({
  todo,
  onToggle,
}: {
  todo: Todo;
  onToggle: (id: string, completed: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 py-0.5 cursor-pointer group">
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => onToggle(todo.id, !todo.completed)}
        className="w-3.5 h-3.5 rounded accent-[#6366f1] flex-shrink-0"
      />
      <span
        className={`text-xs truncate ${
          todo.completed
            ? "line-through text-gray-400"
            : "text-gray-700 group-hover:text-gray-900"
        }`}
      >
        {todo.title}
      </span>
    </label>
  );
}

// ==================== Month View ====================

function MonthView({
  currentDate,
  todos,
  onDayClick,
}: {
  currentDate: Date;
  todos: Todo[];
  onDayClick: (date: Date) => void;
}) {
  const today = startOfDay(new Date());
  const days = useMemo(
    () => getMonthDays(currentDate.getFullYear(), currentDate.getMonth()),
    [currentDate]
  );

  return (
    <div className="glass rounded-2xl p-4">
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {DAY_NAMES.map((name) => (
          <div
            key={name}
            className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wider py-1"
          >
            {name}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const isToday = isSameDay(day, today);
          const dayTodos = getTodosForDay(todos, day);

          return (
            <button
              key={i}
              onClick={() => onDayClick(day)}
              className={`relative p-1.5 rounded-xl text-center min-h-[60px] transition-all duration-200 ${
                isToday
                  ? "bg-primary/10 ring-2 ring-primary/30"
                  : "hover:bg-white/40"
              } ${!isCurrentMonth ? "opacity-40" : ""}`}
            >
              <span
                className={`text-sm font-medium ${
                  isToday ? "text-primary" : "text-gray-700"
                }`}
              >
                {day.getDate()}
              </span>
              <TodoDots count={dayTodos.length} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

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
    <div className="glass rounded-2xl p-4">
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day, i) => {
          const isToday = isSameDay(day, today);
          const dayTodos = getTodosForDay(todos, day);

          return (
            <div
              key={i}
              className={`rounded-xl p-2 min-h-[200px] transition-all duration-200 ${
                isToday
                  ? "bg-primary/5 ring-1 ring-primary/20"
                  : "bg-white/20"
              }`}
            >
              {/* Column header */}
              <div className="text-center mb-2 pb-2 border-b border-white/20">
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  {DAY_NAMES[i]}
                </div>
                <div
                  className={`text-lg font-bold ${
                    isToday ? "text-primary" : "text-gray-700"
                  }`}
                >
                  {day.getDate()}
                </div>
              </div>

              {/* Todos list */}
              <div className="space-y-0.5">
                {dayTodos.map((todo) => (
                  <CompactTodoItem
                    key={todo.id}
                    todo={todo}
                    onToggle={onToggle}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
    <div className="glass rounded-2xl p-4">
      {/* All Day section */}
      {allDayTodos.length > 0 && (
        <div className="mb-4 pb-3 border-b border-white/20">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            All Day
          </div>
          <div className="space-y-1.5">
            {allDayTodos.map((todo) => (
              <DayTodoBlock key={todo.id} todo={todo} onToggle={onToggle} />
            ))}
          </div>
        </div>
      )}

      {/* 24h timeline */}
      <div className="relative">
        {HOURS.map((hour) => {
          const hourTodos = timedTodos.get(hour) || [];
          return (
            <div
              key={hour}
              className="flex min-h-[52px] border-t border-white/10"
            >
              {/* Hour label */}
              <div className="w-14 flex-shrink-0 pr-3 pt-1 text-right">
                <span className="text-xs text-gray-400 font-medium">
                  {String(hour).padStart(2, "0")}:00
                </span>
              </div>

              {/* Slot content */}
              <div className="flex-1 py-1 pl-3 border-l border-white/15 space-y-1">
                {hourTodos.map((todo) => (
                  <DayTodoBlock
                    key={todo.id}
                    todo={todo}
                    onToggle={onToggle}
                    showTime
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
      ? time.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      : null;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
        todo.completed
          ? "bg-[#22c55e]/10 border border-[#22c55e]/20 opacity-60"
          : "bg-primary/10 border border-primary/20 hover:bg-primary/15"
      }`}
    >
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => onToggle(todo.id, !todo.completed)}
        className="w-4 h-4 rounded accent-[#6366f1] flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <span
          className={`text-sm font-medium block truncate ${
            todo.completed ? "line-through text-gray-400" : "text-gray-800"
          }`}
        >
          {todo.title}
        </span>
      </div>
      {timeStr && (
        <span className="text-xs text-gray-400 flex-shrink-0 font-medium">
          {timeStr}
        </span>
      )}
    </div>
  );
}

// ==================== Main Calendar ====================

export function Calendar({ todos, onToggle }: CalendarProps) {
  const [view, setView] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState<Date>(() => startOfDay(new Date()));

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

  const handleDayClick = useCallback((date: Date) => {
    setCurrentDate(date);
    setView("day");
  }, []);

  // Filter out soft-deleted todos
  const activeTodos = useMemo(
    () => todos.filter((t) => !t.deletedAt),
    [todos]
  );

  const headerTitle = useMemo(() => {
    if (view === "month") return formatMonthYear(currentDate);
    if (view === "week") return formatWeekRange(getWeekStart(currentDate));
    return formatDayHeader(currentDate);
  }, [view, currentDate]);

  return (
    <div className="w-full space-y-4">
      {/* Toolbar */}
      <div className="glass rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <NavButton onClick={goPrev} title="Previous">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </NavButton>
          <NavButton onClick={goToday}>Today</NavButton>
          <NavButton onClick={goNext} title="Next">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </NavButton>
        </div>

        {/* Title */}
        <h2 className="text-lg font-bold text-gray-800 order-first sm:order-none">
          {headerTitle}
        </h2>

        {/* View switcher */}
        <div className="flex items-center gap-1 p-1 glass rounded-xl">
          <ViewButton active={view === "month"} onClick={() => setView("month")}>
            Month
          </ViewButton>
          <ViewButton active={view === "week"} onClick={() => setView("week")}>
            Week
          </ViewButton>
          <ViewButton active={view === "day"} onClick={() => setView("day")}>
            Day
          </ViewButton>
        </div>
      </div>

      {/* View content */}
      {view === "month" && (
        <MonthView
          currentDate={currentDate}
          todos={activeTodos}
          onDayClick={handleDayClick}
        />
      )}
      {view === "week" && (
        <WeekView
          currentDate={currentDate}
          todos={activeTodos}
          onToggle={onToggle}
        />
      )}
      {view === "day" && (
        <DayView
          currentDate={currentDate}
          todos={activeTodos}
          onToggle={onToggle}
        />
      )}
    </div>
  );
}
