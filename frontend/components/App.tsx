import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { AppState, Message, Page, SelfAssessment, CaseworkerAnalysis, SupervisorAnalysis } from '../types/types';
import { createChatSession, createMentorshipChatSession, createSimulationChatSession, analyzeCaseworkerPerformance, analyzeSupervisorCoaching } from '../services/geminiService';
import { ASSESSMENT_CRITERIA, SIMULATION_SYSTEM_PROMPT, GENERAL_QA_SYSTEM_PROMPT, SIMULATION_SCENARIOS, SIMULATION_PREFILL_TRANSCRIPTS, SELF_ASSESSMENT_EXAMPLES } from '../utils/constants';
import { 
    BotIcon, UserIcon, SendIcon, SparklesIcon, ClipboardIcon, 
    CheckCircleIcon, LightbulbIcon, ChatBubbleLeftRightIcon, QuestionMarkCircleIcon,
    MagicWandIcon
} from '../utils/icons';
import SplashScreen from './SplashScreen';
import StreamingAnalysisDisplay from './StreamingAnalysisDisplay';
import AnalysisDisplay from './AnalysisDisplay';


//region --- UI Components ---

const Header = ({ 
    currentView, 
    onViewChange,
    onTitleClick
}: { 
    currentView: 'caseworker' | 'supervisor',
    onViewChange: (view: 'caseworker' | 'supervisor') => void,
    onTitleClick: () => void
}) => {
    return (
        <header className="text-center relative" style={{marginBottom: 0}}>
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
};

const AboutCurriculumLink = () => {
    const [showAboutModal, setShowAboutModal] = useState(false);
    
    return (
        <div className="text-center" style={{
            marginTop: 'var(--unit-6)',
            marginBottom: 'var(--unit-8)'
        }}>
            <div className="relative inline-block">
                <button
                    className="about-curriculum-trigger"
                    onMouseEnter={() => setShowAboutModal(true)}
                    onMouseLeave={() => setShowAboutModal(false)}
                    onClick={() => setShowAboutModal(!showAboutModal)}
                    aria-label="About Core Curriculum"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 'var(--unit-2)',
                        color: 'var(--on-surface-variant)',
                        fontSize: '0.875rem',
                        padding: 'var(--unit-2) var(--unit-3)',
                        borderRadius: 'var(--unit-5)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--surface-container-low)';
                        e.currentTarget.style.color = 'var(--primary)';
                    }}
                    onMouseOut={(e) => {
                        if (!showAboutModal) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = 'var(--on-surface-variant)';
                        }
                    }}
                >
                    <QuestionMarkCircleIcon className="w-5 h-5" />
                    <span>About Core Curriculum</span>
                </button>
                {showAboutModal && (
                    <div 
                        className="about-modal"
                        onMouseEnter={() => setShowAboutModal(true)}
                        onMouseLeave={() => setShowAboutModal(false)}
                        style={{
                            position: 'absolute',
                            top: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            marginTop: 'var(--unit-2)',
                            width: '896px',
                            maxWidth: '90vw',
                            maxHeight: '70vh',
                            backgroundColor: 'var(--surface)',
                            border: '1px solid var(--outline-variant)',
                            borderRadius: 'var(--unit-3)',
                            padding: 'var(--unit-5)',
                            boxShadow: '0 4px 20px var(--shadow)',
                            zIndex: 1000,
                            animation: 'modalFadeIn 0.3s ease-out',
                            overflowY: 'auto',
                            textAlign: 'left'
                        }}
                    >
                        <h3 className="h5 mb-3" style={{textAlign: 'left'}}>About the Core Curriculum</h3>
                        <p style={{fontSize: '0.875rem', lineHeight: '1.6', color: 'var(--on-surface-variant)', marginBottom: 'var(--unit-3)', textAlign: 'left'}}>
                            This simulator is built around evidence-based practice behaviors essential for effective social work. The curriculum framework is derived from the Arkansas Division of Children and Family Services competency model.
                        </p>
                        <p style={{fontSize: '0.875rem', lineHeight: '1.6', color: 'var(--on-surface-variant)', marginBottom: 'var(--unit-3)', textAlign: 'left'}}>
                            Each simulation and feedback session focuses on developing these core competencies:
                        </p>
                        
                        <div style={{marginBottom: 'var(--unit-4)'}}>
                            {ASSESSMENT_CRITERIA.map((criterion) => (
                                <div key={criterion.key} style={{
                                    marginBottom: 'var(--unit-3)',
                                    padding: 'var(--unit-3)',
                                    backgroundColor: 'var(--surface-container-low)',
                                    borderRadius: 'var(--unit-2)',
                                    border: '1px solid var(--outline-variant)'
                                }}>
                                    <h4 style={{
                                        fontSize: '0.925rem',
                                        fontWeight: '600',
                                        color: 'var(--on-surface)',
                                        marginBottom: 'var(--unit-1)',
                                        textAlign: 'left'
                                    }}>
                                        {criterion.title}
                                    </h4>
                                    <p style={{
                                        fontSize: '0.825rem',
                                        lineHeight: '1.5',
                                        color: 'var(--on-surface-variant)',
                                        textAlign: 'left',
                                        margin: 0
                                    }}>
                                        {criterion.description}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <p style={{fontSize: '0.875rem', lineHeight: '1.6', color: 'var(--on-surface-variant)', textAlign: 'left'}}>
                            The AI provides real-time coaching aligned with these standards, helping both new and experienced workers refine their skills in a safe, supportive environment.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

const ChatInterface = ({
  history,
  onSendMessage,
  isLoading,
  placeholder = "Send a message...",
  chatTitle,
  initialMessage,
  onPrefillExample,
  showPrefillButton = false,
}: {
  history: Message[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  placeholder?: string;
  chatTitle: string;
  initialMessage?: Message;
  onPrefillExample?: () => void;
  showPrefillButton?: boolean;
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
    <div className="chat-container" style={{ position: 'relative' }}>
      {showPrefillButton && onPrefillExample && (
        <button
          onClick={onPrefillExample}
          className="glossy-chip-surface"
          style={{
            position: 'absolute',
            top: 'var(--unit-6)',
            right: 'var(--unit-6)',
            zIndex: 10
          }}
        >
          <MagicWandIcon className="w-4 h-4" />
          <span>Prefill Example</span>
        </button>
      )}
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
          className="btn-send"
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
    </div>
);

const ScenarioSelectionPage = ({ onScenarioSelect }: { onScenarioSelect: (scenario: typeof SIMULATION_SCENARIOS[0]) => void }) => {
    const [selectedScenario, setSelectedScenario] = useState<typeof SIMULATION_SCENARIOS[0] | null>(null);
    const scenariosRef = useRef<HTMLDivElement>(null);
    const caseSummaryRef = useRef<HTMLDivElement>(null);

    // Autoscroll to scenarios when page loads
    useEffect(() => {
        setTimeout(() => {
            scenariosRef.current?.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }, 100); // Small delay to ensure DOM is ready
    }, []);

    // Autoscroll to case summary when a scenario is selected
    useEffect(() => {
        if (selectedScenario) {
            setTimeout(() => {
                caseSummaryRef.current?.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }, 100); // Small delay to ensure DOM updates
        }
    }, [selectedScenario]);

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h2 className="h2 mb-4">Select a Practice Scenario</h2>
                <p style={{color: 'var(--on-surface-variant)', fontSize: '1.125rem'}}>
                    Choose a case scenario to practice your social work skills. Each scenario is based on real case files and will provide a realistic role-play experience.
                </p>
            </div>

            <div className="space-y-6">
                <div className="card" ref={scenariosRef}>
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
                    <div className="card" ref={caseSummaryRef}>
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
    const [hasPrefilled, setHasPrefilled] = useState(false);

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

    const handlePrefillExample = useCallback(() => {
        // Get available transcripts for this scenario
        const scenarioTranscripts = SIMULATION_PREFILL_TRANSCRIPTS[scenario.id as keyof typeof SIMULATION_PREFILL_TRANSCRIPTS];
        if (!scenarioTranscripts || scenarioTranscripts.length === 0) return;

        // Select a random transcript
        const randomTranscript = scenarioTranscripts[Math.floor(Math.random() * scenarioTranscripts.length)];
        
        // Set the history to the prefilled messages (excluding the initial greeting)
        setHistory(randomTranscript.messages);
        setHasPrefilled(true);
        
        // Mark as finished since these are complete examples
        setIsFinished(true);
    }, [scenario.id]);

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
                onPrefillExample={handlePrefillExample}
                showPrefillButton={!hasPrefilled && history.length === 0}
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
    type Stage = 'self-assessment' | 'caseworker-analysis' | 'caseworker-analysis-complete' | 'supervisor-review' | 'supervisor-analysis' | 'supervisor-analysis-complete' | 'final';
    const [stage, setStage] = useState<Stage>('self-assessment');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selfAssessment, setSelfAssessment] = useState<SelfAssessment>({});
    const [caseworkerAnalysis, setCaseworkerAnalysis] = useState<CaseworkerAnalysis | null>(null);
    const [supervisorFeedback, setSupervisorFeedback] = useState('');
    const [supervisorAnalysis, setSupervisorAnalysis] = useState<SupervisorAnalysis | null>(null);
    const [hasPrefilled, setHasPrefilled] = useState(false);
    
    // Streaming state
    const [streamingText, setStreamingText] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [thinkingComplete, setThinkingComplete] = useState(false);

    // Scroll to top when component mounts (when starting self-assessment)
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const handlePrefillSelfAssessment = () => {
        // Select a random example
        const randomExample = SELF_ASSESSMENT_EXAMPLES[Math.floor(Math.random() * SELF_ASSESSMENT_EXAMPLES.length)];
        setSelfAssessment(randomExample.assessment);
        setHasPrefilled(true);
    };

    const handleSelfAssessmentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setStreamingText('');
        setIsStreaming(true);
        setIsThinking(false);
        setThinkingComplete(false);
        setStage('caseworker-analysis');
        
        try {
            const analysis = await analyzeCaseworkerPerformance(
                simulationTranscript, 
                selfAssessment,
                (text, metadata) => {
                    setStreamingText(text);
                    if (metadata) {
                        setIsThinking(metadata.isThinking || false);
                        setThinkingComplete(metadata.thinkingComplete || false);
                    }
                }
            );
            setCaseworkerAnalysis(analysis);
            setIsStreaming(false);
            setStage('caseworker-analysis-complete');
            
            // Brief pause before transitioning to final view
            setTimeout(() => {
                setStage('supervisor-review');
            }, 1500);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            setStage('self-assessment');
        } finally {
            setIsLoading(false);
            setIsStreaming(false);
        }
    };

    const handleSupervisorSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setStreamingText('');
        setIsStreaming(true);
        setStage('supervisor-analysis');
        
        try {
            const analysis = await analyzeSupervisorCoaching(
                supervisorFeedback, 
                simulationTranscript,
                (text) => {
                    setStreamingText(text);
                }
            );
            setSupervisorAnalysis(analysis);
            setIsStreaming(false);
            setStage('supervisor-analysis-complete');
            
            // Brief pause before transitioning to final view
            setTimeout(() => {
                setStage('final');
            }, 1500);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            setStage('supervisor-review');
        } finally {
            setIsLoading(false);
            setIsStreaming(false);
        }
    };

    if (error) return <div className="bg-red-100 text-red-700 p-4 rounded-md">Error: {error}</div>

    const renderContent = () => {
        switch(stage) {
            case 'self-assessment':
                return (
                    <form onSubmit={handleSelfAssessmentSubmit} className="space-y-6 bg-white p-8 rounded-2xl shadow-lg border border-slate-200 relative">
                        {!hasPrefilled && Object.keys(selfAssessment).length === 0 && (
                            <button
                                type="button"
                                onClick={handlePrefillSelfAssessment}
                                className="glossy-chip-surface"
                                style={{
                                    position: 'absolute',
                                    top: 'var(--unit-6)',
                                    right: 'var(--unit-6)',
                                    zIndex: 10
                                }}
                            >
                                <MagicWandIcon className="w-4 h-4" />
                                <span>Prefill Example</span>
                            </button>
                        )}
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
                                    value={selfAssessment[c.key] || ''}
                                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    onChange={e => setSelfAssessment(s => ({ ...s, [c.key]: e.target.value }))}
                                />
                            </div>
                        ))}
                        <button type="submit" className="w-full px-6 py-3 text-white bg-blue-600 rounded-md hover:bg-blue-700 font-semibold">Submit for AI Analysis</button>
                    </form>
                );
            case 'caseworker-analysis':
            case 'caseworker-analysis-complete':
                return (
                    <StreamingAnalysisDisplay 
                        streamingText={streamingText}
                        isComplete={stage === 'caseworker-analysis-complete'}
                        isThinking={isThinking}
                        thinkingComplete={thinkingComplete}
                    />
                );
            case 'supervisor-analysis':
            case 'supervisor-analysis-complete':
                return (
                    <StreamingAnalysisDisplay 
                        streamingText={streamingText}
                        isComplete={stage === 'supervisor-analysis-complete'}
                    />
                );
            case 'supervisor-review':
            case 'final':
                return (
                    <div className="space-y-8">
                        {caseworkerAnalysis && (
                            <AnalysisDisplay analysis={caseworkerAnalysis} />
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
    );
};

const QAPage = () => {
    const [chatSession] = useState(() => createMentorshipChatSession(GENERAL_QA_SYSTEM_PROMPT));
    const [history, setHistory] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);

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
                chatTitle="Q&A with AI Mentor"
                history={history}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                placeholder="Ask a question about social work practice..."
                initialMessage={{role: 'model', parts: "Hello! I'm here to help answer your questions about the core curriculum and best practices in social work. Feel free to ask me anything about the assessment criteria, simulation scenarios, or how to improve your skills."}}
            />
        </div>
    );
};

const SupervisorDashboard = ({ onBack }: { onBack: () => void }) => {
    const [transcriptInput, setTranscriptInput] = useState('');
    const [supervisorFeedback, setSupervisorFeedback] = useState('');
    const [supervisorAnalysis, setSupervisorAnalysis] = useState<SupervisorAnalysis | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'input' | 'results'>('input');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            // Convert transcript string to Message array format
            const transcriptMessages: Message[] = transcriptInput
                .split('\n')
                .filter(line => line.trim())
                .map((line, index) => ({
                    role: index % 2 === 0 ? 'user' : 'model' as 'user' | 'model',
                    parts: line.trim()
                }));
            
            const analysis = await analyzeSupervisorCoaching(supervisorFeedback, transcriptMessages);
            setSupervisorAnalysis(analysis);
            setViewMode('results');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const reset = () => {
        setTranscriptInput('');
        setSupervisorFeedback('');
        setSupervisorAnalysis(null);
        setViewMode('input');
    };

    if (isLoading) return <LoadingIndicator text="Analyzing supervisor feedback..." />;

    return (
        <div className="max-w-4xl mx-auto">
            {error && (
                <div className="bg-red-100 text-red-700 p-4 rounded-md mb-4">
                    <strong>Error:</strong> {error}
                </div>
            )}

            {viewMode === 'input' ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="card">
                        <h2 className="h3 mb-4">Supervisor Coaching Practice</h2>
                        <p className="text-slate-600 mb-6">
                            Practice providing effective feedback to caseworkers. Enter a simulation transcript and your coaching feedback, then receive AI analysis on your supervisory approach.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label htmlFor="transcript" className="block text-sm font-medium text-slate-700 mb-1">
                                    Simulation Transcript
                                </label>
                                <textarea
                                    id="transcript"
                                    rows={8}
                                    required
                                    value={transcriptInput}
                                    onChange={(e) => setTranscriptInput(e.target.value)}
                                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Paste the conversation transcript between the caseworker and parent..."
                                />
                            </div>

                            <div>
                                <label htmlFor="feedback" className="block text-sm font-medium text-slate-700 mb-1">
                                    Your Supervisor Feedback
                                </label>
                                <textarea
                                    id="feedback"
                                    rows={6}
                                    required
                                    value={supervisorFeedback}
                                    onChange={(e) => setSupervisorFeedback(e.target.value)}
                                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Write your coaching feedback for the caseworker..."
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn-primary mt-6"
                            disabled={!transcriptInput.trim() || !supervisorFeedback.trim()}
                        >
                            Get AI Analysis
                        </button>
                    </div>
                </form>
            ) : (
                <div className="space-y-6">
                    {supervisorAnalysis && (
                        <div className="card">
                            <h3 className="h3 mb-4">AI Analysis of Your Coaching</h3>
                            
                            <div className="space-y-4">
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <h4 className="font-semibold text-blue-800 mb-2">Feedback on Acknowledging Strengths</h4>
                                    <p className="text-blue-700">{supervisorAnalysis.feedbackOnStrengths}</p>
                                </div>

                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                    <h4 className="font-semibold text-amber-800 mb-2">Feedback on Constructive Criticism</h4>
                                    <p className="text-amber-700">{supervisorAnalysis.feedbackOnCritique}</p>
                                </div>

                                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <h4 className="font-semibold text-green-800 mb-2">Overall Tone Assessment</h4>
                                    <p className="text-green-700 font-medium">{supervisorAnalysis.overallTone}</p>
                                </div>
                            </div>

                            <button onClick={reset} className="btn-secondary mt-6">
                                Try Another Example
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

//endregion

//region --- Main App Component ---

export default function App() {
    const [appState, setAppState] = useState<AppState>({
        page: 'home',
        currentView: 'caseworker',
        showSplash: true
    });
    const [selectedScenario, setSelectedScenario] = useState<typeof SIMULATION_SCENARIOS[0] | null>(null);
    const [simulationTranscript, setSimulationTranscript] = useState<Message[]>([]);
    const [contentVisible, setContentVisible] = useState(false);

    const handleSplashComplete = (persona: 'caseworker' | 'supervisor') => {
        setAppState(prev => ({ 
            ...prev, 
            showSplash: false,
            currentView: persona 
        }));
        // Add a small delay before showing content for smooth transition
        setTimeout(() => {
            setContentVisible(true);
        }, 100);
    };

    const handlePageChange = (page: Page) => {
        setAppState(prev => ({ ...prev, page }));
    };

    const handleViewChange = (view: 'caseworker' | 'supervisor') => {
        setAppState(prev => ({ 
            ...prev, 
            currentView: view,
            page: 'home'
        }));
    };

    const handleGoHome = () => {
        setAppState(prev => ({ ...prev, page: 'home' }));
        setSelectedScenario(null);
        setSimulationTranscript([]);
    };

    const handleScenarioSelect = (scenario: typeof SIMULATION_SCENARIOS[0]) => {
        setSelectedScenario(scenario);
        handlePageChange('simulation-with-scenario');
    };

    const handleSimulationComplete = (transcript: Message[]) => {
        setSimulationTranscript(transcript);
        handlePageChange('review');
    };

    const handleReviewComplete = (data: any) => {
        console.log('Review complete:', data);
        handleGoHome();
    };

    if (appState.showSplash) {
        return <SplashScreen onComplete={handleSplashComplete} />;
    }

    return (
        <div className={`container ${contentVisible ? 'fade-in' : ''}`}>
            <Header 
                currentView={appState.currentView}
                onViewChange={handleViewChange}
                onTitleClick={handleGoHome}
            />
            <AboutCurriculumLink />

            {appState.currentView === 'caseworker' ? (
                <>
                    {appState.page === 'home' && <HomePage onSelectPage={handlePageChange} />}
                    {appState.page === 'scenario-selection' && <ScenarioSelectionPage onScenarioSelect={handleScenarioSelect} />}
                    {appState.page === 'simulation' && <SimulationPage onComplete={handleSimulationComplete} />}
                    {appState.page === 'simulation-with-scenario' && selectedScenario && (
                        <SimulationPageWithScenario 
                            scenario={selectedScenario} 
                            onComplete={handleSimulationComplete} 
                        />
                    )}
                    {appState.page === 'review' && (
                        <ReviewPage 
                            simulationTranscript={simulationTranscript}
                            onComplete={handleReviewComplete}
                        />
                    )}
                    {appState.page === 'qa' && <QAPage />}
                </>
            ) : (
                <SupervisorDashboard onBack={handleGoHome} />
            )}
        </div>
    );
}

//endregion
