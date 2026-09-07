import React from 'react';

export const AuthError: React.FC<{ message: string }> = ({ message }) => {
  if (!message) return null;
  return (
    <div className="auth-alert auth-alert--error" role="alert">
      {message}
    </div>
  );
};

export const AuthSuccess: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="auth-alert auth-alert--success" role="status">
    {children}
  </div>
);
