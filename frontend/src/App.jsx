import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, Lock, MessageSquare, Heart, RefreshCw, Send, 
  Image, FileText, Plus, User as UserIcon, 
  LogOut, Shield, ChevronDown, Check, Terminal, ExternalLink, ArrowDown,
  Settings, Share2, Search, Play, Users, Bell, FileCode, Film, Eye, Trash2, Video, Globe, Bookmark,
  PlayCircle, MessageCircle, ArrowLeft, Cookie, ShieldCheck, Pencil, X, CornerUpLeft
} from 'lucide-react';

// Global fetch interceptor to override internal server errors (>= 500) to generic "Server Error"
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  try {
    const response = await originalFetch(...args);
    if (response.status >= 500) {
      return new Response(JSON.stringify({ error: "Server Error" }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return response;
  } catch (err) {
    throw err;
  }
};


// Custom SVG component for Github since some lucide-react versions omit it
function Github({ size = 18, className = "" }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function ShortVideoPlayer({ 
  short, 
  isActive, 
  isNext, 
  onLike, 
  onOpenComments, 
  setProfileUserId, 
  setCurrentPanel, 
  setProfileTab, 
  handleVideoTimeUpdate,
  BACKEND_BASE,
  Avatar
}) {
  const videoRef = React.useRef(null);
  const blurVideoRef = React.useRef(null);

  React.useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play().catch(err => console.log("Auto-play blocked or interrupted", err));
        if (blurVideoRef.current) {
          blurVideoRef.current.play().catch(err => {});
        }
      } else {
        videoRef.current.pause();
        if (blurVideoRef.current) {
          blurVideoRef.current.pause();
        }
      }
    }
  }, [isActive]);

  return (
    <div className="short-slide" style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      minHeight: 'calc(100vh - 140px)',
      scrollSnapAlign: 'start',
      background: '#000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      flexShrink: 0
    }}>
      {/* Blur background video */}
      <video
        ref={blurVideoRef}
        src={`${BACKEND_BASE}/api/files/download/${short.mediaUrl}`}
        preload={isActive || isNext ? "auto" : "none"}
        muted
        loop
        playsInline
        style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(20px) brightness(0.35)', zIndex: 1, pointerEvents: 'none' }}
      />

      {/* Main video */}
      <video
        ref={videoRef}
        src={`${BACKEND_BASE}/api/files/download/${short.mediaUrl}`}
        className="shorts-video-player"
        loop
        controls={false}
        playsInline
        preload={isActive || isNext ? "auto" : "none"}
        style={{ position: 'relative', zIndex: 2, width: '100%', height: '100%', objectFit: 'contain', cursor: 'pointer' }}
        onClick={() => {
          if (videoRef.current) {
            if (videoRef.current.paused) {
              videoRef.current.play().catch(err => {});
              blurVideoRef.current?.play().catch(err => {});
            } else {
              videoRef.current.pause();
              blurVideoRef.current?.pause();
            }
          }
        }}
        onTimeUpdate={(e) => handleVideoTimeUpdate(e, short.id)}
      />

      {/* Overlay info & buttons */}
      <div className="shorts-info-overlay" style={{ position: 'absolute', bottom: '16px', left: '16px', zIndex: 3, right: '70px', textShadow: '0 2px 4px rgba(0,0,0,0.8)', textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
          <span style={{ fontWeight: '700', fontSize: '14px', color: '#fff', cursor: 'pointer' }} onClick={() => { setProfileUserId(short.userId); setCurrentPanel('profile'); }}>
            @{short.username}
          </span>
          {short.collaboratorName && (
            <span style={{ fontSize: '11px', color: 'var(--accent-blue)', fontWeight: 600, cursor: 'pointer' }} onClick={() => { setProfileUserId(short.collaboratorId); setCurrentPanel('profile'); setProfileTab('feed'); }}>
              with @{short.collaboratorName}
            </span>
          )}
        </div>
        <p style={{ margin: 0, fontSize: '13px', color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {short.content}
        </p>
      </div>

      <div className="shorts-actions-sidebar" style={{ position: 'absolute', right: '16px', bottom: '24px', zIndex: 3, display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
        <button 
          className="short-sidebar-btn" 
          onClick={() => onLike(short.id)}
          style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}
        >
          <Heart size={20} fill={short.isLiked ? 'var(--accent-danger)' : 'none'} className={short.isLiked ? 'text-danger' : ''} />
        </button>
        <span style={{ fontSize: '11px', color: 'white', marginTop: '-12px', fontWeight: '600' }}>{short.likesCount}</span>

        <button 
          className="short-sidebar-btn" 
          onClick={() => onOpenComments(short.id)}
          style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}
        >
          <MessageSquare size={20} />
        </button>
        <span style={{ fontSize: '11px', color: 'white', marginTop: '-12px', fontWeight: '600' }}>{short.commentsCount}</span>
      </div>
    </div>
  );
}

const getBackendBase = () => {
  let url = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  return url;
};
const BACKEND_BASE = getBackendBase();
const API_BASE = `${BACKEND_BASE}/api`;
const NICHE_CATEGORIES = {
  "Coding & Tech": [
    'Web Development',
    'AI & Data Science',
    'Mobile Apps',
    'DevOps & Cloud',
    'Cybersecurity',
    'Game Development'
  ],
  "Education & Tutorials": [
    'Programming Tutorials',
    'Math & Science Education',
    'UI/UX Design Tutorials'
  ],
  "Daily & Creator Space": [
    'Daily Tech Vlog',
    'Gaming Live Stream',
    'Tech Reviews & News',
    'Coding Music & Study'
  ]
};

const NICHES = Object.values(NICHE_CATEGORIES).flat();

// Avatar fallback component with consistent background colors and username's first letter
function Avatar({ username = '', src = '', className = '', style = {}, size = 32, onClick = null }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Reset error state if src changes
    setHasError(false);
  }, [src]);

  const getAvatarBgColor = (name) => {
    if (!name) return '#6b7280';
    let hash = 0;
    const cleanName = name.replace(/^@/, '');
    for (let i = 0; i < cleanName.length; i++) {
      hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      '#4f46e5', '#2563eb', '#0891b2', '#0d9488', '#059669', 
      '#16a34a', '#84cc16', '#ca8a04', '#ea580c', '#dc2626', 
      '#db2777', '#c084fc', '#9333ea', '#7c3aed'
    ];
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const firstLetter = username ? username.replace(/^@/, '').charAt(0).toUpperCase() : '?';

  if (!src || hasError) {
    const bgColor = getAvatarBgColor(username);
    return (
      <div 
        className={`avatar-fallback-logo ${className}`}
        onClick={onClick}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: bgColor,
          color: '#ffffff',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '700',
          fontSize: `${size * 0.4}px`,
          textTransform: 'uppercase',
          border: '1px solid rgba(255,255,255,0.15)',
          flexShrink: 0,
          userSelect: 'none',
          cursor: onClick ? 'pointer' : 'default',
          ...style
        }}
      >
        {firstLetter}
      </div>
    );
  }

  return (
    <img 
      src={src} 
      className={className} 
      alt={username}
      onClick={onClick}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        objectFit: 'cover',
        flexShrink: 0,
        cursor: onClick ? 'pointer' : 'default',
        ...style
      }}
      onError={() => setHasError(true)}
    />
  );
}

// Lightweight custom Regex-based markdown parser
function parseMarkdown(md) {
  if (!md) return '';
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  html = html.replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>');
  
  return html.split('\n\n').map(p => {
    if (p.trim().startsWith('<h') || p.trim().startsWith('<pre') || p.trim().startsWith('<li')) {
      return p;
    }
    return `<p>${p.replace(/\n/g, '<br/>')}</p>`;
  }).join('\n');
}

function formatRelativeTime(dateString) {
  if (!dateString) return 'Just now';
  let formattedString = dateString;
  if (!dateString.includes('Z') && !dateString.includes('+') && !dateString.includes('T')) {
    // Convert SQLite 'YYYY-MM-DD HH:MM:SS' format to ISO UTC
    formattedString = dateString.replace(' ', 'T') + 'Z';
  } else if (!dateString.includes('Z') && dateString.includes('T') && !dateString.includes('+')) {
    formattedString = dateString + 'Z';
  }
  const now = new Date();
  const date = new Date(formattedString);
  const diffMs = now.getTime() - date.getTime();
  
  if (isNaN(diffMs) || diffMs < 0) return 'Just now';
  
  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 60) return `${diffSecs} sec ago`;
  
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins} min ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hours ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} days ago`;
  
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffDays < 30) return `${diffWeeks} weeks ago`;
  
  const diffMonths = Math.floor(diffDays / 30);
  if (diffDays < 365) return `${diffMonths} months ago`;
  
  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears} yrs ago`;
}

function parseUTCDate(dateString) {
  if (!dateString) return new Date();
  let formattedString = dateString;
  if (!dateString.includes('Z') && !dateString.includes('+') && !dateString.includes('T')) {
    // Convert SQLite 'YYYY-MM-DD HH:MM:SS' format to ISO UTC
    formattedString = dateString.replace(' ', 'T') + 'Z';
  } else if (!dateString.includes('Z') && dateString.includes('T') && !dateString.includes('+')) {
    formattedString = dateString + 'Z';
  }
  return new Date(formattedString);
}

function TermsAndConditionsPage({ navigateTo }) {
  const [activeTab, setActiveTab] = useState('terms');
  const [consentCache, setConsentCache] = useState(true);
  const [consentTelemetry, setConsentTelemetry] = useState(false);

  return (
    <div className="policy-page-container fade-in-panel">
      <div className="policy-bg-blob blob-1"></div>
      <div className="policy-bg-blob blob-2"></div>
      
      <header className="policy-header">
        <div className="policy-brand" onClick={() => navigateTo('/')} style={{ cursor: 'pointer' }}>
          <span style={{ fontSize: '20px' }}>📦</span>
          <span style={{ fontWeight: 'bold', letterSpacing: '1px', background: 'linear-gradient(90deg, #6366f1, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Open Store</span>
        </div>
        <button className="policy-back-btn" onClick={() => navigateTo('/')}>
          <ArrowLeft size={14} />
          <span>Back to Landing</span>
        </button>
      </header>

      <div className="policy-main-content">
        <aside className="policy-sidebar">
          <h2 className="policy-sidebar-title">Security & Policy Center</h2>
          <nav className="policy-tabs">
            <button 
              className={`policy-tab-item ${activeTab === 'terms' ? 'active' : ''}`}
              onClick={() => setActiveTab('terms')}
            >
              <div className="policy-tab-icon-wrapper">
                <FileText size={16} />
              </div>
              <div className="policy-tab-text">
                <span className="policy-tab-label">Terms & Conditions</span>
                <span className="policy-tab-desc">User rules & content policy</span>
              </div>
            </button>

            <button 
              className={`policy-tab-item ${activeTab === 'privacy' ? 'active' : ''}`}
              onClick={() => setActiveTab('privacy')}
            >
              <div className="policy-tab-icon-wrapper">
                <Lock size={16} />
              </div>
              <div className="policy-tab-text">
                <span className="policy-tab-label">Privacy Policy</span>
                <span className="policy-tab-desc">Data encryption & safety</span>
              </div>
            </button>

            <button 
              className={`policy-tab-item ${activeTab === 'cookies' ? 'active' : ''}`}
              onClick={() => setActiveTab('cookies')}
            >
              <div className="policy-tab-icon-wrapper">
                <Cookie size={16} />
              </div>
              <div className="policy-tab-text">
                <span className="policy-tab-label">Cookies & Sessions</span>
                <span className="policy-tab-desc">Local storage & tracking</span>
              </div>
            </button>
          </nav>
        </aside>

        <section className="policy-detail-panel">
          {activeTab === 'terms' && (
            <div className="policy-section-content fade-in-panel">
              <div className="policy-section-header">
                <h3>Terms & Conditions</h3>
                <p>Welcome to the luxury space for secure developer logs, code vaults, and private source sharing.</p>
              </div>
              
              <div className="policy-body">
                <p>By entering Open Store, you agree to adhere to our peer-to-peer security code of conduct. The workspace is built for professional collaboration, privacy, and integrity.</p>
                
                <div className="policy-visual-grid">
                  <div className="policy-visual-card">
                    <h5>📦 Code Ownership</h5>
                    <p>You retain full copyright of all repositories, files, and updates you publish or vault.</p>
                  </div>
                  <div className="policy-visual-card">
                    <h5>🔒 Absolute Privacy</h5>
                    <p>Strictly no scraping, unapproved downloading, or distribution of other members' private media vaults.</p>
                  </div>
                  <div className="policy-visual-card">
                    <h5>⏳ 24-Hour Expiry</h5>
                    <p>Stories are temporary logs automatically deleted from our servers after exactly 24 hours.</p>
                  </div>
                </div>

                <div className="policy-accordion-section">
                  <h4>Common Questions</h4>
                  <details className="policy-details-elem">
                    <summary>What files can I upload to the Vault?</summary>
                    <p>You can upload documents, screenshots, and videos up to 50MB. All uploads are encrypted block-by-block using your custom-defined cryptographic key before being written to storage.</p>
                  </details>
                  <details className="policy-details-elem">
                    <summary>How are stories cleaned up?</summary>
                    <p>A backend background task runs every 30 minutes, identifying stories older than 24 hours, deleting their database records, and permanently purging the media files from storage.</p>
                  </details>
                  <details className="policy-details-elem">
                    <summary>How is my database protected from deletion on free hosting?</summary>
                    <p>To prevent data loss on free or ephemeral hosting platforms (which might clear files due to quotas or inactive periods), the backend is designed to run anywhere while utilizing GitHub as a persistent database. It downloads the active SQLite database on startup and automatically backs it up to your repository on every write. If the backend is suspended or redeployed to another site, your database is never deleted and you can seamlessly rehost the backend to any new URL without losing a single user or post.</p>
                  </details>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="policy-section-content fade-in-panel">
              <div className="policy-section-header">
                <h3>Privacy Policy</h3>
                <p>Learn how we shield your credentials and encrypt your files.</p>
              </div>

              <div className="policy-body">
                <p>Your privacy is protected cryptographically rather than legally. We do not inspect your vaulted media, messages, or source code. Our storage is encrypted using a Dynamic Chaotic Bit-Scrambler.</p>

                <div className="policy-visual-grid">
                  <div className="policy-visual-card">
                    <h5>🔑 Bit-Scrambler</h5>
                    <p>Data files are scrambled with keys derived dynamically from process environment credentials.</p>
                  </div>
                  <div className="policy-visual-card">
                    <h5>💬 Locked Chats</h5>
                    <p>Direct messages are completely private and locked until follow requests are accepted by both developers.</p>
                  </div>
                </div>

                <div className="policy-consent-box" style={{ marginTop: '24px' }}>
                  <div className="policy-consent-text">
                    <h5>Profile Local Storage Caching</h5>
                    <p>Enable local storage caching of your active user session to bypass re-authentication on refresh.</p>
                  </div>
                  <label className="toggle-switch">
                    <input 
                      type="checkbox" 
                      checked={consentCache} 
                      onChange={(e) => setConsentCache(e.target.checked)} 
                    />
                    <span className="toggle-slider round"></span>
                  </label>
                </div>

                <div className="policy-consent-box">
                  <div className="policy-consent-text">
                    <h5>Anonymous Usage Telemetry</h5>
                    <p>Allow anonymous logs of dashboard clicks to help us optimize UI latency.</p>
                  </div>
                  <label className="toggle-switch">
                    <input 
                      type="checkbox" 
                      checked={consentTelemetry} 
                      onChange={(e) => setConsentTelemetry(e.target.checked)} 
                    />
                    <span className="toggle-slider round"></span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cookies' && (
            <div className="policy-section-content fade-in-panel">
              <div className="policy-section-header">
                <h3>Cookie & Session Policy</h3>
                <p>Clear, visual details of all persistent data stored inside your browser.</p>
              </div>

              <div className="policy-body">
                <p>We do not use tracking cookies or sell your session data. The following items are stored locally on your device to keep you authenticated and maintain your preferences:</p>

                <div className="cookie-policy-table-wrapper" style={{ marginTop: '20px', marginBottom: '24px' }}>
                  <table className="cookie-policy-table">
                    <thead>
                      <tr>
                        <th>Storage Key</th>
                        <th>Type</th>
                        <th>Purpose</th>
                        <th>Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><code>user</code></td>
                        <td>Local Storage</td>
                        <td>Stores active login details (username, niche, avatar)</td>
                        <td>Until Logout</td>
                      </tr>
                      <tr>
                        <td><code>inWorkspace</code></td>
                        <td>Local Storage</td>
                        <td>Remembers if you entered the workspace to bypass landing screen</td>
                        <td>Until Logout</td>
                      </tr>
                      <tr>
                        <td><code>savedPostIds</code></td>
                        <td>Local Storage</td>
                        <td>IDs of posts you marked as "Saved" for custom feed filtering</td>
                        <td>Permanent</td>
                      </tr>
                      <tr>
                        <td><code>theme</code></td>
                        <td>Local Storage</td>
                        <td>Tracks preference for Light or Dark mode</td>
                        <td>Permanent</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="policy-consent-box">
                  <div className="policy-consent-text">
                    <h5>Session Persistence</h5>
                    <p>Allow keeping your login session active across browser tabs.</p>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={true} disabled />
                    <span className="toggle-slider round" style={{ opacity: 0.6, cursor: 'not-allowed' }}></span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function App() {
  // Navigation: Landing Page vs Workspace
  const [inWorkspace, setInWorkspace] = useState(() => {
    return localStorage.getItem('inWorkspace') === 'true';
  });

  // Authentication State
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [authMode, setAuthMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [require2FA, setRequire2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorUserId, setTwoFactorUserId] = useState(null);

  const [email, setEmail] = useState('');
  const [requireOTP, setRequireOTP] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpUserId, setOtpUserId] = useState(null);

  const [currentPanel, setCurrentPanel] = useState('feed');
  const [feedTab, setFeedTab] = useState('all'); // 'all', 'updates'

  // Theme state
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Custom router state
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };
  
  // Profile user, stats, and tab states
  const [profileUserId, setProfileUserId] = useState(null); // When viewing a profile
  const [profileTab, setProfileTab] = useState('feed');     // 'feed' | 'vault' | 'projects' | 'analytics' | 'settings'
  const [profileUser, setProfileUser] = useState(null);
  const [profileStats, setProfileStats] = useState({
    postsCount: 0,
    likesCount: 0,
    viewsCount: 0,
    videosCount: 0,
    followersCount: 0,
    followingCount: 0
  });
  const [profilePosts, setProfilePosts] = useState([]);
  const [profileFollowers, setProfileFollowers] = useState([]);
  const [profileFollowing, setProfileFollowing] = useState([]);

  // Feed & Creator State (Rebranded: Logs -> updates, Vaults -> uploads, Sources -> projects)
  const [posts, setPosts] = useState([]);
  const [activeDetailsPost, setActiveDetailsPost] = useState(null);
  const [savedPostIds, setSavedPostIds] = useState(() => {
    try {
      const saved = localStorage.getItem('savedPostIds');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('savedPostIds', JSON.stringify(savedPostIds));
  }, [savedPostIds]);

  const handleSavePost = (postId) => {
    setSavedPostIds(prev => {
      if (prev.includes(postId)) {
        return prev.filter(id => id !== postId);
      } else {
        return [...prev, postId];
      }
    });
  };

  const [creatorType, setCreatorType] = useState('log'); // 'log' (Updates), 'vault' (Uploads), 'source' (Projects)
  const [postText, setPostText] = useState('');
  const [githubRepo, setGithubRepo] = useState(''); // Stores repo path OR custom website URL
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [followedFilterUserId, setFollowedFilterUserId] = useState(null);

  // Active Comments Drawer & Threaded Replies
  const [activeCommentsPostId, setActiveCommentsPostId] = useState(null);
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [replyingToCommentId, setReplyingToCommentId] = useState(null);
  const [replyText, setReplyText] = useState('');

  // Stories State
  const [stories, setStories] = useState([]);
  const [showStoryUpload, setShowStoryUpload] = useState(false);
  const [storyText, setStoryText] = useState('');
  const [storyFile, setStoryFile] = useState(null);
  const [uploadingStory, setUploadingStory] = useState(false);
  const [activeStoryGroup, setActiveStoryGroup] = useState(null); // Story group active in viewer
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
   // Support Request States
  const [supportType, setSupportType] = useState('error');
  const [supportDesc, setSupportDesc] = useState('');
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [supportSuccess, setSupportSuccess] = useState(false);
  const [supportError, setSupportError] = useState('');


  // Direct Message (Chat) State
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newChatText, setNewChatText] = useState('');
  const [chatFile, setChatFile] = useState(null);
  const [sendingChat, setSendingChat] = useState(false);
  const [isContactTyping, setIsContactTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  // Message Replies and Lightbox States
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [lightboxScale, setLightboxScale] = useState(1);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [actionedRequests, setActionedRequests] = useState({});
  const chatLogRef = useRef(null);
  const lastScrolledContactIdRef = useRef(null);

  // Profile Settings Modal State
  const [showSettings, setShowSettings] = useState(false);
  const [settingsUsername, setSettingsUsername] = useState('');
  const [settingsName, setSettingsName] = useState('');
  const [settingsAvatar, setSettingsAvatar] = useState('');
  const [settingsNiche, setSettingsNiche] = useState('');
  const [settingsDescription, setSettingsDescription] = useState('');
  const [settingsTag, setSettingsTag] = useState('');
  const [settingsSocialUrl, setSettingsSocialUrl] = useState('');
  const [settingsPlaybackQuality, setSettingsPlaybackQuality] = useState('Auto');
  const [settingsMediaCompression, setSettingsMediaCompression] = useState('Balanced');
  const [settingsAutoplayCaptions, setSettingsAutoplayCaptions] = useState(true);
  const [totpSetupSecret, setTotpSetupSecret] = useState('');
  const [totpSetupQrUrl, setTotpSetupQrUrl] = useState('');
  const [totpSetupToken, setTotpSetupToken] = useState('');
  const [showTotpSetup, setShowTotpSetup] = useState(false);
  const [totpDisableToken, setTotpDisableToken] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuggestions, setSettingsSuggestions] = useState([]);
  const [avatarFile, setAvatarFile] = useState(null);       // File object for upload
  const [avatarMode, setAvatarMode] = useState('url');      // 'url' | 'file'
  const [avatarPreview, setAvatarPreview] = useState('');   // local blob preview URL
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarFileInputRef = useRef(null);

  // Channel comments moderation
  const [channelComments, setChannelComments] = useState([]);

  // Collaborator state for post creation
  const [selectedCollaborator, setSelectedCollaborator] = useState(null);
  const [showUploadDrawer, setShowUploadDrawer] = useState(false);
  const [collabSearchText, setCollabSearchText] = useState('');
  const [showCollabMenu, setShowCollabMenu] = useState(false);
  const watchedPostsRef = useRef(new Set());

  // Fuzzy Header Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ users: [], videos: [] });
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Post Share State
  const [activeSharePostId, setActiveSharePostId] = useState(null);
  const [copiedPostId, setCopiedPostId] = useState(null);

  // Members Directory State
  const [allUsers, setAllUsers] = useState([]);
  const [membersSearch, setMembersSearch] = useState('');

  // Notifications List State
  const [notifications, setNotifications] = useState([]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [toasts, setToasts] = useState([]);
  const prevNotificationsRef = useRef([]);
  const isFirstNotificationFetchRef = useRef(true);

  // Shorts View (Vertical Video Looper) State
  const [shortVideoIndex, setShortVideoIndex] = useState(0);

  // Scroll Animation State
  const [scrollPercent, setScrollPercent] = useState(0);
  const landingRef = useRef(null);
  const fileInputRef = useRef(null);
  const storyFileInputRef = useRef(null);
  const chatFileInputRef = useRef(null);
  const chatEndRef = useRef(null);
  const bellRef = useRef(null);
  const searchContainerRef = useRef(null);

  // Click outside listener for notifications and search dropdowns
  useEffect(() => {
    // Apply theme class to body
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(`${theme}-theme`);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // System theme change listener
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return; // user manually set it, skip system
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setTheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Click outside listener for notifications and search dropdowns
  useEffect(() => {

    const handleClickOutside = (event) => {
      if (
        showNotificationsDropdown &&
        bellRef.current &&
        !bellRef.current.contains(event.target)
      ) {
        setShowNotificationsDropdown(false);
      }
      if (
        showSearchDropdown &&
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target)
      ) {
        setShowSearchDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotificationsDropdown, showSearchDropdown]);

  // Scroll Event Listener for Landing Page
  useEffect(() => {
    if (inWorkspace) return;

    const handleScroll = () => {
      if (!landingRef.current) return;
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        const percent = scrollTop / docHeight;
        setScrollPercent(percent);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [inWorkspace]);

  // Interactive 3D mouse-tilt card handlers
  const handleCardMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((centerY - y) / centerY) * 10;
    const rotateY = ((x - centerX) / centerX) * 10;
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    card.style.setProperty('--glare-x', `${(x / rect.width) * 100}%`);
    card.style.setProperty('--glare-y', `${(y / rect.height) * 100}%`);
  };

  const handleCardMouseLeave = (e) => {
    const card = e.currentTarget;
    card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    card.style.setProperty('--glare-x', `50%`);
    card.style.setProperty('--glare-y', `50%`);
  };

  // Verify user session validity on startup (helps log out stale users after DB resets)
  useEffect(() => {
    async function verifyUserSession() {
      if (!user) return;
      try {
        const res = await fetch(`${API_BASE}/users/${user.id}?_=${Date.now()}`);
        if (!res.ok) {
          if (res.status === 404 || res.status === 401) {
            console.warn("Session expired or user not found. Logging out.");
            handleLogout();
          }
        }
      } catch (err) {
        console.error("Failed to verify user session:", err);
      }
    }
    verifyUserSession();
  }, [user]);

  // Load notifications
  const fetchNotifications = async (forceSync = false) => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE}/notifications?_=${Date.now()}&currentPanel=${currentPanel}${forceSync ? '&forceSync=true' : ''}`, {
        headers: { 'x-user-id': user.id.toString() }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  // Trigger Toast notifications on new notifications
  useEffect(() => {
    if (isFirstNotificationFetchRef.current) {
      if (notifications.length > 0) {
        isFirstNotificationFetchRef.current = false;
      }
      prevNotificationsRef.current = notifications;
      return;
    }
    if (notifications.length > prevNotificationsRef.current.length) {
      const prevIds = new Set(prevNotificationsRef.current.map(n => n.id));
      const newNotifications = notifications.filter(n => !prevIds.has(n.id));
      
      newNotifications.forEach(notif => {
        // Suppress message notifications if user is in message tab
        if (currentPanel === 'chat' && notif.type === 'message') return;

        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message: notif.message, type: notif.type }]);
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
      });
    }
    prevNotificationsRef.current = notifications;
  }, [notifications, currentPanel]);

  const handleClearNotifications = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE}/notifications/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      if (res.ok) {
        setNotifications([]);
      }
    } catch (err) {
      console.error("Error clearing notifications:", err);
    }
  };

  const handleNotificationClick = (notif) => {
    setShowNotificationsDropdown(false);
    if (notif.postId) {
      setCurrentPanel('all');
      handleOpenComments(notif.postId);
    } else if (notif.type === 'message' && notif.senderId) {
      const senderObj = contacts.find(c => c.id === notif.senderId);
      if (senderObj) {
        setSelectedContact(senderObj);
      } else {
        fetch(`${API_BASE}/users/${notif.senderId}`)
          .then(r => r.json())
          .then(data => setSelectedContact(data))
          .catch(() => {});
      }
      setCurrentPanel('chat');
    } else if (notif.senderId) {
      setProfileUserId(notif.senderId);
      setCurrentPanel('profile');
      setProfileTab('feed');
    }
  };
  const fetchProfileDetails = async (targetId) => {
    try {
      const res = await fetch(`${API_BASE}/users/${targetId}?_=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setProfileUser(data);
      } else if (res.status === 404 && targetId === user?.id) {
        console.warn("Logged in user not found in database. Logging out.");
        handleLogout();
      }
    } catch (err) {
      console.error("Error fetching profile details:", err);
    }
  };

  const fetchProfileStats = async (targetId) => {
    try {
      const res = await fetch(`${API_BASE}/users/${targetId}/stats?_=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setProfileStats(data);
      }
    } catch (err) {
      console.error("Error fetching profile stats:", err);
    }
  };

  const fetchProfileFollowers = async (targetId) => {
    try {
      const res = await fetch(`${API_BASE}/users/${targetId}/followers?_=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setProfileFollowers(data);
      }
    } catch (err) {
      console.error("Error fetching profile followers:", err);
    }
  };

  const fetchProfileFollowing = async (targetId) => {
    try {
      const res = await fetch(`${API_BASE}/users/${targetId}/following?_=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setProfileFollowing(data);
      }
    } catch (err) {
      console.error("Error fetching profile following:", err);
    }
  };

  const fetchProfilePosts = async (targetId) => {
    try {
      const res = await fetch(`${API_BASE}/users/${targetId}/posts?_=${Date.now()}`, {
        headers: { 'x-user-id': user?.id?.toString() || '' }
      });
      if (res.ok) {
        const data = await res.json();
        setProfilePosts(data);
      }
    } catch (err) {
      console.error("Error fetching profile posts:", err);
    }
  };

  const handleIncrementView = async (postId) => {
    try {
      await fetch(`${API_BASE}/posts/${postId}/view`, { method: 'POST' });
      // update feed post locally
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, views: (p.views || 0) + 1 } : p));
      // update profile posts locally if viewing it
      setProfilePosts(prev => prev.map(p => p.id === postId ? { ...p, views: (p.views || 0) + 1 } : p));
    } catch (err) {
      console.error("Failed to increment views:", err);
    }
  };

  const handleVideoTimeUpdate = (e, postId) => {
    const video = e.target;
    if (!video.duration) return;
    const progress = video.currentTime / video.duration;
    if (progress >= 0.4) {
      if (!watchedPostsRef.current.has(postId)) {
        watchedPostsRef.current.add(postId);
        handleIncrementView(postId);
      }
    }
  };

  const handleShortsScroll = (e) => {
    const container = e.target;
    const scrollPos = container.scrollTop;
    const height = container.clientHeight;
    if (height > 0) {
      const index = Math.round(scrollPos / height);
      if (index !== shortVideoIndex && index >= 0 && index < shortVideos.length) {
        setShortVideoIndex(index);
      }
    }
  };

  const getHeaderTitle = () => {
    if (currentPanel === 'feed') {
      if (feedTab === 'all') return 'All Developer Releases';
      if (feedTab === 'updates') return 'Developer Updates Log';
      if (feedTab === 'saved') return 'Saved Releases';
      if (feedTab === 'followed') return 'Followed Developer Feed';
      if (feedTab === 'members') return 'Find Members';
      return 'All Developer Releases';
    }
    if (currentPanel === 'shorts') return '🎬 Shorts';
    if (currentPanel === 'videos') return 'Video Releases';
    if (currentPanel === 'chat') return 'Messages';
    if (currentPanel === 'notifications') return 'System Notifications';
    if (currentPanel === 'search') return `Search Results for "${searchQuery}"`;
    if (currentPanel === 'profile') {
      return profileUserId === user?.id ? 'My Workspace Profile' : 'Member Workspace';
    }
    return 'Open Store';
  };

  // Load feed, stories, contacts when logged in
  useEffect(() => {
    if (user && inWorkspace) {
      // Validate that the logged in user still exists in the database to prevent stale local sessions
      fetch(`${API_BASE}/users/${user.id}?_=${Date.now()}`)
        .then(res => {
          if (res.status === 404) {
            console.warn("Logged in user not found in database (possibly reset). Logging out.");
            handleLogout();
          }
        })
        .catch(err => console.error("Error validating user session:", err));

      fetchPosts();
      fetchStories();
      fetchContacts();
      fetchAllUsers();
      fetchNotifications();
    }
  }, [user, inWorkspace]);

  // Automatic background polling to prevent browser stale state (fetches notifications, posts, stories, contacts, all users, and chats)
  useEffect(() => {
    if (inWorkspace && user) {
      const interval = setInterval(() => {
        fetchNotifications();
        fetchPosts();
        fetchStories();
        fetchContacts();
        fetchAllUsers();
        
        // Poll profile details if profile tab is active
        if (currentPanel === 'profile') {
          const targetId = profileUserId || user.id;
          if (targetId) {
            fetchProfileDetails(targetId);
            fetchProfileStats(targetId);
            fetchProfileFollowers(targetId);
            fetchProfileFollowing(targetId);
          }
        }
        
        if (currentPanel === 'chat' && selectedContact) {
          fetchMessages();
          // Poll typing indicator
          fetch(`${API_BASE}/chat/typing?userId=${user.id}&targetUserId=${selectedContact.id}&_=${Date.now()}`)
            .then(r => r.json())
            .then(d => setIsContactTyping(d.isTyping))
            .catch(() => {});
        }
        // Poll active comments real-time
        if (activeCommentsPostId) {
          fetchComments(activeCommentsPostId);
        } else if (activeDetailsPost) {
          fetchComments(activeDetailsPost.id);
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [inWorkspace, currentPanel, selectedContact, user, activeCommentsPostId, activeDetailsPost, profileUserId]);

  // Fetch profile details when profile tab active
  useEffect(() => {
    if (inWorkspace && currentPanel === 'profile') {
      const targetId = profileUserId || user?.id;
      if (targetId) {
        // Pre-fill with the logged in user details if viewing own profile
        if (user && targetId === user.id) {
          setProfileUser(user);
        } else {
          setProfileUser(null);
        }
        fetchProfileDetails(targetId);
        fetchProfileStats(targetId);
        fetchProfilePosts(targetId);
        fetchProfileFollowers(targetId);
        fetchProfileFollowing(targetId);
      }
    }
  }, [profileUserId, currentPanel, inWorkspace]);

  // Sync Settings Tab Initial State
  useEffect(() => {
    if (inWorkspace && currentPanel === 'profile' && profileTab === 'settings' && user) {
      setSettingsUsername(user.username || '');
      setSettingsName(user.name || '');
      setSettingsAvatar(user.avatar || '');
      setSettingsNiche(user.niche || 'Web Development');
      setSettingsDescription(user.description || '');
      setSettingsTag(user.tag || '');
      setSettingsSocialUrl(user.socialUrl || '');
      setSettingsPlaybackQuality(user.defaultPlaybackQuality || 'Auto');
      setSettingsMediaCompression(user.mediaCompression || 'Balanced');
      setSettingsAutoplayCaptions(user.autoplayCaptions !== 0);
      setSettingsError('');
      setSettingsSuggestions([]);
      setAvatarFile(null);
      setAvatarPreview('');
    }
  }, [currentPanel, profileTab, user, inWorkspace]);

  // Fetch channel comments with real-time polling when on the moderation tab
  useEffect(() => {
    if (inWorkspace && currentPanel === 'profile' && profileTab === 'comments' && user) {
      const fetchChanComments = () => {
        fetch(`${API_BASE}/users/${user.id}/channel-comments?_=${Date.now()}`)
          .then(r => r.json())
          .then(setChannelComments)
          .catch(() => {});
      };
      fetchChanComments();
      const interval = setInterval(fetchChanComments, 2000);
      return () => clearInterval(interval);
    }
  }, [currentPanel, profileTab, user, inWorkspace]);

  const handleChatScroll = (e) => {
    const container = e.target;
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    if (isAtBottom) {
      setShowScrollToBottom(false);
    } else {
      setShowScrollToBottom(true);
    }
  };

  const scrollToLatestChat = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollToBottom(false);
  };

  // Scroll Chat to bottom selectively
  useEffect(() => {
    if (chatMessages.length > 0 && chatLogRef.current) {
      const container = chatLogRef.current;
      const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 180;
      
      const lastMsg = chatMessages[chatMessages.length - 1];
      const sentByMe = lastMsg && Number(lastMsg.senderId) === Number(user.id);
      const isNewContact = lastScrolledContactIdRef.current !== selectedContact?.id;
      
      if (isNewContact || sentByMe || isAtBottom) {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        setShowScrollToBottom(false);
        if (selectedContact) {
          lastScrolledContactIdRef.current = selectedContact.id;
        }
      } else {
        setShowScrollToBottom(true);
      }
    }
  }, [chatMessages, selectedContact]);

  // Clear chat messages when selected contact changes to prevent visual leak
  useEffect(() => {
    setChatMessages([]);
  }, [selectedContact?.id]);

  // Synchronize selectedContact details when contacts update in the background (e.g. follow status changes from pending to accepted)
  useEffect(() => {
    if (selectedContact) {
      const updated = contacts.find(c => c.id === selectedContact.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedContact)) {
        setSelectedContact(updated);
      }
    }
  }, [contacts, selectedContact]);

  // Story playback timer
  useEffect(() => {
    if (!activeStoryGroup) {
      setStoryProgress(0);
      return;
    }

    const duration = 5000; // 5s per story
    const step = 50; // update every 50ms
    const totalSteps = duration / step;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      const progress = (currentStep / totalSteps) * 100;
      setStoryProgress(progress);

      if (currentStep >= totalSteps) {
        // Go to next story in group
        if (activeStoryIndex < activeStoryGroup.stories.length - 1) {
          setActiveStoryIndex(prev => prev + 1);
          setStoryProgress(0);
          currentStep = 0;
        } else {
          // Finished stories for this user
          setActiveStoryGroup(null);
          setActiveStoryIndex(0);
          setStoryProgress(0);
          clearInterval(interval);
        }
      }
    }, step);

    return () => clearInterval(interval);
  }, [activeStoryGroup, activeStoryIndex]);

  // Story keyboard navigation (ArrowRight, Space, ArrowLeft)
  useEffect(() => {
    if (!activeStoryGroup) return;

    const handleKeyDown = (e) => {
      console.log("[Story KeyDown]", e.key);
      if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'Spacebar') {
        e.preventDefault();
        e.stopPropagation();
        if (activeStoryIndex < activeStoryGroup.stories.length - 1) {
          setActiveStoryIndex(prev => prev + 1);
          setStoryProgress(0);
        } else {
          setActiveStoryGroup(null);
          setActiveStoryIndex(0);
          setStoryProgress(0);
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        if (activeStoryIndex > 0) {
          setActiveStoryIndex(prev => prev - 1);
          setStoryProgress(0);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [activeStoryGroup, activeStoryIndex]);

  // Blur active inputs when a story opens to release focus for arrow/spacebar controls
  useEffect(() => {
    if (activeStoryGroup) {
      if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
      }
    }
  }, [activeStoryGroup]);

  // Fetch comments when the active details post changes
  useEffect(() => {
    if (activeDetailsPost) {
      fetchComments(activeDetailsPost.id);
    }
  }, [activeDetailsPost]);

  // Fuzzy Header Search Debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ users: [], videos: [] });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(searchQuery)}`, {
          headers: { 'x-user-id': user?.id?.toString() || '' }
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error("Search error:", err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchPosts = async (forceSync = false) => {
    setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE}/posts?_=${Date.now()}${forceSync ? '&forceSync=true' : ''}`, {
        headers: { 'x-user-id': user?.id?.toString() || '' }
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
        if (data.length > 0) {
          setActiveDetailsPost(prev => prev || data[0]);
        }
      }
    } catch (err) {
      console.error("Error fetching posts:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchStories = async (forceSync = false) => {
    try {
      const res = await fetch(`${API_BASE}/stories?_=${Date.now()}${forceSync ? '&forceSync=true' : ''}`);
      if (res.ok) {
        const data = await res.json();
        setStories(data);
      }
    } catch (err) {
      console.error("Error fetching stories:", err);
    }
  };

  const fetchComments = async (postId) => {
    try {
      const res = await fetch(`${API_BASE}/posts/${postId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (err) {
      console.error("Error loading comments:", err);
    }
  };

  const fetchContacts = async (forceSync = false) => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE}/users/${user.id}/following?_=${Date.now()}${forceSync ? '&forceSync=true' : ''}`);
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
      }
    } catch (err) {
      console.error("Error fetching contacts:", err);
    }
  };

  const fetchAllUsers = async (forceSync = false) => {
    try {
      // Simple fetch users by querying empty space or a user search query
      const res = await fetch(`${API_BASE}/search?q=&_=${Date.now()}${forceSync ? '&forceSync=true' : ''}`, {
        headers: { 'x-user-id': user?.id?.toString() || '' }
      });
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data.users || []);
      }
    } catch (err) {
      console.error("Error fetching all users:", err);
    }
  };

  const fetchMessages = async (forceSync = false) => {
    if (!user || !selectedContact) return;
    try {
      const res = await fetch(`${API_BASE}/messages?userA=${user.id}&userB=${selectedContact.id}&_=${Date.now()}${forceSync ? '&forceSync=true' : ''}`);
      if (res.ok) {
        const data = await res.json();
        setChatMessages(prev => {
          const map = new Map();
          const currentContactId = selectedContact.id;
          
          // Keep existing messages of current contact
          prev.forEach(msg => {
            if (msg && msg.id && (
              (msg.senderId === user.id && msg.receiverId === currentContactId) ||
              (msg.senderId === currentContactId && msg.receiverId === user.id)
            )) {
              map.set(msg.id, msg);
            }
          });
          
          // Add new messages
          data.forEach(msg => {
            if (msg && msg.id) {
              map.set(msg.id, msg);
            }
          });
          
          // Sort chronologically
          return Array.from(map.values()).sort((a, b) => {
            if (a.id !== b.id) return a.id - b.id;
            return parseUTCDate(a.createdAt) - parseUTCDate(b.createdAt);
          });
        });
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  };

  // Auth Submit
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!username || !password || (authMode === 'register' && !email)) {
      setAuthError("All fields are required.");
      return;
    }

    try {
      const endpoint = authMode === 'login' ? 'login' : 'register';
      const bodyObj = authMode === 'register' 
        ? { username, password, email }
        : { username, password };

      const res = await fetch(`${API_BASE}/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyObj)
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      if (data.requireOTP) {
        setRequireOTP(true);
        setOtpUserId(data.userId);
        setOtpCode('');
        return;
      }

      if (data.require2FA) {
        setRequire2FA(true);
        setTwoFactorUserId(data.userId);
        setTwoFactorCode('');
        return;
      }

      localStorage.setItem('user', JSON.stringify(data));
      setUser(data);
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handle2FAVerifySubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!twoFactorCode) {
      setAuthError("Please enter your 2FA code.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/auth/verify-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: twoFactorUserId, token: twoFactorCode })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid 2FA code.");
      }
      localStorage.setItem('user', JSON.stringify(data));
      setUser(data);
      setRequire2FA(false);
      setTwoFactorUserId(null);
      setTwoFactorCode('');
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleOTPVerifySubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!otpCode) {
      setAuthError("Please enter your OTP code.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: otpUserId, token: otpCode })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid OTP code.");
      }
      localStorage.setItem('user', JSON.stringify(data));
      setUser(data);
      setRequireOTP(false);
      setOtpUserId(null);
      setOtpCode('');
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleCancelOTP = () => {
    setRequireOTP(false);
    setOtpUserId(null);
    setOtpCode('');
    setAuthError('');
  };

  const handleCancel2FA = () => {
    setRequire2FA(false);
    setTwoFactorUserId(null);
    setTwoFactorCode('');
    setAuthError('');
  };

  const handleSupportSubmit = async (e) => {
    e.preventDefault();
    setSupportSubmitting(true);
    setSupportError('');
    try {
      const res = await fetch(`${BACKEND_BASE}/api/support-requests`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user?.id?.toString() || ''
        },
        body: JSON.stringify({ type: supportType, description: supportDesc })
      });
      if (res.ok) {
        setSupportSuccess(true);
      } else {
        const errData = await res.json();
        setSupportError(errData.error || 'Failed to submit ticket');
      }
    } catch (err) {
      setSupportError('Network error. Please try again.');
    } finally {
      setSupportSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    setUsername('');
    setPassword('');
    setInWorkspace(false);
    setCurrentPanel('feed');
    setFeedTab('all');
    setProfileUserId(null);
    setProfileTab('feed');
    setProfileUser(null);
    setPosts([]);
    setActiveDetailsPost(null);
    setSavedPostIds([]);
    setCreatorType('log');
    setPostText('');
    setGithubRepo('');
    setSelectedFile(null);
    setUploading(false);
    setUploadProgress(null);
    setSelectedCollaborator(null);
    setCollabSearchText('');
    setShowCollabMenu(false);
    setStories([]);
    setActiveStoryGroup(null);
    setContacts([]);
    setSelectedContact(null);
    setChatMessages([]);
    setNewChatText('');
    setChatFile(null);
    setSearchQuery('');
    setSearchResults({ users: [], videos: [] });
    isFirstNotificationFetchRef.current = true;
  };

  // Creator Release
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setSelectedFile(file);
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const renderCreatorBox = (isDrawer = false) => {
    const acceptedContacts = contacts.filter(c => c.status === 'accepted');
    const filteredContacts = acceptedContacts.filter(c => 
      c.username.toLowerCase().includes(collabSearchText.toLowerCase())
    );

    return (
      <div className="creator-box glass-card" style={isDrawer ? { border: 'none', background: 'transparent', padding: 0 } : {}}>
        <div className="creator-header">
          <Avatar username={user?.username} src={user?.avatar} className="creator-avatar" />
          <textarea 
            className="creator-textarea" 
            placeholder={
              creatorType === 'log' ? "Log an Update status or release note..." :
              creatorType === 'vault' ? "Explain the secure media or document file you are uploading in the vault..." :
              creatorType === 'short' ? "Describe your new video short release..." :
              "Share a Project link (repository or custom website preview URL)..."
            }
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
          />
        </div>

        <div className="type-selector">
          <button 
            type="button" 
            className={`type-tab ${creatorType === 'log' ? 'active' : ''}`} 
            onClick={() => { setCreatorType('log'); setSelectedFile(null); setGithubRepo(''); }}
          >
            <MessageSquare size={13} />
            <span>Updates</span>
          </button>
          <button 
            type="button" 
            className={`type-tab ${creatorType === 'vault' ? 'active' : ''}`} 
            onClick={() => { setCreatorType('vault'); setGithubRepo(''); }}
          >
            <Shield size={13} />
            <span>Uploads</span>
          </button>
          <button 
            type="button" 
            className={`type-tab ${creatorType === 'short' ? 'active' : ''}`} 
            onClick={() => { setCreatorType('short'); setGithubRepo(''); setSelectedFile(null); }}
          >
            <Film size={13} />
            <span>Shorts</span>
          </button>
          <button 
            type="button" 
            className={`type-tab ${creatorType === 'source' ? 'active' : ''}`} 
            onClick={() => { setCreatorType('source'); setSelectedFile(null); }}
          >
            <FileCode size={13} />
            <span>Projects</span>
          </button>
        </div>

        {/* DYNAMIC SUB-INPUTS */}
        {creatorType === 'source' && (
          <div className="attachment-container">
            <div className="repo-input-wrapper">
              <input 
                type="text" 
                placeholder="e.g. facebook/react OR https://example.com" 
                value={githubRepo}
                onChange={(e) => setGithubRepo(e.target.value)}
                required
                style={{ width: '100%', paddingLeft: '8px' }}
              />
            </div>
          </div>
        )}

        {(creatorType === 'vault' || creatorType === 'short') && (
          <div className="attachment-container">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept={creatorType === 'short' ? "video/*" : "image/*,video/*"}
              style={{ display: 'none' }}
            />
            
            {!selectedFile ? (
              <div className="file-upload-zone" onClick={triggerFileSelect}>
                <Plus size={20} className="text-secondary" style={{ marginBottom: '4px' }} />
                <div style={{ fontSize: '13px', fontWeight: '500' }}>
                  {creatorType === 'short' ? "Select Short Video (.mp4 / .webm)" : "Select Secure Document / File"}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {creatorType === 'short' ? "Vertical video works best for mobile/looper view" : "Files are securely stored in your workspace"}
                </div>
              </div>
            ) : (
              <div className="file-preview">
                <div className="preview-info">
                  <span className="preview-icon">
                    {selectedFile.type.startsWith('video/') ? '🎥' : '🖼️'}
                  </span>
                  <div className="preview-details">
                    <span className="preview-name">{selectedFile.name}</span>
                    <span className="preview-size">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                  </div>
                </div>
                <button type="button" className="remove-file-btn" onClick={() => setSelectedFile(null)}>
                  &times;
                </button>
              </div>
            )}
          </div>
        )}

        {uploadProgress !== null && (
          <div className="upload-progress-container" style={{ padding: '10px 16px', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              <span>Uploading media...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="progress-bar-bg" style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
              <div className="progress-bar-fill" style={{ width: `${uploadProgress}%`, height: '100%', background: 'linear-gradient(90deg, #4f46e5, #0ea5e9)', borderRadius: '3px', transition: 'width 0.2s ease-out' }} />
            </div>
          </div>
        )}

        {/* COLLABORATOR SELECTOR - SEARCH SYSTEM FOR FOLLOWED FRIENDS */}
        <div className="form-group" style={{ marginTop: '12px', textAlign: 'left', position: 'relative' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <Users size={13} />
            <span>Collaboration Partner (Optional)</span>
          </label>
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '4px 8px' }}>
              {selectedCollaborator ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                    <Avatar username={selectedCollaborator.username} src={selectedCollaborator.avatar} size={20} />
                    <span style={{ fontWeight: '600' }}>@{selectedCollaborator.username}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({selectedCollaborator.niche})</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => { setSelectedCollaborator(null); setCollabSearchText(''); }}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px', padding: '0 4px' }}
                  >
                    &times;
                  </button>
                </div>
              ) : (
                <input 
                  type="text"
                  placeholder="Search followed friends..."
                  value={collabSearchText}
                  onChange={(e) => { setCollabSearchText(e.target.value); setShowCollabMenu(true); }}
                  onFocus={() => setShowCollabMenu(true)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '100%', padding: '6px 0', fontSize: '13px' }}
                />
              )}
            </div>

            {showCollabMenu && !selectedCollaborator && (
              <>
                <div 
                  onClick={() => setShowCollabMenu(false)}
                  style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }}
                />
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px', marginTop: '4px', maxHeight: '180px', overflowY: 'auto', zIndex: 999, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                  {filteredContacts.length === 0 ? (
                    <div style={{ padding: '8px 12px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                      No mutual friends found
                    </div>
                  ) : (
                    filteredContacts.map(c => (
                      <div 
                        key={c.id} 
                        onClick={() => { setSelectedCollaborator(c); setShowCollabMenu(false); }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-surface-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.15s' }}
                      >
                        <Avatar username={c.username} src={c.avatar} size={24} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '12.5px', fontWeight: '600' }}>@{c.username}</span>
                          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{c.niche}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="creator-footer">
          <div style={{ flex: 1 }} />
          <button 
            type="button" 
            className="publish-btn" 
            onClick={handleRelease}
            disabled={uploading || (!postText.trim() && !selectedFile && !githubRepo)}
          >
            {uploading ? 'Uploading...' : 'Release'}
          </button>
        </div>
      </div>
    );
  };

  const handleRelease = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!postText.trim() && !selectedFile && !githubRepo) return;

    setUploading(true);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append('userId', user.id);
      
      // Keep post type as is (e.g. 'short', 'vault', 'log', 'source')
      const postType = creatorType;
      formData.append('type', postType);
      formData.append('content', postText);
      formData.append('niche', user.niche || 'Web Development');

      if (selectedCollaborator) {
        formData.append('collaboratorId', selectedCollaborator.id);
      }

      if ((creatorType === 'vault' || creatorType === 'short') && selectedFile) {
        formData.append('media', selectedFile);
      } else if (creatorType === 'source' && githubRepo) {
        formData.append('githubRepo', githubRepo.trim());
      }

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/posts`, true);
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);
        }
      };

      xhr.onload = async () => {
        setUploading(false);
        setUploadProgress(null);
        if (xhr.status >= 200 && xhr.status < 300) {
          setPostText('');
          setGithubRepo('');
          setSelectedFile(null);
          setSelectedCollaborator(null);
          setShowUploadDrawer(false);
          await fetchPosts();
        } else {
          let errMsg = 'Failed to release';
          try {
            const data = JSON.parse(xhr.responseText);
            errMsg = data.error || errMsg;
          } catch (_) {}
          alert(errMsg);
        }
      };

      xhr.onerror = () => {
        setUploading(false);
        setUploadProgress(null);
        alert("Network error occurred during release.");
      };

      xhr.send(formData);
    } catch (err) {
      alert(err.message);
      setUploading(false);
      setUploadProgress(null);
    }
  };

  // Likes & Comments
  const handleLike = async (postId) => {
    try {
      const res = await fetch(`${API_BASE}/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      if (res.ok) {
        const { liked } = await res.json();
        setPosts(posts.map(p => {
          if (p.id === postId) {
            const diff = liked ? 1 : -1;
            return {
              ...p,
              isLiked: liked ? 1 : 0,
              likesCount: Math.max(0, p.likesCount + diff)
            };
          }
          return p;
        }));
      }
    } catch (err) {
      console.error("Error liking post:", err);
    }
  };

  const handleOpenComments = async (postId) => {
    if (activeCommentsPostId === postId) {
      setActiveCommentsPostId(null);
      return;
    }
    setActiveCommentsPostId(postId);
    setReplyingToCommentId(null);
    fetchComments(postId);
  };

  const handleAddComment = async (e, postId, parentId = null) => {
    e.preventDefault();
    const txt = parentId ? replyText : newCommentText;
    if (!txt.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, content: txt, parentId })
      });
      if (res.ok) {
        const comment = await res.json();
        setComments([...comments, comment]);
        if (parentId) {
          setReplyText('');
          setReplyingToCommentId(null);
        } else {
          setNewCommentText('');
        }
        
        setPosts(posts.map(p => {
          if (p.id === postId) {
            return { ...p, commentsCount: p.commentsCount + 1 };
          }
          return p;
        }));
      }
    } catch (err) {
      console.error("Error adding comment:", err);
    }
  };

  // Follow Actions
  const handleFollowToggle = async (targetUserId) => {
    // 1. Determine current follow state
    const isUnfollowing = contacts.some(c => c.id === targetUserId);
    
    // Save original state for rollbacks on failure
    const originalContacts = [...contacts];
    const originalAllUsers = [...allUsers];
    const originalPosts = [...posts];
    const originalProfileStats = { ...profileStats };

    // Check if target is already following us (makes it mutual accepted follow)
    const isFollower = notifications.some(n => n.senderId === targetUserId && n.type === 'follow_request');
    const optimisticStatus = isFollower ? 'accepted' : 'pending';

    // 2. Perform Optimistic updates
    if (isUnfollowing) {
      setContacts(prev => prev.filter(c => c.id !== targetUserId));
      setAllUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, followStatus: null } : u));
      setPosts(prev => prev.map(p => p.userId === targetUserId ? { ...p, isFollowing: 0 } : p));
      if (profileUser && profileUser.id === targetUserId) {
        setProfileStats(prev => ({ ...prev, followersCount: Math.max(0, prev.followersCount - 1) }));
      }
    } else {
      const userObj = allUsers.find(u => u.id === targetUserId) || profileUser;
      if (userObj) {
        setContacts(prev => {
          if (prev.some(c => c.id === targetUserId)) {
            return prev.map(c => c.id === targetUserId ? { ...c, status: optimisticStatus } : c);
          } else {
            return [...prev, { ...userObj, status: optimisticStatus }];
          }
        });
      }
      setAllUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, followStatus: optimisticStatus } : u));
      setPosts(prev => prev.map(p => p.userId === targetUserId ? { ...p, isFollowing: optimisticStatus === 'accepted' ? 1 : 0 } : p));
      if (profileUser && profileUser.id === targetUserId) {
        setProfileStats(prev => ({ ...prev, followersCount: prev.followersCount + 1 }));
      }
    }

    try {
      const res = await fetch(`${API_BASE}/users/${targetUserId}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followerId: user.id })
      });
      if (res.ok) {
        const { followed, status } = await res.json();
        
        // Sync states to whatever backend actually returned (just to be completely correct)
        setContacts(prev => {
          if (!followed) {
            return prev.filter(c => c.id !== targetUserId);
          }
          return prev.map(c => c.id === targetUserId ? { ...c, status } : c);
        });
        setAllUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, followStatus: followed ? status : null } : u));
        setPosts(prev => prev.map(p => p.userId === targetUserId ? { ...p, isFollowing: (followed && status === 'accepted') ? 1 : 0 } : p));
        
        // Background sync to ensure client consistency
        fetchContacts(true);
        fetchAllUsers(true);
        fetchPosts(true);
      } else {
        throw new Error("Failed to toggle follow");
      }
    } catch (err) {
      console.error("Follow error:", err);
      // Rollback to original states
      setContacts(originalContacts);
      setAllUsers(originalAllUsers);
      setPosts(originalPosts);
      setProfileStats(originalProfileStats);
    }
  };

  const handleProfileFollowToggle = async () => {
    if (!profileUser) return;
    await handleFollowToggle(profileUser.id);
    fetchProfileDetails(profileUser.id);
    fetchProfileStats(profileUser.id);
    fetchProfileFollowers(profileUser.id);
    fetchProfileFollowing(profileUser.id);
  };

  const handleAcceptFollow = async (followerId) => {
    setActionedRequests(prev => ({ ...prev, [followerId]: 'accepted' }));
    
    // Optimistically update contacts status
    setContacts(prev => {
      if (prev.some(c => c.id === followerId)) {
        return prev.map(c => c.id === followerId ? { ...c, status: 'accepted' } : c);
      }
      return prev;
    });

    try {
      const res = await fetch(`${API_BASE}/follows/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followerId, followedId: user.id })
      });
      if (res.ok) {
        fetchNotifications(true);
        fetchContacts(true);
      }
    } catch (err) {
      console.error("Error accepting follow request:", err);
      setActionedRequests(prev => {
        const copy = { ...prev };
        delete copy[followerId];
        return copy;
      });
    }
  };

  const handleDeclineFollow = async (followerId) => {
    setActionedRequests(prev => ({ ...prev, [followerId]: 'declined' }));
    try {
      const res = await fetch(`${API_BASE}/follows/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followerId, followedId: user.id })
      });
      if (res.ok) {
        fetchNotifications(true);
        fetchContacts(true);
      }
    } catch (err) {
      console.error("Error declining follow request:", err);
      setActionedRequests(prev => {
        const copy = { ...prev };
        delete copy[followerId];
        return copy;
      });
    }
  };

  // Direct Message sends
  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!newChatText.trim() && !chatFile) return;

    // Clear typing state on send
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    const textToSend = newChatText;
    const fileToSend = chatFile;
    const currentReply = replyingToMessage;

    // Create optimistic message
    const tempMsgId = `temp_${Date.now()}`;
    const tempMsg = {
      id: tempMsgId,
      senderId: user.id,
      receiverId: selectedContact.id,
      content: textToSend || null,
      mediaUrl: fileToSend ? URL.createObjectURL(fileToSend) : null,
      mediaName: fileToSend ? fileToSend.name : null,
      replyToId: currentReply ? currentReply.id : null,
      replyContent: currentReply ? (currentReply.content || currentReply.mediaName || '[Image/Media]') : null,
      replySenderName: currentReply ? (currentReply.senderName || (Number(currentReply.senderId) === Number(user.id) ? user.username : selectedContact.username)) : null,
      createdAt: new Date().toISOString(),
      isSending: true
    };

    // Append immediately & clear inputs
    setChatMessages(prev => [...prev, tempMsg]);
    setNewChatText('');
    setChatFile(null);
    setReplyingToMessage(null);

    setSendingChat(true);
    try {
      const formData = new FormData();
      formData.append('senderId', user.id);
      formData.append('receiverId', selectedContact.id);
      if (textToSend) formData.append('content', textToSend);
      if (fileToSend) formData.append('media', fileToSend);
      if (currentReply) formData.append('replyToId', currentReply.id);

      const res = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const sentMsg = await res.json();
        setChatMessages(prev => 
          prev.map(m => m.id === tempMsgId ? sentMsg : m)
        );
      } else {
        throw new Error("Failed to send message");
      }
    } catch (err) {
      console.error("Error sending chat message:", err);
      // Remove optimistic message on failure
      setChatMessages(prev => prev.filter(m => m.id !== tempMsgId));
      alert("Failed to send message.");
    } finally {
      setSendingChat(false);
    }
  };

  // Signal typing to the backend (debounced — fires 3s after last keystroke)
  const handleTypingInChat = (val) => {
    setNewChatText(val);
    if (!user || !selectedContact) return;
    // Signal typing now
    fetch(`${API_BASE}/chat/typing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, targetUserId: selectedContact.id })
    }).catch(() => {});
  };

  // Delete a comment from my channel (moderation)
  const handleDeleteChannelComment = async (commentId) => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user.id.toString() }
      });
      if (res.ok) {
        setChannelComments(prev => prev.filter(c => c.id !== commentId));
      }
    } catch (err) {
      console.error("Error deleting comment:", err);
    }
  };


  // Share link handlers
  const handleSharePopover = (postId) => {
    setActiveSharePostId(activeSharePostId === postId ? null : postId);
  };

  const copyShareLink = (postId) => {
    const link = `${window.location.origin}/post/${postId}`;
    navigator.clipboard.writeText(link);
    setCopiedPostId(postId);
    setTimeout(() => setCopiedPostId(null), 2000);
  };

  const shareToFriend = async (postId, friendId) => {
    try {
      const link = `${window.location.origin}/post/${postId}`;
      const formData = new FormData();
      formData.append('senderId', user.id);
      formData.append('receiverId', friendId);
      formData.append('content', `Check this open store release: ${link}`);

      const res = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        alert("Shared to developer successfully!");
        setActiveSharePostId(null);
      }
    } catch (err) {
      console.error("Direct share error:", err);
    }
  };

  const handleMessageUser = async (targetUser) => {
    if (!user || !targetUser) return;
    const targetUserId = targetUser.id || targetUser;
    
    // Fetch latest contacts first to be absolutely sure we have up-to-date follow status
    let latestContacts = contacts;
    try {
      const res = await fetch(`${API_BASE}/users/${user.id}/following?_=${Date.now()}`);
      if (res.ok) {
        latestContacts = await res.json();
        setContacts(latestContacts);
      }
    } catch (err) {
      console.error("Error updating contacts in handleMessageUser:", err);
    }
    
    const existing = latestContacts.find(c => c.id === targetUserId);
    let fullUserObj = existing;
    
    if (!fullUserObj) {
      // If not in contacts, fetch details and default to pending
      fullUserObj = {
        id: targetUserId,
        username: targetUser.username || '',
        avatar: targetUser.avatar || '',
        status: 'pending'
      };
      
      if (!fullUserObj.username || !fullUserObj.avatar) {
        try {
          const res = await fetch(`${API_BASE}/users/${targetUserId}`);
          if (res.ok) {
            const fetched = await res.json();
            fullUserObj.username = fetched.username;
            fullUserObj.avatar = fetched.avatar;
            fullUserObj.niche = fetched.niche;
          }
        } catch (err) {
          console.error("Error fetching user detail:", err);
        }
      }
      
      setContacts(prev => {
        if (!prev.some(c => c.id === targetUserId)) {
          return [...prev, fullUserObj];
        }
        return prev;
      });
    }
    
    setSelectedContact(fullUserObj);
    setCurrentPanel('chat');
    setActiveStoryGroup(null);
    setStoryProgress(0);
  };

  // Stories Upload & Player
  const handleStoryFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setStoryFile(file);
  };

  const handleUploadStory = async (e) => {
    e.preventDefault();
    if (!storyText.trim() && !storyFile) return;

    setUploadingStory(true);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append('userId', user.id);
      let storyType = 'text';
      if (storyFile) {
        storyType = storyFile.type.startsWith('video/') ? 'video' : 'image';
      }
      formData.append('type', storyType);
      if (storyText) formData.append('content', storyText);
      if (storyFile) formData.append('media', storyFile);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/stories`, true);
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);
        }
      };

      xhr.onload = async () => {
        setUploadingStory(false);
        setUploadProgress(null);
        if (xhr.status >= 200 && xhr.status < 300) {
          setStoryText('');
          setStoryFile(null);
          setShowStoryUpload(false);
          await fetchStories();
        } else {
          let errMsg = 'Failed to post story';
          try {
            const data = JSON.parse(xhr.responseText);
            errMsg = data.error || errMsg;
          } catch (_) {}
          alert(errMsg);
        }
      };

      xhr.onerror = () => {
        setUploadingStory(false);
        setUploadProgress(null);
        alert("Network error occurred during story upload.");
      };

      xhr.send(formData);
    } catch (err) {
      console.error("Story creation failed:", err);
      setUploadingStory(false);
      setUploadProgress(null);
    }
  };

  const startStoryPlayback = (userStoriesGroup) => {
    setActiveStoryGroup(userStoriesGroup);
    setActiveStoryIndex(0);
    setStoryProgress(0);
  };

  // Settings updates
  const openSettingsDialog = () => {
    setSettingsUsername(user.username);
    setSettingsName(user.name || '');
    setSettingsAvatar(user.avatar || '');
    setSettingsNiche(user.niche || 'Web Development');
    setSettingsDescription(user.description || '');
    setSettingsTag(user.tag || '');
    setSettingsSocialUrl(user.socialUrl || '');
    setSettingsError('');
    setSettingsSuggestions([]);
    setAvatarFile(null);
    setAvatarPreview('');
    setAvatarMode('url');
    setShowSettings(true);
  };

  const handleAvatarFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    setSettingsError('');
    setSettingsSuggestions([]);

    if (settingsTag && settingsTag.length > 10) {
      setSettingsError("Tag must be 10 characters or fewer");
      return;
    }
    if (settingsDescription && settingsDescription.length > 50) {
      setSettingsError("Description must be 50 characters or fewer");
      return;
    }

    try {
      let finalAvatarUrl = settingsAvatar;

      // If user chose a file, upload it first
      if (avatarMode === 'file' && avatarFile) {
        setUploadingAvatar(true);
        setUploadProgress(0);
        const formData = new FormData();
        formData.append('avatar', avatarFile);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE}/users/${user.id}/avatar`, true);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percent);
          }
        };

        const uploadPromise = new Promise((resolve, reject) => {
          xhr.onload = () => {
            setUploadingAvatar(false);
            setUploadProgress(null);
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                resolve(JSON.parse(xhr.responseText));
              } catch (e) {
                reject(new Error("Invalid response from server"));
              }
            } else {
              let errMsg = 'Avatar upload failed';
              try {
                const data = JSON.parse(xhr.responseText);
                errMsg = data.error || errMsg;
              } catch (_) {}
              reject(new Error(errMsg));
            }
          };
          xhr.onerror = () => {
            setUploadingAvatar(false);
            setUploadProgress(null);
            reject(new Error("Network error during avatar upload"));
          };
        });

        xhr.send(formData);
        const avatarData = await uploadPromise;
        finalAvatarUrl = avatarData.avatarUrl;
        // Avatar already saved by backend, just update local state
        localStorage.setItem('user', JSON.stringify(avatarData.user));
        setUser(avatarData.user);
        if (profileUser && profileUser.id === avatarData.user.id) {
          setProfileUser(avatarData.user);
        }
        // Now update username/niche/extras separately if changed
        const res2 = await fetch(`${API_BASE}/users/${user.id}/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            username: settingsUsername, name: settingsName, avatar: finalAvatarUrl, niche: settingsNiche,
            description: settingsDescription, tag: settingsTag, socialUrl: settingsSocialUrl,
            defaultPlaybackQuality: settingsPlaybackQuality, mediaCompression: settingsMediaCompression,
            autoplayCaptions: settingsAutoplayCaptions ? 1 : 0
          })
        });
        const data2 = await res2.json();
        if (res2.status === 409) { setSettingsError('User found with this username. Try suggestions below.'); setSettingsSuggestions(data2.suggestions || []); return; }
        if (!res2.ok) throw new Error(data2.error || 'Failed to update profile');
        localStorage.setItem('user', JSON.stringify(data2));
        setUser(data2);
        if (profileUser && profileUser.id === data2.id) {
          setProfileUser(data2);
        }
        setShowSettings(false);
        fetchPosts();
        fetchProfileDetails(user.id);
        fetchProfileStats(user.id);
        fetchProfilePosts(user.id);
        return;
      }

      const res = await fetch(`${API_BASE}/users/${user.id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: settingsUsername, 
          name: settingsName,
          avatar: finalAvatarUrl, 
          niche: settingsNiche,
          description: settingsDescription,
          tag: settingsTag,
          socialUrl: settingsSocialUrl,
          defaultPlaybackQuality: settingsPlaybackQuality,
          mediaCompression: settingsMediaCompression,
          autoplayCaptions: settingsAutoplayCaptions ? 1 : 0
        })
      });
      const data = await res.json();

      if (res.status === 409) {
        setSettingsError("User found with this username. Try suggestions below.");
        setSettingsSuggestions(data.suggestions || []);
        return;
      }

      if (!res.ok) throw new Error(data.error || "Failed to update profile settings");

      localStorage.setItem('user', JSON.stringify(data));
      setUser(data);
      if (profileUser && profileUser.id === data.id) {
        setProfileUser(data);
      }
      setShowSettings(false);
      fetchPosts();
      fetchProfileDetails(user.id);
      fetchProfileStats(user.id);
      fetchProfilePosts(user.id);
    } catch (err) {
      setUploadingAvatar(false);
      setSettingsError(err.message);
    }
  };

  const selectSuggestedName = (name) => {
    setSettingsUsername(name);
    setSettingsError('');
    setSettingsSuggestions([]);
  };

  const handleStart2FASetup = async () => {
    setSettingsError('');
    try {
      const res = await fetch(`${API_BASE}/auth/setup-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to setup 2FA");
      
      setTotpSetupSecret(data.secret);
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(data.otpauthUrl)}`;
      setTotpSetupQrUrl(qrUrl);
      setShowTotpSetup(true);
      setTotpSetupToken('');
    } catch (err) {
      setSettingsError(err.message);
    }
  };

  const handleConfirmEnable2FA = async (e) => {
    e.preventDefault();
    setSettingsError('');
    if (!totpSetupToken) return;
    try {
      const res = await fetch(`${API_BASE}/auth/enable-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, token: totpSetupToken, secret: totpSetupSecret })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to verify 2FA token");

      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      setShowTotpSetup(false);
      setTotpSetupSecret('');
      setTotpSetupQrUrl('');
      setTotpSetupToken('');
      if (profileUser && profileUser.id === data.user.id) {
        setProfileUser(data.user);
      }
    } catch (err) {
      setSettingsError(err.message);
    }
  };

  const handleDisable2FA = async (e) => {
    e.preventDefault();
    setSettingsError('');
    if (!totpDisableToken) return;
    try {
      const res = await fetch(`${API_BASE}/auth/disable-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, token: totpDisableToken })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to disable 2FA");

      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      setTotpDisableToken('');
      if (profileUser && profileUser.id === data.user.id) {
        setProfileUser(data.user);
      }
    } catch (err) {
      setSettingsError(err.message);
    }
  };

  // Navigating to workspace from landing page
  const enterWorkspace = () => {
    localStorage.setItem('inWorkspace', 'true');
    setInWorkspace(true);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setCurrentPanel('search');
      setShowSearchDropdown(false);
    }
  };

  // Filtering feeds
  const filteredPosts = posts.filter(post => {
    if (searchQuery.trim() && currentPanel !== 'search') return true;
    
    if (currentPanel === 'feed') {
      if (feedTab === 'all') return post.type !== 'short';
      if (feedTab === 'updates') return post.type === 'log';
      if (feedTab === 'followed') return post.isFollowing === 1 && (followedFilterUserId === null || post.userId === followedFilterUserId);
      if (feedTab === 'saved') return savedPostIds.includes(post.id);
      return true;
    }
    if (currentPanel === 'gallery') {
      return post.type === 'vault' && post.mediaType && post.mediaType.startsWith('image/');
    }
    if (currentPanel === 'videos') {
      return post.mediaType && post.mediaType.startsWith('video/') && post.type !== 'short';
    }
    if (currentPanel === 'profile') {
      return post.userId === (profileUserId || user.id);
    }
    return true;
  });

  // Group stories by user
  const groupedStories = React.useMemo(() => {
    const groups = {};
    stories.forEach(s => {
      if (!groups[s.userId]) {
        groups[s.userId] = {
          userId: s.userId,
          username: s.username,
          avatar: s.avatar,
          stories: []
        };
      }
      groups[s.userId].stories.push(s);
    });
    return Object.values(groups);
  }, [stories]);

  // List of videos for Shorts Vertical view loop
  const shortVideos = posts.filter(p => p.type === 'short');

  // Header Search Click Actions
  const handleSearchResultClick = (item, type) => {
    setShowSearchDropdown(false);
    setSearchQuery('');
    if (type === 'user') {
      setProfileUserId(item.id);
      setCurrentPanel('profile');
    } else if (type === 'video') {
      // Find the index of this video in the shorts listing
      const idx = shortVideos.findIndex(sv => sv.id === item.id);
      if (idx !== -1) {
        setShortVideoIndex(idx);
        setCurrentPanel('shorts');
      } else {
        // highlight or open comments on the post
        setCurrentPanel('all');
        handleOpenComments(item.id);
      }
    }
  };

  // Render components for website vs github source link
  function ProjectSourcePreview({ url }) {
    const isGithub = url.includes('github.com') || (!url.startsWith('http') && url.split('/').length === 2);
    const cleanRepoPath = isGithub ? (url.includes('github.com') ? url.split('github.com/').pop() : url) : '';

    if (isGithub) {
      return <GithubRepoCardWithMarkdown repoPath={cleanRepoPath} />;
    }

    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [useIframe, setUseIframe] = useState(false);

    useEffect(() => {
      async function fetchMeta() {
        try {
          const res = await fetch(`${API_BASE}/project/preview?url=${encodeURIComponent(url)}`);
          if (res.ok) {
            const data = await res.json();
            setMeta(data);
          }
        } catch (e) {
          console.error("Preview metadata load failed", e);
        } finally {
          setLoading(false);
        }
      }
      fetchMeta();
    }, [url]);

    let targetUrl = url;
    if (url.includes('<iframe')) {
      const match = url.match(/src=["']([^"']+)["']/i);
      if (match && match[1]) {
        targetUrl = match[1];
      }
    }
    if (!targetUrl.startsWith('http') && !targetUrl.startsWith('//')) {
      targetUrl = `https://${targetUrl}`;
    }

    return (
      <div className="project-viewport-container glass-card" style={{ border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden', background: 'rgba(0,0,0,0.2)', margin: '10px 0' }}>
        <div className="viewport-toolbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f56', display: 'inline-block' }} />
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffbd2e', display: 'inline-block' }} />
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#27c93f', display: 'inline-block' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '10px', fontFamily: 'monospace', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {targetUrl}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              type="button"
              className="comment-reply-trigger"
              onClick={() => setUseIframe(!useIframe)}
              style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '12px', background: useIframe ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)', color: 'white', border: 'none', cursor: 'pointer' }}
            >
              {useIframe ? 'Show Card' : 'Embed Live (IFrame)'}
            </button>
            <a href={targetUrl} target="_blank" rel="noreferrer" className="icon-btn text-muted hover:text-primary" style={{ display: 'flex', alignItems: 'center' }}>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {useIframe ? (
          <div style={{ position: 'relative', width: '100%', height: '240px', background: '#fff' }}>
            <iframe 
              className="viewport-iframe" 
              src={targetUrl} 
              title="Web Preview" 
              style={{ width: '100%', height: '100%', border: 'none', background: 'white' }}
            />
            <div style={{
              position: 'absolute',
              bottom: '8px',
              left: '8px',
              right: '8px',
              background: 'rgba(15, 23, 42, 0.95)',
              color: '#f8fafc',
              fontSize: '10px',
              padding: '6px 10px',
              borderRadius: '6px',
              zIndex: 10,
              pointerEvents: 'none',
              textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
            }}>
              ⚠️ If the preview is blank, this website blocks embedding. Click the ↗ icon above to open directly.
            </div>
          </div>
        ) : (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left', minHeight: '110px', justifyContent: 'center' }}>
            {loading ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '12.5px', textAlign: 'center', width: '100%' }}>
                Connecting to website details...
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                {meta?.image ? (
                  <img src={meta.image} style={{ width: '100px', height: '70px', borderRadius: '6px', objectFit: 'cover', border: '1px solid var(--border-color)', flexShrink: 0 }} alt="" />
                ) : (
                  <div style={{ width: '100px', height: '70px', borderRadius: '6px', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)', fontSize: '20px', flexShrink: 0 }}>
                    🌐
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: 'white', margin: 0 }}>{meta?.title || url}</h4>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {meta?.description}
                  </p>
                  <a 
                    href={targetUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    style={{ fontSize: '11px', color: 'var(--accent-blue)', textDecoration: 'underline', marginTop: '6px', fontWeight: 'bold' }}
                  >
                    Open Live App &rarr;
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Expanded Github Repo Card with live README scraped rendering
  function GithubRepoCardWithMarkdown({ repoPath }) {
    const [repoData, setRepoData] = useState(null);
    const [readmeHtml, setReadmeHtml] = useState('');
    const [showReadme, setShowReadme] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
      async function fetchRepo() {
        try {
          const res = await fetch(`${API_BASE}/github/repo?repo=${repoPath}`);
          if (res.ok) {
            const data = await res.json();
            setRepoData(data);
          } else {
            setError(true);
          }
        } catch (err) {
          setError(true);
        } finally {
          setLoading(false);
        }
      }
      fetchRepo();
    }, [repoPath]);

    const handleToggleReadme = async () => {
      if (!showReadme && !readmeHtml) {
        try {
          const res = await fetch(`${API_BASE}/github/readme?repo=${repoPath}`);
          if (res.ok) {
            const data = await res.json();
            setReadmeHtml(parseMarkdown(data.markdown));
          } else {
            setReadmeHtml('<p style="color: var(--accent-danger); padding: 10px;">README.md is not accessible or not found on repository branch.</p>');
          }
        } catch (e) {
          setReadmeHtml('<p style="color: var(--accent-danger); padding: 10px;">Error reading markdown data.</p>');
        }
      }
      setShowReadme(!showReadme);
    };

    if (loading) {
      return (
        <div className="github-card" style={{ opacity: 0.7 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <Github size={14} />
            <span>Connecting repository metadata...</span>
          </div>
        </div>
      );
    }

    if (error || !repoData) {
      return (
        <div className="github-card" style={{ borderColor: 'var(--accent-danger)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-danger)', fontSize: '13px' }}>
            <Github size={14} />
            <span>Repository {repoPath} is not readable or does not exist.</span>
          </div>
        </div>
      );
    }

    const langColor = {
      JavaScript: '#f1e05a',
      TypeScript: '#3178c6',
      Python: '#3572A5',
      HTML: '#e34c26',
      CSS: '#563d7c',
      Rust: '#dea584',
      Go: '#00ADD8'
    }[repoData.language] || '#8b949e';

    return (
      <div className="github-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="github-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a href={repoData.url} target="_blank" rel="noopener noreferrer" className="github-card-title" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Github size={15} />
            <span style={{ fontWeight: '600' }}>{repoData.name}</span>
          </a>
          <button type="button" className="icon-btn" onClick={handleToggleReadme} title="View README.md File">
            <Eye size={14} />
          </button>
        </div>
        
        {repoData.description && (
          <div className="github-card-desc" style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>{repoData.description}</div>
        )}
        
        <div className="github-card-footer" style={{ display: 'flex', gap: '14px', fontSize: '11px', color: 'var(--text-muted)' }}>
          {repoData.language && (
            <div className="github-stat" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="lang-dot" style={{ backgroundColor: langColor, width: '8px', height: '8px', borderRadius: '50%' }} />
              <span>{repoData.language}</span>
            </div>
          )}
          <div>⭐ {repoData.stars}</div>
          <div>🍴 {repoData.forks}</div>
        </div>

        {showReadme && (
          <div className="project-viewport-container" style={{ marginTop: '10px' }}>
            <div className="viewport-toolbar">
              <span>📖 README.md Viewport</span>
              <span style={{ fontSize: '10px', opacity: 0.7 }}>Scraped via proxy</span>
            </div>
            <div className="readme-content-box" dangerouslySetInnerHTML={{ __html: readmeHtml || 'Loading Readme details...' }} />
          </div>
        )}
      </div>
    );
  }

  if (currentPath === '/terms-and-conditions') {
    return <TermsAndConditionsPage navigateTo={navigateTo} />;
  }

  // --- 1. Scroll-based 3D Animations Landing Page ---
  if (!inWorkspace) {
    const isSec1Active = scrollPercent < 0.2;
    const isSec2Active = scrollPercent >= 0.2 && scrollPercent < 0.5;
    const isSec3Active = scrollPercent >= 0.5 && scrollPercent < 0.8;
    const isSec4Active = scrollPercent >= 0.8;
    const videoScale = 1 + scrollPercent * 0.08;

    let opacityCrystals = 0;
    if (scrollPercent < 0.15) opacityCrystals = 1;
    else if (scrollPercent < 0.3) opacityCrystals = 1 - (scrollPercent - 0.15) / 0.15;

    let opacityVault = 0;
    if (scrollPercent >= 0.1 && scrollPercent < 0.3) opacityVault = (scrollPercent - 0.1) / 0.2;
    else if (scrollPercent >= 0.3 && scrollPercent < 0.5) opacityVault = 1;
    else if (scrollPercent >= 0.5 && scrollPercent < 0.65) opacityVault = 1 - (scrollPercent - 0.5) / 0.15;

    let opacityNodes = 0;
    if (scrollPercent >= 0.45 && scrollPercent < 0.65) opacityNodes = (scrollPercent - 0.45) / 0.2;
    else if (scrollPercent >= 0.65) opacityNodes = 1;

    const MAX_OPACITY = 0.15;

    return (
      <div className="landing-container" ref={landingRef}>
        <video 
          className="landing-video"
          src="/bg-crystals.mp4"
          autoPlay loop muted playsInline
          style={{ transform: `scale(${videoScale})`, opacity: opacityCrystals * MAX_OPACITY }}
        />
        <video 
          className="landing-video"
          src="/bg-vault.mp4"
          autoPlay loop muted playsInline
          style={{ transform: `scale(${videoScale})`, opacity: opacityVault * MAX_OPACITY }}
        />
        <video 
          className="landing-video"
          src="/bg-nodes.mp4"
          autoPlay loop muted playsInline
          style={{ transform: `scale(${videoScale})`, opacity: opacityNodes * MAX_OPACITY }}
        />
        
        <div className="landing-overlay" />

        <header className="landing-header">
          <div className="landing-brand">
            <span className="brand-logo-small">📦</span>
            <span className="brand-name-small">Open Store</span>
          </div>
          <div className="landing-auth-buttons">
            <button className="landing-signin-btn" style={{ marginRight: '8px' }} onClick={() => navigateTo('/terms-and-conditions')}>Terms & Policies</button>
            <button className="landing-signin-btn" onClick={() => { setAuthMode('login'); enterWorkspace(); }}>Sign In</button>
            <button className="landing-signup-btn" onClick={() => { setAuthMode('register'); enterWorkspace(); }}>Sign Up</button>
          </div>
        </header>

        <section className="scroll-section">
          <div className={`scroll-content ${isSec1Active ? 'active' : ''}`}>
            <h1 className="landing-title">OPEN STORE</h1>
            <p className="landing-subtitle">
              The luxury space for code vaults,<br />
              development logs, and private sources.
            </p>
            <div className="luxury-scroll-indicator">
              <svg width="24" height="40" viewBox="0 0 24 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="scroll-svg">
                <line x1="10" y1="2" x2="10" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="14" y1="2" x2="14" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M6 22L12 28L18 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="scroll-label">Scroll to explore</div>
            </div>
          </div>
        </section>

        <section className="scroll-section">
          <div className={`scroll-content ${isSec2Active ? 'active' : ''}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h1 className="landing-title" style={{ fontSize: '4rem' }}>Secure Storage</h1>
            <p className="landing-subtitle" style={{ maxWidth: '650px' }}>
              Keep your media files and video streams safe with top-tier security standards.
              Enjoy fast, reliable range-request streams directly from your storage.
            </p>
            
            <div 
              className="premium-3d-card vault-preview-mock"
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
              style={{
                marginTop: '40px',
                width: '100%',
                maxWidth: '550px',
                height: '240px',
                borderRadius: '20px',
                background: 'rgba(255, 255, 255, 0.02)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 30px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              <div className="card-glare" />

              <div className="window-header" style={{
                height: '40px',
                background: 'rgba(255, 255, 255, 0.04)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                gap: '8px',
                transform: 'translateZ(15px)'
              }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f56' }} />
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffbd2e' }} />
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#27c93f' }} />
                <div style={{
                  color: 'rgba(255, 255, 255, 0.3)',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  marginLeft: 'auto',
                  letterSpacing: '1px'
                }}>SECURE_VAULT_v2.0.4</div>
              </div>

              <div className="window-body" style={{
                flex: 1,
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '12px',
                transform: 'translateZ(25px)',
                transformStyle: 'preserve-3d'
              }}>
                <div style={{
                  fontSize: '44px',
                  filter: 'drop-shadow(0 0 15px rgba(99, 102, 241, 0.4))',
                  marginBottom: '4px'
                }}>🔒</div>
                <div style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#fff',
                  letterSpacing: '2px',
                  textTransform: 'uppercase'
                }}>Vault Storage Encrypted</div>
                <div className="vault-line-progress" style={{
                  width: '180px',
                  height: '3px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  <div className="vault-progress-active" style={{
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                    position: 'absolute',
                    left: 0,
                    top: 0
                  }} />
                </div>
                <div style={{
                  fontSize: '10px',
                  color: 'rgba(255, 255, 255, 0.4)',
                  fontFamily: 'monospace'
                }}>AES-256-GCM // CIPHER SHIELD VERIFIED</div>
              </div>
            </div>
          </div>
        </section>

        <section className="scroll-section">
          <div className={`scroll-content ${isSec3Active ? 'active' : ''}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h1 className="landing-title" style={{ fontSize: '3.5rem' }}>Secure Code Space</h1>
            <p className="landing-subtitle">Connect, log your progress, secure your vaults, and release your sources.</p>
            
            <div className="cube-perspective" style={{ marginTop: '40px', marginBottom: '20px' }}>
              <div className="cube-wrapper">
                <div className="cube">
                  <div className="cube-face cube-face-front">
                    <span className="cube-icon">🔒</span>
                    <span className="cube-text">VAULTS</span>
                  </div>
                  <div className="cube-face cube-face-back">
                    <span className="cube-icon">📝</span>
                    <span className="cube-text">LOGS</span>
                  </div>
                  <div className="cube-face cube-face-right">
                    <span className="cube-icon">💻</span>
                    <span className="cube-text">SOURCES</span>
                  </div>
                  <div className="cube-face cube-face-left">
                    <span className="cube-icon">🛡️</span>
                    <span className="cube-text">SECURITY</span>
                  </div>
                  <div className="cube-face cube-face-top">
                    <span className="cube-icon">🔑</span>
                    <span className="cube-text">KEYS</span>
                  </div>
                  <div className="cube-face cube-face-bottom">
                    <span className="cube-icon">🚀</span>
                    <span className="cube-text">RELEASES</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="luxury-scroll-indicator" style={{ marginTop: '24px' }}>
              <div className="scroll-label" style={{ marginBottom: '8px' }}>Scroll for Terms & Data Sync</div>
              <svg width="18" height="30" viewBox="0 0 24 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="scroll-svg" style={{ animation: 'bounce 2s infinite' }}>
                <path d="M6 22L12 28L18 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </section>

        <section className="scroll-section" style={{ height: 'auto', minHeight: '100vh', padding: '100px 24px 80px 24px' }}>
          <div className={`scroll-content ${isSec4Active ? 'active' : ''}`} style={{ maxWidth: '900px', width: '100%' }}>
            <h1 className="landing-title" style={{ fontSize: '2.5rem', marginBottom: '16px' }}>Terms & Data Persistence</h1>
            <p className="landing-subtitle" style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', marginBottom: '32px' }}>
              We protect your data cryptographically and structurally. Read our core policies below.
            </p>
            
            <div className="bento-grid" style={{ marginBottom: '40px' }}>
              <div 
                className="bento-card bento-large premium-3d-card"
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
              >
                <div className="card-glare" />
                <div className="bento-card-content">
                  <div className="bento-icon">☁️</div>
                  <h3 className="bento-title">GitHub-Backed DB Sync</h3>
                  <p className="bento-text">
                    Our database and media storage are backed up directly to GitHub. If our backend hosting service suspends operations due to free-tier quotas or limitations, your data remains safe. We can instantly redeploy to another URL and resume operations.
                  </p>
                  <div className="bento-status-badge">GitHub Backup: Active</div>
                </div>
              </div>

              <div 
                className="bento-card bento-medium premium-3d-card"
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
              >
                <div className="card-glare" />
                <div className="bento-card-content">
                  <div className="bento-icon">🔒</div>
                  <h3 className="bento-title">Zero-Cost Security</h3>
                  <p className="bento-text">
                    Access is secured using Time-Based One-Time Passwords (2FA/TOTP) running completely free. No SMS charges, no API dependencies, and 100% private.
                  </p>
                </div>
              </div>

              <div 
                className="bento-card bento-small premium-3d-card"
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
              >
                <div className="card-glare" />
                <div className="bento-card-content">
                  <div className="bento-icon">⚖️</div>
                  <h3 className="bento-title">Content Policy</h3>
                  <p className="bento-text">
                    You retain copyright of all code vaults. Scraping or unauthorized downloading is strictly prohibited. Stories expire and delete automatically after 24 hours.
                  </p>
                </div>
              </div>

              <div 
                className="bento-card bento-small premium-3d-card bento-system-card"
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
              >
                <div className="card-glare" />
                <div className="bento-card-content">
                  <div className="bento-icon">🛡️</div>
                  <h3 className="bento-title">System Status</h3>
                  <div className="bento-system-indicators">
                    <div className="system-indicator-item">
                      <span className="indicator-dot online"></span>
                      <span className="indicator-label">Shield Core: Online</span>
                    </div>
                    <div className="system-indicator-item">
                      <span className="indicator-dot secure"></span>
                      <span className="indicator-label">S-Box Cipher: Verified</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '14px' }}>
              <button className="enter-btn" onClick={enterWorkspace}>Enter Open Store</button>
              <button className="landing-signin-btn" onClick={() => navigateTo('/terms-and-conditions')}>Read Full Policies</button>
            </div>
          </div>
        </section>

        <footer style={{
          position: 'absolute',
          bottom: '20px',
          left: 0,
          right: 0,
          textAlign: 'center',
          zIndex: 10,
          fontSize: '13px',
          color: 'var(--text-secondary)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>© {new Date().getFullYear()} Open Store. All rights reserved.</span>
          <span style={{ opacity: 0.3 }}>|</span>
          <button 
            onClick={() => navigateTo('/terms-and-conditions')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-primary, #6366f1)',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0,
              font: 'inherit',
              fontWeight: '500'
            }}
          >
            Terms & Policies
          </button>
        </footer>
      </div>
    );
  }

  // --- 2. User Authentication Views ---
  if (!user) {
    return (
      <div className="auth-overlay">
        <div className="auth-bg-blob blob-1"></div>
        <div className="auth-bg-blob blob-2"></div>
        <div className="auth-bg-blob blob-3"></div>
        
        <div className="auth-card glass-card">
          {requireOTP ? (
            <div className="auth-card-content" key="otp">
              <div className="auth-logo-wrapper">
                <span className="auth-logo">📧</span>
              </div>
              <h2>Verify Your Email</h2>
              <div className="auth-subtitle" style={{ marginBottom: 20 }}>
                Enter the 6-digit verification code sent to your email address to complete authentication.
              </div>
              
              {authError && <div className="auth-error-msg">{authError}</div>}
              
              <form className="auth-form" onSubmit={handleOTPVerifySubmit}>
                <div className="form-group">
                  <label>Verification Code</label>
                  <div className="form-input-wrapper">
                    <Lock size={16} className="auth-input-icon" />
                    <input 
                      type="text" 
                      placeholder="e.g. 123456" 
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      maxLength={6}
                      pattern="[0-9]{6}"
                      required 
                      autoFocus
                    />
                  </div>
                </div>
                
                <button type="submit" className="auth-btn">
                  <span>Verify & Continue</span>
                </button>
                
                <button type="button" className="auth-btn" style={{ background: 'transparent', border: '1px solid var(--border-color)', marginTop: '8px', color: 'var(--text-primary)' }} onClick={handleCancelOTP}>
                  <span>Cancel</span>
                </button>
              </form>
            </div>
          ) : require2FA ? (
            <div className="auth-card-content" key="2fa">
              <div className="auth-logo-wrapper">
                <span className="auth-logo">🛡️</span>
              </div>
              <h2>Confirm Identity</h2>
              <div className="auth-subtitle" style={{ marginBottom: 20 }}>
                Enter the 6-digit verification code from your authenticator app (Google Authenticator, Microsoft Authenticator, etc.) to complete login.
              </div>
              
              {authError && <div className="auth-error-msg">{authError}</div>}
              
              <form className="auth-form" onSubmit={handle2FAVerifySubmit}>
                <div className="form-group">
                  <label>Authenticator Code</label>
                  <div className="form-input-wrapper">
                    <Lock size={16} className="auth-input-icon" />
                    <input 
                      type="text" 
                      placeholder="e.g. 123456" 
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value)}
                      maxLength={6}
                      pattern="[0-9]{6}"
                      required 
                      autoFocus
                    />
                  </div>
                </div>
                
                <button type="submit" className="auth-btn">
                  <span>Verify and Login</span>
                </button>
                
                <button type="button" className="auth-btn" style={{ background: 'transparent', border: '1px solid var(--border-color)', marginTop: '8px', color: 'var(--text-primary)' }} onClick={handleCancel2FA}>
                  <span>Cancel</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="auth-card-content" key={authMode}>
              <div className="auth-logo-wrapper">
                <span className="auth-logo">📦</span>
              </div>
              <h2>{authMode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
              <div className="auth-subtitle">
                {authMode === 'login' 
                  ? 'Minimalist Space for Developer Logs & Vaults' 
                  : 'Join the luxury space for secure development logs'}
              </div>
              
              {authError && <div className="auth-error-msg">{authError}</div>}
              
              <form className="auth-form" onSubmit={handleAuthSubmit}>
                <div className="form-group">
                  <label>Username</label>
                  <div className="form-input-wrapper">
                    <UserIcon size={16} className="auth-input-icon" />
                    <input 
                      type="text" 
                      placeholder="code_ninja" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required 
                    />
                  </div>
                </div>

                {authMode === 'register' && (
                  <div className="form-group">
                    <label>Email Address</label>
                    <div className="form-input-wrapper">
                      <Globe size={16} className="auth-input-icon" />
                      <input 
                        type="email" 
                        placeholder="you@example.com" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required 
                      />
                    </div>
                  </div>
                )}
                
                <div className="form-group">
                  <label>Password</label>
                  <div className="form-input-wrapper">
                    <Lock size={16} className="auth-input-icon" />
                    <input 
                      type="password" 
                      placeholder="••••••••" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required 
                    />
                  </div>
                </div>
                
                <button type="submit" className="auth-btn">
                  <span>{authMode === 'login' ? 'Sign In' : 'Create Account'}</span>
                </button>
              </form>
              
              <div className="auth-switch">
                {authMode === 'login' ? (
                  <>First time here? <span className="auth-switch-link-btn" onClick={() => { setAuthError(''); setAuthMode('register'); setEmail(''); }}>Create Account</span></>
                ) : (
                  <>Already have an account? <span className="auth-switch-link-btn" onClick={() => { setAuthError(''); setAuthMode('login'); }}>Sign In</span></>
                )}
              </div>
              <div className="auth-footer" style={{ marginTop: '20px', fontSize: '11.5px', textAlign: 'center', color: 'var(--text-muted)' }}>
                By entering, you agree to the <span className="auth-switch-link-btn" style={{ textDecoration: 'underline', color: 'var(--text-primary)' }} onClick={() => navigateTo('/terms-and-conditions')}>Terms & Policies</span>.
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const renderCommentsDrawer = (post) => {
    return (
      <div className="comments-section">
        <div className="comments-hierarchy-wrapper">
          {comments.length === 0 ? (
            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', textAlign: 'left', padding: '4px' }}>
              No comments yet. Write the first response.
            </div>
          ) : (
            comments.filter(c => !c.parentId).map(rootC => {
              const replies = comments.filter(r => r.parentId === rootC.id);
              return (
                <div key={rootC.id} className="parent-comment-block">
                  <div className="comment-item">
                    <Avatar username={rootC.username} src={rootC.avatar} size={24} className="comment-avatar" />
                    <div className="comment-body">
                      <span className="comment-author-name">@{rootC.username}</span>
                      <span className="comment-text">{rootC.content}</span>
                      <div style={{ display: 'flex', gap: '10px', marginTop: 4 }}>
                        <span className="comment-time">{formatRelativeTime(rootC.createdAt)}</span>
                        <button 
                          className="comment-reply-trigger" 
                          onClick={() => {
                            setReplyingToCommentId(replyingToCommentId === rootC.id ? null : rootC.id);
                            setReplyText('');
                          }}
                        >
                          Reply {replies.length > 0 && `(${replies.length})`}
                        </button>
                      </div>
                    </div>
                  </div>

                  {replyingToCommentId === rootC.id && (
                    <form className="reply-input-box" onSubmit={(e) => handleAddComment(e, post.id, rootC.id)}>
                      <input 
                        type="text" 
                        placeholder={`Reply to @${rootC.username}...`} 
                        className="comment-input" 
                        style={{ fontSize: '12px' }}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        required
                      />
                      <button type="submit" className="comment-submit-btn" style={{ padding: '4px 10px', fontSize: '11px' }}>Reply</button>
                    </form>
                  )}

                  {replies.length > 0 && (
                    <div className="nested-replies-list">
                      {replies.map(replyC => (
                        <div key={replyC.id} className="comment-item">
                          <Avatar username={replyC.username} src={replyC.avatar} size={20} className="comment-avatar" />
                          <div className="comment-body">
                            <span className="comment-author-name">@{replyC.username}</span>
                            <span className="comment-text">{replyC.content}</span>
                            <span className="comment-time">{formatRelativeTime(replyC.createdAt)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <form className="comment-input-wrapper" onSubmit={(e) => handleAddComment(e, post.id)}>
          <input 
            type="text" 
            placeholder="Write a comment..." 
            className="comment-input"
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            required
          />
          <button type="submit" className="comment-submit-btn">Send</button>
        </form>
      </div>
    );
  };

  // --- 3. Core Developer Social Workspace (App UI Layout) ---
  return (
    <div className={`app-container ${activeDetailsPost && (currentPanel === 'feed' || currentPanel === 'profile') ? 'has-details' : 'no-details'}`}>
      <aside className="left-sidebar">
        <div className="brand" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => { localStorage.removeItem('inWorkspace'); setInWorkspace(false); }}>
          <button 
            type="button" 
            className="icon-btn back-workspace-btn" 
            style={{ color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px' }}
            title="Leave Workspace"
            onClick={(e) => { e.stopPropagation(); localStorage.removeItem('inWorkspace'); setInWorkspace(false); }}
          >
            <ChevronDown size={18} style={{ transform: 'rotate(90deg)', color: 'var(--text-primary)' }} />
          </button>
          <span className="brand-logo" style={{ fontSize: '20px' }}>📦</span>
          <span className="brand-gradient">Open Store</span>
        </div>
        
        <nav className="nav-menu glass-card">
          <div className={`nav-item ${currentPanel === 'feed' && feedTab === 'all' ? 'active' : ''}`} onClick={() => { setCurrentPanel('feed'); setFeedTab('all'); setProfileUserId(null); }}>
            <Home size={16} />
            <span>Home</span>
          </div>
          <div className={`nav-item ${currentPanel === 'shorts' ? 'active' : ''}`} onClick={() => { setCurrentPanel('shorts'); setProfileUserId(null); setShortVideoIndex(0); }}>
            <Video size={16} />
            <span>Shorts</span>
          </div>
          <div className={`nav-item ${currentPanel === 'videos' ? 'active' : ''}`} onClick={() => { setCurrentPanel('videos'); setProfileUserId(null); }}>
            <PlayCircle size={16} />
            <span>Videos</span>
          </div>
          <div className={`nav-item ${currentPanel === 'chat' ? 'active' : ''}`} onClick={() => { setCurrentPanel('chat'); setProfileUserId(null); }}>
            <MessageCircle size={16} />
            <span>Messages</span>
          </div>
          <div className={`nav-item ${currentPanel === 'feed' && feedTab === 'followed' ? 'active' : ''}`} onClick={() => { setCurrentPanel('feed'); setFeedTab('followed'); setProfileUserId(null); }}>
            <Bookmark size={16} />
            <span>Followed Feed</span>
          </div>
          <div className={`nav-item ${currentPanel === 'feed' && feedTab === 'members' ? 'active' : ''}`} onClick={() => { setCurrentPanel('feed'); setFeedTab('members'); setProfileUserId(null); }}>
            <Globe size={16} />
            <span>Find Members</span>
          </div>
          <div className={`nav-item ${currentPanel === 'profile' && profileTab === 'settings' ? 'active' : ''}`} onClick={() => { setProfileUserId(user.id); setCurrentPanel('profile'); setProfileTab('settings'); }}>
            <Settings size={16} />
            <span>Settings</span>
          </div>
          <div className={`nav-item ${currentPanel === 'profile' && profileTab !== 'settings' ? 'active' : ''}`} onClick={() => { setProfileUserId(user.id); setCurrentPanel('profile'); setProfileTab('feed'); }}>
            <UserIcon size={16} />
            <span>Profile</span>
          </div>
          <div className="nav-item" onClick={() => navigateTo('/terms-and-conditions')}>
            <ShieldCheck size={16} />
            <span>Terms & Policies</span>
          </div>
          <div className={`nav-item ${currentPanel === 'support' ? 'active' : ''}`} onClick={() => { setCurrentPanel('support'); setProfileUserId(null); }}>
            <MessageSquare size={16} />
            <span>Report Error / Request</span>
          </div>
        </nav>

        {/* Profile Card & Settings Trigger in footer */}
        <div className="profile-card glass-card">
          <div className="profile-footer">
            <div className="profile-info-block" onClick={() => { setProfileUserId(user.id); setCurrentPanel('profile'); setProfileTab('feed'); }}>
              <Avatar username={user.username} src={user.avatar} size={28} className="profile-avatar-small" />
              <div className="profile-meta-small">
                <span className="profile-username-small">{user.name || `@${user.username}`}</span>
                <span className="profile-niche-small">{user.niche}</span>
              </div>
            </div>
            <div className="footer-action-icons">
              <button className="icon-btn logout-btn" onClick={handleLogout} title="Leave Space" style={{ padding: '6px' }}>
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Panel Viewport */}
      <main className="main-feed">
        {/* Workspace Top Header with Search and Branding */}
        <div className="workspace-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Mobile Branding Logo */}
            <div 
              className="mobile-brand-logo" 
              onClick={() => { localStorage.removeItem('inWorkspace'); setInWorkspace(false); }}
              style={{ cursor: 'pointer', display: 'none', fontSize: '20px' }}
            >
              📦
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 700 }}>
              {getHeaderTitle()}
            </h2>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Mobile Profile Trigger */}
            <div 
              className="mobile-profile-trigger" 
              onClick={() => { setProfileUserId(user.id); setCurrentPanel('profile'); setProfileTab('feed'); }}
              style={{ cursor: 'pointer', display: 'none', borderRadius: '50%', overflow: 'hidden' }}
            >
              <Avatar username={user.username} src={user.avatar} size={28} />
            </div>

            {/* Mobile Messaging Icon */}
            <button
              type="button"
              className="mobile-message-icon"
              style={{ display: 'none', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '6px' }}
              onClick={() => { setCurrentPanel('chat'); setSelectedContact(null); }}
              title="Messages"
            >
              <MessageCircle size={22} />
            </button>

            {/* Fuzzy Search bar in header inside a form */}
            <form ref={searchContainerRef} onSubmit={handleSearchSubmit} className="header-search-container" style={{ margin: 0 }}>
              <div className="search-input-wrapper">
                <Search size={14} className="text-secondary" />
                <input 
                  type="text" 
                  placeholder="Search users, project codes, videos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowSearchDropdown(true)}
                />
                {searchQuery && (
                  <button type="button" className="icon-btn" onClick={() => setSearchQuery('')} style={{ padding: 2 }}>&times;</button>
                )}
              </div>

              {showSearchDropdown && (searchQuery.trim()) && (
                <div className="search-results-dropdown glass-card">
                  {searchResults.users?.length > 0 && (
                    <div className="search-result-group">
                      <div className="search-group-title">Members</div>
                      {searchResults.users.map(u => (
                        <div key={u.id} className="search-result-item" onClick={() => handleSearchResultClick(u, 'user')}>
                          <Avatar username={u.username} src={u.avatar} size={28} className="result-avatar" />
                          <div className="result-info">
                            <span className="result-name">@{u.username}</span>
                            <span className="result-desc">{u.niche}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {searchResults.videos?.length > 0 && (
                    <div className="search-result-group">
                      <div className="search-group-title">Video Uploads</div>
                      {searchResults.videos.map(v => (
                        <div key={v.id} className="search-result-item" onClick={() => handleSearchResultClick(v, 'video')}>
                          <span style={{ fontSize: '16px' }}>🎥</span>
                          <div className="result-info">
                            <span className="result-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '250px' }}>
                              {v.content || v.mediaName}
                            </span>
                            <span className="result-desc">by @{v.username}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {searchResults.users?.length === 0 && searchResults.videos?.length === 0 && (
                    <div style={{ padding: '8px', color: 'var(--text-muted)', fontSize: '12.5px' }}>No matches found</div>
                  )}
                </div>
              )}
            </form>

            {/* Theme Toggle Button */}
            <button
              type="button"
              className="theme-toggle-btn"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              onClick={() => {
                const newTheme = theme === 'dark' ? 'light' : 'dark';
                setTheme(newTheme);
                localStorage.setItem('theme', newTheme);
              }}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            <div ref={bellRef} className="notifications-bell-container" style={{ position: 'relative' }}>
              <button 

                type="button" 
                className={`icon-btn bell-btn ${notifications.length > 0 ? 'active-bell' : ''}`}
                onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                style={{
                  position: 'relative',
                  padding: '8px',
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Notifications"
              >
                <Bell size={16} />
                {notifications.length > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: '#ff4b4b',
                    color: 'white',
                    fontSize: '9px',
                    borderRadius: '50%',
                    padding: '1px 5px',
                    fontWeight: 'bold',
                    minWidth: '14px',
                    textAlign: 'center'
                  }}>
                    {notifications.length}
                  </span>
                )}
              </button>

              {showNotificationsDropdown && (
                <div className="notifications-dropdown glass-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '12.5px' }}>System Notifications</span>
                    {notifications.length > 0 && (
                      <button 
                        type="button" 
                        className="comment-reply-trigger" 
                        style={{ fontSize: '10.5px', color: 'var(--accent-danger)' }} 
                        onClick={handleClearNotifications}
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '16px 0', fontSize: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No new notifications
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div 
                        key={notif.id} 
                        className="search-result-item" 
                        onClick={() => handleNotificationClick(notif)}
                        style={{
                          padding: '8px',
                          borderBottom: '1px solid var(--border-color)',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <Avatar 
                            username={notif.senderName} 
                            src={notif.senderAvatar} 
                            size={28} 
                          />
                          <span style={{
                            position: 'absolute',
                            bottom: '-4px',
                            right: '-4px',
                            background: 'var(--bg-surface)',
                            borderRadius: '50%',
                            width: '14px',
                            height: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '8px',
                            border: '1px solid var(--border-color)',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                          }}>
                            {notif.type === 'like' && '❤️'}
                            {notif.type === 'comment' && '💬'}
                            {(notif.type === 'follow' || notif.type === 'follow_request' || notif.type === 'follow_accept') && '👤'}
                          </span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-primary)', display: 'block' }}>{notif.message}</span>
                          <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{formatRelativeTime(notif.createdAt)}</span>
                          {notif.type === 'follow_request' && (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center' }}>
                              {actionedRequests[notif.senderId] === 'accepted' ? (
                                <span className="success-badge-anim" style={{ fontSize: '10px', color: 'var(--accent-success)', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 'bold' }}>
                                  <Check size={10} /> Accepted
                                </span>
                              ) : actionedRequests[notif.senderId] === 'declined' ? (
                                <span style={{ fontSize: '10px', color: 'var(--accent-danger)', fontWeight: 'bold' }}>
                                  Declined
                                </span>
                              ) : (
                                <>
                                  <button 
                                    type="button" 
                                    className="publish-btn" 
                                    style={{ padding: '3px 10px', fontSize: '10px', borderRadius: '12px', width: 'auto', background: 'var(--accent-blue)', color: 'white' }}
                                    onClick={(e) => { e.stopPropagation(); handleAcceptFollow(notif.senderId); }}
                                  >
                                    Accept
                                  </button>
                                  <button 
                                    type="button" 
                                    className="publish-btn" 
                                    style={{ padding: '3px 10px', fontSize: '10px', borderRadius: '12px', width: 'auto', background: 'rgba(0, 0, 0, 0.08)', color: 'var(--text-primary)' }}
                                    onClick={(e) => { e.stopPropagation(); handleDeclineFollow(notif.senderId); }}
                                  >
                                    Decline
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {currentPanel === 'feed' && (
          <div className="feed-tabs-bar glass-card" style={{
            display: 'flex',
            gap: '8px',
            padding: '8px 16px',
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-color)',
            margin: '0 -16px 16px -16px',
            position: 'sticky',
            top: '0',
            zIndex: 90,
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}>
            {[
              { id: 'all', label: 'All Releases' },
              { id: 'followed', label: 'Followed Feed' },
              { id: 'members', label: 'Find Members' },
              { id: 'updates', label: 'Updates Log' },
              { id: 'saved', label: 'Saved' }
            ].map(tab => (
              <button 
                key={tab.id}
                className={`feed-tab-btn ${feedTab === tab.id ? 'active' : ''}`} 
                onClick={() => { setFeedTab(tab.id); setProfileUserId(null); }} 
                style={{ 
                  padding: '6px 12px', 
                  border: 'none', 
                  background: feedTab === tab.id ? 'var(--bg-surface-hover)' : 'transparent', 
                  color: 'var(--text-primary)', 
                  borderRadius: '6px', 
                  cursor: 'pointer', 
                  fontWeight: feedTab === tab.id ? '700' : '500', 
                  fontSize: '13px',
                  flexShrink: 0
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* --- DYNAMIC RENDERING OF SEARCH RESULTS PANEL --- */}
        {currentPanel === 'search' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Matching Users */}
            <div className="glass-card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '14.5px', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', fontWeight: 'bold' }}>
                👥 Matching Developers
              </h3>
              {!searchResults.users || searchResults.users.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '12.5px' }}>No members match this query.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                  {searchResults.users.map(u => (
                    <div key={u.id} className="glass-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Avatar username={u.username} src={u.avatar} size={40} onClick={() => { setProfileUserId(u.id); setCurrentPanel('profile'); }} />
                      <span style={{ fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => { setProfileUserId(u.id); setCurrentPanel('profile'); }}>@{u.username}</span>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>{u.niche}</span>
                      <button className="publish-btn" style={{ fontSize: '10px', padding: '4px 10px', width: '100%' }} onClick={() => handleFollowToggle(u.id)}>
                        {u.followStatus === 'pending' ? 'Requested' : u.followStatus === 'accepted' ? 'Following' : '+ Follow'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Matching Updates */}
            <div className="glass-card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '14.5px', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', fontWeight: 'bold' }}>
                💬 Matching Updates
              </h3>
              {(!searchResults.posts || searchResults.posts.filter(p => p.type === 'log').length === 0) ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '12.5px' }}>No log updates match this query.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {searchResults.posts.filter(p => p.type === 'log').map(post => (
                    <div key={post.id} className="glass-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
                          @{post.username}
                          {post.collaboratorName && <span style={{ color: 'var(--accent-blue)', marginLeft: 6, fontWeight: 500 }}>with @{post.collaboratorName}</span>}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{formatRelativeTime(post.createdAt)}</span>
                      </div>
                      <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>{post.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Matching Uploads */}
            <div className="glass-card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '14.5px', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', fontWeight: 'bold' }}>
                🔒 Matching Uploads (Vault files)
              </h3>
              {(!searchResults.posts || searchResults.posts.filter(p => p.type === 'vault').length === 0) ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '12.5px' }}>No secure uploads match this query.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                  {searchResults.posts.filter(p => p.type === 'vault').map(post => (
                    <div key={post.id} className="glass-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '8px', textAlign: 'left' }}>
                      <div>
                        <span style={{ fontSize: '11px', fontWeight: 'bold' }}>
                          @{post.username}
                          {post.collaboratorName && <span style={{ color: 'var(--accent-blue)', marginLeft: 6, fontWeight: 500 }}>with @{post.collaboratorName}</span>}
                        </span>
                        {post.content && <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>{post.content}</p>}
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px' }}>Name: {post.mediaName}</div>
                      </div>
                      <a 
                        href={`${BACKEND_BASE}/api/files/download/${post.mediaUrl}`} 
                        className="publish-btn" 
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', textDecoration: 'none', fontSize: '10.5px', padding: '4px 0' }}
                      >
                        <Shield size={10} /> Download
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Matching Projects */}
            <div className="glass-card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '14.5px', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', fontWeight: 'bold' }}>
                📂 Matching Projects
              </h3>
              {(!searchResults.posts || searchResults.posts.filter(p => p.type === 'source').length === 0) ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '12.5px' }}>No project repositories match this query.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {searchResults.posts.filter(p => p.type === 'source').map(post => (
                    <div key={post.id} className="glass-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11.5px', fontWeight: 'bold' }}>
                          @{post.username}
                          {post.collaboratorName && <span style={{ color: 'var(--accent-blue)', marginLeft: 6, fontWeight: 500 }}>with @{post.collaboratorName}</span>}
                        </span>
                        <a href={post.githubRepo} target="_blank" rel="noreferrer" style={{ fontSize: '10.5px', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '2px', textDecoration: 'underline' }}>
                          Repo Link <ExternalLink size={10} />
                        </a>
                      </div>
                      {post.content && <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>{post.content}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* --- DEDICATED FOLLOWED NETWORK TIMELINE PANEL --- */}
        {currentPanel === 'feed' && feedTab === 'followed' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Horizontal followed users selection carousel */}
            <div className="followed-network-carousel glass-card" style={{ padding: '12px 18px', display: 'flex', gap: '16px', overflowX: 'auto', alignItems: 'center', border: '1px solid var(--border-color)' }}>
              <div 
                className={`followed-carousel-item ${followedFilterUserId === null ? 'active' : ''}`}
                onClick={() => setFollowedFilterUserId(null)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  minWidth: '55px',
                  opacity: followedFilterUserId === null ? 1 : 0.6,
                  transition: 'opacity 0.2s'
                }}
              >
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: followedFilterUserId === null ? '2px solid var(--accent-blue)' : '2px solid rgba(255, 255, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: '700',
                  color: followedFilterUserId === null ? 'var(--accent-blue)' : 'white',
                  boxShadow: followedFilterUserId === null ? '0 0 10px rgba(79, 70, 229, 0.4)' : 'none'
                }}>
                  All
                </div>
                <span style={{ fontSize: '10px', fontWeight: '600', color: followedFilterUserId === null ? 'white' : 'var(--text-secondary)' }}>All Feed</span>
              </div>

              {contacts.map(c => {
                const isActive = followedFilterUserId === c.id;
                return (
                  <div 
                    key={c.id}
                    className={`followed-carousel-item ${isActive ? 'active' : ''}`}
                    onClick={() => setFollowedFilterUserId(c.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      minWidth: '55px',
                      opacity: isActive ? 1 : 0.6,
                      transition: 'opacity 0.2s'
                    }}
                  >
                    <Avatar 
                      username={c.username} 
                      src={c.avatar} 
                      size={42} 
                      style={{
                        border: isActive ? '2px solid var(--accent-blue)' : '2px solid transparent',
                        padding: isActive ? '1px' : '0',
                        boxShadow: isActive ? '0 0 10px rgba(79, 70, 229, 0.4)' : 'none'
                      }} 
                    />
                    <span style={{ 
                      fontSize: '10px', 
                      fontWeight: '600', 
                      color: isActive ? 'white' : 'var(--text-secondary)',
                      maxWidth: '65px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      @{c.username.replace(/^@/, '')}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* FEEDS LIST FOR FOLLOWED */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {filteredPosts.length === 0 ? (
                <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  No releases found from followed developers.
                </div>
              ) : (
                filteredPosts.map(post => (
                  <div 
                    key={post.id} 
                    className="post-card glass-card"
                    onClick={() => { setActiveDetailsPost(post); }}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Post Author Metadata */}
                    <div className="post-header">
                      <div className="post-author-info">
                        <Avatar 
                          username={post.username}
                          src={post.avatar} 
                          className="post-avatar" 
                          style={{ cursor: 'pointer' }}
                          onClick={(e) => { e.stopPropagation(); setProfileUserId(post.userId); setCurrentPanel('profile'); setProfileTab('feed'); }}
                        />
                        <div className="post-meta">
                          <span 
                            className="post-author-name" 
                            style={{ cursor: 'pointer' }}
                            onClick={(e) => { e.stopPropagation(); setProfileUserId(post.userId); setCurrentPanel('profile'); setProfileTab('feed'); }}
                          >
                            @{post.username}
                          </span>
                          {post.collaboratorName && (
                            <span 
                              className="collaborator-badge"
                              onClick={(e) => { e.stopPropagation(); setProfileUserId(post.collaboratorId); setCurrentPanel('profile'); setProfileTab('feed'); }}
                              style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--accent-blue)', fontWeight: 500, cursor: 'pointer' }}
                            >
                              with @{post.collaboratorName}
                            </span>
                          )}
                          <span className="post-time">{formatRelativeTime(post.createdAt)}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                        <span className="post-badge" style={{ background: 'rgba(255, 255, 255, 0.04)', fontSize: '10.5px' }}>{post.niche}</span>
                        <span className={`post-badge ${post.type}`}>{post.type === 'log' ? 'update' : post.type === 'vault' ? 'upload' : 'project'}</span>
                        
                        {post.userId !== user.id && (
                          <button 
                            className="comment-reply-trigger" 
                            onClick={() => handleFollowToggle(post.userId)}
                            style={{ fontSize: '10.5px' }}
                          >
                            {post.isFollowing ? 'Following' : '+ Follow'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Text Release content */}
                    {post.content && <div className="post-content">{post.content}</div>}

                    {/* Vault uploaded media */}
                    {post.type === 'vault' && post.mediaUrl && (
                      <div className="encrypted-media-box" onClick={(e) => e.stopPropagation()}>
                        {post.mediaType && post.mediaType.startsWith('video/') ? (
                          <video 
                            className="media-video" 
                            src={`${BACKEND_BASE}/api/files/download/${post.mediaUrl}`} 
                            controls
                            preload="metadata"
                            onTimeUpdate={(e) => handleVideoTimeUpdate(e, post.id)}
                          />
                        ) : (
                          <img 
                            className="media-image" 
                            src={`${BACKEND_BASE}/api/files/download/${post.mediaUrl}`} 
                            alt={post.mediaName}
                            loading="lazy"
                            style={{ cursor: 'pointer' }}
                            onClick={() => setLightboxImage(`${BACKEND_BASE}/api/files/download/${post.mediaUrl}`)}
                          />
                        )}
                      </div>
                    )}

                    {/* Project/Website Live Frame Port */}
                    {post.type === 'source' && post.githubRepo && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <ProjectSourcePreview url={post.githubRepo} />
                      </div>
                    )}

                    {/* Post Actions: Like, Comment, Share */}
                    <div className="post-actions" style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                      <button className={`action-btn like-btn ${post.isLiked ? 'liked' : ''}`} onClick={() => handleLike(post.id)}>
                        <Heart size={15} />
                        <span>{post.likesCount}</span>
                      </button>
                      <button className="action-btn comment-btn" onClick={() => handleOpenComments(post.id)}>
                        <MessageSquare size={15} />
                        <span>{post.commentsCount} Comments</span>
                      </button>
                      
                      <button className="action-btn share-btn" onClick={() => handleSharePopover(post.id)}>
                        <Share2 size={15} />
                        <span>Share</span>
                      </button>

                      <button 
                        className={`action-btn save-btn ${savedPostIds.includes(post.id) ? 'saved' : ''}`}
                        onClick={() => handleSavePost(post.id)}
                      >
                        <Bookmark size={15} style={{ fill: savedPostIds.includes(post.id) ? 'currentColor' : 'none' }} />
                        <span>{savedPostIds.includes(post.id) ? 'Saved' : 'Save'}</span>
                      </button>

                      {/* Direct Send & Copy Share popover */}
                      {activeSharePostId === post.id && (
                        <div className="search-results-dropdown glass-card" style={{ position: 'absolute', top: '100%', right: 0, width: 220, zIndex: 120 }}>
                          <div style={{ padding: '8px 10px', fontSize: '11px', borderBottom: '1px solid var(--border-color)', fontWeight: 'bold' }}>
                            Share options
                          </div>
                          <div className="search-result-item" onClick={() => copyShareLink(post.id)}>
                            <span>🔗</span>
                            <div className="result-info">
                              <span className="result-name">{copiedPostId === post.id ? 'Copied URL!' : 'Copy direct link'}</span>
                            </div>
                          </div>
                          
                          {contacts.length > 0 && (
                            <>
                              <div style={{ padding: '4px 10px', fontSize: '10px', color: 'var(--text-muted)' }}>Send directly to friends</div>
                              {contacts.map(friend => (
                                <div key={friend.id} className="search-result-item" onClick={() => shareToFriend(post.id, friend.id)}>
                                  <Avatar username={friend.username} src={friend.avatar} size={18} />
                                  <span style={{ fontSize: '11px' }}>Send to @{friend.username}</span>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {activeCommentsPostId === post.id && (
                      <div onClick={(e) => e.stopPropagation()}>
                        {renderCommentsDrawer(post)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}

        {/* --- DEDICATED SHORTS VIEW (VERTICAL LOOPER) --- */}
        {currentPanel === 'shorts' ? (
          <>
            <div className="shorts-panel-container">
              {shortVideos.length === 0 ? (
                <div className="glass-card" style={{ padding: '40px', color: 'var(--text-secondary)', textAlign: 'center', width: '100%' }}>
                  No short video releases available in the space.
                </div>
              ) : (
                <div 
                  className="shorts-scroll-container" 
                  onScroll={handleShortsScroll}
                  style={{ 
                    height: 'calc(100vh - 120px)', 
                    overflowY: 'scroll', 
                    scrollSnapType: 'y mandatory', 
                    width: '100%', 
                    maxWidth: '480px', 
                    margin: '0 auto', 
                    display: 'flex', 
                    flexDirection: 'column',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    background: '#000'
                  }}
                >
                  {shortVideos.map((short, index) => (
                    <ShortVideoPlayer 
                      key={short.id}
                      short={short}
                      isActive={index === shortVideoIndex}
                      isNext={index === shortVideoIndex + 1}
                      onLike={handleLike}
                      onOpenComments={handleOpenComments}
                      setProfileUserId={setProfileUserId}
                      setCurrentPanel={setCurrentPanel}
                      setProfileTab={setProfileTab}
                      handleVideoTimeUpdate={handleVideoTimeUpdate}
                      BACKEND_BASE={BACKEND_BASE}
                      Avatar={Avatar}
                    />
                  ))}
                </div>
              )}
            </div>
            {activeCommentsPostId && shortVideos[shortVideoIndex] && activeCommentsPostId === shortVideos[shortVideoIndex].id && (
              <>
                <div className="shorts-comments-scrim" onClick={() => setActiveCommentsPostId(null)} />
                <div className="shorts-comments-drawer glass-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexShrink: 0 }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 'bold' }}>💬 Comments</h4>
                    <button className="icon-btn" onClick={() => setActiveCommentsPostId(null)} style={{ fontSize: '18px', lineHeight: 1 }}>&times;</button>
                  </div>
                  {renderCommentsDrawer(shortVideos[shortVideoIndex])}
                </div>
              </>
            )}
          </>
        ) : null}

        {/* --- DEDICATED FIND MEMBERS PANEL --- */}
        {currentPanel === 'feed' && feedTab === 'members' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="search-input-wrapper glass-card" style={{ padding: '10px 14px' }}>
              <Search size={16} className="text-secondary" />
              <input 
                type="text" 
                placeholder="Filter members by name or development niche..."
                value={membersSearch}
                onChange={(e) => setMembersSearch(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', color: 'white', width: '100%', fontSize: '13.5px' }}
              />
            </div>
            
            <div className="members-grid">
              {allUsers
                .filter(u => {
                  const query = membersSearch.toLowerCase();
                  return u.username.toLowerCase().includes(query) || (u.niche && u.niche.toLowerCase().includes(query));
                })
                .map(u => (
                  <div key={u.id} className="member-card glass-card">
                    <Avatar username={u.username} src={u.avatar} className="member-card-avatar" onClick={() => { setProfileUserId(u.id); setCurrentPanel('profile'); }} />
                    <span className="member-card-username" onClick={() => { setProfileUserId(u.id); setCurrentPanel('profile'); }}>@{u.username}</span>
                    <span className="member-card-niche">{u.niche}</span>
                    
                    {u.id !== user.id ? (
                      <button 
                        className={`publish-btn ${u.followStatus === 'accepted' ? 'unfollow' : u.followStatus === 'pending' ? 'pending' : ''}`} 
                        style={{ fontSize: '11px', padding: '6px 14px', width: '100%', marginTop: '10px' }}
                        onClick={() => handleFollowToggle(u.id)}
                      >
                        {u.followStatus === 'accepted' ? 'Following' : u.followStatus === 'pending' ? 'Pending' : '+ Follow'}
                      </button>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '10px' }}>This is You</span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ) : null}

        {/* --- DEDICATED SYSTEM NOTIFICATIONS PANEL --- */}
        {currentPanel === 'notifications' ? (
          <div className="glass-card" style={{ padding: '24px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 'bold' }}>Recent Activity Feed</h3>
              <button className="comment-reply-trigger" style={{ fontSize: '11px' }} onClick={handleClearNotifications}>Clear All</button>
            </div>
            {notifications.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', padding: '10px 0' }}>No recent notifications.</p>
            ) : (
              <div className="notifications-list">
                {notifications.map(notif => (
                  <div 
                    key={notif.id} 
                    className="notification-item glass-card" 
                    onClick={() => handleNotificationClick(notif)}
                    style={{ padding: '14px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}
                  >
                    <span style={{ fontSize: '18px' }}>
                      {(notif.type === 'follow' || notif.type === 'follow_request' || notif.type === 'follow_accept') && '👤'}
                      {notif.type === 'like' && '❤️'}
                      {notif.type === 'comment' && '💬'}
                    </span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{notif.message}</p>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{formatRelativeTime(notif.createdAt)}</span>
                      {notif.type === 'follow_request' && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
                          {actionedRequests[notif.senderId] === 'accepted' ? (
                            <span className="success-badge-anim" style={{ fontSize: '11px', color: 'var(--accent-success)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
                              <Check size={12} /> Accepted
                            </span>
                          ) : actionedRequests[notif.senderId] === 'declined' ? (
                            <span style={{ fontSize: '11px', color: 'var(--accent-danger)', fontWeight: 'bold' }}>
                              Declined
                            </span>
                          ) : (
                            <>
                              <button 
                                type="button" 
                                className="publish-btn" 
                                style={{ padding: '4px 14px', fontSize: '11px', borderRadius: '14px', width: 'auto', background: 'var(--accent-blue)', color: 'white' }}
                                onClick={(e) => { e.stopPropagation(); handleAcceptFollow(notif.senderId); }}
                              >
                                Accept Follow
                              </button>
                              <button 
                                type="button" 
                                className="publish-btn" 
                                style={{ padding: '4px 14px', fontSize: '11px', borderRadius: '14px', width: 'auto', background: 'rgba(255, 255, 255, 0.08)', color: 'white' }}
                                onClick={(e) => { e.stopPropagation(); handleDeclineFollow(notif.senderId); }}
                              >
                                Decline
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* --- DEDICATED DM CHAT PANEL (Instagram-style) --- */}
        {currentPanel === 'chat' ? (
          <div className="chat-panel glass-card" style={{ display: 'flex', flexDirection: 'row', height: 'calc(100vh - 130px)', overflow: 'hidden' }}>
            {/* Contacts list - hidden on mobile when a contact is selected */}
            <div className={`chat-contacts-list ${selectedContact ? 'hidden-mobile' : ''}`} style={{ width: '260px', flexShrink: 0, borderRight: '1px solid var(--border-color)', overflowY: 'auto' }}>
              <div style={{ padding: '14px 16px', fontWeight: 700, fontSize: '15px', borderBottom: '1px solid var(--border-color)' }}>
                Direct Messages
              </div>
              {contacts.length === 0 ? (
                <div style={{ padding: '24px 20px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>💬</div>
                  Follow members to start chatting
                </div>
              ) : (
                contacts.map(c => (
                  <div 
                    key={c.id} 
                    className={`chat-contact-item ${selectedContact?.id === c.id ? 'active' : ''}`}
                    onClick={() => { setSelectedContact(c); fetchMessages(); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}
                  >
                    <Avatar username={c.username} src={c.avatar} size={36} />
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontWeight: 600, fontSize: '13.5px' }}>@{c.username}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.niche || 'Developer'}</div>
                    </div>
                    {c.status === 'accepted' && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-success)', flexShrink: 0 }} />}
                  </div>
                ))
              )}
            </div>
            
            {/* Conversation Area */}
            <div className={`chat-conversation-area ${selectedContact ? 'fullscreen-mobile' : ''}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
              {selectedContact ? (
                <>
                  {/* Header with back button (mobile) */}
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-surface)' }}>
                    <button className="chat-back-btn" onClick={() => setSelectedContact(null)}>
                      <ArrowLeft size={16} /> Back
                    </button>
                    <Avatar username={selectedContact.username} src={selectedContact.avatar} size={32} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>@{selectedContact.username}</div>
                      {isContactTyping && <div style={{ fontSize: '11px', color: 'var(--accent-success)' }}>typing…</div>}
                    </div>
                    <button
                      className="icon-btn"
                      style={{ marginLeft: 'auto' }}
                      title="View Profile"
                      onClick={() => { setProfileUserId(selectedContact.id); setCurrentPanel('profile'); setProfileTab('feed'); }}
                    >
                      <UserIcon size={15} />
                    </button>
                  </div>
                  
                  <div 
                    ref={chatLogRef}
                    onScroll={handleChatScroll}
                    className="chat-messages-log" 
                    style={{ flex: 1, overflowY: 'auto', padding: '16px' }}
                  >
                    {chatMessages.length === 0 ? (
                      <div style={{ margin: 'auto', color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', paddingTop: '40px' }}>
                        <div style={{ fontSize: '40px', marginBottom: '8px' }}>👋</div>
                        Say hello to @{selectedContact.username}!
                      </div>
                    ) : (
                      chatMessages.map(msg => (
                        <div 
                          key={msg.id} 
                          id={`msg-${msg.id}`}
                          className={`chat-message-row ${Number(msg.senderId) === Number(user.id) ? 'sent' : 'received'}`}
                        >
                          {Number(msg.senderId) === Number(user.id) && (
                            <button
                              type="button"
                              className="reply-btn"
                              title="Reply"
                              onClick={() => setReplyingToMessage(msg)}
                            >
                              <CornerUpLeft size={12} />
                            </button>
                          )}
                          
                          <div className={`chat-message-bubble ${Number(msg.senderId) === Number(user.id) ? 'sent' : 'received'} ${msg.isSending ? 'sending' : ''}`}>
                            {msg.replyContent && (
                              <div 
                                className="chat-message-reply-quote" 
                                onClick={() => {
                                  const targetElem = document.getElementById(`msg-${msg.replyToId}`);
                                  if (targetElem) {
                                    targetElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    // Visual highlight effect
                                    targetElem.style.transition = 'background 0.3s ease';
                                    const originalBg = targetElem.style.background;
                                    targetElem.style.background = 'rgba(99, 102, 241, 0.2)';
                                    setTimeout(() => {
                                      targetElem.style.background = originalBg;
                                    }, 1000);
                                  }
                                }}
                              >
                                <div className="reply-quote-sender">@{msg.replySenderName || 'user'}</div>
                                <div className="reply-quote-text">{msg.replyContent || msg.replyMediaName || 'Image/Media'}</div>
                              </div>
                            )}
                            
                            {msg.content && <div>{msg.content}</div>}
                            {msg.mediaUrl && (
                              <div style={{ marginTop: '6px' }}>
                                {(() => {
                                  const filename = msg.mediaName || msg.mediaUrl || '';
                                  let cleanName = filename;
                                  if (filename.endsWith('.enc')) cleanName = filename.slice(0, -4);
                                  const ext = cleanName.split('.').pop().toLowerCase();
                                  const isImg = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);
                                  const isVid = ['mp4', 'webm', 'mov', 'ogg'].includes(ext);
                                  const downloadUrl = msg.isSending
                                    ? msg.mediaUrl
                                    : `${BACKEND_BASE}/api/files/download/${encodeURIComponent(msg.mediaUrl)}`;
                                  if (isImg) return <img src={downloadUrl} style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: 8, objectFit: 'contain', cursor: 'pointer' }} alt="Chat media" onClick={() => setLightboxImage(downloadUrl)} />;
                                  if (isVid) return <video src={downloadUrl} controls style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: 8 }} />;
                                  return <a href={downloadUrl} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'underline', fontSize: '11px' }} download={msg.mediaName || undefined}>📎 {msg.mediaName || 'attachment'}</a>;
                                })()}
                              </div>
                            )}
                            <div style={{ fontSize: '9px', opacity: 0.6, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: Number(msg.senderId) === Number(user.id) ? 'flex-end' : 'flex-start', gap: '4px' }}>
                              {msg.isSending ? (
                                <>
                                  <RefreshCw size={8} className="spin-icon" />
                                  <span>Sending...</span>
                                </>
                              ) : (
                                parseUTCDate(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              )}
                            </div>
                          </div>

                          {Number(msg.senderId) !== Number(user.id) && (
                            <button
                              type="button"
                              className="reply-btn"
                              title="Reply"
                              onClick={() => setReplyingToMessage(msg)}
                            >
                              <CornerUpLeft size={12} style={{ transform: 'scaleX(-1)' }} />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                    {/* Typing Indicator */}
                    {isContactTyping && (
                      <div style={{ marginTop: '8px' }}>
                        <div className="typing-indicator">
                          <div className="typing-dot" />
                          <div className="typing-dot" />
                          <div className="typing-dot" />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  
                  {selectedContact.status === 'accepted' ? (
                    <div className="chat-input-container" style={{ position: 'relative', display: 'flex', flexDirection: 'column', width: '100%' }}>
                      {replyingToMessage && (
                        <div className="chat-reply-preview-bar" style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: 'rgba(255, 255, 255, 0.04)',
                          borderBottom: '1px solid var(--border-color)',
                          borderLeft: '4px solid var(--accent-blue)',
                          fontSize: '12px',
                          borderTopLeftRadius: '8px',
                          borderTopRightRadius: '8px'
                        }}>
                          <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)', textAlign: 'left' }}>
                            <span style={{ fontWeight: 'bold', color: 'var(--accent-blue)', marginRight: '6px' }}>
                              Replying to @{replyingToMessage.senderName || (Number(replyingToMessage.senderId) === Number(user.id) ? user.username : selectedContact.username)}:
                            </span>
                            <span>{replyingToMessage.content || replyingToMessage.mediaName || '[Image/Media]'}</span>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => setReplyingToMessage(null)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px', padding: '0 4px', lineHeight: 1 }}
                          >
                            ×
                          </button>
                        </div>
                      )}
                      
                      <form className="chat-input-toolbar" onSubmit={handleSendChatMessage} style={{ borderTopLeftRadius: replyingToMessage ? 0 : undefined, borderTopRightRadius: replyingToMessage ? 0 : undefined, borderTop: replyingToMessage ? 'none' : undefined }}>
                        <input 
                          type="file" 
                          ref={chatFileInputRef} 
                          style={{ display: 'none' }} 
                          onChange={(e) => setChatFile(e.target.files[0])} 
                        />
                        <button 
                          type="button" 
                          className={`icon-btn ${chatFile ? 'text-success' : ''}`}
                          onClick={() => chatFileInputRef.current?.click()}
                          title="Attach File"
                        >
                          <Plus size={18} />
                        </button>
                        <input 
                          type="text" 
                          className="chat-msg-input" 
                          placeholder={chatFile ? `File: ${chatFile.name}` : "Message @" + selectedContact.username + "…"}
                          value={newChatText}
                          onChange={(e) => handleTypingInChat(e.target.value)}
                        />
                        <button type="submit" className="icon-btn" disabled={sendingChat}>
                          <Send size={16} />
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div style={{ padding: '16px', textAlign: 'center', background: 'rgba(255, 75, 75, 0.05)', borderTop: '1px solid var(--border-color)', color: 'var(--accent-danger)', fontSize: '13px', fontWeight: '500' }}>
                      🔒 Chat locked: Waiting for follow approval.
                    </div>
                  )}
                  {showScrollToBottom && (
                    <button 
                      type="button"
                      className="chat-scroll-to-bottom-btn"
                      onClick={scrollToLatestChat}
                      title="Scroll to latest messages"
                    >
                      <ArrowDown size={16} />
                    </button>
                  )}
                </>
              ) : (
                <div style={{ margin: 'auto', color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '40px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>💬</div>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>Your Messages</div>
                  <div style={{ fontSize: '13px' }}>Select a contact on the left to start chatting</div>
                </div>
              )}
            </div>
          </div>
        ) : null}


        {/* --- DEDICATED UPDATES PANEL VIEW --- */}
        {currentPanel === 'feed' && feedTab === 'updates' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="creator-box glass-card">
              <div className="creator-header">
                <Avatar username={user.username} src={user.avatar} className="creator-avatar" />
                <textarea 
                  className="creator-textarea" 
                  placeholder="Publish a status update or release note..." 
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                />
              </div>
              <div className="creator-footer">
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Categorized: {user.niche}</span>
                <div style={{ flex: 1 }} />
                <button 
                  type="button" 
                  className="publish-btn" 
                  onClick={(e) => { setCreatorType('log'); handleRelease(e); }}
                  disabled={uploading || !postText.trim()}
                >
                  {uploading ? 'Publishing...' : 'Release Update'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredPosts.length === 0 ? (
                <div className="glass-card" style={{ padding: '40px', color: 'var(--text-secondary)' }}>No status updates found.</div>
              ) : (
                filteredPosts.map(post => (
                  <div 
                    key={post.id} 
                    className="post-card glass-card" 
                    style={{ padding: '20px', cursor: 'pointer' }}
                    onClick={() => setActiveDetailsPost(post)}
                  >
                    <div className="post-header">
                      <div className="post-author-info">
                        <Avatar 
                          username={post.username} 
                          src={post.avatar} 
                          className="post-avatar" 
                          style={{ cursor: 'pointer' }}
                          onClick={(e) => { e.stopPropagation(); setProfileUserId(post.userId); setCurrentPanel('profile'); setProfileTab('feed'); }}
                        />
                        <div className="post-meta">
                          <span 
                            className="post-author-name"
                            style={{ cursor: 'pointer' }}
                            onClick={(e) => { e.stopPropagation(); setProfileUserId(post.userId); setCurrentPanel('profile'); setProfileTab('feed'); }}
                          >
                            @{post.username}
                          </span>
                          {post.collaboratorName && (
                            <span 
                              className="collaborator-badge"
                              onClick={(e) => { e.stopPropagation(); setProfileUserId(post.collaboratorId); setCurrentPanel('profile'); setProfileTab('feed'); }}
                              style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--accent-blue)', fontWeight: 500, cursor: 'pointer' }}
                            >
                              with @{post.collaboratorName}
                            </span>
                          )}
                          <span className="post-time">{formatRelativeTime(post.createdAt)}</span>
                        </div>
                      </div>
                      <span className="post-badge log" onClick={(e) => e.stopPropagation()}>update</span>
                    </div>
                    <div className="post-content" style={{ marginTop: '12px', fontSize: '13.5px', lineHeight: '1.6', textAlign: 'left' }}>
                      {post.content}
                    </div>
                    <div className="post-actions" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '14px' }} onClick={(e) => e.stopPropagation()}>
                      <button className={`action-btn ${post.isLiked ? 'liked' : ''}`} onClick={() => handleLike(post.id)}>
                        <Heart size={14} /> <span>{post.likesCount}</span>
                      </button>
                      <button className="action-btn" onClick={() => handleOpenComments(post.id)}>
                        <MessageSquare size={14} /> <span>{post.commentsCount} Comments</span>
                      </button>
                      <button 
                        className={`action-btn ${savedPostIds.includes(post.id) ? 'liked' : ''}`} 
                        onClick={() => handleSavePost(post.id)}
                      >
                        <Bookmark size={14} style={{ fill: savedPostIds.includes(post.id) ? 'currentColor' : 'none' }} /> <span>{savedPostIds.includes(post.id) ? 'Saved' : 'Save'}</span>
                      </button>
                    </div>
                    {activeCommentsPostId === post.id && (
                      <div onClick={(e) => e.stopPropagation()}>
                        {renderCommentsDrawer(post)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}

        {/* --- DEDICATED UPLOADS VAULT PANEL VIEW --- */}
        {currentPanel === 'uploads' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="creator-box glass-card">
              <div className="creator-header">
                <Avatar username={user.username} src={user.avatar} className="creator-avatar" />
                <textarea 
                  className="creator-textarea" 
                  placeholder="Provide details about the file, code, or video upload..." 
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                />
              </div>
              <div className="attachment-container">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*,video/*"
                  style={{ display: 'none' }}
                />
                {!selectedFile ? (
                  <div className="file-upload-zone" onClick={triggerFileSelect}>
                    <Plus size={20} className="text-secondary" style={{ marginBottom: '4px' }} />
                    <div style={{ fontSize: '13px', fontWeight: '500' }}>Select Secure Document / File</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Bit-scrambled with chaotic maps prior to upload</div>
                  </div>
                ) : (
                  <div className="file-preview">
                    <span className="preview-icon">{selectedFile.type.startsWith('video/') ? '🎥' : '🖼️'}</span>
                    <div className="preview-details">
                      <span className="preview-name">{selectedFile.name}</span>
                      <span className="preview-size">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                    </div>
                    <button type="button" className="remove-file-btn" onClick={() => setSelectedFile(null)}>&times;</button>
                  </div>
                )}
              </div>
              <div className="creator-footer">
                <div className="crypto-badge"><Shield size={11} /> <span>DCBS Encrypted Upload</span></div>
                <div style={{ flex: 1 }} />
                <button 
                  type="button" 
                  className="publish-btn" 
                  onClick={(e) => { setCreatorType('vault'); handleRelease(e); }}
                  disabled={uploading || !selectedFile}
                >
                  {uploading ? 'Encrypting...' : 'Lock File in Vault'}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {filteredPosts.length === 0 ? (
                <div className="glass-card" style={{ padding: '40px', color: 'var(--text-secondary)', gridColumn: '1/-1' }}>No secure uploads vault files found.</div>
              ) : (
                filteredPosts.map(post => (
                  <div key={post.id} className="post-card glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'left' }}>
                    <div>
                      <div className="post-header" style={{ marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Avatar username={post.username} src={post.avatar} size={24} />
                          <span style={{ fontSize: '12px', fontWeight: 'bold' }}>@{post.username}</span>
                          {post.collaboratorName && (
                            <span 
                              className="collaborator-badge"
                              onClick={(e) => { e.stopPropagation(); setProfileUserId(post.collaboratorId); setCurrentPanel('profile'); setProfileTab('feed'); }}
                              style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--accent-blue)', fontWeight: 500, cursor: 'pointer' }}
                            >
                              with @{post.collaboratorName}
                            </span>
                          )}
                        </div>
                        <span className="post-badge vault" style={{ fontSize: '9px' }}>upload</span>
                      </div>
                      
                      {post.content && <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '10px' }}>{post.content}</p>}
                      
                      <div className="encrypted-media-box" style={{ margin: '8px 0' }}>
                        {post.mediaType && post.mediaType.startsWith('video/') ? (
                          <video src={`${BACKEND_BASE}/api/files/download/${post.mediaUrl}`} style={{ width: '100%', maxHeight: '150px', objectFit: 'contain' }} controls onTimeUpdate={(e) => handleVideoTimeUpdate(e, post.id)} />
                        ) : (
                          <img src={`${BACKEND_BASE}/api/files/download/${post.mediaUrl}`} style={{ width: '100%', maxHeight: '150px', objectFit: 'contain', cursor: 'pointer' }} alt="" onClick={() => setLightboxImage(`${BACKEND_BASE}/api/files/download/${post.mediaUrl}`)} />
                        )}
                      </div>
                      
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '8px 0', display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div>Filename: {post.mediaName}</div>
                        <div>Size: {(post.mediaType) || 'file'}</div>
                      </div>
                    </div>

                    <div>
                      <a 
                        href={`${BACKEND_BASE}/api/files/download/${post.mediaUrl}`} 
                        download={post.mediaName}
                        className="publish-btn" 
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', textDecoration: 'none', fontSize: '12px', padding: '6px', margin: '8px 0' }}
                      >
                        <Shield size={11} /> Unlock & Download
                      </a>
                      
                      <div className="post-actions" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '8px' }}>
                        <button className="action-btn" onClick={() => handleLike(post.id)}>
                          <Heart size={13} className={post.isLiked ? 'text-danger' : ''} /> <span>{post.likesCount}</span>
                        </button>
                        <button className="action-btn" onClick={() => handleOpenComments(post.id)}>
                          <MessageSquare size={13} /> <span>{post.commentsCount} Comments</span>
                        </button>
                      </div>
                    </div>
                    {activeCommentsPostId === post.id && renderCommentsDrawer(post)}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}

        {/* --- DEDICATED PROJECTS PANEL VIEW --- */}
        {currentPanel === 'projects' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="creator-box glass-card">
              <div className="creator-header">
                <Avatar username={user.username} src={user.avatar} className="creator-avatar" />
                <textarea 
                  className="creator-textarea" 
                  placeholder="Explain the features of your web app or repository project..." 
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                />
              </div>
              <div className="attachment-container">
                <input 
                  type="text" 
                  placeholder="Paste URL link (e.g. facebook/react OR https://my-portfolio-site.com)" 
                  value={githubRepo}
                  onChange={(e) => setGithubRepo(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white' }}
                />
              </div>
              <div className="creator-footer">
                <div style={{ flex: 1 }} />
                <button 
                  type="button" 
                  className="publish-btn" 
                  onClick={(e) => { setCreatorType('source'); handleRelease(e); }}
                  disabled={uploading || !githubRepo}
                >
                  {uploading ? 'Releasing...' : 'Release Project'}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
              {filteredPosts.length === 0 ? (
                <div className="glass-card" style={{ padding: '40px', color: 'var(--text-secondary)', gridColumn: '1/-1' }}>No shared projects found.</div>
              ) : (
                filteredPosts.map(post => (
                  <div 
                    key={post.id} 
                    className="post-card glass-card" 
                    style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'left', cursor: 'pointer' }}
                    onClick={() => setActiveDetailsPost(post)}
                  >
                    <div>
                      <div className="post-header" style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Avatar 
                            username={post.username} 
                            src={post.avatar} 
                            size={28} 
                            onClick={(e) => { e.stopPropagation(); setProfileUserId(post.userId); setCurrentPanel('profile'); }}
                          />
                          <span 
                            style={{ fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }} 
                            onClick={(e) => { e.stopPropagation(); setProfileUserId(post.userId); setCurrentPanel('profile'); }}
                          >
                            @{post.username}
                          </span>
                          {post.collaboratorName && (
                            <span 
                              className="collaborator-badge"
                              onClick={(e) => { e.stopPropagation(); setProfileUserId(post.collaboratorId); setCurrentPanel('profile'); setProfileTab('feed'); }}
                              style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--accent-blue)', fontWeight: 500, cursor: 'pointer' }}
                            >
                              with @{post.collaboratorName}
                            </span>
                          )}
                        </div>
                        <span className="post-badge source" onClick={(e) => e.stopPropagation()}>project</span>
                      </div>
                      
                      {post.content && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>{post.content}</p>}
                      
                      {post.githubRepo && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <ProjectSourcePreview url={post.githubRepo} />
                        </div>
                      )}
                    </div>
                    
                    <div style={{ marginTop: '16px' }} onClick={(e) => e.stopPropagation()}>
                      <div className="post-actions" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                        <button className={`action-btn ${post.isLiked ? 'liked' : ''}`} onClick={() => handleLike(post.id)}>
                          <Heart size={14} className={post.isLiked ? 'text-danger' : ''} /> <span>{post.likesCount}</span>
                        </button>
                        <button className="action-btn" onClick={() => handleOpenComments(post.id)}>
                          <MessageSquare size={14} /> <span>{post.commentsCount} Comments</span>
                        </button>
                        <button 
                          className={`action-btn save-btn ${savedPostIds.includes(post.id) ? 'saved' : ''}`}
                          onClick={() => handleSavePost(post.id)}
                        >
                          <Bookmark size={14} style={{ fill: savedPostIds.includes(post.id) ? 'currentColor' : 'none' }} />
                          <span>{savedPostIds.includes(post.id) ? 'Saved' : 'Save'}</span>
                        </button>
                      </div>
                    </div>
                    {activeCommentsPostId === post.id && (
                      <div onClick={(e) => e.stopPropagation()}>
                        {renderCommentsDrawer(post)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}

        {/* --- DEDICATED GALLERY PANEL VIEW --- */}
        {currentPanel === 'gallery' ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {filteredPosts.length === 0 ? (
                <div className="glass-card" style={{ padding: '40px', color: 'var(--text-secondary)', gridColumn: '1/-1', textAlign: 'center' }}>No image releases found.</div>
              ) : (
                filteredPosts.map(post => (
                  <div 
                    key={post.id} 
                    className="post-card glass-card" 
                    style={{ padding: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'left', cursor: 'pointer' }}
                    onClick={() => { setActiveDetailsPost(post); handleOpenComments(post.id); }}
                  >
                    <div>
                      <div className="post-header" style={{ marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Avatar username={post.username} src={post.avatar} size={22} onClick={(e) => { e.stopPropagation(); setProfileUserId(post.userId); setCurrentPanel('profile'); }} />
                          <span style={{ fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setProfileUserId(post.userId); setCurrentPanel('profile'); }}>@{post.username}</span>
                        </div>
                        <span className="post-badge vault" style={{ fontSize: '8px' }}>image</span>
                      </div>
                      
                      <div style={{ position: 'relative', height: '180px', background: '#000', borderRadius: '8px', overflow: 'hidden' }}>
                        <img 
                          src={`${BACKEND_BASE}/api/files/download/${post.mediaUrl}`} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          alt={post.mediaName}
                          loading="lazy"
                        />
                      </div>
                      
                      {post.content && <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '10px' }}>{post.content}</p>}
                    </div>
                    
                    <div className="post-actions" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '10px' }}>
                      <button className="action-btn" onClick={(e) => { e.stopPropagation(); handleLike(post.id); }}>
                        <Heart size={13} className={post.isLiked ? 'liked' : ''} /> <span>{post.likesCount}</span>
                      </button>
                      <button className="action-btn" onClick={(e) => { e.stopPropagation(); handleOpenComments(post.id); }}>
                        <MessageSquare size={13} /> <span>{post.commentsCount} Comments</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : null}

        {/* --- DEDICATED VIDEOS PANEL VIEW --- */}
        {currentPanel === 'videos' ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {filteredPosts.length === 0 ? (
                <div className="glass-card" style={{ padding: '40px', color: 'var(--text-secondary)', gridColumn: '1/-1' }}>No video releases found.</div>
              ) : (
                filteredPosts.map(post => (
                  <div 
                    key={post.id} 
                    className="post-card glass-card" 
                    style={{ padding: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'left', cursor: 'pointer' }}
                    onClick={() => { setActiveDetailsPost(post); handleOpenComments(post.id); }}
                  >
                    <div>
                      <div className="post-header" style={{ marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Avatar username={post.username} src={post.avatar} size={22} onClick={(e) => { e.stopPropagation(); setProfileUserId(post.userId); setCurrentPanel('profile'); }} />
                          <span style={{ fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setProfileUserId(post.userId); setCurrentPanel('profile'); }}>@{post.username}</span>
                          {post.collaboratorName && (
                            <span 
                              className="collaborator-badge"
                              onClick={(e) => { e.stopPropagation(); setProfileUserId(post.collaboratorId); setCurrentPanel('profile'); setProfileTab('feed'); }}
                              style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--accent-blue)', fontWeight: 500, cursor: 'pointer' }}
                            >
                              with @{post.collaboratorName}
                            </span>
                          )}
                        </div>
                        <span className="post-badge vault" style={{ fontSize: '8px' }}>video</span>
                      </div>
                      
                      <div style={{ position: 'relative', height: '180px', background: '#000', borderRadius: '8px', overflow: 'hidden' }}>
                        <video 
                          src={`${BACKEND_BASE}/api/files/download/${post.mediaUrl}`} 
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                          controls
                          preload="metadata"
                          onPlay={() => handleIncrementView(post.id)}
                        />
                      </div>
                      
                      {post.content && <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '10px' }}>{post.content}</p>}
                    </div>
                    
                    <div className="post-actions" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '10px' }}>
                      <button className="action-btn" onClick={(e) => { e.stopPropagation(); handleLike(post.id); }}>
                        <Heart size={13} className={post.isLiked ? 'liked' : ''} /> <span>{post.likesCount}</span>
                      </button>
                      <button className="action-btn" onClick={(e) => { e.stopPropagation(); handleOpenComments(post.id); }}>
                        <MessageSquare size={13} /> <span>{post.commentsCount} Comments</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            {/* Floating comments modal for videos panel — always visible, not squeezed inside card */}
            {activeCommentsPostId && filteredPosts.find(p => p.id === activeCommentsPostId) && (
              <div className="comments-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setActiveCommentsPostId(null); }}>
                <div className="comments-modal-card">
                  <div className="comments-modal-header">
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 'bold' }}>💬 Comments</h3>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {filteredPosts.find(p => p.id === activeCommentsPostId)?.content?.slice(0, 60) || 'Video'}
                      </p>
                    </div>
                    <button className="icon-btn" onClick={() => setActiveCommentsPostId(null)} style={{ fontSize: '20px', lineHeight: 1 }}>&times;</button>
                  </div>
                  <div className="comments-modal-body">
                    {renderCommentsDrawer(filteredPosts.find(p => p.id === activeCommentsPostId))}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : null}

        {/* --- SUPPORT / FEEDBACK VIEW --- */}
        {currentPanel === 'support' ? (
          <div className="glass-card" style={{ padding: '30px', maxWidth: '600px', margin: '20px auto 0 auto', textAlign: 'left' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: '800', marginBottom: '10px', color: '#fff' }}>
              🔧 Support & Feedback
            </h2>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '24px' }}>
              Submit an error report or request a new feature. Our administration team will review your ticket.
            </p>

            {supportSuccess ? (
              <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '20px', borderRadius: '12px', color: '#10b981', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <strong style={{ fontSize: '15px' }}>✓ Ticket Registered Successfully</strong>
                <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)' }}>Thank you for helping us improve Open Store. Your support ticket has been queued.</span>
                <button 
                  className="enter-btn" 
                  style={{ marginTop: '12px', padding: '10px 20px', fontSize: '12px', background: 'var(--text-primary)', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', alignSelf: 'flex-start' }}
                  onClick={() => { setSupportSuccess(false); setSupportDesc(''); }}
                >
                  Submit Another Ticket
                </button>
              </div>
            ) : (
              <form onSubmit={handleSupportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {supportError && <div style={{ color: '#ef4444', fontSize: '13px', background: 'rgba(239, 68, 68, 0.08)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>{supportError}</div>}
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-primary)', letterSpacing: '0.5px' }}>TICKET TYPE</label>
                  <select 
                    value={supportType} 
                    onChange={(e) => setSupportType(e.target.value)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '12px',
                      color: '#fff',
                      fontSize: '13.5px',
                      outline: 'none'
                    }}
                  >
                    <option value="error" style={{ background: '#0f172a' }}>⚠️ Report System Error / Bug</option>
                    <option value="feature" style={{ background: '#0f172a' }}>💡 Request New Feature</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-primary)', letterSpacing: '0.5px' }}>DESCRIPTION & REPRODUCTION STEPS</label>
                  <textarea 
                    value={supportDesc}
                    onChange={(e) => setSupportDesc(e.target.value)}
                    placeholder="Provide a detailed description of the error or feature request..."
                    required
                    rows={6}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '12px',
                      color: '#fff',
                      fontSize: '13.5px',
                      outline: 'none',
                      resize: 'vertical',
                      lineHeight: '1.6'
                    }}
                  />
                </div>

                <button 
                  type="submit" 
                  className="enter-btn" 
                  disabled={supportSubmitting}
                  style={{
                    padding: '14px 28px',
                    fontSize: '13px',
                    fontWeight: '600',
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    background: 'var(--text-primary)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    alignSelf: 'flex-start',
                    boxShadow: '0 4px 12px rgba(255, 255, 255, 0.1)',
                    transition: 'all 0.2s'
                  }}
                >
                  {supportSubmitting ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </form>
            )}
          </div>
        ) : null}

        {/* --- DEDICATED SAVED FEED VIEW --- */}
        {currentPanel === 'feed' && feedTab === 'saved' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800' }}>Saved Releases</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {filteredPosts.length === 0 ? (
                <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  No saved releases yet. Click "Save" on any post to keep it here!
                </div>
              ) : (
                filteredPosts.map(post => (
                  <div 
                    key={post.id} 
                    className="post-card glass-card"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setActiveDetailsPost(post)}
                  >
                    {/* Post Author Metadata */}
                    <div className="post-header">
                      <div className="post-author-info">
                        <Avatar 
                          username={post.username}
                          src={post.avatar} 
                          className="post-avatar" 
                          style={{ cursor: 'pointer' }}
                          onClick={(e) => { e.stopPropagation(); setProfileUserId(post.userId); setCurrentPanel('profile'); setProfileTab('feed'); }}
                        />
                        <div className="post-meta">
                          <span 
                            className="post-author-name" 
                            style={{ cursor: 'pointer' }}
                            onClick={(e) => { e.stopPropagation(); setProfileUserId(post.userId); setCurrentPanel('profile'); setProfileTab('feed'); }}
                          >
                            @{post.username}
                          </span>
                          {post.collaboratorName && (
                            <span 
                              className="collaborator-badge"
                              onClick={(e) => { e.stopPropagation(); setProfileUserId(post.collaboratorId); setCurrentPanel('profile'); setProfileTab('feed'); }}
                              style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--accent-blue)', fontWeight: 500, cursor: 'pointer' }}
                            >
                              with @{post.collaboratorName}
                            </span>
                          )}
                          <span className="post-time">{formatRelativeTime(post.createdAt)}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                        <span className="post-badge" style={{ background: 'rgba(255, 255, 255, 0.04)', fontSize: '10.5px' }}>{post.niche}</span>
                        <span className={`post-badge ${post.type}`}>{post.type === 'log' ? 'update' : post.type === 'vault' ? 'upload' : 'project'}</span>
                      </div>
                    </div>

                    {/* Text Release content */}
                    {post.content && <div className="post-content">{post.content}</div>}

                    {/* Vault uploaded media */}
                    {post.type === 'vault' && post.mediaUrl && (
                      <div className="encrypted-media-box" onClick={(e) => e.stopPropagation()}>
                        {post.mediaType && post.mediaType.startsWith('video/') ? (
                          <video 
                            className="media-video" 
                            src={`${BACKEND_BASE}/api/files/download/${post.mediaUrl}`} 
                            controls
                            preload="metadata"
                            onTimeUpdate={(e) => handleVideoTimeUpdate(e, post.id)}
                          />
                        ) : (
                          <img 
                            className="media-image" 
                            src={`${BACKEND_BASE}/api/files/download/${post.mediaUrl}`} 
                            alt={post.mediaName}
                            loading="lazy"
                          />
                        )}
                      </div>
                    )}

                    {/* Project/Website Live Frame Port */}
                    {post.type === 'source' && post.githubRepo && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <ProjectSourcePreview url={post.githubRepo} />
                      </div>
                    )}

                    {/* Post Actions: Like, Comment, Share, Save */}
                    <div className="post-actions" style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                      <button className={`action-btn like-btn ${post.isLiked ? 'liked' : ''}`} onClick={() => handleLike(post.id)}>
                        <Heart size={15} />
                        <span>{post.likesCount}</span>
                      </button>
                      <button className="action-btn comment-btn" onClick={() => handleOpenComments(post.id)}>
                        <MessageSquare size={15} />
                        <span>{post.commentsCount} Comments</span>
                      </button>
                      
                      <button className="action-btn share-btn" onClick={() => handleSharePopover(post.id)}>
                        <Share2 size={15} />
                        <span>Share</span>
                      </button>

                      <button 
                        className="action-btn save-btn saved" 
                        onClick={() => handleSavePost(post.id)}
                      >
                        <Bookmark size={15} style={{ fill: 'currentColor' }} />
                        <span>Saved</span>
                      </button>

                      {/* Direct Send & Copy Share popover */}
                      {activeSharePostId === post.id && (
                        <div className="search-results-dropdown glass-card" style={{ position: 'absolute', top: '100%', right: 0, width: 220, zIndex: 120 }}>
                          <div style={{ padding: '8px 10px', fontSize: '11px', borderBottom: '1px solid var(--border-color)', fontWeight: 'bold' }}>
                            Share options
                          </div>
                          <div className="search-result-item" onClick={() => copyShareLink(post.id)}>
                            <span>🔗</span>
                            <div className="result-info">
                              <span className="result-name">{copiedPostId === post.id ? 'Copied URL!' : 'Copy direct link'}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* YouTube Threaded comments drawer */}
                    {activeCommentsPostId === post.id && (
                      <div onClick={(e) => e.stopPropagation()}>
                        {renderCommentsDrawer(post)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}

        {/* --- CORE SOCIAL FEEDS (ALL) --- */}
        {currentPanel === 'feed' && feedTab === 'all' ? (
          <>
            {/* Instagram-style circular Stories container */}
            <div className="stories-container glass-card">
              <div className="story-circle" onClick={() => setShowStoryUpload(true)}>
                <div className="story-avatar-wrapper empty">
                  <span style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>+</span>
                </div>
                <span className="story-username">Your Story</span>
              </div>
              
              {groupedStories.map(group => (
                <div key={group.userId} className="story-circle" onClick={() => startStoryPlayback(group)}>
                  <div className="story-avatar-wrapper">
                    <Avatar username={group.username} src={group.avatar} className="story-avatar-img" size={48} />
                  </div>
                  <span className="story-username">@{group.username}</span>
                </div>
              ))}
            </div>

            {/* CREATOR BOX */}
            {renderCreatorBox()}

            {/* FEEDS LIST */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {filteredPosts.length === 0 ? (
                <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  No releases found in this workspace filter.
                </div>
              ) : (
                filteredPosts.map(post => (
                  <div 
                    key={post.id} 
                    className="post-card glass-card"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setActiveDetailsPost(post)}
                  >
                    {/* Post Author Metadata */}
                    <div className="post-header">
                      <div className="post-author-info">
                        <Avatar 
                          username={post.username}
                          src={post.avatar} 
                          className="post-avatar" 
                          style={{ cursor: 'pointer' }}
                          onClick={(e) => { e.stopPropagation(); setProfileUserId(post.userId); setCurrentPanel('profile'); setProfileTab('feed'); }}
                        />
                        <div className="post-meta">
                          <span 
                            className="post-author-name" 
                            style={{ cursor: 'pointer' }}
                            onClick={(e) => { e.stopPropagation(); setProfileUserId(post.userId); setCurrentPanel('profile'); setProfileTab('feed'); }}
                          >
                            @{post.username}
                          </span>
                          {post.collaboratorName && (
                            <span 
                              className="collaborator-badge"
                              onClick={(e) => { e.stopPropagation(); setProfileUserId(post.collaboratorId); setCurrentPanel('profile'); setProfileTab('feed'); }}
                              style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--accent-blue)', fontWeight: 500, cursor: 'pointer' }}
                            >
                              with @{post.collaboratorName}
                            </span>
                          )}
                           <span className="post-time">{formatRelativeTime(post.createdAt)}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                        <span className="post-badge" style={{ background: 'rgba(255,255,255,0.04)', fontSize: '10.5px' }}>{post.niche}</span>
                        <span className={`post-badge ${post.type}`}>{post.type === 'log' ? 'update' : post.type === 'vault' ? 'upload' : 'project'}</span>
                        
                        {post.userId !== user.id && (
                          <button 
                            className="comment-reply-trigger" 
                            onClick={(e) => { e.stopPropagation(); handleFollowToggle(post.userId); }}
                            style={{ fontSize: '10.5px' }}
                          >
                            {post.isFollowing ? 'Following' : '+ Follow'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Text Release content */}
                    {post.content && <div className="post-content">{post.content}</div>}

                    {/* Vault uploaded media (Decrypted via stream endpoint) */}
                    {post.type === 'vault' && post.mediaUrl && (
                      <div className="encrypted-media-box" onClick={(e) => e.stopPropagation()}>
                        {post.mediaType && post.mediaType.startsWith('video/') ? (
                          <video 
                            className="media-video" 
                            src={`${BACKEND_BASE}/api/files/download/${post.mediaUrl}`} 
                            controls
                            preload="metadata"
                            onTimeUpdate={(e) => handleVideoTimeUpdate(e, post.id)}
                          />
                        ) : (
                          <img 
                            className="media-image" 
                            src={`${BACKEND_BASE}/api/files/download/${post.mediaUrl}`} 
                            alt={post.mediaName}
                            loading="lazy"
                          />
                        )}
                      </div>
                    )}

                    {/* Project/Website Live Frame Port */}
                    {post.type === 'source' && post.githubRepo && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <ProjectSourcePreview url={post.githubRepo} />
                      </div>
                    )}

                    {/* Post Actions: Like, Comment, Share */}
                    <div className="post-actions" style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                      <button className={`action-btn like-btn ${post.isLiked ? 'liked' : ''}`} onClick={() => handleLike(post.id)}>
                        <Heart size={15} />
                        <span>{post.likesCount}</span>
                      </button>
                      <button className="action-btn comment-btn" onClick={() => handleOpenComments(post.id)}>
                        <MessageSquare size={15} />
                        <span>{post.commentsCount} Comments</span>
                      </button>
                      
                      <button className="action-btn share-btn" onClick={() => handleSharePopover(post.id)}>
                        <Share2 size={15} />
                        <span>Share</span>
                      </button>

                      <button 
                        className={`action-btn save-btn ${savedPostIds.includes(post.id) ? 'saved' : ''}`}
                        onClick={() => handleSavePost(post.id)}
                      >
                        <Bookmark size={15} style={{ fill: savedPostIds.includes(post.id) ? 'currentColor' : 'none' }} />
                        <span>{savedPostIds.includes(post.id) ? 'Saved' : 'Save'}</span>
                      </button>

                      {/* Direct Send & Copy Share popover */}
                      {activeSharePostId === post.id && (
                        <div className="search-results-dropdown glass-card" style={{ position: 'absolute', top: '100%', right: 0, width: 220, zIndex: 120 }}>
                          <div style={{ padding: '8px 10px', fontSize: '11px', borderBottom: '1px solid var(--border-color)', fontWeight: 'bold' }}>
                            Share options
                          </div>
                          <div className="search-result-item" onClick={() => copyShareLink(post.id)}>
                            <span>🔗</span>
                            <div className="result-info">
                              <span className="result-name">{copiedPostId === post.id ? 'Copied URL!' : 'Copy direct link'}</span>
                            </div>
                          </div>
                          
                          {contacts.length > 0 && (
                            <>
                              <div style={{ padding: '4px 10px', fontSize: '10px', color: 'var(--text-muted)' }}>Send directly to friends</div>
                              {contacts.map(friend => (
                                <div key={friend.id} className="search-result-item" onClick={() => shareToFriend(post.id, friend.id)}>
                                  <Avatar username={friend.username} src={friend.avatar} size={18} />
                                  <span style={{ fontSize: '11px' }}>Send to @{friend.username}</span>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* YouTube Threaded comments drawer */}
                    {activeCommentsPostId === post.id && renderCommentsDrawer(post)}
                  </div>
                ))
              )}
            </div>
          </>
        ) : null}

        {/* --- DEDICATED PROFILE TIMELINE & CONTROLS PANEL --- */}
        {currentPanel === 'profile' && (
          !profileUser ? (
            <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <div className="profile-loading-spinner"></div>
              Loading Workspace Profile...
            </div>
          ) : (
            <div className="profile-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px', textAlign: 'left' }}>
            {/* User Profile Header Banner */}
            <div className="glass-card" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
              {profileUser?.tag && (
                <div className="profile-tag-badge">
                  {profileUser.tag}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                <Avatar 
                  username={profileUser?.username || 'user'} 
                  src={profileUser?.avatar} 
                  size={80} 
                  style={{ border: '3px solid var(--border-color)', objectFit: 'cover' }} 
                />
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {profileUser?.name ? profileUser.name : `@${profileUser?.username || 'user'}`}
                    {profileUser?.id === user.id && <span style={{ fontSize: '10.5px', background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: '20px', color: 'var(--text-secondary)' }}>You</span>}
                    {profileUser?.id === user.id && (
                      <button 
                        type="button" 
                        className="profile-edit-pencil-btn" 
                        onClick={openSettingsDialog}
                        title="Edit Space Profile"
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
                      >
                        <Pencil size={14} style={{ color: 'var(--text-secondary)' }} />
                      </button>
                    )}
                  </h2>
                  {profileUser?.name && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '13.5px', marginTop: '2px', fontWeight: 500 }}>
                      @{profileUser.username}
                    </div>
                  )}
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>Development Niche: <span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{profileUser?.niche || 'Web Development'}</span></p>
                  
                  {/* Follow counts */}
                  <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                    <span 
                      style={{ cursor: 'pointer', transition: 'color 0.2s' }} 
                      onClick={() => setProfileTab('followers')}
                    >
                      <strong>{profileStats.followersCount}</strong> followers
                    </span>
                    <span 
                      style={{ cursor: 'pointer', transition: 'color 0.2s' }} 
                      onClick={() => setProfileTab('following')}
                    >
                      <strong>{profileStats.followingCount}</strong> following
                    </span>
                    <span 
                      style={{ cursor: 'pointer', transition: 'color 0.2s' }} 
                      onClick={() => setProfileTab('feed')}
                    >
                      <strong>{profileStats.postsCount}</strong> releases
                    </span>
                  </div>
                  {profileUser?.description && (
                    <p className="profile-description" style={{ marginTop: '10px' }}>
                      {profileUser.description}
                    </p>
                  )}
                  {profileUser?.socialUrl && (
                    <div style={{ marginTop: '8px' }}>
                      <a 
                        href={profileUser.socialUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '4px', 
                          fontSize: '12px', 
                          color: 'var(--accent-blue)', 
                          textDecoration: 'none' 
                        }}
                      >
                        <ExternalLink size={12} /> {profileUser.socialUrl}
                      </a>
                    </div>
                  )}
                </div>

                {/* Follow/Unfollow button if viewing another user's profile */}
                {profileUser && profileUser.id !== user.id && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      type="button" 
                      className="publish-btn"
                      onClick={() => {
                        if (!contacts.some(c => c.id === profileUser.id)) {
                          setContacts(prev => [...prev, profileUser]);
                        }
                        setSelectedContact(profileUser);
                        setCurrentPanel('chat');
                      }}
                      style={{ padding: '8px 20px', borderRadius: '20px', fontSize: '13px', width: 'auto', background: 'var(--accent-blue)', color: 'white' }}
                    >
                      Message
                    </button>
                    <button 
                      type="button" 
                      className={`publish-btn ${contacts.some(c => c.id === profileUser.id && c.status === 'accepted') ? 'unfollow' : contacts.some(c => c.id === profileUser.id && c.status === 'pending') ? 'pending' : ''}`}
                      onClick={handleProfileFollowToggle}
                      style={{ padding: '8px 20px', borderRadius: '20px', fontSize: '13px', width: 'auto' }}
                    >
                      {contacts.some(c => c.id === profileUser.id && c.status === 'accepted') ? 'Following' : contacts.some(c => c.id === profileUser.id && c.status === 'pending') ? 'Pending' : '+ Follow'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Tab Navigation — scrollable on small screens */}
            <div className="profile-tabs-wrapper">
              {[
                { id: 'feed', label: 'Feed' },
                { id: 'projects', label: 'Projects' },
                { id: 'analytics', label: 'Analytics' },
                { id: 'followers', label: `Followers (${profileFollowers.length})` },
                { id: 'following', label: `Following (${profileFollowing.length})` },
                ...(profileUser?.id === user.id ? [
                  { id: 'vault', label: 'Vault' },
                  { id: 'comments', label: 'Comments' },
                  { id: 'settings', label: 'Settings' },
                ] : [])
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setProfileTab(tab.id)}
                  style={{
                    padding: '10px 16px',
                    background: 'none',
                    border: 'none',
                    borderBottom: profileTab === tab.id ? '2px solid var(--accent-blue)' : '2px solid transparent',
                    color: profileTab === tab.id ? 'var(--accent-blue)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '13px',
                    whiteSpace: 'nowrap',
                    transition: 'border-color 0.2s, color 0.2s'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>


            {/* TAB CONTENTS */}
            <div className="profile-tab-content" style={{ marginTop: '10px' }}>
              
              {/* 1. Feed Tab */}
              {profileTab === 'feed' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {profilePosts.length === 0 ? (
                    <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No updates or releases posted yet.
                    </div>
                  ) : (
                    profilePosts.map(post => (
                      <div key={post.id} className="post-card glass-card">
                        {/* Post Header */}
                        <div className="post-header">
                          <div className="post-author-info">
                            <Avatar username={post.username} src={post.avatar} className="post-avatar" />
                            <div className="post-meta">
                              <span className="post-author-name">@{post.username}</span>
                              {post.collaboratorName && (
                                <span 
                                  className="collaborator-badge"
                                  onClick={(e) => { e.stopPropagation(); setProfileUserId(post.collaboratorId); setCurrentPanel('profile'); setProfileTab('feed'); }}
                                  style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--accent-blue)', fontWeight: 500, cursor: 'pointer' }}
                                >
                                  with @{post.collaboratorName}
                                </span>
                              )}
                              <span className="post-time">{formatRelativeTime(post.createdAt)}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="post-badge" style={{ background: 'rgba(255,255,255,0.04)', fontSize: '10.5px' }}>{post.niche}</span>
                            <span className={`post-badge ${post.type}`}>{post.type === 'log' ? 'update' : post.type === 'vault' ? 'upload' : 'project'}</span>
                          </div>
                        </div>

                        {post.content && <div className="post-content">{post.content}</div>}

                        {post.type === 'vault' && post.mediaUrl && (
                          <div className="encrypted-media-box">
                            {post.mediaType && post.mediaType.startsWith('video/') ? (
                              <video 
                                className="media-video" 
                                src={`${BACKEND_BASE}/api/files/download/${post.mediaUrl}`} 
                                controls
                                preload="metadata"
                                onTimeUpdate={(e) => handleVideoTimeUpdate(e, post.id)}
                              />
                            ) : (
                              <img 
                                className="media-image" 
                                src={`${BACKEND_BASE}/api/files/download/${post.mediaUrl}`} 
                                alt={post.mediaName}
                                loading="lazy"
                              />
                            )}
                          </div>
                        )}

                        {post.type === 'source' && post.githubRepo && (
                          <ProjectSourcePreview url={post.githubRepo} />
                        )}

                        <div className="post-actions" style={{ position: 'relative' }}>
                          <button className={`action-btn like-btn ${post.isLiked ? 'liked' : ''}`} onClick={() => handleLike(post.id)}>
                            <Heart size={15} />
                            <span>{post.likesCount}</span>
                          </button>
                          <button className="action-btn comment-btn" onClick={() => handleOpenComments(post.id)}>
                            <MessageSquare size={15} />
                            <span>{post.commentsCount} Comments</span>
                          </button>
                        </div>
                        {activeCommentsPostId === post.id && renderCommentsDrawer(post)}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* 2. Projects Tab */}
              {profileTab === 'projects' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {profileUser?.id === user.id && (
                    <div className="creator-box glass-card">
                      <div className="creator-header">
                        <Avatar username={user.username} src={user.avatar} className="creator-avatar" />
                        <textarea 
                          className="creator-textarea" 
                          placeholder="Explain the features of your web app or repository project..." 
                          value={postText}
                          onChange={(e) => setPostText(e.target.value)}
                        />
                      </div>
                      <div className="attachment-container">
                        <input 
                          type="text" 
                          placeholder="Paste URL link (e.g. facebook/react OR https://my-portfolio-site.com)" 
                          value={githubRepo}
                          onChange={(e) => setGithubRepo(e.target.value)}
                          required
                          style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white' }}
                        />
                      </div>
                      <div className="creator-footer">
                        <div style={{ flex: 1 }} />
                        <button 
                          type="button" 
                          className="publish-btn" 
                          onClick={(e) => { setCreatorType('source'); handleRelease(e); }}
                          disabled={uploading || !githubRepo}
                        >
                          {uploading ? 'Releasing...' : 'Release Project'}
                        </button>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                    {profilePosts.filter(p => p.type === 'source').length === 0 ? (
                      <div className="glass-card" style={{ padding: '40px', color: 'var(--text-secondary)', gridColumn: '1/-1', textAlign: 'center' }}>No shared projects found.</div>
                    ) : (
                      profilePosts.filter(p => p.type === 'source').map(post => (
                        <div key={post.id} className="post-card glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div>
                            <div className="post-header" style={{ marginBottom: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Avatar username={post.username} src={post.avatar} size={28} />
                                <span style={{ fontSize: '13px', fontWeight: 'bold' }}>@{post.username}</span>
                                {post.collaboratorName && (
                                  <span 
                                    className="collaborator-badge"
                                    onClick={(e) => { e.stopPropagation(); setProfileUserId(post.collaboratorId); setCurrentPanel('profile'); setProfileTab('feed'); }}
                                    style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--accent-blue)', fontWeight: 500, cursor: 'pointer' }}
                                  >
                                    with @{post.collaboratorName}
                                  </span>
                                )}
                              </div>
                              <span className="post-badge source">project</span>
                            </div>
                            
                            {post.content && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>{post.content}</p>}
                            
                            <ProjectSourcePreview url={post.githubRepo} />
                          </div>
                          
                          <div style={{ marginTop: '16px' }}>
                            <div className="post-actions" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                              <button className="action-btn" onClick={() => handleLike(post.id)}>
                                <Heart size={14} className={post.isLiked ? 'text-danger' : ''} /> <span>{post.likesCount}</span>
                              </button>
                              <button className="action-btn" onClick={() => handleOpenComments(post.id)}>
                                <MessageSquare size={14} /> <span>{post.commentsCount} Comments</span>
                              </button>
                            </div>
                          </div>
                          {activeCommentsPostId === post.id && renderCommentsDrawer(post)}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* 3. Analytics Tab */}
              {profileTab === 'analytics' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Views</div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', marginTop: '10px', color: 'var(--accent-blue)' }}>{profileStats.viewsCount}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>across all post releases</div>
                  </div>
                  <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Releases Liked</div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', marginTop: '10px', color: '#ff4b72' }}>{profileStats.likesCount}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>total positive feedback</div>
                  </div>
                  <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Videos Posted</div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', marginTop: '10px', color: '#00ffd2' }}>{profileStats.videosCount}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>vault video/shorts count</div>
                  </div>
                  <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Releases</div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', marginTop: '10px', color: 'white' }}>{profileStats.postsCount}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>updates, projects, and vaults</div>
                  </div>
                </div>
              )}

              {/* Followers Tab */}
              {profileTab === 'followers' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 'bold' }}>Followers ({profileFollowers.length})</h3>
                  {profileFollowers.length === 0 ? (
                    <div className="glass-card" style={{ padding: '40px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                      No followers yet.
                    </div>
                  ) : (
                    <div className="members-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                      {profileFollowers.map(u => (
                        <div key={u.id} className="member-card glass-card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <Avatar 
                            username={u.username} 
                            src={u.avatar} 
                            className="member-card-avatar" 
                            size={48} 
                            onClick={() => { setProfileUserId(u.id); setProfileTab('feed'); }} 
                          />
                          <span 
                            className="member-card-username" 
                            style={{ fontWeight: 'bold', fontSize: '13px', marginTop: '8px', cursor: 'pointer' }}
                            onClick={() => { setProfileUserId(u.id); setProfileTab('feed'); }}
                          >
                            @{u.username}
                          </span>
                          <span className="member-card-niche" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{u.niche}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Following Tab */}
              {profileTab === 'following' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 'bold' }}>Following ({profileFollowing.length})</h3>
                  {profileFollowing.length === 0 ? (
                    <div className="glass-card" style={{ padding: '40px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                      Not following anyone yet.
                    </div>
                  ) : (
                    <div className="members-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                      {profileFollowing.map(u => (
                        <div key={u.id} className="member-card glass-card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <Avatar 
                            username={u.username} 
                            src={u.avatar} 
                            className="member-card-avatar" 
                            size={48} 
                            onClick={() => { setProfileUserId(u.id); setProfileTab('feed'); }} 
                          />
                          <span 
                            className="member-card-username" 
                            style={{ fontWeight: 'bold', fontSize: '13px', marginTop: '8px', cursor: 'pointer' }}
                            onClick={() => { setProfileUserId(u.id); setProfileTab('feed'); }}
                          >
                            @{u.username}
                          </span>
                          <span className="member-card-niche" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{u.niche}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 4. Vault (Uploads) Tab */}
              {profileTab === 'vault' && profileUser?.id === user.id && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="creator-box glass-card">
                    <div className="creator-header">
                      <Avatar username={user.username} src={user.avatar} className="creator-avatar" />
                      <textarea 
                        className="creator-textarea" 
                        placeholder="Provide details about the file, code, or video upload..." 
                        value={postText}
                        onChange={(e) => setPostText(e.target.value)}
                      />
                    </div>
                    <div className="attachment-container">
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        accept="image/*,video/*"
                        style={{ display: 'none' }}
                      />
                      {!selectedFile ? (
                        <div className="file-upload-zone" onClick={triggerFileSelect}>
                          <Plus size={20} className="text-secondary" style={{ marginBottom: '4px' }} />
                          <div style={{ fontSize: '13px', fontWeight: '500' }}>Select Secure Document / File</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Bit-scrambled with chaotic maps prior to upload</div>
                        </div>
                      ) : (
                        <div className="file-preview">
                          <span className="preview-icon">{selectedFile.type.startsWith('video/') ? '🎥' : '🖼️'}</span>
                          <div className="preview-details">
                            <span className="preview-name">{selectedFile.name}</span>
                            <span className="preview-size">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                          </div>
                          <button type="button" className="remove-file-btn" onClick={() => setSelectedFile(null)}>&times;</button>
                        </div>
                      )}
                    </div>
                    <div className="creator-footer">
                      <div className="crypto-badge"><Shield size={11} /> <span>DCBS Encrypted Upload</span></div>
                      <div style={{ flex: 1 }} />
                      <button 
                        type="button" 
                        className="publish-btn" 
                        onClick={(e) => { setCreatorType('vault'); handleRelease(e); }}
                        disabled={uploading || !selectedFile}
                      >
                        {uploading ? 'Encrypting...' : 'Lock File in Vault'}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {profilePosts.filter(p => p.type === 'vault').length === 0 ? (
                      <div className="glass-card" style={{ padding: '40px', color: 'var(--text-secondary)', gridColumn: '1/-1', textAlign: 'center' }}>No secure uploads vault files found.</div>
                    ) : (
                      profilePosts.filter(p => p.type === 'vault').map(post => (
                        <div key={post.id} className="post-card glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div>
                            <div className="post-header" style={{ marginBottom: '10px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Avatar username={post.username} src={post.avatar} size={24} />
                                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>@{post.username}</span>
                                {post.collaboratorName && (
                                  <span 
                                    className="collaborator-badge"
                                    onClick={(e) => { e.stopPropagation(); setProfileUserId(post.collaboratorId); setCurrentPanel('profile'); setProfileTab('feed'); }}
                                    style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--accent-blue)', fontWeight: 500, cursor: 'pointer' }}
                                  >
                                    with @{post.collaboratorName}
                                  </span>
                                )}
                              </div>
                              <span className="post-badge vault" style={{ fontSize: '9px' }}>upload</span>
                            </div>
                            
                            {post.content && <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '10px' }}>{post.content}</p>}
                            
                            <div className="encrypted-media-box" style={{ margin: '8px 0' }}>
                              {post.mediaType && post.mediaType.startsWith('video/') ? (
                                <video src={`${BACKEND_BASE}/api/files/download/${post.mediaUrl}`} style={{ width: '100%', maxHeight: '150px', objectFit: 'contain' }} controls onTimeUpdate={(e) => handleVideoTimeUpdate(e, post.id)} />
                              ) : (
                                <img src={`${BACKEND_BASE}/api/files/download/${post.mediaUrl}`} style={{ width: '100%', maxHeight: '150px', objectFit: 'contain', cursor: 'pointer' }} alt="" onClick={() => setLightboxImage(`${BACKEND_BASE}/api/files/download/${post.mediaUrl}`)} />
                              )}
                            </div>
                            
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '8px 0', display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <div>Filename: {post.mediaName}</div>
                              <div>Size: {(post.mediaType) || 'file'}</div>
                            </div>
                            
                            <a 
                              href={`${BACKEND_BASE}/api/files/download/${post.mediaUrl}`} 
                              download={post.mediaName}
                              className="publish-btn" 
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', textDecoration: 'none', fontSize: '11px', padding: '6px 0' }}
                            >
                              <Shield size={11} /> Unlock & Download
                            </a>
                          </div>

                          <div>
                            <div className="post-actions" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '8px' }}>
                              <button className="action-btn" onClick={() => handleLike(post.id)}>
                                <Heart size={13} className={post.isLiked ? 'text-danger' : ''} /> <span>{post.likesCount}</span>
                              </button>
                              <button className="action-btn" onClick={() => handleOpenComments(post.id)}>
                                <MessageSquare size={13} /> <span>{post.commentsCount} Comments</span>
                              </button>
                            </div>
                          </div>
                          {activeCommentsPostId === post.id && renderCommentsDrawer(post)}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* 4b. Comments Moderation Tab */}
              {profileTab === 'comments' && profileUser?.id === user.id && (
                <div className="glass-card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>Comments Moderation Dashboard</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {channelComments.length === 0 ? (
                      <div style={{ padding: '20px', color: 'var(--text-muted)', textAlign: 'center' }}>No comments on your releases yet.</div>
                    ) : (
                      channelComments.map(comment => (
                        <div key={comment.id} className="comment-item glass-card" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                            <Avatar username={comment.username} src={comment.avatar} size={28} />
                            <div>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <span style={{ fontWeight: 600, fontSize: '13px' }}>@{comment.username}</span>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{parseUTCDate(comment.createdAt).toLocaleString()}</span>
                              </div>
                              <p style={{ fontSize: '13px', margin: '4px 0', color: 'var(--text-primary)' }}>{comment.content}</p>
                              {comment.postContent && (
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', borderLeft: '2px solid var(--border-color)', paddingLeft: '8px', marginTop: '4px' }}>
                                  On: {comment.postContent.length > 60 ? `${comment.postContent.slice(0, 60)}...` : comment.postContent}
                                </div>
                              )}
                            </div>
                          </div>
                          <button 
                            type="button" 
                            className="icon-btn delete-comment-btn" 
                            onClick={() => handleDeleteChannelComment(comment.id)}
                            style={{ color: 'var(--accent-danger)', background: 'rgba(239, 68, 68, 0.1)', padding: '6px', borderRadius: '50%', cursor: 'pointer' }}
                            title="Delete comment"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* 5. Settings Tab */}
              {profileTab === 'settings' && profileUser?.id === user.id && (
                <div className="glass-card" style={{ padding: '24px', maxWidth: '500px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>Inline Settings</h3>

                  <form onSubmit={handleUpdateSettings} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="form-group">
                      <label>Default Playback Quality</label>
                      <div className="form-input-wrapper" style={{ paddingLeft: '8px' }}>
                        <select 
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '100%', cursor: 'pointer' }}
                          value={settingsPlaybackQuality}
                          onChange={(e) => setSettingsPlaybackQuality(e.target.value)}
                        >
                          <option value="Auto" style={{ background: '#12101a', color: 'white' }}>Auto</option>
                          <option value="1080p" style={{ background: '#12101a', color: 'white' }}>1080p</option>
                          <option value="720p" style={{ background: '#12101a', color: 'white' }}>720p</option>
                          <option value="480p" style={{ background: '#12101a', color: 'white' }}>480p</option>
                          <option value="360p" style={{ background: '#12101a', color: 'white' }}>360p</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Media Upload Compression</label>
                      <div className="form-input-wrapper" style={{ paddingLeft: '8px' }}>
                        <select 
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '100%', cursor: 'pointer' }}
                          value={settingsMediaCompression}
                          onChange={(e) => setSettingsMediaCompression(e.target.value)}
                        >
                          <option value="High Quality" style={{ background: '#12101a', color: 'white' }}>High Quality (No Compression)</option>
                          <option value="Balanced" style={{ background: '#12101a', color: 'white' }}>Balanced</option>
                          <option value="Low Data" style={{ background: '#12101a', color: 'white' }}>Low Data / High Compression</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                      <input 
                        type="checkbox" 
                        id="autoplay-captions-checkbox"
                        checked={settingsAutoplayCaptions}
                        onChange={(e) => setSettingsAutoplayCaptions(e.target.checked)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                      <label htmlFor="autoplay-captions-checkbox" style={{ margin: 0, cursor: 'pointer' }}>Autoplay & Captions Enabled</label>
                    </div>

                    <button type="submit" className="auth-btn" style={{ marginTop: '10px' }}>
                      Save Preferences
                    </button>
                  </form>

                  {/* Two-Factor Authentication Section */}
                  <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🛡️</span> Two-Factor Authentication (2FA)
                    </h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: '1.4' }}>
                      Add an extra layer of identity verification to your account using TOTP. Secure, cost-free, and works with Google Authenticator, Microsoft Authenticator, and other clients.
                    </p>

                    {user?.totp_enabled ? (
                      <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                            2FA Status: Enabled
                          </span>
                        </div>
                        <form onSubmit={handleDisable2FA} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>Enter 2FA Code to Disable label</label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <div className="form-input-wrapper" style={{ margin: 0, flex: 1 }}>
                              <input 
                                type="text" 
                                placeholder="e.g. 123456" 
                                value={totpDisableToken} 
                                onChange={(e) => setTotpDisableToken(e.target.value)}
                                maxLength={6}
                                pattern="[0-9]{6}"
                                required 
                              />
                            </div>
                            <button type="submit" className="suggestion-btn" style={{ borderColor: 'var(--accent-danger)', color: 'var(--accent-danger)', margin: 0 }}>
                              Disable 2FA
                            </button>
                          </div>
                        </form>
                      </div>
                    ) : (
                      <div>
                        {!showTotpSetup ? (
                          <button 
                            type="button" 
                            onClick={handleStart2FASetup} 
                            style={{
                              padding: '8px 16px',
                              background: 'transparent',
                              color: 'var(--text-primary)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '600',
                              transition: 'all 0.2s'
                            }}
                          >
                            Setup 2FA Authenticator
                          </button>
                        ) : (
                          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                              {totpSetupQrUrl && (
                                <div style={{ background: 'white', padding: '8px', borderRadius: '6px' }}>
                                  <img src={totpSetupQrUrl} alt="2FA Scan QR" style={{ width: '130px', height: '130px', display: 'block' }} />
                                </div>
                              )}
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Scan the QR code above or manually enter this secret key:</div>
                                <code style={{ fontSize: '14px', background: 'rgba(255,255,255,0.08)', padding: '4px 10px', borderRadius: '4px', color: 'var(--accent-primary, #6366f1)', letterSpacing: '1px', fontWeight: 'bold' }}>{totpSetupSecret}</code>
                              </div>
                            </div>

                            <form onSubmit={handleConfirmEnable2FA} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <label style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--text-secondary)' }}>Enter 6-Digit Authenticator Token</label>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <div className="form-input-wrapper" style={{ margin: 0, flex: 1 }}>
                                  <input 
                                    type="text" 
                                    placeholder="e.g. 123456" 
                                    value={totpSetupToken} 
                                    onChange={(e) => setTotpSetupToken(e.target.value)}
                                    maxLength={6}
                                    pattern="[0-9]{6}"
                                    required 
                                  />
                                </div>
                                <button type="submit" className="suggestion-btn" style={{ borderColor: 'var(--accent-primary, #6366f1)', color: 'var(--accent-primary, #6366f1)', margin: 0 }}>
                                  Confirm and Activate
                                </button>
                              </div>
                            </form>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
          )
        )}
      </main>

      {/* Right details panel for the active post */}
      {activeDetailsPost && (currentPanel === 'feed' || currentPanel === 'profile') ? (
        <aside className="right-details-panel">
          {/* Media Player/Preview */}
          {activeDetailsPost.mediaUrl && (
            <div className="details-media-container" style={{ width: '100%' }}>
              {activeDetailsPost.mediaType && activeDetailsPost.mediaType.startsWith('video/') ? (
                <video 
                  key={activeDetailsPost.id}
                  className="details-video-player"
                  src={`${BACKEND_BASE}/api/files/download/${activeDetailsPost.mediaUrl}`} 
                  controls
                  autoPlay={false}
                  preload="metadata"
                  onTimeUpdate={(e) => handleVideoTimeUpdate(e, activeDetailsPost.id)}
                />
              ) : (
                <img 
                  className="details-image-preview" 
                  src={`${BACKEND_BASE}/api/files/download/${activeDetailsPost.mediaUrl}`} 
                  alt={activeDetailsPost.mediaName || 'Post media'} 
                  style={{ width: '100%', borderRadius: 'var(--radius-sm)', objectFit: 'cover', maxHeight: '200px', cursor: 'pointer' }}
                  onClick={() => setLightboxImage(`${BACKEND_BASE}/api/files/download/${activeDetailsPost.mediaUrl}`)}
                />
              )}
            </div>
          )}

          {/* Details header: Title/Content and views */}
          <div className="details-header-section" style={{ textAlign: 'left' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', margin: '4px 0', color: 'var(--text-primary)' }}>
              {activeDetailsPost.content ? (activeDetailsPost.content.length > 60 ? activeDetailsPost.content.substring(0, 60) + '...' : activeDetailsPost.content) : 'Release Details'}
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              <span>Uploaded {formatRelativeTime(activeDetailsPost.createdAt)}</span>
              <span>{activeDetailsPost.views || 0} views</span>
            </div>
          </div>

          {/* Comments section */}
          <div className="details-comments-section" style={{ textAlign: 'left', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
            <h4 style={{ fontSize: '12px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>Comments</h4>
            <div className="details-comments-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
              {comments.length === 0 ? (
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>No comments yet.</div>
              ) : (
                comments.map(c => (
                  <div key={c.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', background: 'var(--bg-surface-hover)', padding: '6px 10px', borderRadius: '8px' }}>
                    <Avatar username={c.username} src={c.avatar} size={20} />
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{ fontSize: '10px', fontWeight: 'bold' }}>@{c.username}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', wordBreak: 'break-word' }}>{c.content}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Similar Posts section */}
          <div className="details-similar-section" style={{ textAlign: 'left', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
            <h4 style={{ fontSize: '12px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>Similar</h4>
            <div className="details-similar-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {posts
                .filter(p => p.id !== activeDetailsPost.id && (p.type === activeDetailsPost.type || p.niche === activeDetailsPost.niche))
                .slice(0, 3)
                .map(similarPost => (
                  <div 
                    key={similarPost.id} 
                    className="details-similar-card"
                    onClick={() => setActiveDetailsPost(similarPost)}
                    style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '6px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-hover)', cursor: 'pointer' }}
                  >
                    {similarPost.mediaUrl ? (
                      <img 
                        src={`${BACKEND_BASE}/api/files/download/${similarPost.mediaUrl}`} 
                        alt="thumbnail" 
                        className="details-similar-thumb"
                        style={{ width: '50px', height: '35px', borderRadius: '4px', objectFit: 'cover' }}
                      />
                    ) : (
                      <div className="details-similar-thumb" style={{ width: '50px', height: '35px', borderRadius: '4px', background: 'var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>
                        📄
                      </div>
                    )}
                    <div className="details-similar-info" style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
                      <span className="details-similar-title" style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {similarPost.content || 'Release code'}
                      </span>
                      <span className="details-similar-views" style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                        {similarPost.views || 0} views • @{similarPost.username}
                      </span>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>

          {/* View Details Button */}
          <button 
            type="button" 
            className="auth-btn" 
            style={{ marginTop: 'auto', padding: '8px', fontSize: '12px' }}
            onClick={() => { setProfileUserId(activeDetailsPost.userId); setCurrentPanel('profile'); setProfileTab('feed'); }}
          >
            View Details
          </button>
        </aside>
      ) : null}

      {/* --- STORIES UPLOAD DIALOG OVERLAY --- */}
      {showStoryUpload && (
        <div className="auth-overlay" style={{ zIndex: 1100 }}>
          <div className="auth-card glass-card" style={{ maxWidth: '380px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3>Release a Highlight story</h3>
              <button className="icon-btn" onClick={() => setShowStoryUpload(false)}>&times;</button>
            </div>
            <form onSubmit={handleUploadStory}>
              <div className="form-group">
                <label>Story text caption</label>
                <textarea 
                  className="creator-textarea" 
                  placeholder="What is going on with the code status today?" 
                  style={{ minHeight: '60px', width: '100%' }}
                  value={storyText}
                  onChange={(e) => setStoryText(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginTop: '10px' }}>
                <label>Story Media (Image or Video, Optional)</label>
                <input 
                  type="file" 
                  ref={storyFileInputRef} 
                  accept="image/*,video/*" 
                  style={{ display: 'none' }} 
                  onChange={handleStoryFileChange}
                />
                {!storyFile ? (
                  <button type="button" className="action-btn" style={{ width: '100%', padding: '10px', border: '1px dashed var(--border-color)' }} onClick={() => storyFileInputRef.current?.click()}>
                    Upload snapshot image or video
                  </button>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span>Attached: {storyFile.name}</span>
                    <button type="button" className="text-danger" onClick={() => setStoryFile(null)}>Remove</button>
                  </div>
                )}
              </div>
              
              {uploadProgress !== null && (
                <div className="upload-progress-container" style={{ padding: '10px 0', marginTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    <span>Uploading story...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="progress-bar-bg" style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div className="progress-bar-fill" style={{ width: `${uploadProgress}%`, height: '100%', background: 'linear-gradient(90deg, #4f46e5, #0ea5e9)', borderRadius: '2px', transition: 'width 0.2s ease-out' }} />
                  </div>
                </div>
              )}
              
              <button type="submit" className="auth-btn" style={{ marginTop: '16px' }} disabled={uploadingStory}>
                {uploadingStory ? 'Publishing...' : 'Share story'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- STORIES FULL-SCREEN LOOP VIEWER OVERLAY --- */}
      {activeStoryGroup && (
        <div className="story-viewer-overlay">
          <div className="story-viewer-card">
            {/* Story timeline progress indicators */}
            <div className="story-progress-bar">
              {activeStoryGroup.stories.map((st, i) => (
                <div key={st.id} className="story-progress-segment">
                  <div 
                    className="story-progress-fill" 
                    style={{ 
                      width: i < activeStoryIndex ? '100%' : i === activeStoryIndex ? `${storyProgress}%` : '0%' 
                    }} 
                  />
                </div>
              ))}
            </div>

            <div className="story-viewer-header">
              <div 
                style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                onClick={() => {
                  setProfileUserId(activeStoryGroup.userId);
                  setCurrentPanel('profile');
                  setProfileTab('feed');
                  setActiveStoryGroup(null);
                  setStoryProgress(0);
                }}
              >
                <Avatar username={activeStoryGroup.username} src={activeStoryGroup.avatar} size={32} />
                <span style={{ fontWeight: 'bold' }}>@{activeStoryGroup.username}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {activeStoryGroup.userId !== user?.id && (
                  <button 
                    type="button"
                    className="icon-btn" 
                    title="Message Developer"
                    style={{ color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMessageUser({ id: activeStoryGroup.userId, username: activeStoryGroup.username, avatar: activeStoryGroup.avatar });
                    }}
                  >
                    <MessageSquare size={16} />
                  </button>
                )}
                <button 
                  className="icon-btn" 
                  style={{ color: 'white', fontSize: '20px' }} 
                  onClick={() => { setActiveStoryGroup(null); setStoryProgress(0); }}
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Story contents */}
            <div className="story-viewer-content" style={{ position: 'relative' }}>
              {/* Left Overlay Nav */}
              <div 
                onClick={() => {
                  if (activeStoryIndex > 0) {
                    setActiveStoryIndex(prev => prev - 1);
                    setStoryProgress(0);
                  }
                }}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: '30%',
                  cursor: 'pointer',
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: '12px',
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  userSelect: 'none'
                }}
                className="story-nav-zone-left"
                onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = 0; }}
              >
                <div style={{ background: 'rgba(0,0,0,0.6)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.1)' }}>◀</div>
              </div>

              {/* Right Overlay Nav */}
              <div 
                onClick={() => {
                  if (activeStoryIndex < activeStoryGroup.stories.length - 1) {
                    setActiveStoryIndex(prev => prev + 1);
                    setStoryProgress(0);
                  } else {
                    setActiveStoryGroup(null);
                    setActiveStoryIndex(0);
                    setStoryProgress(0);
                  }
                }}
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: '30%',
                  cursor: 'pointer',
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: '12px',
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  userSelect: 'none'
                }}
                className="story-nav-zone-right"
                onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = 0; }}
              >
                <div style={{ background: 'rgba(0,0,0,0.6)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.1)' }}>▶</div>
              </div>

              {(() => {
                const story = activeStoryGroup.stories[activeStoryIndex];
                if (!story) return null;
                const isVideo = story.type === 'video' || 
                                (story.mediaUrl && (story.mediaUrl.toLowerCase().includes('.mp4') || story.mediaUrl.toLowerCase().includes('.webm')));
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', width: '100%', height: '100%', justifyContent: 'center' }}>
                    {story.mediaUrl && (
                      isVideo ? (
                        <video 
                          src={`${BACKEND_BASE}/api/files/download/${story.mediaUrl}`} 
                          className="story-video" 
                          controls
                          autoPlay
                          playsInline
                          style={{ maxWidth: '100%', maxHeight: '420px', objectFit: 'contain', borderRadius: '8px' }}
                        />
                      ) : (
                        <img 
                          src={`${BACKEND_BASE}/api/files/download/${story.mediaUrl}`} 
                          className="story-image" 
                          alt="Story media" 
                          style={{ maxWidth: '100%', maxHeight: '420px', objectFit: 'contain', borderRadius: '8px' }}
                        />
                      )
                    )}
                    {story.content && (
                      <p style={{ textShadow: '0 2px 8px black', padding: '0 10px', margin: 0, fontSize: '14px', textAlign: 'center', color: 'white', fontWeight: '500' }}>{story.content}</p>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Modal navigation click buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
              <button 
                className="comment-reply-trigger" 
                style={{ color: 'white' }}
                onClick={() => {
                  if (activeStoryIndex > 0) {
                    setActiveStoryIndex(prev => prev - 1);
                    setStoryProgress(0);
                  }
                }}
                disabled={activeStoryIndex === 0}
              >
                ◀ Previous
              </button>
              <button 
                className="comment-reply-trigger" 
                style={{ color: 'white' }}
                onClick={() => {
                  if (activeStoryIndex < activeStoryGroup.stories.length - 1) {
                    setActiveStoryIndex(prev => prev + 1);
                    setStoryProgress(0);
                  } else {
                    setActiveStoryGroup(null);
                    setActiveStoryIndex(0);
                    setStoryProgress(0);
                  }
                }}
                disabled={activeStoryIndex === activeStoryGroup.stories.length - 1}
              >
                Next ▶
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Floating Toast Notification alerts */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        pointerEvents: 'none'
      }}>
        {toasts.map(toast => (
          <div key={toast.id} className="glass-card" style={{
            pointerEvents: 'auto',
            padding: '12px 18px',
            background: 'rgba(18, 16, 26, 0.95)',
            borderLeft: '4px solid var(--accent-blue)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
            color: 'white',
            fontSize: '12.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            animation: 'slideIn 0.3s ease-out',
            minWidth: '250px',
            maxWidth: '350px'
          }}>
            <span style={{ fontSize: '16px' }}>
              {toast.type === 'like' && '❤️'}
              {toast.type === 'comment' && '💬'}
              {(toast.type === 'follow' || toast.type === 'follow_request' || toast.type === 'follow_accept') && '👤'}
            </span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Mobile Bottom Navigation Bar — 4 tabs: Home, Shorts, Videos, Profile */}
      {inWorkspace && user && (
        <nav className="mobile-bottom-nav">
          <button 
            type="button"
            className={`mobile-nav-item ${currentPanel === 'feed' && feedTab === 'all' ? 'active' : ''}`}
            onClick={() => { setCurrentPanel('feed'); setFeedTab('all'); setProfileUserId(null); }}
          >
            <Home size={20} />
            <span>Home</span>
          </button>
          <button 
            type="button"
            className={`mobile-nav-item ${currentPanel === 'shorts' ? 'active' : ''}`}
            onClick={() => { setCurrentPanel('shorts'); setProfileUserId(null); setShortVideoIndex(0); }}
          >
            <Video size={20} />
            <span>Shorts</span>
          </button>
          <button 
            type="button"
            className={`mobile-nav-item ${showUploadDrawer ? 'active' : ''}`}
            onClick={() => { setShowUploadDrawer(true); }}
          >
            <Plus size={20} />
            <span>Upload</span>
          </button>
          <button 
            type="button"
            className={`mobile-nav-item ${currentPanel === 'videos' ? 'active' : ''}`}
            onClick={() => { setCurrentPanel('videos'); setProfileUserId(null); }}
          >
            <PlayCircle size={20} />
            <span>Videos</span>
          </button>
          <button 
            type="button"
            className={`mobile-nav-item ${currentPanel === 'profile' ? 'active' : ''}`}
            onClick={() => { setProfileUserId(user.id); setCurrentPanel('profile'); setProfileTab('feed'); }}
          >
            <UserIcon size={20} />
            <span>Profile</span>
          </button>
        </nav>
      )}

      {/* Mobile Upload Drawer */}
      {showUploadDrawer && (
        <div 
          className="mobile-upload-drawer-overlay" 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => setShowUploadDrawer(false)}
        >
          <div 
            className="mobile-upload-drawer-content" 
            style={{
              background: 'var(--bg-surface)',
              borderTopLeftRadius: '16px',
              borderTopRightRadius: '16px',
              borderTop: '1px solid var(--border-color)',
              padding: '20px 16px 40px 16px',
              maxHeight: '85vh',
              overflowY: 'auto',
              animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>Upload Release</h3>
              <button 
                type="button" 
                onClick={() => setShowUploadDrawer(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer', padding: '4px' }}
              >
                &times;
              </button>
            </div>
            {renderCreatorBox(true)}
          </div>
        </div>
      )}

      {/* Zoomable Image Lightbox Modal */}
      {lightboxImage && (
        <div 
          className="lightbox-overlay"
          onClick={() => { setLightboxImage(null); setLightboxScale(1); }}
        >
          <div className="lightbox-toolbar" onClick={(e) => e.stopPropagation()}>
            <button 
              className="lightbox-btn" 
              onClick={() => setLightboxScale(prev => Math.min(prev + 0.25, 3))}
              title="Zoom In"
            >
              <Plus size={18} />
            </button>
            <button 
              className="lightbox-btn" 
              onClick={() => setLightboxScale(prev => Math.max(prev - 0.25, 0.5))}
              title="Zoom Out"
            >
              <span style={{ fontSize: '18px', fontWeight: 'bold', lineHeight: 1 }}>−</span>
            </button>
            <button 
              className="lightbox-btn" 
              onClick={() => setLightboxScale(1)}
              title="Reset Zoom"
            >
              <RefreshCw size={14} />
            </button>
            <button 
              className="lightbox-btn" 
              onClick={() => { setLightboxImage(null); setLightboxScale(1); }}
              title="Close"
              style={{ background: 'rgba(239, 68, 68, 0.2)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
            >
              <X size={18} />
            </button>
          </div>
          
          <div className="lightbox-container" onClick={(e) => e.stopPropagation()}>
            <img 
              className="lightbox-image"
              src={lightboxImage} 
              alt="Zoomed preview" 
              style={{ 
                transform: `scale(${lightboxScale})`, 
                cursor: lightboxScale > 1 ? 'grab' : 'zoom-in' 
              }}
              onClick={() => setLightboxScale(prev => prev === 1 ? 2 : 1)}
            />
          </div>
          
          <div className="lightbox-zoom-indicator">
            Zoom: {Math.round(lightboxScale * 100)}%
          </div>
        </div>
      )}

      {/* Floating glassmorphic Edit Profile Modal overlay */}
      {showSettings && (
        <div className="edit-profile-modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="edit-profile-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="edit-profile-modal-header">
              <h3>Edit Space Profile</h3>
              <button 
                type="button" 
                onClick={() => setShowSettings(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="edit-profile-modal-body">
              {settingsError && (
                <div className="settings-suggestions-block" style={{ marginBottom: 12 }}>
                  <div style={{ color: 'var(--accent-danger)', fontSize: '13px', fontWeight: 'bold' }}>{settingsError}</div>
                  {settingsSuggestions.length > 0 && (
                    <>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Suggested unique alternatives:</div>
                      <div className="suggestions-list">
                        {settingsSuggestions.map((sug, index) => (
                          <button key={index} type="button" className="suggestion-btn" onClick={() => selectSuggestedName(sug)}>
                            {sug}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              <form onSubmit={handleUpdateSettings} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label>Display Name (Rename)</label>
                  <div className="form-input-wrapper">
                    <UserIcon size={16} className="text-muted" />
                    <input 
                      type="text" 
                      placeholder="Your Display Name"
                      value={settingsName}
                      onChange={(e) => setSettingsName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Space Username</label>
                  <div className="form-input-wrapper">
                    <UserIcon size={16} className="text-muted" />
                    <input 
                      type="text" 
                      placeholder="username"
                      value={settingsUsername}
                      onChange={(e) => setSettingsUsername(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label style={{ margin: 0 }}>Profile Picture</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => { setAvatarMode('file'); setAvatarFile(null); setAvatarPreview(''); }}
                        style={{
                          fontSize: '10px', padding: '3px 10px', borderRadius: '20px', cursor: 'pointer',
                          background: avatarMode === 'file' ? '#ffffff' : 'transparent',
                          color: avatarMode === 'file' ? '#000' : 'var(--text-muted)',
                          border: '1px solid var(--border-color)', fontWeight: 600
                        }}
                      >
                        Upload Photo
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAvatarMode('url'); setAvatarFile(null); setAvatarPreview(''); }}
                        style={{
                          fontSize: '10px', padding: '3px 10px', borderRadius: '20px', cursor: 'pointer',
                          background: avatarMode === 'url' ? '#ffffff' : 'transparent',
                          color: avatarMode === 'url' ? '#000' : 'var(--text-muted)',
                          border: '1px solid var(--border-color)', fontWeight: 600
                        }}
                      >
                        Paste URL
                      </button>
                    </div>
                  </div>

                  {(avatarPreview || settingsAvatar) && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                      <Avatar 
                        username={settingsUsername} 
                        src={avatarPreview || settingsAvatar} 
                        size={72} 
                        style={{ border: '2px solid var(--border-color)', objectFit: 'cover' }} 
                      />
                    </div>
                  )}

                  {avatarMode === 'file' ? (
                    <>
                      <input
                        type="file"
                        ref={avatarFileInputRef}
                        accept="image/png,image/jpeg,image/gif,image/webp"
                        style={{ display: 'none' }}
                        onChange={handleAvatarFileChange}
                      />
                      {!avatarFile ? (
                        <div
                          className="file-upload-zone"
                          onClick={() => avatarFileInputRef.current?.click()}
                          style={{ padding: '20px', minHeight: '80px', cursor: 'pointer' }}
                        >
                          <UserIcon size={22} className="text-muted" style={{ marginBottom: 6 }} />
                          <div style={{ fontSize: '12.5px', fontWeight: 500 }}>Click to choose a photo</div>
                          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>PNG, JPG, GIF, WebP — max 10MB</div>
                        </div>
                      ) : (
                        <div className="file-preview">
                          <div className="preview-info">
                            <span className="preview-icon">🖼️</span>
                            <div className="preview-details">
                              <span className="preview-name">{avatarFile.name}</span>
                              <span className="preview-size">{(avatarFile.size / 1024).toFixed(1)} KB</span>
                            </div>
                          </div>
                          <button type="button" className="remove-file-btn" onClick={() => { setAvatarFile(null); setAvatarPreview(''); }}>×</button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="form-input-wrapper">
                      <Terminal size={16} className="text-muted" />
                      <input
                        type="text"
                        placeholder="https://example.com/my-photo.png"
                        value={settingsAvatar}
                        onChange={(e) => setSettingsAvatar(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Development Niche Feed</label>
                  <div className="form-input-wrapper" style={{ paddingLeft: '8px' }}>
                    <select 
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '100%', cursor: 'pointer' }}
                      value={settingsNiche}
                      onChange={(e) => setSettingsNiche(e.target.value)}
                    >
                      {Object.entries(NICHE_CATEGORIES).map(([catName, nichesList]) => (
                        <optgroup label={catName} key={catName} style={{ background: '#12101a', color: 'var(--text-muted)' }}>
                          {nichesList.map((n, i) => (
                            <option key={i} value={n} style={{ background: '#12101a', color: 'white' }}>{n}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Profile Tag (max 10 chars)</label>
                  <div className="form-input-wrapper">
                    <Terminal size={16} className="text-muted" />
                    <input 
                      type="text" 
                      placeholder="e.g. CORE-DEV"
                      value={settingsTag}
                      onChange={(e) => {
                        if (e.target.value.length <= 10) {
                          setSettingsTag(e.target.value);
                        }
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right', marginTop: '2px' }}>
                    {settingsTag.length}/10 chars
                  </div>
                </div>

                <div className="form-group">
                  <label>Profile Description (max 50 chars)</label>
                  <div className="form-input-wrapper">
                    <FileText size={16} className="text-muted" />
                    <input 
                      type="text" 
                      placeholder="Brief bio about yourself..."
                      value={settingsDescription}
                      onChange={(e) => {
                        if (e.target.value.length <= 50) {
                          setSettingsDescription(e.target.value);
                        }
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right', marginTop: '2px' }}>
                    {settingsDescription.length}/50 chars
                  </div>
                </div>

                <div className="form-group">
                  <label>Social / Portfolio URL</label>
                  <div className="form-input-wrapper">
                    <Globe size={16} className="text-muted" />
                    <input 
                      type="text" 
                      placeholder="https://github.com/myusername"
                      value={settingsSocialUrl}
                      onChange={(e) => setSettingsSocialUrl(e.target.value)}
                    />
                  </div>
                </div>

                {uploadProgress !== null && (
                  <div className="upload-progress-container" style={{ padding: '10px 0', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      <span>Uploading avatar...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="progress-bar-bg" style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div className="progress-bar-fill" style={{ width: `${uploadProgress}%`, height: '100%', background: 'linear-gradient(90deg, #4f46e5, #0ea5e9)', borderRadius: '2px', transition: 'width 0.2s ease-out' }} />
                    </div>
                  </div>
                )}

                <button type="submit" className="auth-btn" style={{ marginTop: '10px' }} disabled={uploadingAvatar}>
                  {uploadingAvatar ? 'Uploading photo...' : 'Save Profile Details'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
