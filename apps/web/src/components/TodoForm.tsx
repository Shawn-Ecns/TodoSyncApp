import { useState, type FormEvent } from "react";

interface TodoFormProps {
  onAdd: (title: string, description?: string, dueDate?: string) => void;
}

export function TodoForm({ onAdd }: TodoFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [showDesc, setShowDesc] = useState(false);
  const [showDate, setShowDate] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(
      title.trim(),
      description.trim() || undefined,
      dueDate ? new Date(dueDate).toISOString() : undefined
    );
    setTitle("");
    setDescription("");
    setDueDate("");
    setShowDesc(false);
    setShowDate(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="添加新待办..."
          className="flex-1 px-4 py-2.5 bg-white/80 border border-white/40 rounded-xl text-gray-800 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 focus:bg-white transition-all"
          maxLength={500}
        />
        {/* Date toggle */}
        <button
          type="button"
          onClick={() => setShowDate(!showDate)}
          className={`px-3 py-2 rounded-xl transition-all text-sm ${
            showDate || dueDate
              ? "bg-primary/15 text-primary border border-primary/30"
              : "bg-white/60 text-gray-400 border border-white/40 hover:text-primary hover:bg-white/80"
          }`}
          title="设置日期时间"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
        {/* Description toggle */}
        <button
          type="button"
          onClick={() => setShowDesc(!showDesc)}
          className={`px-3 py-2 rounded-xl transition-all text-sm ${
            showDesc
              ? "bg-accent/15 text-accent border border-accent/30"
              : "bg-white/60 text-gray-400 border border-white/40 hover:text-accent hover:bg-white/80"
          }`}
          title="添加描述"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        </button>
        <button
          type="submit"
          disabled={!title.trim()}
          className="px-5 py-2 bg-gradient-to-r from-primary to-accent text-white font-semibold text-sm rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:brightness-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
        >
          添加
        </button>
      </div>

      {/* Date picker */}
      {showDate && (
        <div className="flex items-center gap-2">
          <input
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="flex-1 px-4 py-2 bg-white/80 border border-white/40 rounded-xl text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white transition-all"
          />
          {dueDate && (
            <button
              type="button"
              onClick={() => setDueDate("")}
              className="px-3 py-2 text-gray-400 hover:text-danger text-sm rounded-xl hover:bg-white/60 transition-all"
            >
              清除
            </button>
          )}
        </div>
      )}

      {showDesc && (
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="添加描述（可选）..."
          className="w-full px-4 py-2 bg-white/80 border border-white/40 rounded-xl text-gray-800 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white resize-none transition-all"
          rows={2}
          maxLength={5000}
        />
      )}
    </form>
  );
}
