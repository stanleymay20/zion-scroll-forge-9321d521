/**
 * AI Research Assistant Component
 * "The Spirit of truth will guide you into all truth" - John 16:13
 * 
 * Student-facing research assistance interface
 */

import React, { useState } from 'react';
import { legacyApiCall } from "@/lib/legacyApi";
import {
  Search,
  FileText,
  BookOpen,
  Lightbulb,
  Download,
  Copy,
  CheckCircle,
  Loader,
  AlertCircle
} from 'lucide-react';

interface Paper {
  id: string;
  title: string;
  authors: string[];
  year: number;
  abstract: string;
  url: string;
  citations: number;
}

interface LiteratureReview {
  keyPapers: Paper[];
  researchGaps: string[];
  methodologies: string[];
  theoreticalFrameworks: string[];
  summary: string;
}

export const AIResearchAssistant: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'search' | 'review' | 'citations'>('search');
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [literatureReview, setLiteratureReview] = useState<LiteratureReview | null>(null);
  const [citations, setCitations] = useState<string>('');
  const [citationStyle, setCitationStyle] = useState<'APA' | 'MLA' | 'Chicago'>('APA');
  const [copied, setCopied] = useState(false);

  const handleSearch = async () => {
    if (!topic.trim()) {
      setError('Please enter a research topic');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await legacyApiCall('/api/ai-unified/research/literature-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ topic })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to conduct literature review');
      }

      setLiteratureReview(result.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFormatCitations = async () => {
    if (!citations.trim()) {
      setError('Please enter references to format');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await legacyApiCall('/api/ai-unified/research/format-citations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          references: citations,
          style: citationStyle
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to format citations');
      }

      setCitations(result.data.formattedCitations);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(citations);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6">
        <div className="flex items-center gap-3">
          <Search className="w-8 h-8" />
          <div>
            <h1 className="text-3xl font-bold">AI Research Assistant</h1>
            <p className="text-sm opacity-90 mt-1">
              Accelerate your research with AI-powered literature review and citation tools
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
            activeTab === 'search'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Search className="w-5 h-5 mx-auto mb-1" />
          Literature Search
        </button>
        <button
          onClick={() => setActiveTab('review')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
            activeTab === 'review'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <FileText className="w-5 h-5 mx-auto mb-1" />
          Review Results
        </button>
        <button
          onClick={() => setActiveTab('citations')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
            activeTab === 'citations'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <BookOpen className="w-5 h-5 mx-auto mb-1" />
          Citation Formatter
        </button>
      </div>

      {/* Search Tab */}
      {activeTab === 'search' && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Conduct Literature Review</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Research Topic
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Impact of AI on theological education"
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleSearch}
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Search Academic Literature
              </>
            )}
          </button>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">What you'll get:</h3>
            <ul className="space-y-1 text-sm text-blue-800">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Key papers and research articles
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Identified research gaps
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Common methodologies
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Theoretical frameworks
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Review Tab */}
      {activeTab === 'review' && (
        <div className="space-y-6">
          {!literatureReview ? (
            <div className="bg-white rounded-lg shadow-lg p-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">No literature review yet</p>
              <p className="text-sm text-gray-500 mt-2">
                Search for a topic to see results here
              </p>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Research Summary</h2>
                <p className="text-gray-700 leading-relaxed">{literatureReview.summary}</p>
              </div>

              {/* Key Papers */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Key Papers</h2>
                <div className="space-y-4">
                  {literatureReview.keyPapers.map((paper) => (
                    <div key={paper.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                      <h3 className="font-semibold text-gray-900 mb-2">{paper.title}</h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {paper.authors.join(', ')} ({paper.year})
                      </p>
                      <p className="text-sm text-gray-700 mb-3">{paper.abstract}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {paper.citations} citations
                        </span>
                        <a
                          href={paper.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          View Paper
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Research Gaps */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Lightbulb className="w-6 h-6 text-yellow-600" />
                  Research Gaps
                </h2>
                <ul className="space-y-2">
                  {literatureReview.researchGaps.map((gap, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span className="text-gray-700">{gap}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Methodologies */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-semibold mb-4">Common Methodologies</h2>
                  <ul className="space-y-2">
                    {literatureReview.methodologies.map((method, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{method}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-semibold mb-4">Theoretical Frameworks</h2>
                  <ul className="space-y-2">
                    {literatureReview.theoreticalFrameworks.map((framework, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{framework}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Citations Tab */}
      {activeTab === 'citations' && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Citation Formatter</h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Citation Style
            </label>
            <select
              value={citationStyle}
              onChange={(e) => setCitationStyle(e.target.value as any)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="APA">APA 7th Edition</option>
              <option value="MLA">MLA 9th Edition</option>
              <option value="Chicago">Chicago 17th Edition</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              References (one per line)
            </label>
            <textarea
              value={citations}
              onChange={(e) => setCitations(e.target.value)}
              placeholder="Paste your references here..."
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              rows={10}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleFormatCitations}
              disabled={loading}
              className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Formatting...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  Format Citations
                </>
              )}
            </button>

            <button
              onClick={handleCopy}
              disabled={!citations}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  Copy
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>
      )}

      {/* Spiritual Encouragement */}
      <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg p-6 border border-purple-200">
        <h3 className="text-lg font-semibold mb-2 text-purple-900">
          Research with Integrity
        </h3>
        <p className="text-purple-800 italic mb-3">
          "Whatever you do, work at it with all your heart, as working for the Lord" - Colossians 3:23
        </p>
        <p className="text-purple-700">
          Remember to properly cite all sources and maintain academic integrity. Your research contributes to the body of knowledge that advances God's kingdom.
        </p>
      </div>
    </div>
  );
};
