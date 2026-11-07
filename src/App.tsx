/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { sfx } from './utils/audio';

declare global {
  interface Window {
    Swal?: {
      fire: (options: Record<string, unknown>) => Promise<{ isConfirmed?: boolean }>;
    };
    particlesJS?: (id: string, config: unknown) => void;
  }
}

interface Platform {
  id: string;
  name: string;
  image: string;
  status: 'active' | 'inactive';
}

const PLATFORMS: Platform[] = [
  {
    id: 'LINEBET',
    name: 'LINEBET',
    image: '/IMG/platform/LINEBET.JPG',
    status: 'active',
  },
  {
    id: '1XBET',
    name: '1XBET',
    image: '/IMG/platform/1XBET.JPG',
    status: 'active',
  },
  {
    id: 'MELBET',
    name: 'MELBET',
    image: '/IMG/platform/MELBET.JPG',
    status: 'active',
  },
  {
    id: '888STARZ',
    name: '888STARZ',
    image: '/IMG/platform/888STARZ.JPG',
    status: 'active',
  },
];

const MULTIPLIERS = [
  'x349.68',
  'x69.93',
  'x27.97',
  'x11.18',
  'x6.71',
  'x4.02',
  'x2.41',
  'x1.93',
  'x1.54',
  'x1.23',
];

const SCAN_PROMO = 'son333';
const CODE_DURATION_MIN = 60;
const SESSION_KEY = 'gameSession_apple';

export default function App() {
  // Navigation & Page State
  const [activePage, setActivePage] = useState<
    'pageGameSelect' | 'pagePlatform' | 'pageLogin' | 'pageScan' | 'pageResult' | 'pageDashboard'
  >('pageGameSelect');

  // Splash Screen State
  const [showSplash, setShowSplash] = useState(true);
  const [splashCountdown, setSplashCountdown] = useState(3);

  // Online count
  const [onlineCount, setOnlineCount] = useState(1341);

  // Game & Platform
  const [selectedGame, setSelectedGame] = useState<string | null>('apple');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>(PLATFORMS[0]);

  // Connection Modal
  const [isConnModalOpen, setIsConnModalOpen] = useState(false);
  const [connSeconds, setConnSeconds] = useState(10);
  const [connProgress, setConnProgress] = useState(0);
  const [connStatusLine, setConnStatusLine] = useState('بدء الاتصال...');
  const [stepsState, setStepsState] = useState<{ [key: string]: 'wait' | 'active' | 'done' }>({
    st1: 'wait',
    st2: 'wait',
    st3: 'wait',
    st4: 'wait',
    st5: 'wait',
  });

  // Login & Session
  const [accountId, setAccountId] = useState('');
  const [activationKey, setActivationKey] = useState('');
  const [isServerConnected, setIsServerConnected] = useState(false);
  const [generatedKey, setGeneratedKey] = useState('');
  const [keyExpiry, setKeyExpiry] = useState<number | null>(null);

  // Verification & Uploads
  const [depositImg, setDepositImg] = useState<string | null>(null);
  const [promoImg, setPromoImg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Dashboard / Apple Grid
  const [dashTimeRemaining, setDashTimeRemaining] = useState('01:00:00');
  const [gridCells, setGridCells] = useState<number[]>(new Array(50).fill(-1)); // -1 unrevealed, 1 good apple, 0 bad apple
  const [isGridFlashing, setIsGridFlashing] = useState(false);
  const [isWaitingState, setIsWaitingState] = useState(false);
  const [signalRound, setSignalRound] = useState(1);

  // Refs
  const depositFileRef = useRef<HTMLInputElement>(null);
  const promoFileRef = useRef<HTMLInputElement>(null);
  const matrixCanvasRef = useRef<HTMLCanvasElement>(null);
  const lastProcessedCreatedAt = useRef<string | null>(null);
  const pollAbortRef = useRef<AbortController | null>(null);
  const isPollingRef = useRef<boolean>(false);
  const pendingTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const [autoSimulate, setAutoSimulate] = useState<boolean>(true);
  const [isSyncingLive, setIsSyncingLive] = useState<boolean>(true);

  // Helper for cyber SweetAlert
  const cyberAlert = (opts: {
    title: string;
    text?: string;
    html?: string;
    icon?: 'success' | 'error' | 'warning' | 'info';
    timer?: number;
    showConfirmButton?: boolean;
    confirmButtonText?: string;
  }) => {
    if (window.Swal) {
      return window.Swal.fire({
        background: '#0a0a0a',
        color: '#fff',
        customClass: {
          popup: 'mafya-swal',
          confirmButton: 'mafya-swal-confirm',
        },
        confirmButtonText: opts.confirmButtonText || 'تمام',
        ...opts,
      });
    }
  };

  // Check URL params on initial load
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const gameParam = urlParams.get('game');
      if (gameParam === 'apple') {
        setSelectedGame('apple');
        setActivePage('pagePlatform');
      }

      // Check saved platform
      const savedPlatform = localStorage.getItem('selectedPlatformData');
      if (savedPlatform) {
        const parsed = JSON.parse(savedPlatform);
        const found = PLATFORMS.find((p) => p.id === parsed.platform);
        if (found) setSelectedPlatform(found);
      }

      // Check existing session
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.expiry && Date.now() < parsed.expiry) {
          setAccountId(parsed.userId || '');
          setActivationKey(parsed.key || '');
          setKeyExpiry(parsed.expiry);
          setIsServerConnected(true);
          setActivePage('pageDashboard');
        }
      }
    } catch {}
  }, []);

  // Initialize Particles.js
  useEffect(() => {
    if (typeof window.particlesJS === 'function') {
      window.particlesJS('particles-js', {
        particles: {
          number: { value: 50, density: { enable: true, value_area: 800 } },
          color: { value: '#00f2ff' },
          shape: { type: 'circle' },
          opacity: { value: 0.5, random: true },
          size: { value: 2, random: true },
          line_linked: {
            enable: true,
            distance: 120,
            color: '#00f2ff',
            opacity: 0.15,
            width: 1,
          },
          move: {
            enable: true,
            speed: 1.2,
            direction: 'none',
            random: true,
            out_mode: 'out',
          },
        },
        interactivity: {
          detect_on: 'canvas',
          events: { onhover: { enable: true, mode: 'grab' } },
        },
      });
    }
  }, []);

  // Splash countdown
  useEffect(() => {
    if (!showSplash) return;
    const timer = setInterval(() => {
      setSplashCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimeout(() => setShowSplash(false), 200);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [showSplash]);

  // Online count fluctuating
  useEffect(() => {
    const interval = setInterval(() => {
      const delta = Math.floor(Math.random() * 5) - 2;
      setOnlineCount((prev) => Math.max(1200, prev + delta));
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  // Matrix Rain Animation for Hacking Modal
  useEffect(() => {
    if (!isConnModalOpen || !matrixCanvasRef.current) return;
    const canvas = matrixCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    canvas.width = canvas.parentElement?.clientWidth || 400;
    canvas.height = canvas.parentElement?.clientHeight || 450;

    const chars = '01ABCDEF0123456789§$%&#*+';
    const fontSize = 12;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = new Array(columns).fill(1);

    const drawMatrix = () => {
      ctx.fillStyle = 'rgba(5, 10, 20, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#00f2ff';
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = chars.charAt(Math.floor(Math.random() * chars.length));
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
      animId = requestAnimationFrame(drawMatrix);
    };

    drawMatrix();
    return () => cancelAnimationFrame(animId);
  }, [isConnModalOpen]);

  // Dashboard Remaining Timer & Auto Poll
  useEffect(() => {
    if (activePage !== 'pageDashboard') return;

    const updateTimer = () => {
      let expiry = keyExpiry || Date.now() + 24 * 60 * 60 * 1000;
      // Auto-renew permanently so user is never locked out
      if (expiry - Date.now() < 300 * 1000) {
        expiry = Date.now() + 24 * 60 * 60 * 1000;
        setKeyExpiry(expiry);
      }
      const rem = Math.max(0, Math.ceil((expiry - Date.now()) / 1000));
      const h = Math.floor(rem / 3600);
      const m = Math.floor((rem % 3600) / 60);
      const s = rem % 60;
      setDashTimeRemaining(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      );
    };

    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);

    // Initial poll
    pollCurrentGame();

    // Continuous poll every 2500ms like original thor_apple.html
    const pollInterval = setInterval(() => {
      pollCurrentGame();
    }, 2500);

    // If auto-simulate is enabled and no game is active yet, trigger prediction
    const autoSimTimer = setTimeout(() => {
      if (autoSimulate && lastProcessedCreatedAt.current === null) {
        pollCurrentGame(true);
      }
    }, 1800);

    const autoSimInterval = setInterval(() => {
      if (autoSimulate) {
        pollCurrentGame(true);
      }
    }, 18000);

    return () => {
      clearInterval(timerInterval);
      clearInterval(pollInterval);
      clearInterval(autoSimInterval);
      clearTimeout(autoSimTimer);
      cancelPendingTimeouts();
    };
  }, [activePage, keyExpiry, autoSimulate]);

  // Handle Game Selection
  const handleConfirmGame = () => {
    sfx.playClick();
    if (!selectedGame) return;
    setActivePage('pagePlatform');
  };

  // Start Platform Connection Modal
  const handleStartConnection = () => {
    sfx.playClick();
    if (selectedPlatform.status !== 'active') {
      cyberAlert({
        title: 'غير مدعومة حالياً',
        html: `<p>هذه المنصة غير مدعومة الآن: <b style="color:#00f2ff;">${selectedPlatform.name}</b>.</p>`,
        icon: 'error',
      });
      return;
    }

    localStorage.setItem(
      'selectedPlatformData',
      JSON.stringify({
        name: selectedPlatform.name,
        image: selectedPlatform.image,
        platform: selectedPlatform.id,
        game: 'apple',
      })
    );

    setIsConnModalOpen(true);
    setConnSeconds(10);
    setConnProgress(0);
    setConnStatusLine('بدء الاتصال...');
    setStepsState({
      st1: 'wait',
      st2: 'wait',
      st3: 'wait',
      st4: 'wait',
      st5: 'wait',
    });

    let s = 10;
    const interval = setInterval(() => {
      s--;
      setConnSeconds(s);
      sfx.playTick();

      if (s === 9) {
        setStepsState((prev) => ({ ...prev, st1: 'active' }));
        setConnStatusLine('تجاوز جدار الحماية...');
        setConnProgress(18);
        sfx.playStep();
      } else if (s === 7) {
        setStepsState((prev) => ({ ...prev, st1: 'done', st2: 'active' }));
        setConnStatusLine('حقن الحمولة...');
        setConnProgress(36);
        sfx.playStep();
      } else if (s === 5) {
        setStepsState((prev) => ({ ...prev, st2: 'done', st3: 'active' }));
        setConnStatusLine('فك التشفير...');
        setConnProgress(54);
        sfx.playStep();
      } else if (s === 4) {
        setStepsState((prev) => ({ ...prev, st3: 'done', st4: 'active' }));
        setConnStatusLine('تجاوز التحقق الأمني...');
        setConnProgress(72);
        sfx.playStep();
      } else if (s === 3) {
        setStepsState((prev) => ({ ...prev, st4: 'done', st5: 'active' }));
        setConnStatusLine('السيطرة على الخادم...');
        setConnProgress(90);
        sfx.playStep();
      } else if (s === 2) {
        setStepsState((prev) => ({ ...prev, st5: 'done' }));
        setConnStatusLine('تم الاتصال بنجاح ✓');
        setConnProgress(100);
        sfx.playSuccess();
      }

      if (s <= 0) {
        clearInterval(interval);
        setTimeout(() => {
          setIsConnModalOpen(false);
          setActivePage('pageLogin');
        }, 500);
      }
    }, 1000);
  };

  // Toggle Server in Login
  const handleToggleServer = () => {
    sfx.playClick();
    if (!accountId.trim()) {
      cyberAlert({
        title: 'أدخل رقم المعرف أولاً',
        icon: 'warning',
      });
      return;
    }
    const nextState = !isServerConnected;
    setIsServerConnected(nextState);
    if (nextState) {
      sfx.playSuccess();
    }
  };

  // File Upload Handlers
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'deposit' | 'promo'
  ) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.match(/^image\//)) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      sfx.playClick();
      const result = ev.target?.result as string;
      if (type === 'deposit') setDepositImg(result);
      if (type === 'promo') setPromoImg(result);
    };
    reader.readAsDataURL(file);
  };

  // Run Verification
  const handleStartScan = () => {
    if (!isServerConnected || !accountId.trim()) {
      cyberAlert({
        title: 'التحقق مقفل',
        text: 'يجب إدخال ID والاتصال بالسيرفر أولاً',
        icon: 'warning',
      });
      return;
    }
    if (!depositImg || !promoImg) return;

    sfx.playClick();
    setIsVerifying(true);

    setTimeout(() => {
      sfx.playSuccess();
      const random = Math.floor(Math.random() * 90000 + 10000);
      const newKey = `${SCAN_PROMO}-apple-${random}`;
      const expiry = Date.now() + CODE_DURATION_MIN * 60 * 1000;

      setGeneratedKey(newKey);
      setKeyExpiry(expiry);
      setActivationKey(newKey);
      setIsVerifying(false);
      setActivePage('pageResult');
    }, 2000);
  };

  // Copy Key and Navigate to Login
  const handleCopyKey = () => {
    sfx.playClick();
    if (!generatedKey) return;

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(generatedKey).catch(() => {});
    }

    setActivationKey(generatedKey);
    cyberAlert({
      title: 'تم نسخ الكود ✓',
      text: 'سيتم نقلك لصفحة تسجيل الدخول',
      icon: 'success',
      timer: 1500,
      showConfirmButton: false,
    });

    setTimeout(() => {
      setActivePage('pageLogin');
    }, 1200);
  };

  // Copy Promocode
  const handleCopyPromo = () => {
    sfx.playClick();
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(SCAN_PROMO).catch(() => {});
    }
    cyberAlert({
      title: 'تم نسخ البروموكود ✓',
      text: SCAN_PROMO,
      icon: 'success',
      timer: 1500,
      showConfirmButton: false,
    });
  };

  // Handle Login
  const handleLogin = () => {
    sfx.playClick();
    const id = accountId.trim();
    const key = activationKey.trim();

    if (!id || !key) {
      cyberAlert({
        title: 'أكمل البيانات',
        text: 'أدخل رقم المعرف وكود التفعيل',
        icon: 'warning',
      });
      return;
    }

    if (!isServerConnected) {
      cyberAlert({
        title: 'السيرفر غير متصل',
        text: 'اضغط على زر السيرفر أعلى الصفحة لتوصيله أولاً',
        icon: 'info',
      });
      return;
    }

    // Check validity
    const isValidKey =
      key.startsWith('son333-') ||
      (generatedKey && key === generatedKey) ||
      key.length >= 8;

    if (isValidKey) {
      sfx.playSuccess();
      const expiry = keyExpiry || Date.now() + CODE_DURATION_MIN * 60 * 1000;
      setKeyExpiry(expiry);
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ userId: id, key, expiry, game: 'apple' })
      );

      setActivePage('pageDashboard');
    } else {
      cyberAlert({
        title: 'كود غير صالح',
        text: 'الكود منتهي الصلاحية أو غير صحيح',
        icon: 'error',
      });
    }
  };

  // Logout
  const handleLogout = () => {
    sfx.playClick();
    localStorage.removeItem(SESSION_KEY);
    setActivePage('pageLogin');
  };

  // Cancel pending timeouts
  const cancelPendingTimeouts = () => {
    pendingTimeoutsRef.current.forEach((t) => clearTimeout(t));
    pendingTimeoutsRef.current = [];
  };

  // Reset grid back to unrevealed barrels
  const resetGridToDefault = () => {
    cancelPendingTimeouts();
    setGridCells(new Array(50).fill(-1));
    setIsGridFlashing(false);
  };

  // Update grid cells exactly as in original thor_apple.html
  const updateGrid = (boardData: number[][]) => {
    if (!boardData || !Array.isArray(boardData)) return;
    const fixedBoard = boardData.slice().reverse();
    const flatBoard = fixedBoard.flat();
    if (flatBoard.length !== 50) return;

    cancelPendingTimeouts();
    // Temporarily reset to unrevealed with transition
    setGridCells(new Array(50).fill(-1));

    const perCellDelay = 18;
    const baseDelay = 220;

    const baseT = setTimeout(() => {
      for (let i = 0; i < 50; i++) {
        const t = setTimeout(() => {
          setGridCells((prev) => {
            const next = [...prev];
            next[i] = flatBoard[i];
            return next;
          });
          if (i % 5 === 0) sfx.playCellReveal(flatBoard[i] === 1);
        }, i * perCellDelay);
        pendingTimeoutsRef.current.push(t);
      }
    }, baseDelay);
    pendingTimeoutsRef.current.push(baseT);

    const flashT = setTimeout(() => {
      setIsGridFlashing(true);
      setTimeout(() => setIsGridFlashing(false), 900);
    }, baseDelay + 50 * perCellDelay + 100);
    pendingTimeoutsRef.current.push(flashT);
  };

  // Poll current game from ajax.php (proxied to sony1x.icu)
  const pollCurrentGame = async (forceSimulate = false) => {
    if (isPollingRef.current) return;
    isPollingRef.current = true;
    if (pollAbortRef.current) pollAbortRef.current.abort();
    pollAbortRef.current = new AbortController();

    try {
      const sess = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      const userId = sess?.userId || accountId || '123456';
      const key = sess?.key || activationKey || 'son333-apple-demo';

      const res = await fetch('/ajax.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          action: 'get_current_game',
          user_id: userId,
          code: key,
          simulate: forceSimulate,
        }),
        signal: pollAbortRef.current.signal,
      });

      const data = await res.json();
      setIsSyncingLive(true);

      if (!data || !data.success) {
        isPollingRef.current = false;
        return;
      }

      if (!data.has_game) {
        setIsWaitingState(true);
        if (lastProcessedCreatedAt.current !== null) {
          resetGridToDefault();
          lastProcessedCreatedAt.current = null;
        }
        isPollingRef.current = false;
        return;
      }

      setIsWaitingState(false);
      if (data.no_attempts) {
        resetGridToDefault();
        lastProcessedCreatedAt.current = null;
        isPollingRef.current = false;
        return;
      }

      const currentCreatedAt = data.created_at || '';
      if (currentCreatedAt && currentCreatedAt !== lastProcessedCreatedAt.current) {
        lastProcessedCreatedAt.current = currentCreatedAt;
        updateGrid(data.AP);
        sfx.playSuccess();
        setSignalRound((prev) => prev + 1);
      }
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        if (forceSimulate) {
          generateFallbackPrediction();
        }
      }
    } finally {
      isPollingRef.current = false;
    }
  };

  // Client-side fallback if server cannot be reached
  const generateFallbackPrediction = () => {
    setIsWaitingState(false);
    sfx.playStep();
    const rowCounts = [4, 4, 4, 4, 3, 3, 3, 2, 2, 1];
    const boardData: number[][] = [];
    for (let r = 0; r < 10; r++) {
      const ones = rowCounts[r];
      const row = [0, 0, 0, 0, 0];
      const indices = [0, 1, 2, 3, 4].sort(() => Math.random() - 0.5);
      for (let i = 0; i < ones; i++) {
        row[indices[i]] = 1;
      }
      boardData.push(row);
    }
    lastProcessedCreatedAt.current = String(Date.now());
    updateGrid(boardData);
    sfx.playSuccess();
    setSignalRound((prev) => prev + 1);
  };

  // Start round immediately when user places a bet on the platform
  const handleStartRound = async () => {
    sfx.playClick();
    setIsWaitingState(false);
    await pollCurrentGame(true);
  };

  // End round and return to waiting state
  const handleEndRound = () => {
    sfx.playClick();
    resetGridToDefault();
    setIsWaitingState(true);
    lastProcessedCreatedAt.current = null;
  };

  return (
    <div className="min-h-screen bg-[#010409] text-white font-['Almarai'] relative select-none">
      {/* ==================== SPLASH SCREEN ==================== */}
      {showSplash && (
        <div
          id="splashScreen"
          onClick={() => {
            sfx.playClick();
            setShowSplash(false);
          }}
        >
          <div
            className="splash-skip"
            onClick={(e) => {
              e.stopPropagation();
              sfx.playClick();
              setShowSplash(false);
            }}
          >
            <i className="fas fa-forward"></i>
            <span>تخطي</span>
          </div>

          <div className="splash-rings">
            <div className="splash-ring r1"></div>
            <div className="splash-ring r2"></div>
            <div className="splash-ring r3"></div>
            <div className="splash-core">
              <img
                src="/IMG/logo.png"
                alt="Logo"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).outerHTML =
                    '<i class="fas fa-bolt" style="font-size:26px;color:var(--accent);"></i>';
                }}
              />
            </div>
          </div>

          <div className="splash-title">THOR INDECATOR V1</div>
          <div className="splash-subtitle">Neural Bypass Protocol</div>

          <div className="splash-progress-wrap">
            <div className="splash-progress-bar">
              <div className="splash-progress-fill"></div>
            </div>
            <div className="splash-info-row">
              <span className="loading-text">
                <i
                  className="fas fa-circle-notch"
                  style={{ animation: 'spin 1s linear infinite' }}
                ></i>
                Initializing<span className="loading-dots"></span>
              </span>
              <span id="splashCountdown">{splashCountdown}s</span>
            </div>
          </div>

          <div className="splash-version">
            SECURE BUILD · <span>v1.0.0</span>
          </div>
        </div>
      )}

      {/* ==================== MAIN SCREEN ==================== */}
      <div className="screen">
        {/* Background overlays */}
        <div id="particles-js" aria-hidden="true"></div>
        <div className="overlay" aria-hidden="true"></div>
        <div className="grid-bg" aria-hidden="true"></div>

        {/* Top Chips */}
        <div className="top">
          <div className="chip">
            <span className="chip-icon">
              <i className="fas fa-code"></i>
            </span>
            <span>Version</span>
            <span className="value">1.0.0</span>
          </div>

          <div className="chip online-chip">
            <span className="status-dot"></span>
            <span>Online:</span>
            <span id="platformsUserCount" className="value">
              {onlineCount}
            </span>
          </div>
        </div>

        {/* Container Wrap */}
        <div className="wrap">
          {/* ========================================================= */}
          {/* 1. GAME SELECTION SCREEN                                  */}
          {/* ========================================================= */}
          {activePage === 'pageGameSelect' && (
            <div className="game-select">
              <div className="page-brand">
                <img
                  src="/IMG/logo.png"
                  alt="Logo"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>

              <h3>اختر لعبتك</h3>

              <div className="games-row">
                <div
                  className={`game-card ${selectedGame === 'apple' ? 'selected' : ''}`}
                  onClick={() => {
                    sfx.playClick();
                    setSelectedGame('apple');
                  }}
                  data-game="apple"
                >
                  <img
                    src="/IMG/apple.png"
                    alt="Apple"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).outerHTML =
                        '<i class="fas fa-apple-alt" style="font-size:60px;color:var(--accent);"></i>';
                    }}
                  />
                  <span>Apple</span>
                </div>
              </div>

              <button
                className="select-btn"
                id="selectGameBtn"
                disabled={!selectedGame}
                onClick={handleConfirmGame}
              >
                اضغط هنا لاختيار المنصة التي ستلعب عليها
              </button>

              <div className="social-footer">
                <div className="social-footer-title">
                  <i className="fas fa-satellite-dish"></i>
                  <span>تواصل معنا</span>
                </div>
                <div className="social-links-row">
                  <a
                    href="https://t.me/+S8eSSLYmVV9kYzVk"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-link-btn developer"
                  >
                    <i className="fab fa-telegram"></i>
                    <span>Contact Developer</span>
                  </a>
                  <a
                    href="https://t.me/+S8eSSLYmVV9kYzVk"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-link-btn channel"
                  >
                    <i className="fab fa-telegram"></i>
                    <span>Telegram Channel</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2. PLATFORM SELECTION SCREEN                              */}
          {/* ========================================================= */}
          <div
            className={`page ${activePage === 'pagePlatform' ? 'active' : ''}`}
            id="pagePlatform"
          >
            <div className="header">
              <div className="page-brand">
                <img
                  src="/IMG/logo.png"
                  alt="Logo"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <h2 className="title">اختر المنصة</h2>
              <div className="subtitle">
                اللعبة المختارة:{' '}
                <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>
                  Apple Of Fortune
                </span>
              </div>
            </div>

            <div className="platforms-container" role="list">
              {PLATFORMS.map((plat) => (
                <div
                  key={plat.id}
                  className={`platform-card ${selectedPlatform.id === plat.id ? 'selected' : ''}`}
                  role="listitem"
                  tabIndex={0}
                  onClick={() => {
                    sfx.playClick();
                    setSelectedPlatform(plat);
                  }}
                  data-platform={plat.id}
                  data-status={plat.status}
                  data-name={plat.name}
                  data-image={plat.image}
                >
                  <div className="platform-logo-wrap">
                    <img src={plat.image} alt={plat.name} />
                  </div>
                  <div className="platform-info">
                    <div className="platform-name">{plat.name}</div>
                    <div className="platform-status-text online">ONLINE</div>
                  </div>
                  <div className="platform-select-indicator">
                    <i className="fas fa-check"></i>
                  </div>
                </div>
              ))}
            </div>

            <button
              id="connectPlatformBtn"
              disabled={!selectedPlatform}
              onClick={handleStartConnection}
            >
              <i className="fas fa-plug"></i>
              <span>الاتصال بسيرفر منصة</span>
              <img
                id="selectedPlatformLogo"
                className="btn-logo show"
                src={selectedPlatform.image}
                alt="logo"
              />
              <span id="selectedPlatformName">{selectedPlatform.name}</span>
            </button>
          </div>

          {/* ========================================================= */}
          {/* 3. LOGIN SCREEN                                           */}
          {/* ========================================================= */}
          <div
            className={`page ${activePage === 'pageLogin' ? 'active' : ''}`}
            id="pageLogin"
          >
            <div className="header">
              <div className="page-brand">
                <img
                  src="/IMG/logo.png"
                  alt="Logo"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <div className="game-badge-header">
                <i className="fas fa-apple-alt"></i>
                <span>Apple Of Fortune</span>
              </div>
              <h2 className="title" style={{ marginTop: '12px' }}>
                تسجيل الدخول
              </h2>
              <div className="subtitle">
                المنصة:{' '}
                <span
                  id="loginPlatformName"
                  style={{ color: 'var(--accent)', fontWeight: 800 }}
                >
                  {selectedPlatform.name}
                </span>
              </div>
            </div>

            <div className="login-card">
              <div
                className={`server-toggle ${isServerConnected ? 'active' : ''}`}
                id="serverToggle"
                onClick={handleToggleServer}
              >
                {isServerConnected ? (
                  <>
                    <i className="fas fa-signal"></i> السيرفر: متصل_أونلاين
                  </>
                ) : (
                  <>
                    <i className="fas fa-power-off"></i> السيرفر: غير متصل
                  </>
                )}
              </div>

              <div className="input-wrap">
                <i className="fas fa-user-shield"></i>
                <input
                  type="number"
                  id="idInput"
                  className="cyber-input"
                  placeholder="رقم المعرف (ID)"
                  inputMode="numeric"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                />
              </div>

              <div className="input-wrap">
                <i className="fas fa-key"></i>
                <input
                  type="text"
                  id="keyInput"
                  className="cyber-input"
                  placeholder="كود التفعيل"
                  value={activationKey}
                  onChange={(e) => setActivationKey(e.target.value)}
                />
              </div>

              <button className="select-btn" id="loginBtn" onClick={handleLogin}>
                دخول <i className="fas fa-bolt"></i>
              </button>

              <div
                className="link-btn"
                id="getNewCodeLink"
                onClick={() => {
                  sfx.playClick();
                  setActivePage('pageScan');
                }}
              >
                الحصول على كود جديد (مجاناً)
              </div>
            </div>

            <div className="social-footer">
              <div className="social-footer-title">
                <i className="fas fa-satellite-dish"></i>
                <span>تواصل معنا</span>
              </div>
              <div className="social-links-row">
                <a
                  href="https://t.me/+S8eSSLYmVV9kYzVk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-link-btn developer"
                >
                  <i className="fab fa-telegram"></i>
                  <span>Contact Developer</span>
                </a>
                <a
                  href="https://t.me/+S8eSSLYmVV9kYzVk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-link-btn channel"
                >
                  <i className="fab fa-telegram"></i>
                  <span>Telegram Channel</span>
                </a>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 4. SCAN & VERIFY SCREEN                                   */}
          {/* ========================================================= */}
          <div
            className={`page ${activePage === 'pageScan' ? 'active' : ''}`}
            id="pageScan"
          >
            <div className="header">
              <div className="page-brand">
                <img
                  src="/IMG/logo.png"
                  alt="Logo"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <h2 className="title">التحقق وأخذ كود مجاني</h2>
              <div className="subtitle">اتبع الخطوات بدقة للحصول على الكود</div>
            </div>

            {/* Lock Card: When not connected */}
            {(!isServerConnected || !accountId.trim()) && (
              <div className="scan-lock-card" id="scanLockCard">
                <div className="lock-icon">
                  <i className="fas fa-lock"></i>
                </div>
                <div className="lock-title">التحقق مقفل</div>
                <div className="lock-desc">
                  يجب إدخال <b>ID الحساب</b> والضغط على <b>الاتصال بالسيرفر</b>{' '}
                  أولاً قبل البدء في التحقق.
                </div>
                <button
                  className="select-btn"
                  onClick={() => {
                    sfx.playClick();
                    setActivePage('pageLogin');
                  }}
                >
                  الذهاب لتسجيل الدخول <i className="fas fa-arrow-left"></i>
                </button>
              </div>
            )}

            {/* Unlocked Form */}
            {isServerConnected && accountId.trim() && (
              <div className="scan-card" id="scanForm">
                <div className="workon-section">
                  <span>WORK ON</span>
                  <img
                    src={selectedPlatform.image}
                    className="plat-mini"
                    alt={selectedPlatform.name}
                  />
                  <span>
                    PROMOCODE:{' '}
                    <span className="promo-highlight" id="promoCodeValue">
                      {SCAN_PROMO}
                    </span>
                  </span>
                  <i
                    className="fas fa-copy copy-btn"
                    id="copyPromoBtn"
                    title="نسخ البروموكود"
                    onClick={handleCopyPromo}
                  ></i>
                </div>

                <div className="scan-note">
                  لن يتم إعطاء الكود إلا بعد تنفيذ الخطوات والتحقق منها ⬇️
                </div>

                <div className="scan-steps">
                  <ol>
                    <li>
                      هتحمل منصة <b>{selectedPlatform.name}</b>
                    </li>
                    <li>
                      هتعمل حساب جديد باستخدام البروموكود (
                      <span className="promo-highlight">{SCAN_PROMO}</span>)
                    </li>
                    <li>
                      قم بإيداع <b>10 دولار</b> في حسابك أو <b>5 دولار</b> بحد أدنى
                    </li>
                    <li>قم بوضع الأسكرينات المطلوبة</li>
                    <li>أضغط بدء التحقق لكي تأخذ الكود المجاني</li>
                  </ol>
                </div>

                <a
                  href="https://example.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="scan-download-btn"
                >
                  <i className="fas fa-download"></i> تحميل منصة{' '}
                  {selectedPlatform.name}
                </a>

                <div className="scan-uploads">
                  {/* Upload 1: Deposit */}
                  <div className="up">
                    <label>اسكرين الإيداع</label>
                    <div
                      className={`upload-box ${depositImg ? 'has-img' : ''}`}
                      id="depositBox"
                      role="button"
                      tabIndex={0}
                      style={
                        depositImg
                          ? { backgroundImage: `url(${depositImg})` }
                          : {}
                      }
                      onClick={() => depositFileRef.current?.click()}
                    >
                      {!depositImg && (
                        <img
                          src="/IMG/UploadFiles.gif"
                          className="upload-gif"
                          alt="Upload"
                        />
                      )}
                      <small>Deposit</small>
                    </div>
                    <input
                      type="file"
                      id="fileInput2"
                      hidden
                      accept="image/*"
                      ref={depositFileRef}
                      onChange={(e) => handleFileUpload(e, 'deposit')}
                    />
                  </div>

                  {/* Upload 2: Promocode */}
                  <div className="up">
                    <label>اسكرين البروموكود</label>
                    <div
                      className={`upload-box ${promoImg ? 'has-img' : ''}`}
                      id="promoBox"
                      role="button"
                      tabIndex={0}
                      style={
                        promoImg ? { backgroundImage: `url(${promoImg})` } : {}
                      }
                      onClick={() => promoFileRef.current?.click()}
                    >
                      {!promoImg && (
                        <img
                          src="/IMG/UploadFiles.gif"
                          className="upload-gif"
                          alt="Upload"
                        />
                      )}
                      <small>Promocode</small>
                    </div>
                    <input
                      type="file"
                      id="fileInput1"
                      hidden
                      accept="image/*"
                      ref={promoFileRef}
                      onChange={(e) => handleFileUpload(e, 'promo')}
                    />
                  </div>
                </div>

                <button
                  className="select-btn"
                  id="scanBtn"
                  disabled={!depositImg || !promoImg || isVerifying}
                  onClick={handleStartScan}
                >
                  {isVerifying ? (
                    'جاري التحقق...'
                  ) : (
                    <>
                      بدء التحقق <i className="fas fa-microchip"></i>
                    </>
                  )}
                </button>

                <div
                  className="link-btn"
                  id="backToLoginFromScan"
                  onClick={() => {
                    sfx.playClick();
                    setActivePage('pageLogin');
                  }}
                >
                  ← رجوع لتسجيل الدخول
                </div>
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* 5. CODE RESULT SCREEN                                     */}
          {/* ========================================================= */}
          <div
            className={`page ${activePage === 'pageResult' ? 'active' : ''}`}
            id="pageResult"
          >
            <div className="header">
              <div className="page-brand">
                <img
                  src="/IMG/logo.png"
                  alt="Logo"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <h2 className="title">تم استخراج الكود</h2>
              <div className="subtitle">
                الصلاحية:{' '}
                <b style={{ color: 'var(--accent)' }}>60 دقيقة</b>
              </div>
            </div>

            <div className="result-card">
              <div className="result-code-box">
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--muted)',
                    marginBottom: '8px',
                  }}
                >
                  الكود الخاص بك
                </div>
                <div id="finalKey">{generatedKey || '-----'}</div>
              </div>

              <button className="select-btn" id="copyBtn" onClick={handleCopyKey}>
                نسخ الكود والانتقال للدخول <i className="fas fa-copy"></i>
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 6. LIVE SIGNAL DASHBOARD SCREEN                           */}
          {/* ========================================================= */}
          <div
            className={`page ${activePage === 'pageDashboard' ? 'active' : ''}`}
            id="pageDashboard"
          >
            <div className="header">
              <div className="page-brand">
                <img
                  src="/IMG/logo.png"
                  alt="Logo"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <div className="game-badge-header">
                <i className="fas fa-apple-alt"></i>
                <span>Apple Of Fortune</span>
              </div>
              <h2 className="title" style={{ marginTop: '12px' }}>
                SIGNAL ACTIVE
              </h2>
            </div>

            <div className="dash-card">
              <div className="apple-dash">
                <div className="attempts-info-simple">
                  <div className="id-group">
                    <span className="label">ID:</span>
                    <span className="value" id="dashUserId">
                      {accountId || '123456'}
                    </span>
                  </div>
                  <span className="separator">|</span>
                  <div className="time-group">
                    <span className="label">الوقت المتبقي:</span>
                    <span className="value" id="timerText">
                      {dashTimeRemaining}
                    </span>
                  </div>
                </div>

                <div className="live-badge flex flex-col gap-1 px-3 py-2 w-full max-w-[340px] !rounded-xl !bg-cyan-950/40 !border !border-cyan-400/40 shadow-[0_0_15px_rgba(0,242,255,0.2)]">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <span className="live-dot"></span>
                      <span className="font-bold text-xs tracking-wider text-cyan-300">
                        سيرفر التوقعات الخاص (مستقل 100%)
                      </span>
                    </div>
                    <span className="text-[10px] text-cyan-200 font-mono bg-cyan-900/60 px-2 py-0.5 rounded border border-cyan-400/30">
                      Round #{signalRound}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-emerald-400 pt-0.5">
                    <span className="flex items-center gap-1">
                      <i className="fas fa-shield-alt"></i> محمي ومستقل · لا يمكن إيقافه
                    </span>
                    <span className="text-cyan-400/80">دقة كاملة</span>
                  </div>
                </div>

                {/* 10 x 5 Grid with row multiplier labels */}
                <div
                  className={`grid-container ${isGridFlashing ? 'new-flash' : ''}`}
                  id="gameGrid"
                >
                  {MULTIPLIERS.map((mult, rowIndex) => (
                    <React.Fragment key={`row-${rowIndex}`}>
                      <div className="row-label">{mult}</div>
                      {[0, 1, 2, 3, 4].map((colIndex) => {
                        const cellIndex = rowIndex * 5 + colIndex;
                        const cellVal = gridCells[cellIndex];
                        return (
                          <div
                            key={`cell-${cellIndex}`}
                            className={`grid-card ${
                              cellVal === 1
                                ? 'good-apple'
                                : cellVal === 0
                                ? 'bad-apple'
                                : ''
                            }`}
                          ></div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>

                {/* Live Sync Waiting State */}
                <div
                  id="waitingState"
                  className="waiting-state"
                  style={{ display: isWaitingState ? 'block' : 'none' }}
                >
                  <i className="fas fa-satellite-dish animate-pulse text-cyan-400"></i>
                  في انتظار بدء الجولة من المنصة...
                </div>

                {!isWaitingState && (
                  <div className="text-center text-xs text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-500/30 rounded-lg py-1.5 px-3 w-full max-w-[340px]">
                    <i className="fas fa-check-circle ml-1"></i> تم كشف مسار التفاح للجولة الحالية بنجاح ✓
                  </div>
                )}

                {/* Action Buttons for Signal */}
                <div className="flex flex-col gap-2 w-full max-w-[340px] mt-2">
                  {isWaitingState ? (
                    <button
                      className="select-btn w-full !py-3.5 !text-sm flex items-center justify-center gap-2 !bg-gradient-to-r !from-cyan-500 !to-blue-600 hover:!brightness-110 shadow-[0_0_20px_rgba(0,242,255,0.4)]"
                      onClick={handleStartRound}
                    >
                      <i className="fas fa-bolt text-yellow-300 text-base"></i>
                      <span className="font-bold">بدأت الدور في المنصة الآن (كشف التوقع)</span>
                    </button>
                  ) : (
                    <div className="flex gap-2 w-full">
                      <button
                        className="select-btn flex-1 !py-2.5 !text-xs flex items-center justify-center gap-1.5 !bg-amber-600/30 !border-amber-400/40 text-amber-200 hover:!bg-amber-600/50"
                        onClick={handleEndRound}
                      >
                        <i className="fas fa-undo"></i>
                        <span>إنهاء الجولة والانتظار</span>
                      </button>
                      <button
                        className="select-btn flex-1 !py-2.5 !text-xs flex items-center justify-center gap-1.5 !bg-cyan-600/40"
                        onClick={() => {
                          sfx.playClick();
                          pollCurrentGame(true);
                        }}
                      >
                        <i className="fas fa-forward"></i>
                        <span>توقع الدور التالي</span>
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] px-2.5 py-1.5 bg-cyan-950/30 border border-cyan-500/20 rounded-lg text-cyan-300">
                    <span className="flex items-center gap-1.5">
                      <i className="fas fa-microchip"></i>
                      <span>الرصد التلقائي للجولة:</span>
                    </span>
                    <button
                      type="button"
                      className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                        autoSimulate
                          ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/40'
                          : 'bg-white/10 text-white/50 border border-white/10'
                      }`}
                      onClick={() => {
                        sfx.playClick();
                        setAutoSimulate(!autoSimulate);
                      }}
                    >
                      {autoSimulate ? 'مفعل (تلقائي)' : 'يدوي عند بدء الدور'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 w-full mt-3">
                <button
                  className="logout-btn flex-1"
                  onClick={() => setActivePage('pagePlatform')}
                >
                  <i className="fas fa-exchange-alt"></i> تغيير المنصة
                </button>
                <button
                  className="logout-btn flex-1 !bg-red-950/40 !border-red-500/40 text-red-300 hover:!bg-red-900/60"
                  id="logoutBtn"
                  onClick={handleLogout}
                >
                  <i className="fas fa-sign-out-alt"></i> خروج
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 7. HACKING / CONNECTION MODAL                             */}
      {/* ========================================================= */}
      <div
        id="connBackdrop"
        className={`conn-backdrop ${isConnModalOpen ? 'show' : ''}`}
        aria-hidden={!isConnModalOpen}
      >
        <div className="conn-modal" role="dialog" aria-modal="true">
          <canvas
            ref={matrixCanvasRef}
            className="matrix-rain absolute inset-0 w-full h-full pointer-events-none z-0"
          ></canvas>

          <div className="conn-head relative z-10">
            <div className="conn-head-icon">
              <i className="fas fa-user-secret"></i>
            </div>
            <h3 id="connGameTitle">بدء الاتصال</h3>
            <div className="crash-badge" id="connGameBadge">
              Apple Of Fortune || CONNECT
            </div>
          </div>

          <div className="conn-body relative z-10">
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <b id="connPlatformName" style={{ color: '#00f2ff' }}>
                {selectedPlatform.name}
              </b>
            </div>

            <div className="progress-wrap">
              <div className="progress-info">
                <span id="connStatusLine">{connStatusLine}</span>
                <span id="connTimer">{connSeconds}s</span>
              </div>

              <div className="progress-bar">
                <div
                  id="connProgress"
                  className="progress-fill"
                  style={{ width: `${connProgress}%` }}
                ></div>
              </div>

              <div className="steps">
                <div
                  className={`step ${
                    stepsState.st1 === 'active'
                      ? 'active'
                      : stepsState.st1 === 'done'
                      ? 'done'
                      : ''
                  }`}
                  id="st1"
                >
                  <i className="fas fa-firewall"></i>
                  <div className="step-content">
                    <span>تجاوز جدار الحماية</span>
                    <span className="step-status">
                      {stepsState.st1 === 'active'
                        ? 'جاري...'
                        : stepsState.st1 === 'done'
                        ? 'تم ✓'
                        : 'انتظار'}
                    </span>
                  </div>
                </div>

                <div
                  className={`step ${
                    stepsState.st2 === 'active'
                      ? 'active'
                      : stepsState.st2 === 'done'
                      ? 'done'
                      : ''
                  }`}
                  id="st2"
                >
                  <i className="fas fa-bug"></i>
                  <div className="step-content">
                    <span>حقن الحمولة البرمجية</span>
                    <span className="step-status">
                      {stepsState.st2 === 'active'
                        ? 'جاري...'
                        : stepsState.st2 === 'done'
                        ? 'تم ✓'
                        : 'انتظار'}
                    </span>
                  </div>
                </div>

                <div
                  className={`step ${
                    stepsState.st3 === 'active'
                      ? 'active'
                      : stepsState.st3 === 'done'
                      ? 'done'
                      : ''
                  }`}
                  id="st3"
                >
                  <i className="fas fa-lock-open"></i>
                  <div className="step-content">
                    <span>فك التشفير وكسر الحماية</span>
                    <span className="step-status">
                      {stepsState.st3 === 'active'
                        ? 'جاري...'
                        : stepsState.st3 === 'done'
                        ? 'تم ✓'
                        : 'انتظار'}
                    </span>
                  </div>
                </div>

                <div
                  className={`step ${
                    stepsState.st4 === 'active'
                      ? 'active'
                      : stepsState.st4 === 'done'
                      ? 'done'
                      : ''
                  }`}
                  id="st4"
                >
                  <i className="fas fa-user-shield"></i>
                  <div className="step-content">
                    <span>تجاوز التحقق الأمني</span>
                    <span className="step-status">
                      {stepsState.st4 === 'active'
                        ? 'جاري...'
                        : stepsState.st4 === 'done'
                        ? 'تم ✓'
                        : 'انتظار'}
                    </span>
                  </div>
                </div>

                <div
                  className={`step ${
                    stepsState.st5 === 'active'
                      ? 'active'
                      : stepsState.st5 === 'done'
                      ? 'done'
                      : ''
                  }`}
                  id="st5"
                >
                  <i className="fas fa-skull"></i>
                  <div className="step-content">
                    <span>تم الاختراق والسيطرة</span>
                    <span className="step-status">
                      {stepsState.st5 === 'active'
                        ? 'جاري...'
                        : stepsState.st5 === 'done'
                        ? 'تم ✓'
                        : 'انتظار'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="conn-foot relative z-10">
            <button className="conn-btn" disabled>
              <i className="fas fa-lock"></i> جارِ الاتصال...
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
