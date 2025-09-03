import React, { useState } from 'react';

const JsonInput = ({ onDataLoad }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileUpload = async (file) => {
    setIsLoading(true);
    setError(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.output || !Array.isArray(data.output)) {
        throw new Error('Invalid JSON format: missing "output" array');
      }

      onDataLoad(data);
    } catch (err) {
      setError(`Error parsing JSON: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const jsonFile = files.find(file => file.type === 'application/json' || file.name.endsWith('.json'));

    if (jsonFile) {
      handleFileUpload(jsonFile);
    } else {
      setError('Please upload a JSON file');
    }
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleTextPaste = async (e) => {
    const text = e.target.value;
    if (text.trim()) {
      setIsLoading(true);
      setError(null);

      try {
        const data = JSON.parse(text);

        if (!data.output || !Array.isArray(data.output)) {
          throw new Error('Invalid JSON format: missing "output" array');
        }

        onDataLoad(data);
        e.target.value = ''; // Clear the textarea
      } catch (err) {
        setError(`Error parsing JSON: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold">Load JSON Data</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Drop a file or paste JSON to render the feed.</p>
        </div>
      </div>

      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${isDragOver ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-900/10' : 'border-gray-300 dark:border-gray-700 hover:border-gray-400'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
          <svg className="w-6 h-6 text-gray-500 dark:text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 16a4 4 0 0 1-.88-7.903A5 5 0 1 1 15.9 6L16 6a5 5 0 0 1 1 9.9"/>
            <path d="M15 13l-3-3-3 3"/>
            <path d="M12 10v12"/>
          </svg>
        </div>
        <p className="text-gray-700 dark:text-gray-200 mb-2">Drag & drop a JSON file here</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">or choose a file from your computer</p>
        <label className="btn-primary cursor-pointer">
          Choose File
          <input type="file" accept=".json,application/json" onChange={handleFileInput} className="hidden" />
        </label>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium mb-2">Or paste JSON directly:</label>
        <textarea
          className="w-full h-36 p-3 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Paste your JSON data here..."
          onChange={handleTextPaste}
        />
      </div>

      {isLoading && (
        <div className="mt-4 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-600 dark:text-gray-300">Processing JSON...</span>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-rose-100/80 dark:bg-rose-900/30 border border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200 rounded">
          {error}
        </div>
      )}
    </div>
  );
};

export default JsonInput;
