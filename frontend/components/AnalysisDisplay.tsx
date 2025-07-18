
import React, { useState } from 'react';
import type { CaseworkerAnalysis, TranscriptCitation, CurriculumCitation } from '../types/types';
import { CheckCircleIcon, LightbulbIcon, SparklesIcon } from '../utils/icons';

interface AnalysisDisplayProps {
  analysis: CaseworkerAnalysis;
}

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ analysis }) => {
  const [hoveredCitation, setHoveredCitation] = useState<string | null>(null);
  
  // Function to parse text and replace citation markers with interactive elements
  const renderTextWithCitations = (text: string) => {
    const citationRegex = /\[([T]?\d+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    
    while ((match = citationRegex.exec(text)) !== null) {
      // Add text before citation
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      
      // Add citation as interactive element
      const citationMarker = match[0];
      const isTranscript = citationMarker.includes('T');
      parts.push(
        <span
          key={match.index}
          className={`inline-flex items-center justify-center w-6 h-6 text-xs rounded-full cursor-pointer transition-all ${
            isTranscript 
              ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' 
              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          } ${hoveredCitation === citationMarker ? 'ring-2 ring-offset-1 ring-blue-400' : ''}`}
          onMouseEnter={() => setHoveredCitation(citationMarker)}
          onMouseLeave={() => setHoveredCitation(null)}
          onClick={() => {
            // Scroll to citation section
            const element = document.getElementById(`citation-${citationMarker.replace(/[\[\]]/g, '')}`);
            element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
          title={isTranscript ? 'Transcript citation' : 'Curriculum citation'}
        >
          {match[1]}
        </span>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    return parts;
  };
  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200 h-full overflow-y-auto">
      <div className="flex items-center gap-3 mb-4">
        <SparklesIcon className="w-8 h-8 text-blue-600" />
        <h2 className="text-2xl font-bold text-slate-800">Feedback Analysis</h2>
      </div>
      
      <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">Overall Summary</h3>
        <p className="text-blue-700">{renderTextWithCitations(analysis.overallSummary)}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
            <CheckCircleIcon className="w-6 h-6" />
            Strengths
          </h3>
          <ul className="space-y-3 list-disc list-inside text-green-700">
            {analysis.strengths.map((strength, index) => (
              <li key={index}>{renderTextWithCitations(strength)}</li>
            ))}
          </ul>
        </div>

        <div className="p-6 bg-amber-50 border border-amber-200 rounded-lg">
          <h3 className="text-lg font-semibold text-amber-800 mb-4 flex items-center gap-2">
            <LightbulbIcon className="w-6 h-6" />
            Areas for Improvement
          </h3>
          <ul className="space-y-4 text-amber-700">
            {analysis.areasForImprovement.map((item, index) => (
              <li key={index}>
                <p className="font-semibold">{item.area}</p>
                <p className="text-sm">{renderTextWithCitations(item.suggestion)}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Citations Section */}
      {(analysis.transcriptCitations || analysis.citations) && (
        <div className="mt-8 space-y-6">
          <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">References</h3>
          
          {/* Transcript Citations */}
          {analysis.transcriptCitations && analysis.transcriptCitations.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-md font-semibold text-purple-800">Transcript Citations</h4>
              <div className="space-y-2">
                {analysis.transcriptCitations.map((citation) => (
                  <div
                    key={citation.marker}
                    id={`citation-${citation.marker.replace(/[\[\]]/g, '')}`}
                    className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm"
                  >
                    <span className="inline-flex items-center justify-center w-6 h-6 text-xs bg-purple-200 text-purple-700 rounded-full mr-2">
                      {citation.marker.replace(/[\[\]]/g, '')}
                    </span>
                    <span className="font-semibold capitalize">{citation.speaker}:</span> "{citation.quote}"
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Curriculum Citations */}
          {analysis.citations && analysis.citations.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-md font-semibold text-blue-800">Curriculum References</h4>
              <div className="space-y-2">
                {analysis.citations.map((citation) => (
                  <div
                    key={citation.number}
                    id={`citation-${citation.number}`}
                    className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm"
                  >
                    <div className="flex items-start gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 text-xs bg-blue-200 text-blue-700 rounded-full flex-shrink-0">
                        {citation.number}
                      </span>
                      <div className="flex-1">
                        <div className="font-semibold text-blue-800">{citation.source}</div>
                        {citation.pages && <div className="text-xs text-blue-600 mt-1">{citation.pages}</div>}
                        {citation.text && (
                          <div className="mt-2 text-slate-700 italic">"{citation.text.substring(0, 200)}..."</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnalysisDisplay;
