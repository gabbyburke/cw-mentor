
import React from 'react';
import type { CaseworkerAnalysis } from '../types/types';
import { CheckCircleIcon, LightbulbIcon, SparklesIcon } from '../utils/icons';

interface AnalysisDisplayProps {
  analysis: CaseworkerAnalysis;
}

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ analysis }) => {
  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200 h-full overflow-y-auto">
      <div className="flex items-center gap-3 mb-4">
        <SparklesIcon className="w-8 h-8 text-blue-600" />
        <h2 className="text-2xl font-bold text-slate-800">Feedback Analysis</h2>
      </div>
      
      <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">Overall Summary</h3>
        <p className="text-blue-700">{analysis.overallSummary}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
            <CheckCircleIcon className="w-6 h-6" />
            Strengths
          </h3>
          <ul className="space-y-3 list-disc list-inside text-green-700">
            {analysis.strengths.map((strength, index) => (
              <li key={index}>{strength}</li>
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
                <p className="text-sm">{item.suggestion}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AnalysisDisplay;
