import React from 'react';

export const AuthProvider = ({ children }: { children?: React.ReactNode }) => {
  return React.createElement(React.Fragment, null, children ?? null);
};

export default AuthProvider;
