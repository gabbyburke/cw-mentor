import React from 'react';

// Google Symbol Icon Component
const GoogleIcon = ({ name, className }: { name: string; className?: string }) => (
  <span className={`icon ${className || ''}`} style={{ fontFamily: 'Google Symbols' }}>
    {name}
  </span>
);

export const UploadIcon = ({ className }: { className?: string }) => (
  <GoogleIcon name="upload" className={className} />
);

export const CheckCircleIcon = ({ className }: { className?: string }) => (
  <GoogleIcon name="check_circle" className={className} />
);

export const LightbulbIcon = ({ className }: { className?: string }) => (
  <GoogleIcon name="lightbulb" className={className} />
);

export const SendIcon = ({ className }: { className?: string }) => (
  <GoogleIcon name="send" className={className} />
);

export const SparklesIcon = ({ className }: { className?: string }) => (
  <GoogleIcon name="auto_awesome" className={className} />
);

export const UserIcon = ({ className }: { className?: string }) => (
  <GoogleIcon name="person" className={className} />
);

export const BotIcon = ({ className }: { className?: string }) => (
  <GoogleIcon name="smart_toy" className={className} />
);

export const ClipboardIcon = ({ className }: { className?: string }) => (
  <GoogleIcon name="assignment" className={className} />
);

export const LoadingSpinner = () => (
  <div className="loading-spinner"></div>
);

export const HomeIcon = ({ className }: { className?: string }) => (
  <GoogleIcon name="home" className={className} />
);

export const ChatBubbleLeftRightIcon = ({ className }: { className?: string }) => (
  <GoogleIcon name="chat" className={className} />
);

export const QuestionMarkCircleIcon = ({ className }: { className?: string }) => (
  <GoogleIcon name="help" className={className} />
);
