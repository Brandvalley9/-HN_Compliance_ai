import React, { useState } from 'react';
import { Plus, X, ListPlus, AlertCircle } from 'lucide-react';

interface StringListInputProps {
  id: string;
  label: string;
  description?: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  badgeColor?: 'green' | 'red' | 'blue' | 'slate';
}

export const StringListInput: React.FC<StringListInputProps> = ({
  id,
  label,
  description,
  items,
  onChange,
  placeholder = 'Type item and press Add...',
  badgeColor = 'slate'
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (!items.includes(trimmed)) {
      onChange([...items, trimmed]);
    }
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleRemove = (indexToRemove: number) => {
    onChange(items.filter((_, idx) => idx !== indexToRemove));
  };

  const colorStyles = {
    green: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    red: 'bg-rose-50 text-rose-800 border-rose-200',
    blue: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    slate: 'bg-slate-100 text-slate-800 border-slate-200'
  }[badgeColor];

  return (
    <div id={`container-${id}`} className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
          <ListPlus className="w-3.5 h-3.5 text-slate-500" />
          {label}
        </label>
        <span className="text-[11px] text-slate-600 font-medium">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {description && (
        <p className="text-[11px] text-slate-600 leading-tight">
          {description}
        </p>
      )}

      {/* Input row */}
      <div className="flex gap-2">
        <input
          id={`input-${id}`}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white placeholder:text-slate-400"
        />
        <button
          id={`add-btn-${id}`}
          type="button"
          onClick={handleAdd}
          disabled={!inputValue.trim()}
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
      </div>

      {/* Chips list */}
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {items.map((item, index) => (
            <span
              key={`${item}-${index}`}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border font-medium transition-all ${colorStyles}`}
            >
              <span>{item}</span>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="hover:opacity-75 focus:outline-hidden p-0.5 rounded-xs"
                title={`Remove ${item}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <div className="text-[11px] text-slate-600 italic py-1">
          No items added yet.
        </div>
      )}
    </div>
  );
};
