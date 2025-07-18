import React, { useState, useEffect } from 'react';
import { SparklesIcon } from '../utils/icons';
import ThinkingBox from './ThinkingBox';

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
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Process streaming text based on whether it's thinking or final content
  useEffect(() => {
    if (isThinking && !thinkingComplete) {
      // Split by "THINKING:" to get all sections
      const parts = streamingText.split(/THINKING:/);
      const thinkingSections: string[] = [];
      
      // Skip first part if empty (before first THINKING:)
      for (let i = 1; i < parts.length; i++) {
        const section = parts[i].trim();
        if (section) {
          // Each section might have multiple paragraphs, keep them together
          thinkingSections.push(section);
        }
      }
      
      if (thinkingSections.length > 0) {
        setThinkingContent(thinkingSections);
      }
    } 
    
    // Process final content when thinking is complete
    // Important: Don't clear thinking content when final content arrives
    if (thinkingComplete && streamingText) {
      // When thinking is complete, the streamingText contains both thinking and final content
      // separated by THINKING_COMPLETE marker
      const parts = streamingText.split('THINKING_COMPLETE');
      
      if (parts.length >= 2) {
        // Extract thinking content if not already set
        const thinkingPart = parts[0].trim();
        if (thinkingPart) {
          const thinkingParts = thinkingPart.split(/THINKING:/);
          const thinkingSections: string[] = [];
          
          for (let i = 1; i < thinkingParts.length; i++) {
            const section = thinkingParts[i].trim();
            if (section) {
              thinkingSections.push(section);
            }
          }
          
          if (thinkingSections.length > 0) {
            setThinkingContent(thinkingSections);
          }
        }
        
        // Extract final content (everything after THINKING_COMPLETE)
        const finalPart = parts.slice(1).join('THINKING_COMPLETE').trim();
        setFinalContent(finalPart);
      } else {
        // Fallback: treat entire content as final if no THINKING_COMPLETE marker
        setFinalContent(streamingText);
      }
    } else if (!isThinking && streamingText) {
      // If we're not in thinking mode at all, just set the final content
      setFinalContent(streamingText);
    }
  }, [streamingText, isThinking, thinkingComplete]);

  const latestThinkingChunk = thinkingContent[thinkingContent.length - 1] || '';
  const showThinking = thinkingContent.length > 0;

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200 h-full overflow-y-auto">
      <div className="flex items-center gap-3 mb-6">
        <SparklesIcon className="w-8 h-8 text-blue-600" />
        <h2 className="text-2xl font-bold text-slate-800">
          {isComplete ? 'Analysis Complete' : 'Analyzing Your Performance'}
        </h2>
      </div>
      
      {/* Thinking Section */}
      <ThinkingBox 
        thinkingContent={thinkingContent}
        responseContent={finalContent}
        isThinkingComplete={thinkingComplete}
      />
      
      
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
