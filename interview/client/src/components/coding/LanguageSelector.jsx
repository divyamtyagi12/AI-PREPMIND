import React from 'react';

const LANGUAGES = [
  { id: 'python', label: 'Python 3' },
  { id: 'cpp', label: 'C++ (GCC 9.2)' },
  { id: 'java', label: 'Java (OpenJDK 13)' },
  { id: 'javascript', label: 'JavaScript (Node.js)' },
];

export default function LanguageSelector({ language, onSelectLanguage, disabled }) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium text-slate-500">Language:</label>
      <select
        value={language}
        onChange={(e) => onSelectLanguage(e.target.value)}
        disabled={disabled}
        className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
      >
        {LANGUAGES.map((l) => (
          <option key={l.id} value={l.id}>
            {l.label}
          </option>
        ))}
      </select>
    </div>
  );
}

