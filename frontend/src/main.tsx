import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Note: Remove the .js extension for TSX
import { GoogleOAuthProvider } from '@react-oauth/google';

// Use '!' to tell TypeScript that the 'root' element definitely exists
const rootElement = document.getElementById('root')!;

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    {/* Provide the Google context to all child components */}
    <GoogleOAuthProvider clientId="928179385020-2fkalgbejbopemc6qcndo5ee8o9dglld.apps.googleusercontent.com">
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);
