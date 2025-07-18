import React, { useState, useEffect } from 'react';
import { SparklesIcon, ChevronDownIcon, ChevronUpIcon } from '../utils/icons';

interface StreamingAnalysisDisplayProps {
  streamingText: string;
  isComplete: boolean;
  isThinking?: boolean;
  thinkingComplete?: boolean;
}

const StreamingAnalysisDisplay: React.FC<StreamingAnalysisDisplayProps> = ({ 
  streamingText, 
  isComplete, 
  isThinking = false,
  thinkingComplete = false 
}) => {
  const [thinkingContent, setThinkingContent] = useState<string[]>([]);
  const [finalContent, setFinalContent] = useState('');
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(false);
  
  // Add shimmer animation style
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Process streaming text based on whether it's thinking or final content
  useEffect(() => {
    if (isThinking && !thinkingComplete) {
      // Extract thinking chunks
      const thinkingLines = streamingText
        .split('\n')
        .filter(line => line.startsWith('THINKING:'))
        .map(line => line.replace('THINKING:', '').trim());
      
      if (thinkingLines.length > 0) {
        setThinkingContent(thinkingLines);
      }
    } else if (thinkingComplete || !isThinking) {
      // This is final content
      setFinalContent(streamingText);
    }
  }, [streamingText, isThinking, thinkingComplete]);

  const latestThinkingChunk = thinkingContent[thinkingContent.length - 1] || '';
  const showThinking = thinkingContent.length > 0 && !isComplete;

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200 h-full overflow-y-auto">
      <div className="flex items-center gap-3 mb-6">
        <SparklesIcon className="w-8 h-8 text-blue-600" />
        <h2 className="text-2xl font-bold text-slate-800">
          {isComplete ? 'Analysis Complete' : 'Analyzing Your Performance...'}
        </h2>
      </div>
      
      {/* Thinking Section */}
      {showThinking && (
        <div className={`mb-6 transition-all duration-300 ${thinkingComplete ? 'opacity-60' : 'opacity-100'}`}
          style={{
            background: 'linear-gradient(135deg, rgba(249, 250, 251, 0.95) 0%, rgba(243, 244, 246, 0.95) 100%)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(209, 213, 219, 0.5)',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
            overflow: 'hidden'
          }}>
          <button
            type="button"
            onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
            className="w-full p-5 flex items-center justify-between text-left transition-all duration-200"
            style={{
              background: 'transparent',
              borderRadius: '16px 16px 0 0'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(229, 231, 235, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse"></div>
                <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse" style={{animationDelay: '150ms'}}></div>
                <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse" style={{animationDelay: '300ms'}}></div>
              </div>
              <span className="text-sm font-semibold text-slate-800">AI Thinking Process</span>
            </div>
            {isThinkingExpanded ? (
              <ChevronUpIcon className="w-5 h-5 text-slate-600" />
            ) : (
              <ChevronDownIcon className="w-5 h-5 text-slate-600" />
            )}
          </button>
          
          <div className={`px-6 pb-5 overflow-hidden transition-all duration-300 ${isThinkingExpanded ? 'max-h-96 overflow-y-auto' : 'max-h-16'}`}>
            {isThinkingExpanded ? (
              <div className="space-y-3">
                {thinkingContent.map((chunk, index) => (
                  <div 
                    key={index} 
                    className="p-3 bg-white bg-opacity-60 rounded-lg border border-gray-200"
                    style={{
                      fontSize: '13px',
                      lineHeight: '1.6',
                      color: '#334155' // slate-700
                    }}
                  >
                    {chunk}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-600 italic pt-1">
                {latestThinkingChunk ? `"${latestThinkingChunk.substring(0, 80)}..."` : 'AI is analyzing...'}
              </p>
            )}
          </div>
        </div>
      )}
      
      {/* Progress indicator */}
      {!isComplete && !showThinking && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
            </div>
            <span className="text-sm text-slate-600">
              Processing...
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{
                width: '25%',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }}
            ></div>
          </div>
        </div>
      )}
      
      {/* Prettier progress bar when thinking complete */}
      {!isComplete && thinkingComplete && (
        <div className="mb-6">
          <div className="relative">
            <div className="w-full bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full h-3 overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                style={{
                  width: '85%',
                  background: 'linear-gradient(90deg, #3b82f6 0%, #6366f1 100%)',
                  boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)'
                }}
              >
                <div 
                  className="absolute inset-0 opacity-30"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.8) 50%, transparent 100%)',
                    animation: 'shimmer 2s infinite'
                  }}
                />
              </div>
            </div>
            <p className="text-xs text-slate-600 mt-2 text-center">Generating your personalized feedback...</p>
          </div>
        </div>
      )}

      {/* Final streaming content */}
      {(thinkingComplete || !isThinking) && finalContent && (
        <div 
          className="prose prose-slate max-w-none"
          style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.06) 0%, rgba(59, 130, 246, 0.03) 100%)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(59, 130, 246, 0.15)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 8px 32px rgba(59, 130, 246, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
          }}>
          <div className="space-y-4">
            {finalContent.split('\n\n').map((paragraph, index) => (
              <p key={index} className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Show placeholder if no content yet */}
      {!finalContent && !showThinking && (
        <div className="text-center py-8">
          <p className="text-slate-500">Preparing analysis...</p>
        </div>
      )}

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
