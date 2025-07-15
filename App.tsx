
import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { AppState, Message, Page, SelfAssessment, CaseworkerAnalysis, SupervisorAnalysis } from './types';
import { createChatSession, analyzeCaseworkerPerformance, analyzeSupervisorCoaching } from './services/geminiService.ts';
import { ASSESSMENT_CRITERIA, SIMULATION_SYSTEM_PROMPT, GENERAL_QA_SYSTEM_PROMPT } from './constants';
import { 
    HomeIcon, BotIcon, UserIcon, SendIcon, SparklesIcon, ClipboardIcon, 
    CheckCircleIcon, LightbulbIcon, ChatBubbleLeftRightIcon, QuestionMarkCircleIcon 
} from './components/icons';
import type { Chat } from '@google/genai';


//region --- UI Components ---

const Header = ({ onHomeClick, showHomeButton }: { onHomeClick: () => void, showHomeButton: boolean }) => (
    <header className="text-center mb-6 sm:mb-8 relative">
        {showHomeButton && (
            <button 
                onClick={onHomeClick} 
                className="absolute top-0 left-0 -translate-y-1/2  bg-white border border-slate-300 rounded-full p-3 text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-all shadow-sm"
                aria-label="Back to Home"
            >
                <HomeIcon className="w-6 h-6" />
            </button>
        )}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Social Work <span className="text-blue-600">Coaching Simulator</span>
        </h1>
    </header>
);

const CurriculumDisplay = () => (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
      <div className="flex items-center gap-3 mb-4">
        <ClipboardIcon className="w-8 h-8 text-blue-600" />
        <h2 className="text-xl font-bold text-slate-800">Core Curriculum</h2>
      </div>
      <p className="text-slate-600 mb-6 text-sm">
        Simulations and feedback are based on these core practice behaviors.
      </p>
      <div className="space-y-4">
        {ASSESSMENT_CRITERIA.map((criterion) => (
          <div key={criterion.key} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h3 className="font-semibold text-slate-700">{criterion.title}</h3>
            <p className="text-slate-500 text-sm">{criterion.description}</p>
          </div>
        ))}
      </div>
    </div>
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
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 h-full flex flex-col p-4 sm:p-6">
      <h2 className="text-xl font-bold text-slate-800 mb-4 px-2">{chatTitle}</h2>
      <div className="flex-grow overflow-y-auto pr-2 space-y-4">
        {allMessages.map((msg, index) => (
          <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'model' && <BotIcon className="w-8 h-8 flex-shrink-0 text-white bg-blue-600 rounded-full p-1.5" />}
            <div className={`max-w-md p-3 rounded-2xl ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-slate-100 text-slate-800 rounded-bl-none'
            }`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.parts}</p>
            </div>
             {msg.role === 'user' && <UserIcon className="w-8 h-8 flex-shrink-0 text-white bg-slate-500 rounded-full p-1" />}
          </div>
        ))}
         {isLoading && (
            <div className="flex items-start gap-3">
              <BotIcon className="w-8 h-8 flex-shrink-0 text-white bg-blue-600 rounded-full p-1.5" />
              <div className="max-w-md p-3 rounded-2xl bg-slate-100 text-slate-800 rounded-bl-none">
                <div className="flex items-center justify-center">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse [animation-delay:-0.15s] mx-1"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          )}
        <div ref={chatEndRef} />
      </div>
      <div className="mt-4 pt-4 border-t border-slate-200 flex items-center gap-3">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-200 text-sm"
          disabled={isLoading}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !newMessage}
          className="p-3 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
          aria-label="Send message"
        >
          <SendIcon className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};


const LoadingIndicator = ({text}: {text: string}) => (
    <div className="h-full bg-white rounded-2xl shadow-lg border border-slate-200 flex flex-col items-center justify-center text-center p-8">
        <div className="relative">
            <div className="w-24 h-24 border-8 border-slate-200 rounded-full"></div>
            <div className="w-24 h-24 border-t-8 border-blue-500 rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
        <h3 className="text-xl font-bold text-slate-700 mt-6">{text}</h3>
    </div>
);

//endregion

//region --- Page Components ---

const HomePage = ({ onSelectPage }: { onSelectPage: (page: Page) => void }) => (
    <div className="max-w-4xl mx-auto">
        <p className="text-center mt-4 max-w-2xl mx-auto text-lg text-slate-600 mb-8">
          An AI partner to help you practice, get feedback, and grow your professional skills.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div onClick={() => onSelectPage('simulation')} className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 hover:shadow-xl hover:border-blue-400 transition-all cursor-pointer">
                <ChatBubbleLeftRightIcon className="w-12 h-12 text-blue-600 mb-3" />
                <h3 className="text-xl font-bold text-slate-800">Counseling Simulation</h3>
                <p className="text-slate-600 text-sm mt-1">Engage in a realistic role-play scenario to practice your skills.</p>
            </div>
            <div onClick={() => onSelectPage('qa')} className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 hover:shadow-xl hover:border-blue-400 transition-all cursor-pointer">
                <QuestionMarkCircleIcon className="w-12 h-12 text-blue-600 mb-3" />
                <h3 className="text-xl font-bold text-slate-800">General Feedback / Q&A</h3>
                <p className="text-slate-600 text-sm mt-1">Ask questions about the curriculum and best practices.</p>
            </div>
        </div>
        <CurriculumDisplay />
    </div>
);

const SimulationPage = ({ onComplete }: { onComplete: (transcript: Message[]) => void }) => {
    const [chatSession] = useState<Chat>(() => createChatSession(SIMULATION_SYSTEM_PROMPT));
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
                chatTitle="Simulation: Parent Interview"
                history={history}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                placeholder={isFinished ? "Simulation ended." : "Your response..."}
                initialMessage={{role: 'model', parts: "Hi, thanks for coming in. I'm Maria."}}
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
    const [chatSession] = useState<Chat>(() => createChatSession(GENERAL_QA_SYSTEM_PROMPT));
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

    return (
        <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)]">
            <ChatInterface
                chatTitle="Curriculum Q&A"
                history={history}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                placeholder="Ask a question about the curriculum..."
            />
        </div>
    );
};

//endregion

const App: React.FC = () => {
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
  
  const renderPage = () => {
    switch (state.page) {
      case 'simulation':
        return <SimulationPage onComplete={handleSimulationComplete} />;
      case 'review':
        return <ReviewPage simulationTranscript={state.simulationTranscript} onComplete={() => {}} />;
      case 'qa':
        return <GeneralQAPage />;
      case 'home':
      default:
        return <HomePage onSelectPage={handleSetPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 sm:p-6 lg:p-8">
      <Header onHomeClick={() => handleSetPage('home')} showHomeButton={state.page !== 'home'} />
      <main>
        {state.error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-6 max-w-4xl mx-auto" role="alert">
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
