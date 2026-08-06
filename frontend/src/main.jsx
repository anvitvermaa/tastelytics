import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { Amplify } from 'aws-amplify';
import awsExports from './aws-exports';
import { ErrorBoundary } from './ErrorBoundary.jsx';

Amplify.configure(awsExports);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
