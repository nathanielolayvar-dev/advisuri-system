/// <reference types="vite/client" />

declare module '*.css';
declare module '*.png';
declare module '*.svg';

// This helps if LoadingIndicator.jsx is still giving you trouble
declare module './LoadingIndicator' {
  const LoadingIndicator: React.ComponentType<any>;
  export default LoadingIndicator;
}
