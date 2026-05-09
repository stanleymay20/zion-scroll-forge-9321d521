/**
 * AI Content Creator Component
 * "Whatever is true, whatever is noble, whatever is right... think about such things" - Philippians 4:8
 * 
 * Interface for faculty to create course content with AI assistance
 */

import React, { useState } from 'react';
import { legacyApiCall } from "@/lib/legacyApi";
import {
  BookOpen,
  FileText,
  CheckSquare,
  Sparkles,
  Save,
  Eye,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Loader
} from 'lucide-react';

interface ContentCreationRequest {
  type: 'lecture' | 'assessment' | 'resource';
  topic: string;
  objectives: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  count?: number;
}

interface GeneratedContent {
  id: string;
  type: string;
  content: string;
  metadata: {
    topic: string;
    objectives: string[];
    confidence: number;
    theologicalAlignment: number;
  };
  status: 'draft' | 'review' | 'approved';
}

export const AIContentCreator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'lecture' | 'assessment' | 'resource'>('lecture');
  const [topic, setTopic] = useState('');
  const [objectives, setObjectives] = useState<string[]>(['']);
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAddObjective = () => {
    setObjectives([...objectives, '']);
  };

  const handleObjectiveChange = (index: number, value: string) => {
    const newObjectives = [...objectives];
    newObjectives[index] = value;
    setObjectives(newObjectives);
  };

  const handleRemoveObjective = (index: number) => {
    setObjectives(objectives.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (!topic.trim() || objectives.filter(o => o.trim()).length === 0) {
      setError('Please provide a topic and at least one learning objective');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const endpoint = activeTab === 'lecture' 
        ? '/api/ai-unified/content/lecture'
        : activeTab === 'assessment'
        ? '/api/ai-unified/content/assessment'
        : '/api/ai-unified/content/resources';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          topic,
          objectives: objectives.filter(o => o.trim()),
          difficulty: activeTab === 'assessment' ? difficulty : undefined,
          count: activeTab === 'assessment' ? count : undefined
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate content');
      }

      setGeneratedContent({
        id: Date.now().toString(),
        type: activeTab,
        content: JSON.stringify(result.data, null, 2),
        metadata: {
          topic,
          objectives: objectives.filter(o => o.trim()),
          confidence: result.data.confidence || 0.9,
          theologicalAlignment: result.data.theologicalAlignment || 0.95
        },
        status: 'draft'
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!generatedContent) return;

    try {
      const response = await legacyApiCall('/api/ai-unified/content/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(generatedContent)
      });

      const result = await response.json();

      if (result.success) {
        setGeneratedContent({
          ...generatedContent,
          status: 'approved'
        });
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRegenerate = () => {
    setGeneratedContent(null);
    handleGenerate();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6">
        <div className="flex items-center gap-3">
          <Sparkles className="w-8 h-8" />
          <div>
            <h1 className="text-3xl font-bold">AI Content Creator</h1>
            <p className="text-sm opacity-90 mt-1">
              Generate world-class course content with AI assistance
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Content Configuration</h2>

          {/* Content Type Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('lecture')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                activeTab === 'lecture'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <BookOpen className="w-5 h-5 mx-auto mb-1" />
              Lecture
            </button>
            <button
              onClick={() => setActiveTab('assessment')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                activeTab === 'assessment'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <CheckSquare className="w-5 h-5 mx-auto mb-1" />
              Assessment
            </button>
            <button
              onClick={() => setActiveTab('resource')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                activeTab === 'resource'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FileText className="w-5 h-5 mx-auto mb-1" />
              Resources
            </button>
          </div>

          {/* Topic Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Topic
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Introduction to Biblical Hermeneutics"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Learning Objectives */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Learning Objectives
            </label>
            <div className="space-y-2">
              {objectives.map((objective, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={objective}
                    onChange={(e) => handleObjectiveChange(index, e.target.value)}
                    placeholder={`Objective ${index + 1}`}
                    className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {objectives.length > 1 && (
                    <button
                      onClick={() => handleRemoveObjective(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={handleAddObjective}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              + Add Objective
            </button>
          </div>

          {/* Assessment-specific options */}
          {activeTab === 'assessment' && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Difficulty Level
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Questions
                </label>
                <input
                  type="number"
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value))}
                  min="1"
                  max="50"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Content
              </>
            )}
          </button>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>

        {/* Preview Panel */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Generated Content</h2>
            {generatedContent && (
              <div className="flex gap-2">
                <button
                  onClick={handleRegenerate}
                  className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Regenerate
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
              </div>
            )}
          </div>

          {!generatedContent ? (
            <div className="text-center text-gray-500 py-12">
              <Eye className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>Generated content will appear here</p>
              <p className="text-sm mt-2">Configure your content and click Generate</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Quality Indicators */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">AI Confidence</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">
                    {(generatedContent.metadata.confidence * 100).toFixed(0)}%
                  </p>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium text-purple-900">Theological Alignment</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">
                    {(generatedContent.metadata.theologicalAlignment * 100).toFixed(0)}%
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  generatedContent.status === 'approved'
                    ? 'bg-green-100 text-green-800'
                    : generatedContent.status === 'review'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {generatedContent.status.toUpperCase()}
                </span>
              </div>

              {/* Content Preview */}
              <div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                  {generatedContent.content}
                </pre>
              </div>

              {/* Metadata */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Metadata</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Topic:</strong> {generatedContent.metadata.topic}</p>
                  <p><strong>Objectives:</strong></p>
                  <ul className="list-disc list-inside ml-4">
                    {generatedContent.metadata.objectives.map((obj, idx) => (
                      <li key={idx}>{obj}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Spiritual Encouragement */}
      <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg p-6 border border-purple-200">
        <h3 className="text-lg font-semibold mb-2 text-purple-900">
          Faculty Guidance
        </h3>
        <p className="text-purple-800 italic mb-3">
          "Let the word of Christ dwell in you richly, teaching and admonishing one another in all wisdom" - Colossians 3:16
        </p>
        <p className="text-purple-700">
          AI-generated content is a starting point. Please review, refine, and infuse your unique teaching style and spiritual insights before publishing to students.
        </p>
      </div>
    </div>
  );
};
