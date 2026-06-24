import crypto from 'crypto';
import { config } from '../config/env';

export interface CaptchaChallenge {
  token: string;
  question: string;
  expiresAt: number;
}

// In-memory captcha store (use Redis in production)
const captchaStore = new Map<string, { answer: number; expiresAt: number }>();

export const generateCaptcha = (): CaptchaChallenge => {
  const num1 = Math.floor(Math.random() * 20) + 1;
  const num2 = Math.floor(Math.random() * 20) + 1;
  const operators = ['+', '-', '*'] as const;
  const op = operators[Math.floor(Math.random() * operators.length)];
  
  let answer: number;
  switch (op) {
    case '+':
      answer = num1 + num2;
      break;
    case '-':
      answer = Math.abs(num1 - num2);
      break;
    case '*':
      answer = num1 * num2;
      break;
  }

  const question = op === '-' 
    ? `${Math.max(num1, num2)} ${op} ${Math.min(num1, num2)} = ?`
    : `${num1} ${op} ${num2} = ?`;

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  
  captchaStore.set(token, { answer, expiresAt });
  
  // Cleanup expired tokens
  if (captchaStore.size > 1000) {
    for (const [key, val] of captchaStore.entries()) {
      if (val.expiresAt < Date.now()) captchaStore.delete(key);
    }
  }

  return { token, question, expiresAt };
};

export const verifyCaptcha = (token: string, answer: number): boolean => {
  const stored = captchaStore.get(token);
  if (!stored) return false;
  if (stored.expiresAt < Date.now()) {
    captchaStore.delete(token);
    return false;
  }
  captchaStore.delete(token); // One-time use
  return stored.answer === answer;
};
