
import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { AppState, Message, Page, SelfAssessment, CaseworkerAnalysis, SupervisorAnalysis } from '../types/types';
import { createChatSession, createMentorshipChatSession, createSimulationChatSession, analyzeCaseworkerPerformance, analyzeSupervisorCoaching } from '../services/geminiService';
import { ASSESSMENT_CRITERIA, SIMULATION_SYSTEM_PROMPT, GENERAL_QA_SYSTEM_PROMPT, SIMULATION_SCENARIOS } from '../utils/constants';
import { 
    HomeIcon, BotIcon, UserIcon, SendIcon, SparklesIcon, ClipboardIcon, 
    CheckCircleIcon, LightbulbIcon, ChatBubbleLeftRightIcon, QuestionMarkCircleIcon 
} from '../utils/icons';
import SplashScreen from './SplashScreen';


//region --- UI Components ---

const Header = ({ 
    onHomeClick, 
    showHomeButton, 
    currentView, 
    onViewChange,
    onTitleClick
}: { 
    onHomeClick: () => void, 
    showHomeButton: boolean,
    currentView: 'caseworker' | 'supervisor',
    onViewChange: (view: 'caseworker' | 'supervisor') => void,
    onTitleClick: () => void
}) => (
    <header className="text-center mb-6 relative">
        {showHomeButton && (
            <button 
                onClick={onHomeClick} 
                className="btn-secondary absolute top-0 left-0 -translate-y-1/2 rounded-full p-3"
                aria-label="Back to Home"
            >
                <HomeIcon className="w-6 h-6" />
            </button>
        )}
        <h1 className="h1 cursor-pointer" onClick={onTitleClick}>
          <span>Social Work</span> <span style={{color: 'var(--primary)'}}>Coaching Simulator</span>
        </h1>
        <div className="flex justify-center gap-2 mt-4">
            <button 
                onClick={() => onViewChange('caseworker')}
                className={currentView === 'caseworker' ? 'btn-primary' : 'btn-secondary'}
            >
                Caseworker View
            </button>
            <button 
                onClick={() => onViewChange('supervisor')}
                className={currentView === 'supervisor' ? 'btn-primary' : 'btn-secondary'}
            >
                Supervisor View
            </button>
        </div>
    </header>
);

const CurriculumDisplay = () => (
    <article className="card">
      <div className="flex items-center gap-3 mb-4">
        <ClipboardIcon className="w-8 h-8" style={{color: 'var(--primary)'}} />
        <h2 className="h2">Core Curriculum</h2>
      </div>
      <p style={{color: 'var(--on-surface-variant)'}} className="mb-6">
        Simulations and feedback are based on these core practice behaviors.
      </p>
      <div className="space-y-4">
        {ASSESSMENT_CRITERIA.map((criterion) => (
          <div key={criterion.key} className="p-4" style={{backgroundColor: 'var(--surface-container-low)', borderRadius: 'var(--unit-2)', border: '1px solid var(--outline-variant)'}}>
            <h3 className="h5">{criterion.title}</h3>
            <p style={{color: 'var(--on-surface-variant)', fontSize: '0.875rem'}}>{criterion.description}</p>
          </div>
        ))}
      </div>
    </article>
);

const ChatInterface = ({
  history,
  onSendMessage,
  isLoading,
  placeholder = "Send a message...",
  chatTitle,
  initialMessage,
}: {
  history: Message[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  placeholder?: string;
  chatTitle: string;
  initialMessage?: Message;
}) => {
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isLoading]);

  const handleSend = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSend();
    }
  };
  
  const allMessages = initialMessage ? [initialMessage, ...history] : history;

  return (
    <div className="chat-container">
      <h2 className="h4 mb-4">{chatTitle}</h2>
      <div className="flex-grow overflow-y-auto pr-2 space-y-4">
        {allMessages.map((msg, index) => (
          <div key={index} className={`chat-message ${msg.role === 'user' ? 'user' : ''}`}>
            {msg.role === 'model' && <BotIcon className="w-8 h-8 flex-shrink-0 rounded-full p-2" style={{backgroundColor: 'var(--primary)', color: 'var(--on-primary)'}} />}
            <div className={`chat-bubble ${msg.role}`}>
              <p style={{fontSize: '0.875rem', lineHeight: '1.5', whiteSpace: 'pre-wrap'}}>{msg.parts}</p>
            </div>
             {msg.role === 'user' && <UserIcon className="w-8 h-8 flex-shrink-0 rounded-full p-2" style={{backgroundColor: 'var(--surface-variant)', color: 'var(--on-surface-variant)'}} />}
          </div>
        ))}
         {isLoading && (
            <div className="chat-message">
              <BotIcon className="w-8 h-8 flex-shrink-0 rounded-full p-2" style={{backgroundColor: 'var(--primary)', color: 'var(--on-primary)'}} />
              <div className="chat-bubble model">
                <div className="typing-indicator">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                </div>
              </div>
            </div>
          )}
        <div ref={chatEndRef} />
      </div>
      <div className="chat-input-container">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="chat-input"
          disabled={isLoading}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !newMessage}
          className="btn-primary p-3"
          aria-label="Send message"
        >
          <SendIcon className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};


const LoadingIndicator = ({text}: {text: string}) => (
    <div className="loading-indicator">
        <div className="loading-spinner"></div>
        <h3 className="h4 mt-6">{text}</h3>
    </div>
);

//endregion

//region --- Page Components ---

const HomePage = ({ onSelectPage }: { onSelectPage: (page: Page) => void }) => (
    <div className="max-w-4xl mx-auto">
        <p className="text-center mt-4 max-w-2xl mx-auto mb-8" style={{fontSize: '1.125rem', color: 'var(--on-surface-variant)'}}>
          An AI partner to help you practice, get feedback, and grow your professional skills.
        </p>
        <div className="grid grid-cols-2 gap-6 mb-8">
            <article onClick={() => onSelectPage('scenario-selection')} className="card card-clickable">
                <ChatBubbleLeftRightIcon className="w-12 h-12 mb-3" style={{color: 'var(--primary)'}} />
                <h3 className="h4">Counseling Simulation</h3>
                <p style={{color: 'var(--on-surface-variant)', fontSize: '0.875rem', marginTop: 'var(--unit-1)'}}>Engage in a realistic role-play scenario to practice your skills.</p>
            </article>
            <article onClick={() => onSelectPage('qa')} className="card card-clickable">
                <QuestionMarkCircleIcon className="w-12 h-12 mb-3" style={{color: 'var(--primary)'}} />
                <h3 className="h4">General Feedback / Q&A</h3>
                <p style={{color: 'var(--on-surface-variant)', fontSize: '0.875rem', marginTop: 'var(--unit-1)'}}>Ask questions about the curriculum and best practices.</p>
            </article>
        </div>
        <CurriculumDisplay />
    </div>
);

const ScenarioSelectionPage = ({ onScenarioSelect }: { onScenarioSelect: (scenario: typeof SIMULATION_SCENARIOS[0]) => void }) => {
    const [selectedScenario, setSelectedScenario] = useState<typeof SIMULATION_SCENARIOS[0] | null>(null);

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h2 className="h2 mb-4">Select a Practice Scenario</h2>
                <p style={{color: 'var(--on-surface-variant)', fontSize: '1.125rem'}}>
                    Choose a case scenario to practice your social work skills. Each scenario is based on real case files and will provide a realistic role-play experience.
                </p>
            </div>

            <div className="space-y-6">
                <div className="card">
                    <h3 className="h4 mb-4">Available Scenarios</h3>
                    <div className="space-y-3">
                        {SIMULATION_SCENARIOS.map((scenario) => (
                            <div 
                                key={scenario.id}
                                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                                    selectedScenario?.id === scenario.id 
                                        ? 'border-blue-500 bg-blue-50' 
                                        : 'border-gray-300 hover:border-gray-400'
                                }`}
                                onClick={() => setSelectedScenario(scenario)}
                            >
                                <div className="flex items-start gap-3">
                                    <input
                                        type="radio"
                                        name="scenario"
                                        checked={selectedScenario?.id === scenario.id}
                                        onChange={() => setSelectedScenario(scenario)}
                                        className="w-4 h-4 text-blue-600 mt-1"
                                    />
                                    <div className="flex-1">
                                        <h4 className="h5 mb-2">{scenario.title}</h4>
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            {scenario.id === 'cooper' && 'Domestic violence and substance use allegations involving Sara Cooper and her partner Shawn.'}
                                            {scenario.id === 'baskin' && 'Physical abuse concerns after 14-year-old Karina comes to school with injuries.'}
                                            {scenario.id === 'rich' && 'Neglect case involving untreated dental issues and missed medical appointments.'}
                                            {scenario.id === 'tasi' && 'Neglect allegations including sibling violence and children left unsupervised.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {selectedScenario && (
                    <div className="card">
                        <h3 className="h4 mb-4">Case Summary: {selectedScenario.title}</h3>
                        <p style={{color: 'var(--on-surface-variant)', fontSize: '0.875rem', lineHeight: '1.6', marginBottom: 'var(--unit-4)'}}>
                            {selectedScenario.summary}
                        </p>
                        <button 
                            onClick={() => onScenarioSelect(selectedScenario)}
                            className="btn-primary"
                        >
                            Start Simulation
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const SimulationPage = ({ onComplete }: { onComplete: (transcript: Message[]) => void }) => {
    const [chatSession] = useState(() => createChatSession(SIMULATION_SYSTEM_PROMPT));
    const [history, setHistory] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isFinished, setIsFinished] = useState(false);

    const handleSendMessage = useCallback(async (message: string) => {
        setIsLoading(true);
        const userMessage: Message = { role: 'user', parts: message };
        setHistory(prev => [...prev, userMessage]);

        try {
            const stream = await chatSession.sendMessageStream({ message });
            let fullResponse = '';
            for await (const chunk of stream) {
                fullResponse += chunk.text;
            }
            const modelMessage: Message = { role: 'model', parts: fullResponse };
            setHistory(prev => [...prev, modelMessage]);
            if (fullResponse.toLowerCase().includes("have to go") || fullResponse.toLowerCase().includes("that's all i have time for")) {
                setIsFinished(true);
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'An unknown error occurred.';
            setHistory(prev => [...prev, { role: 'model', parts: `Sorry, an error occurred: ${errorMsg}` }]);
        } finally {
            setIsLoading(false);
        }
    }, [chatSession]);

    return (
        <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)]">
             <ChatInterface
                chatTitle="Simulation: Unexpected Home Visit"
                history={history}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                placeholder={isFinished ? "Simulation ended." : "Your response..."}
                initialMessage={{role: 'model', parts: "Who are you? What do you want?"}}
             />
             {(isFinished || history.length >= 10) && (
                 <div className="mt-4 text-center">
                    <button 
                        onClick={() => onComplete(history)}
                        className="px-8 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                    >
                        Finish & Begin Self-Assessment
                    </button>
                 </div>
             )}
        </div>
    );
};

const SimulationPageWithScenario = ({ scenario, onComplete }: { scenario: typeof SIMULATION_SCENARIOS[0], onComplete: (transcript: Message[]) => void }) => {
    const [chatSession] = useState(() => createSimulationChatSession(scenario.id));
    const [history, setHistory] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isFinished, setIsFinished] = useState(false);

    const handleSendMessage = useCallback(async (message: string) => {
        setIsLoading(true);
        const userMessage: Message = { role: 'user', parts: message };
        setHistory(prev => [...prev, userMessage]);

        try {
            let fullResponse = '';
            const stream = await chatSession.sendMessageStream({ message });
            for await (const chunk of stream) {
                fullResponse += chunk.text;
            }
            const modelMessage: Message = { role: 'model', parts: fullResponse };
            setHistory(prev => [...prev, modelMessage]);
            if (fullResponse.toLowerCase().includes("have to go") || fullResponse.toLowerCase().includes("that's all i have time for")) {
                setIsFinished(true);
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'An unknown error occurred.';
            setHistory(prev => [...prev, { role: 'model', parts: `Sorry, an error occurred: ${errorMsg}` }]);
        } finally {
            setIsLoading(false);
        }
    }, [chatSession]);

    const simulationGreeting = {
        role: 'model' as const,
        parts: "Can I help you?"
    };

    return (
        <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)]">
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">Scenario: {scenario.title}</h3>
                <p className="text-blue-700 text-sm">{scenario.summary}</p>
            </div>
             <ChatInterface
                chatTitle={`Simulation: ${scenario.title}`}
                history={history}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                placeholder={isFinished ? "Simulation ended." : "Your response..."}
                initialMessage={simulationGreeting}
             />
             {(isFinished || history.length >= 10) && (
                 <div className="mt-4 text-center">
                    <button 
                        onClick={() => onComplete(history)}
                        className="px-8 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                    >
                        Finish & Begin Self-Assessment
                    </button>
                 </div>
             )}
        </div>
    );
};

const ReviewPage = ({ 
    simulationTranscript,
    onComplete,
}: { 
    simulationTranscript: Message[];
    onComplete: (data: {selfAssessment: SelfAssessment, caseworkerAnalysis: CaseworkerAnalysis, supervisorFeedback: string, supervisorAnalysis: SupervisorAnalysis}) => void;
}) => {
    type Stage = 'self-assessment' | 'caseworker-analysis' | 'supervisor-review' | 'supervisor-analysis' | 'final';
    const [stage, setStage] = useState<Stage>('self-assessment');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selfAssessment, setSelfAssessment] = useState<SelfAssessment>({});
    const [caseworkerAnalysis, setCaseworkerAnalysis] = useState<CaseworkerAnalysis | null>(null);
    const [supervisorFeedback, setSupervisorFeedback] = useState('');
    const [supervisorAnalysis, setSupervisorAnalysis] = useState<SupervisorAnalysis | null>(null);

    const handleSelfAssessmentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            const analysis = await analyzeCaseworkerPerformance(simulationTranscript, selfAssessment);
            setCaseworkerAnalysis(analysis);
            setStage('supervisor-review');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSupervisorSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            const analysis = await analyzeSupervisorCoaching(supervisorFeedback, simulationTranscript);
            setSupervisorAnalysis(analysis);
            setStage('final');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) return <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)]"><LoadingIndicator text="Analyzing..." /></div>
    if (error) return <div className="bg-red-100 text-red-700 p-4 rounded-md">Error: {error}</div>

    const renderContent = () => {
        switch(stage) {
            case 'self-assessment':
                return (
                    <form onSubmit={handleSelfAssessmentSubmit} className="space-y-6 bg-white p-8 rounded-2xl shadow-lg border border-slate-200">
                        <h3 className="text-2xl font-bold text-slate-800">Post-Simulation Self-Assessment</h3>
                        <p className="text-slate-600">Reflect on your performance during the simulation based on the core criteria.</p>
                        {ASSESSMENT_CRITERIA.map(c => (
                            <div key={c.key}>
                                <label htmlFor={c.key} className="block text-md font-medium text-slate-700">{c.title}</label>
                                <p className="text-sm text-slate-500 mb-2">{c.description}</p>
                                <textarea
                                    id={c.key}
                                    rows={3}
                                    required
                                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    onChange={e => setSelfAssessment(s => ({ ...s, [c.key]: e.target.value }))}
                                />
                            </div>
                        ))}
                        <button type="submit" className="w-full px-6 py-3 text-white bg-blue-600 rounded-md hover:bg-blue-700 font-semibold">Submit for AI Analysis</button>
                    </form>
                );
            case 'supervisor-review':
            case 'final':
                return (
                    <div className="space-y-8">
                        {caseworkerAnalysis && (
                            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
                                <h3 className="text-xl font-bold text-slate-800 mb-4">AI Feedback for Caseworker</h3>
                                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <h4 className="font-semibold text-blue-800">Overall Summary</h4>
                                    <p className="text-blue-700 text-sm">{caseworkerAnalysis.overallSummary}</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                        <h4 className="font-semibold text-green-800 flex items-center gap-2 mb-2"><CheckCircleIcon className="w-5 h-5"/>Strengths</h4>
                                        <ul className="list-disc list-inside space-y-1 text-green-700 text-sm">{caseworkerAnalysis.strengths.map((s,i) => <li key={i}>{s}</li>)}</ul>
                                    </div>
                                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                        <h4 className="font-semibold text-amber-800 flex items-center gap-2 mb-2"><LightbulbIcon className="w-5 h-5"/>Areas for Improvement</h4>
                                        <ul className="space-y-2 text-amber-700 text-sm">{caseworkerAnalysis.areasForImprovement.map((item,i) => <li key={i}><strong>{item.area}:</strong> {item.suggestion}</li>)}</ul>
                                    </div>
                                </div>
                            </div>
                        )}
                        {stage === 'supervisor-review' && (
                            <form onSubmit={handleSupervisorSubmit} className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
                                <h3 className="text-xl font-bold text-slate-800">Supervisor Review & Coaching</h3>
                                <p className="text-slate-600 text-sm mb-4">Provide strength-based feedback and constructive criticism for the caseworker.</p>
                                <textarea
                                    rows={5}
                                    required
                                    value={supervisorFeedback}
                                    onChange={e => setSupervisorFeedback(e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., 'You did a great job building rapport by... Next time, try asking more open-ended questions like...'"
                                />
                                <button type="submit" className="w-full mt-4 px-6 py-3 text-white bg-blue-600 rounded-md hover:bg-blue-700 font-semibold">Submit Feedback</button>
                            </form>
                        )}
                        {supervisorAnalysis && (
                             <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
                                <h3 className="text-xl font-bold text-slate-800 mb-4">AI Analysis of Supervisor's Coaching</h3>
                                <div className="space-y-4 text-sm">
                                    <p><strong>Feedback on Strengths:</strong> {supervisorAnalysis.feedbackOnStrengths}</p>
                                    <p><strong>Feedback on Critique:</strong> {supervisorAnalysis.feedbackOnCritique}</p>
                                    <p><strong>Overall Tone:</strong> <span className="font-semibold text-blue-600">{supervisorAnalysis.overallTone}</span></p>
                                </div>
                             </div>
                        )}
                    </div>
                );
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
           {renderContent()}
        </div>
    )
};

const GeneralQAPage = () => {
    const [chatSession] = useState(() => createMentorshipChatSession(GENERAL_QA_SYSTEM_PROMPT));
    const [history, setHistory] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleSendMessage = useCallback(async (message: string) => {
        setIsLoading(true);
        setHistory(prev => [...prev, { role: 'user', parts: message }]);
        try {
            let fullResponse = '';
            const stream = await chatSession.sendMessageStream({ message });
            for await (const chunk of stream) {
                fullResponse += chunk.text;
            }
            setHistory(prev => [...prev, { role: 'model', parts: fullResponse }]);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'An unknown error occurred.';
            setHistory(prev => [...prev, { role: 'model', parts: `Sorry, an error occurred: ${errorMsg}` }]);
        } finally {
            setIsLoading(false);
        }
    }, [chatSession]);

    const mentorshipGreeting = {
        role: 'model' as const,
        parts: "Hey there! It's great to connect. I'm an AI assistant, and I'm here to offer some insights, support, or just be a sounding board as you navigate your studies and journey into the field. What's on your mind today? Are you grappling with a particular class, a situation in your practicum, or just thinking about what's next?"
    };

    return (
        <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)]">
            <ChatInterface
                chatTitle="PSU Social Work Mentorship"
                history={history}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                placeholder="Ask a question about the curriculum, field practice, or social work..."
                initialMessage={mentorshipGreeting}
            />
        </div>
    );
};

const SupervisorDashboard = ({ state, onLoadTranscript, setState }: { state: AppState, onLoadTranscript: (transcript: Message[]) => void, setState: React.Dispatch<React.SetStateAction<AppState>> }) => {
    const [uploadText, setUploadText] = useState('');
    const [showUpload, setShowUpload] = useState(false);

    const handleUploadTranscript = async () => {
        if (!uploadText.trim()) return;
        
        // Store the raw transcript and immediately trigger AI analysis
        const rawTranscript: Message[] = [
            { 
                role: 'model', 
                parts: uploadText.trim(),
                speaker: 'Raw Transcript'
            }
        ];
        
        onLoadTranscript(rawTranscript);
        setUploadText('');
        setShowUpload(false);
        
        // Set loading state
        setState(s => ({ 
            ...s, 
            isLoading: true,
            simulationTranscript: rawTranscript,
            caseworkerAnalysis: null
        }));
        
        // Immediately analyze the transcript against Arkansas practice behaviors
        try {
            const analysis = await analyzeCaseworkerPerformance(rawTranscript, {});
            // Store the analysis in the app state
            setState(s => ({ 
                ...s, 
                caseworkerAnalysis: analysis,
                isLoading: false
            }));
        } catch (error) {
            console.error('Analysis failed:', error);
            setState(s => ({ 
                ...s, 
                isLoading: false,
                error: error instanceof Error ? error.message : 'Analysis failed'
            }));
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h2 className="h2 mb-4">Supervisor Dashboard</h2>
                <p style={{color: 'var(--on-surface-variant)', fontSize: '1.125rem'}}>
                    Review caseworker simulations and provide coaching feedback.
                </p>
            </div>

            {/* Upload Transcript Section */}
            {!state.simulationTranscript.length && (
                <article className="card mb-6">
                    <h3 className="h4 mb-4">Quick Demo Setup</h3>
                    <p style={{color: 'var(--on-surface-variant)', marginBottom: 'var(--unit-4)'}}>
                        Upload a transcript to quickly review a conversation without going through the full simulation.
                    </p>
                    
                    {!showUpload ? (
                        <button 
                            onClick={() => setShowUpload(true)}
                            className="btn-primary"
                        >
                            Upload Transcript for Review
                        </button>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Paste transcript (any format - AI will analyze the raw text)
                                </label>
                                <textarea
                                    value={uploadText}
                                    onChange={(e) => setUploadText(e.target.value)}
                                    rows={8}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder={`Paste your transcript here in any format. The AI will analyze it directly against the Arkansas practice behaviors.

Examples:
- SRT format with timestamps
- Simple dialogue format
- Meeting notes
- Any conversation transcript`}
                                />
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={handleUploadTranscript}
                                    className="btn-primary"
                                    disabled={!uploadText.trim()}
                                >
                                    Load Transcript
                                </button>
                                <button 
                                    onClick={() => {setShowUpload(false); setUploadText('');}}
                                    className="btn-secondary"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </article>
            )}

            {/* Show simulation data if available */}
            {state.simulationTranscript.length > 0 ? (
                <div className="space-y-6">
                    {/* Simulation Transcript */}
                    <article className="card">
                        <h3 className="h4 mb-4">Simulation Transcript</h3>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {state.simulationTranscript.map((msg, index) => (
                                <div key={index} className="p-3" style={{
                                    backgroundColor: msg.role === 'user' ? 'var(--primary-container)' : 'var(--surface-container-low)',
                                    borderRadius: 'var(--unit-2)',
                                    border: '1px solid var(--outline-variant)'
                                }}>
                                    <div className="font-medium text-sm mb-1">
                                        {msg.speaker || (msg.role === 'user' ? 'Caseworker' : 'Client')}
                                    </div>
                                    <div style={{fontSize: '0.875rem'}}>{msg.parts}</div>
                                </div>
                            ))}
                        </div>
                    </article>

                    {/* Caseworker Self-Assessment */}
                    {state.selfAssessment && (
                        <article className="card">
                            <h3 className="h4 mb-4">Caseworker Self-Assessment</h3>
                            <div className="space-y-4">
                                {ASSESSMENT_CRITERIA.map((criterion) => (
                                    <div key={criterion.key}>
                                        <h4 className="h6">{criterion.title}</h4>
                                        <p style={{fontSize: '0.875rem', color: 'var(--on-surface-variant)'}}>
                                            {state.selfAssessment![criterion.key] || 'No response provided'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </article>
                    )}

                    {/* Loading Indicator */}
                    {state.isLoading && (
                        <article className="card text-center">
                            <LoadingIndicator text="Analyzing transcript against practice behaviors..." />
                        </article>
                    )}

                    {/* AI Analysis of Caseworker */}
                    {state.caseworkerAnalysis && (
                        <div className="space-y-6">
                            {/* Criteria Analysis */}
                            {state.caseworkerAnalysis.criteriaAnalysis && (
                                <article className="card">
                                    <h3 className="h4 mb-4">Assessment Criteria Analysis</h3>
                                    <div className="space-y-4">
                                        {state.caseworkerAnalysis.criteriaAnalysis.map((criterion, index) => (
                                            <div key={index} className="p-4 border rounded-lg" style={{
                                                backgroundColor: criterion.met ? 'var(--tertiary-container)' : 'var(--error-container)',
                                                borderColor: criterion.met ? 'var(--tertiary)' : 'var(--error)'
                                            }}>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold`} style={{
                                                        backgroundColor: criterion.met ? 'var(--tertiary)' : 'var(--error)'
                                                    }}>
                                                        {criterion.met ? '✓' : '✗'}
                                                    </div>
                                                    <h4 className="h6">{criterion.criterion}</h4>
                                                    <span className={`px-2 py-1 rounded text-xs font-medium`} style={{
                                                        backgroundColor: criterion.met ? 'var(--tertiary)' : 'var(--error)',
                                                        color: 'white'
                                                    }}>
                                                        {criterion.score}
                                                    </span>
                                                </div>
                                                <div className="mb-2">
                                                    <strong>Evidence:</strong> 
                                                    <span className="italic ml-1" style={{color: 'var(--on-surface-variant)'}}>
                                                        "{criterion.evidence}"
                                                    </span>
                                                </div>
                                                <div>
                                                    <strong>Feedback:</strong> {criterion.feedback}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </article>
                            )}

                            {/* Overall Analysis */}
                            <article className="card">
                                <h3 className="h4 mb-4">AI Analysis of Caseworker Performance</h3>
                                <div className="mb-6 p-4" style={{backgroundColor: 'var(--primary-container)', borderRadius: 'var(--unit-2)'}}>
                                    <h4 className="h6">Overall Summary</h4>
                                    <p style={{fontSize: '0.875rem'}}>{state.caseworkerAnalysis.overallSummary}</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4" style={{backgroundColor: 'var(--tertiary-container)', borderRadius: 'var(--unit-2)'}}>
                                        <h4 className="h6 flex items-center gap-2 mb-2">
                                            <span className="w-5 h-5">✓</span>Strengths
                                        </h4>
                                        <ul className="list-disc list-inside space-y-1" style={{fontSize: '0.875rem'}}>
                                            {state.caseworkerAnalysis.strengths.map((s,i) => <li key={i}>{s}</li>)}
                                        </ul>
                                    </div>
                                    <div className="p-4" style={{backgroundColor: 'var(--error-container)', borderRadius: 'var(--unit-2)'}}>
                                        <h4 className="h6 flex items-center gap-2 mb-2">
                                            <span className="w-5 h-5">💡</span>Areas for Improvement
                                        </h4>
                                        <ul className="space-y-2" style={{fontSize: '0.875rem'}}>
                                            {state.caseworkerAnalysis.areasForImprovement.map((item,i) => 
                                                <li key={i}><strong>{item.area}:</strong> {item.suggestion}</li>
                                            )}
                                        </ul>
                                    </div>
                                </div>
                            </article>
                        </div>
                    )}

                    {/* Supervisor Feedback Analysis */}
                    {state.supervisorAnalysis && (
                        <article className="card">
                            <h3 className="h4 mb-4">AI Analysis of Your Coaching</h3>
                            <div className="space-y-4" style={{fontSize: '0.875rem'}}>
                                <div>
                                    <strong>Feedback on Strengths:</strong> {state.supervisorAnalysis.feedbackOnStrengths}
                                </div>
                                <div>
                                    <strong>Feedback on Critique:</strong> {state.supervisorAnalysis.feedbackOnCritique}
                                </div>
                                <div>
                                    <strong>Overall Tone:</strong> 
                                    <span className="font-semibold" style={{color: 'var(--primary)'}}> {state.supervisorAnalysis.overallTone}</span>
                                </div>
                            </div>
                        </article>
                    )}
                </div>
            ) : (
                /* No simulation data yet */
                <article className="card text-center">
                    <SparklesIcon className="w-16 h-16 mx-auto mb-4" style={{color: 'var(--on-surface-variant)'}} />
                    <h3 className="h4 mb-2">No Simulations Available</h3>
                    <p style={{color: 'var(--on-surface-variant)'}}>
                        Caseworker simulations will appear here for review and coaching feedback.
                    </p>
                    <p style={{color: 'var(--on-surface-variant)', fontSize: '0.875rem', marginTop: 'var(--unit-2)'}}>
                        Switch to Caseworker View to run a simulation.
                    </p>
                </article>
            )}

            <CurriculumDisplay />
        </div>
    );
};

//endregion

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [currentView, setCurrentView] = useState<'caseworker' | 'supervisor'>('caseworker');
  const [selectedScenario, setSelectedScenario] = useState<typeof SIMULATION_SCENARIOS[0] | null>(null);
  const [state, setState] = useState<AppState>({
    page: 'home',
    isLoading: false,
    error: null,
    simulationTranscript: [],
    selfAssessment: null,
    caseworkerAnalysis: null,
    supervisorFeedback: null,
    supervisorAnalysis: null,
  });

  const handleSetPage = (page: Page) => {
      // Reset state when navigating
      setState({
        page,
        isLoading: false,
        error: null,
        simulationTranscript: [],
        selfAssessment: null,
        caseworkerAnalysis: null,
        supervisorFeedback: null,
        supervisorAnalysis: null,
      });
  };

  const handleSimulationComplete = (transcript: Message[]) => {
      setState(s => ({ ...s, page: 'review', simulationTranscript: transcript }));
  };

  const handleReviewComplete = (data: {selfAssessment: SelfAssessment, caseworkerAnalysis: CaseworkerAnalysis, supervisorFeedback: string, supervisorAnalysis: SupervisorAnalysis}) => {
      setState(s => ({ 
        ...s, 
        selfAssessment: data.selfAssessment,
        caseworkerAnalysis: data.caseworkerAnalysis,
        supervisorFeedback: data.supervisorFeedback,
        supervisorAnalysis: data.supervisorAnalysis
      }));
  };

  const handleLoadTranscript = (transcript: Message[]) => {
      setState(s => ({ ...s, simulationTranscript: transcript }));
  };
  
  const handleScenarioSelect = (scenario: typeof SIMULATION_SCENARIOS[0]) => {
    setSelectedScenario(scenario);
    handleSetPage('simulation');
  };

  const renderPage = () => {
    // Supervisor view shows different content
    if (currentView === 'supervisor') {
      return <SupervisorDashboard state={state} onLoadTranscript={handleLoadTranscript} setState={setState} />;
    }
    
    // Caseworker view (default)
    switch (state.page) {
      case 'scenario-selection':
        return <ScenarioSelectionPage onScenarioSelect={handleScenarioSelect} />;
      case 'simulation':
        return selectedScenario ? <SimulationPageWithScenario scenario={selectedScenario} onComplete={handleSimulationComplete} /> : <SimulationPage onComplete={handleSimulationComplete} />;
      case 'review':
        return <ReviewPage simulationTranscript={state.simulationTranscript} onComplete={handleReviewComplete} />;
      case 'qa':
        return <GeneralQAPage />;
      case 'home':
      default:
        return <HomePage onSelectPage={handleSetPage} />;
    }
  };

  if (showSplash) {
    return <SplashScreen onComplete={(persona) => {
      setCurrentView(persona);
      setShowSplash(false);
    }} />;
  }

  return (
    <div className="app-container">
      <Header 
        onHomeClick={() => handleSetPage('home')} 
        showHomeButton={state.page !== 'home'}
        currentView={currentView}
        onViewChange={setCurrentView}
        onTitleClick={() => {
          setCurrentView('caseworker');
          handleSetPage('home');
        }}
      />
      <main>
        {state.error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 max-w-4xl mx-auto" role="alert" style={{borderRadius: 'var(--unit-2)'}}>
                <p className="font-bold">Error</p>
                <p>{state.error}</p>
            </div>
        )}
        {renderPage()}
      </main>
    </div>
  );
};

export default App;
