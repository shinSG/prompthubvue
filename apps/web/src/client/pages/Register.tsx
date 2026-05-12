import React, { useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    register,
    isAuthenticated,
  } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t('auth.setupPasswordMismatch'));
      return;
    }

    try {
      await register({ username, password });
      navigate('/', { replace: true });
    } catch (registerError: unknown) {
      if (registerError instanceof Error && registerError.message) {
        setError(registerError.message);
      } else {
        setError(t('auth.registerError'));
      }
    }
  };

  return (
    <div className="login-container prompthub-web-auth">
      <div className="login-card rounded-[28px] border border-slate-200/80 bg-white/95 p-8 shadow-[0_32px_90px_rgba(15,23,42,0.10)] backdrop-blur">
        <h2 className="login-title text-3xl font-semibold text-slate-900">
          {t('auth.registerTitle')}
        </h2>
        <p className="setup-hint">{t('auth.needAccount')}</p>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="register-username" className="text-sm font-semibold text-slate-700">
              {t('auth.username')}
            </label>
            <input
              id="register-username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              autoFocus
              className="web-auth-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="register-password" className="text-sm font-semibold text-slate-700">
              {t('auth.password')}
            </label>
            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="web-auth-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="register-confirm-password" className="text-sm font-semibold text-slate-700">
              {t('auth.confirmPassword')}
            </label>
            <input
              id="register-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              className="web-auth-input"
            />
          </div>

          <button type="submit" className="login-submit web-auth-submit">
            <span className="text-white">{t('auth.register')}</span>
          </button>
        </form>

        <div className="auth-inline-actions">
          <Link to="/login" className="auth-link-button auth-link-button-block">
            {t('auth.signIn')}
          </Link>
        </div>
      </div>
    </div>
  );
}
