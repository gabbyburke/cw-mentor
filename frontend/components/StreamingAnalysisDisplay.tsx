import React from 'react';
import { SparklesIcon } from '../utils/icons';

interface StreamingAnalysisDisplayProps {
  streamingText: string;
  isComplete: boolean;
}

const StreamingAnalysisDisplay: React.FC<StreamingAnalysisDisplayProps> = ({ streamingText, isComplete }) => {
  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200 h-full overflow-y-auto">
      <div className="flex items-center gap-3 mb-6">
        <SparklesIcon className="w-8 h-8 text-blue-600" />
        <h2 className="text-2xl font-bold text-slate-800">
          {isComplete ? 'Analysis Complete' : 'Analyzing Your Performance...'}
        </h2>
      </div>
      
      {/* Progress indicator */}
      {!isComplete && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
            </div>
            <span className="text-sm text-slate-600">AI is reviewing your transcript...</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{
                width: streamingText ? '75%' : '25%',
                animation: !isComplete ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'
              }}
            ></div>
          </div>
        </div>
      )}

      {/* Streaming content */}
      <div className="prose prose-slate max-w-none">
        {streamingText ? (
          <div className="space-y-4">
            {streamingText.split('\n\n').map((paragraph, index) => (
              <p key={index} className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                {paragraph}
              </p>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-500">Preparing analysis...</p>
          </div>
        )}
      </div>

      {/* Completion message */}
      {isComplete && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 text-sm font-medium">
            ✓ Analysis complete! Switching to detailed view...
          </p>
        </div>
      )}
    </div>
  );
};

export default StreamingAnalysisDisplay;
