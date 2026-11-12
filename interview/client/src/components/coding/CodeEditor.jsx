import React from 'react';
import Editor from '@monaco-editor/react';

export default function CodeEditor({
  language = 'python',
  value = '',
  onChange,
  theme = 'vs-dark',
  fontSize = 14,
  readOnly = false,
}) {
  const getMonacoLanguage = (lang) => {
    switch (lang) {
      case 'cpp':
        return 'cpp';
      case 'java':
        return 'java';
      case 'python':
        return 'python';
      case 'javascript':
        return 'javascript';
      default:
        return 'python';
    }
  };

  return (
    <div className="w-full h-full min-h-[350px] overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
      <Editor
        height="100%"
        language={getMonacoLanguage(language)}
        value={value}
        onChange={(val) => onChange?.(val || '')}
        theme={theme}
        options={{
          fontSize,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          readOnly,
          tabSize: 4,
          wordWrap: 'on',
          lineNumbers: 'on',
          bracketPairColorization: { enabled: true },
        }}
      />
    </div>
  );
}

