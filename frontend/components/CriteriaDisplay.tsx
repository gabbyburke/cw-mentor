/*
Copyright 2026 Google LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import React from 'react';
import { ASSESSMENT_CRITERIA } from '../utils/constants';
import { ClipboardIcon } from '../utils/icons';

const CriteriaDisplay: React.FC = () => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 h-full">
      <div className="flex items-center gap-3 mb-4">
        <ClipboardIcon className="w-8 h-8 text-blue-600" />
        <h2 className="text-xl font-bold text-slate-800">Assessment Criteria</h2>
      </div>
      <p className="text-slate-600 mb-6 text-sm">
        Your transcript will be evaluated based on the following core child welfare practice behaviors.
      </p>
      <div className="space-y-4">
        {ASSESSMENT_CRITERIA.map((criterion, index) => (
          <div key={index} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h3 className="font-semibold text-slate-700">{criterion.title}</h3>
            <p className="text-slate-500 text-sm">{criterion.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CriteriaDisplay;
