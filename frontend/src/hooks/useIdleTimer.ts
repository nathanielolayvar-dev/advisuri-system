import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

// 15 minutes in milliseconds
const IDLE_TIMEOUT = 15 * 60 * 1000;
// Show warning 2 minutes before logout
const WARNING_TIME = 2 * 60 * 1000;

interface UseIdleTimerReturn {
  showWarning: boolean;
  remainingTime: number;
  logout: () => Promise<void>;
  stayLoggedIn: () => void;
}

export function useIdleTimer(): UseIdleTimerReturn {
  const navigate = useNavigate();
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  
  // Track when page became hidden
  const hiddenStartRef = useRef<number | null>(null);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    sessionStorage.clear();
    navigate('/login');
  }, [navigate]);

  const stayLoggedIn = useCallback(() => {
    // Clear existing timers
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }

    setShowWarning(false);
    setRemainingTime(0);

    // Set warning timer (13 minutes - shows warning at 2 min before logout)
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setRemainingTime(WARNING_TIME / 1000);
    }, IDLE_TIMEOUT - WARNING_TIME);

    // Set logout timer (15 minutes)
    idleTimerRef.current = setTimeout(() => {
      logout();
    }, IDLE_TIMEOUT);
  }, [logout]);

  // Handle page visibility change - track time when tab is not visible
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      // Page is now hidden - record the start time
      hiddenStartRef.current = Date.now();
    } else {
      // Page is now visible - check if idle time exceeded
      if (hiddenStartRef.current) {
        const elapsedWhileHidden = Date.now() - hiddenStartRef.current;
        hiddenStartRef.current = null;
        
        // If elapsed time exceeds timeout, logout immediately
        if (elapsedWhileHidden >= IDLE_TIMEOUT) {
          logout();
          return;
        }
        
        // Otherwise, restart the timer with reduced time
        const remainingTime = IDLE_TIMEOUT - elapsedWhileHidden;
        
        // Clear existing timers
        if (idleTimerRef.current) {
          clearTimeout(idleTimerRef.current);
        }
        if (warningTimerRef.current) {
          clearTimeout(warningTimerRef.current);
        }
        
        setShowWarning(false);
        setRemainingTime(0);
        
        // Check if we're now in warning period
        if (remainingTime <= WARNING_TIME) {
          setShowWarning(true);
          setRemainingTime(Math.floor(remainingTime / 1000));
          
          // Set logout for remaining time
          idleTimerRef.current = setTimeout(() => {
            logout();
          }, remainingTime);
        } else {
          // Set warning timer
          warningTimerRef.current = setTimeout(() => {
            setShowWarning(true);
            setRemainingTime(WARNING_TIME / 1000);
          }, remainingTime - WARNING_TIME);
          
          // Set logout timer
          idleTimerRef.current = setTimeout(() => {
            logout();
          }, remainingTime);
        }
      }
    }
  }, [logout]);

  // Countdown for warning display
  useEffect(() => {
    if (showWarning) {
      const interval = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [showWarning]);

  // Set up activity listeners and visibility API
  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

    const handleActivity = () => {
      if (!showWarning) {
        stayLoggedIn();
      }
    };

    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Listen for visibility changes (tab switching, minimize, etc.)
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initialize timer
    stayLoggedIn();

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, [stayLoggedIn, showWarning, handleVisibilityChange]);

  return { showWarning, remainingTime, logout, stayLoggedIn };
}

export default useIdleTimer;
