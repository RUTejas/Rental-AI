'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { api } from '../services/api';

interface CaptchaProps {
  onVerify: (token: string, answer: number) => void;
  resetTrigger?: number;
}

export const Captcha: React.FC<CaptchaProps> = ({ onVerify, resetTrigger = 0 }) => {
  const [question, setQuestion] = useState<string>('Loading...');
  const [token, setToken] = useState<string>('');
  const [answerInput, setAnswerInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

  const fetchCaptcha = async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await api.get('/auth/captcha');
      const { token, question } = response.data.data;
      setToken(token);
      setQuestion(question);
      setAnswerInput('');
      onVerify(token, 0); // Reset parent answer state
    } catch (err) {
      console.error('Failed to load captcha', err);
      setError(true);
      setQuestion('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => fetchCaptcha(), 0);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetTrigger]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAnswerInput(val);
    const parsed = parseInt(val, 10);
    onVerify(token, isNaN(parsed) ? 0 : parsed);
  };

  return (
    <div className="flex flex-col gap-2 p-4 rounded-xl border border-sandstone/30 bg-graphite-warm/50 backdrop-blur-sm">
      <label className="text-xs font-semibold uppercase tracking-wider text-bronze-luxury">
        Security Verification
      </label>
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-black-near/60 border border-sandstone/10 px-4 py-3 rounded-lg text-center font-mono text-xl tracking-widest text-white-soft select-none">
          {question}
        </div>
        <button
          type="button"
          onClick={fetchCaptcha}
          disabled={loading}
          className="p-3 rounded-lg border border-bronze-luxury/30 text-bronze-luxury hover:bg-bronze-luxury/10 transition-colors disabled:opacity-50"
          title="Refresh Puzzle"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <input
        type="number"
        value={answerInput}
        onChange={handleInputChange}
        placeholder="Enter answer"
        className="w-full px-4 py-3 rounded-lg bg-black-near/40 border border-sandstone/25 text-white-soft placeholder-ash-grey focus:outline-none focus:border-bronze-luxury transition-colors text-center font-mono text-lg"
        required
      />
      {error && (
        <p className="text-xs text-rejected-premium text-center">
          Connection failed. Check network or reload.
        </p>
      )}
    </div>
  );
};
