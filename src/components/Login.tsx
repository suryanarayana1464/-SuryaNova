/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Mail, Lock, ShieldAlert, Key, UserCheck, Shield } from 'lucide-react';
import { api } from '../api.js';

interface LoginProps {
  onLoginSuccess: (userData: any) => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetStage, setResetStage] = useState<'email' | 'reset'>('email');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isForgotPassword) {
      if (resetStage === 'email') {
        if (!/\S+@\S+\.\S+/.test(resetEmail)) {
            setError('Please enter a valid email address');
            return;
        }
        setLoading(true);
        try {
            await api.forgotPassword(resetEmail);
            setResetStage('reset');
            setError('');
        } catch(err: any) {
            setError(err.message || 'Failed to verify email.');
        } finally {
            setLoading(false);
        }
      } else {
        if (!password || password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(password)) {
            setError('Password must be at least 8 characters long and contain both letters and numbers');
            return;
        }
        setLoading(true);
        try {
            await api.resetPassword(resetEmail, password);
            setIsForgotPassword(false);
            setResetStage('email');
            setError('Password reset successful. Please log in.');
            setResetEmail('');
            setPassword('');
        } catch(err: any) {
            setError(err.message || 'Failed to reset password.');
        } finally {
            setLoading(false);
        }
      }
      return;
    }

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const data = isSignUp
        ? await api.signup(email, password)
        : await api.login(email, password);
      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (roleEmail: string, rolePass: string) => {
    setError('');
    setLoading(true);
    try {
      const data = await api.login(roleEmail, rolePass);
      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message || 'Quick login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login_screen" className="min-h-screen bg-black relative flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background image backdrop ("backside") */}
      <div className="absolute inset-0 z-0 select-none pointer-events-none">
        <img
          src="/src/assets/images/syn_login_background_1784123979867.jpg"
          alt="SYN Abstract Background"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 relative">
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-2xl overflow-hidden bg-black border border-slate-800 flex items-center justify-center shadow-2xl shadow-sky-950/40">
            <img
              src="/src/assets/images/syn_logo_1784123310954.jpg"
              alt="SYN Logo"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-white font-sans">
          SuryaNova Portal
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Enterprise Employee Management & RBAC System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 relative">
        <div className="bg-slate-900/80 backdrop-blur-md py-8 px-4 shadow-2xl border border-slate-800/80 rounded-2xl sm:px-10">
          {/* Tab Switcher */}
          {!isForgotPassword && (
            <div className="flex border-b border-slate-800 mb-6">
              <button
                type="button"
                id="tab_signin"
                onClick={() => { setIsSignUp(false); setError(''); }}
                className={`flex-1 pb-3 text-sm font-semibold transition border-b-2 ${
                  !isSignUp
                    ? 'border-sky-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                id="tab_signup"
                onClick={() => { setIsSignUp(true); setError(''); }}
                className={`flex-1 pb-3 text-sm font-semibold transition border-b-2 ${
                  isSignUp
                    ? 'border-sky-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign Up / Activate
              </button>
            </div>
          )}

          {isForgotPassword && (
            <div className="mb-6">
                <h3 className="text-white font-bold mb-2">{resetStage === 'email' ? 'Reset Password' : 'Enter New Password'}</h3>
                <p className="text-sm text-slate-400">
                    {resetStage === 'email' ? 'Enter your registered email address.' : 'Enter your new password for ' + resetEmail}
                </p>
            </div>
          )}

          {isSignUp && !isForgotPassword && (
            <p className="text-xs text-sky-400/90 bg-sky-950/40 border border-sky-900/30 rounded-lg p-3 mb-6 leading-relaxed">
              <strong>Employee Registration:</strong> If you are an onboarded employee, enter your onboarded email and set your desired password to automatically register and sign in.
            </p>
          )}

          {error && (
            <div id="login_error" className="mb-4 bg-rose-950/40 border border-rose-900/50 rounded-lg p-3 flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
              <p className="text-sm text-rose-200 font-medium">{error}</p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {!isForgotPassword && (
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                    Email Address
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-slate-500" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 bg-slate-950/70 border border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm text-white placeholder-slate-600"
                      placeholder="name@sny.com"
                    />
                  </div>
                </div>
            )}
            
            {isForgotPassword && resetStage === 'email' && (
                <div>
                  <label htmlFor="resetEmail" className="block text-sm font-medium text-slate-300">
                    Email Address
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-slate-500" />
                    </div>
                    <input
                      id="resetEmail"
                      name="resetEmail"
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 bg-slate-950/70 border border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm text-white placeholder-slate-600"
                      placeholder="name@sny.com"
                    />
                  </div>
                </div>
            )}

            {(!isForgotPassword || resetStage === 'reset') && (
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                    {isSignUp ? 'Set Password' : (isForgotPassword ? 'New Password' : 'Password')}
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-slate-500" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 bg-slate-950/70 border border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm text-white placeholder-slate-600"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
            )}

            {(isSignUp || resetStage === 'reset') && !isForgotPassword && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300">
                  Confirm Password
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 bg-slate-950/70 border border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm text-white placeholder-slate-600"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}
            {isForgotPassword && resetStage === 'reset' && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300">
                  Confirm New Password
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 bg-slate-950/70 border border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm text-white placeholder-slate-600"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            <div>
              <button
                id="btn_submit_login"
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-sky-600 hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 transition shadow-lg shadow-sky-600/20"
              >
                {loading ? 'Processing...' : (isForgotPassword ? (resetStage === 'email' ? 'Verify Email' : 'Reset Password') : (isSignUp ? 'Sign Up & Activate' : 'Sign In'))}
              </button>
            </div>
            {!isForgotPassword && !isSignUp && (
                <div className="text-center">
                    <button type="button" onClick={() => setIsForgotPassword(true)} className="text-xs text-slate-400 hover:text-white transition">
                        Forgot Password?
                    </button>
                </div>
            )}
            {isForgotPassword && (
                <div className="text-center">
                    <button type="button" onClick={() => { setIsForgotPassword(false); setResetStage('email'); setError(''); }} className="text-xs text-slate-400 hover:text-white transition">
                        Back to Sign In
                    </button>
                </div>
            )}
          </form>

          {/* Demo accounts section removed as requested */}
        </div>
      </div>
    </div>
  );
}
