import { useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertTriangle, Download } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/common/States';
import { adminService } from '@/services/contentService';
import { parseApiError } from '@/services/api';
import { toast } from 'sonner';

export default function BulkQuestionImporter() {
  const [jsonText, setJsonText] = useState('');
  const [filename, setFilename] = useState('questions.json');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = String(event.target?.result || '');
        if (file.name.endsWith('.json')) {
          setJsonText(text);
        } else if (file.name.endsWith('.csv')) {
          // Parse basic CSV to JSON array
          const rows = text.split('\n').filter((r) => r.trim());
          const headers = rows[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
          const items = [];
          for (let i = 1; i < rows.length; i++) {
            const cols = rows[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
            const obj = {};
            headers.forEach((h, idx) => {
              obj[h] = cols[idx] || '';
            });
            items.push(obj);
          }
          setJsonText(JSON.stringify(items, null, 2));
        } else {
          setJsonText(text);
        }
      } catch {
        setError('Failed to read uploaded file format.');
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);

    let parsedQuestions;
    try {
      parsedQuestions = JSON.parse(jsonText);
      if (!Array.isArray(parsedQuestions)) {
        setError('Import payload must be a JSON array of questions.');
        return;
      }
    } catch {
      setError('Invalid JSON syntax in question batch.');
      return;
    }

    setImporting(true);
    try {
      const data = await adminService.bulkImportQuestions({
        filename,
        questions: parsedQuestions,
      });
      setResult(data);
      toast.success(`Import complete! Valid: ${data.validRows}, Invalid: ${data.invalidRows}, Duplicates: ${data.duplicateRows}`);
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.message);
      toast.error(parsed.message);
    } finally {
      setImporting(false);
    }
  };

  const sampleTemplate = `[
  {
    "topicId": "REPLACE_WITH_VALID_TOPIC_OBJECT_ID",
    "title": "Example Question Title",
    "description": "Complete problem statement or scenario description.",
    "type": "single_choice",
    "difficulty": "Easy",
    "options": [
      { "id": "opt_1", "text": "Option A" },
      { "id": "opt_2", "text": "Option B" }
    ],
    "correctAnswer": "opt_1",
    "explanation": "Explanation for why Option A is the correct answer.",
    "hints": ["Hint 1"],
    "tags": ["dsa", "sample"]
  }
]`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-xl border bg-card p-6 shadow-xs">
        <h1 className="text-2xl font-bold tracking-tight">Bulk Question Importer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Import batches of questions via JSON or CSV files into the <strong>Admin Review Queue</strong>.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload or Paste Questions</CardTitle>
          <CardDescription>
            All imported questions undergo schema verification and duplicate detection before being placed in Draft status for review.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormAlert message={error} />

          {/* File Picker */}
          <div className="flex items-center gap-4 border-2 border-dashed rounded-xl p-6 text-center justify-center">
            <Upload className="size-6 text-muted-foreground" />
            <div>
              <label htmlFor="file-upload" className="cursor-pointer font-medium text-primary hover:underline">
                Upload CSV or JSON file
                <input
                  id="file-upload"
                  type="file"
                  accept=".json,.csv"
                  onChange={handleFileUpload}
                  className="sr-only"
                />
              </label>
              <p className="text-xs text-muted-foreground">JSON arrays or CSV with matching header keys</p>
            </div>
          </div>

          {/* Text Area */}
          <form onSubmit={handleImport} className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Batch Payload (JSON Array):</span>
                <button
                  type="button"
                  onClick={() => setJsonText(sampleTemplate)}
                  className="text-primary hover:underline"
                >
                  Load Sample Template
                </button>
              </div>
              <textarea
                rows={10}
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder="Paste JSON array here..."
                className="w-full font-mono text-xs rounded-md border border-input bg-card p-3 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" loading={importing} disabled={!jsonText.trim()}>
                Run Batch Import
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Import Result Summary & Error Report */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="size-5 text-success" /> Import Batch Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="rounded-md bg-muted p-3">
                <p className="font-semibold text-lg">{result.totalRows}</p>
                <p className="text-muted-foreground">Total Rows</p>
              </div>
              <div className="rounded-md bg-success/10 text-success p-3">
                <p className="font-semibold text-lg">{result.validRows}</p>
                <p>Imported</p>
              </div>
              <div className="rounded-md bg-amber-500/10 text-amber-600 p-3">
                <p className="font-semibold text-lg">{result.duplicateRows}</p>
                <p>Duplicates</p>
              </div>
              <div className="rounded-md bg-destructive/10 text-destructive p-3">
                <p className="font-semibold text-lg">{result.invalidRows}</p>
                <p>Invalid</p>
              </div>
            </div>

            {result.errors?.length > 0 && (
              <div className="space-y-2 border-t pt-3">
                <h4 className="text-xs font-semibold text-destructive uppercase tracking-wider">
                  Row Validation Errors ({result.errors.length})
                </h4>
                <div className="max-h-48 overflow-y-auto divide-y rounded-md border bg-card text-xs">
                  {result.errors.map((err, i) => (
                    <div key={i} className="p-2 flex items-center justify-between">
                      <span>
                        <strong>Row {err.row}:</strong> {err.message}
                      </span>
                      {err.field && <code className="text-[10px] text-muted-foreground">[{err.field}]</code>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

