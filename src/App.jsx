import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Upload, 
  Settings, 
  Key, 
  Plus, 
  Trash2, 
  Download, 
  Play, 
  Image as ImageIcon,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  X,
  Eye,
  EyeOff,
  Sparkles,
  Type,
  Database,
  Terminal,
  Cpu,
  Copy,
  RefreshCw,
  Clock
} from 'lucide-react';
import Papa from 'papaparse';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { groqService } from './services/groq';
import { geminiService } from './services/gemini';
import GroqService from './services/groq';
import './App.css';

const providerModels = {
  groq: [
    { id: "llama-3.2-11b-vision-preview", name: "Llama 3.2 11B Vision" },
    { id: "llama-3.2-90b-vision-preview", name: "Llama 3.2 90B Vision" },
    { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B (Fast)" }
  ],
  gemini: [
    { id: "gemini-2.0-flash", name: "Gemini 2.5 Latest" },
    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash (Fast)" },
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro (Best Quality)" }
  ]
};

const ImageCard = React.memo(({ img, activeMode, activeProvider, onSelect, onDelete, onRegenerate, formatFileSize, copyToClipboard }) => {
  return (
    <div className={`card-horizontal ${img.status === 'error' ? 'card-error' : ''}`}>
      {/* Left: Image Section */}
      <div className="card-left">
        <div className="card-image-box">
          <img src={img.preview} alt="Preview" className="card-img-main" onClick={() => onSelect(img)} />
          <button className="card-delete-btn" onClick={() => onDelete(img.id)} title="Delete Image">
            <Trash2 size={16} />
          </button>
        </div>
        <div className="file-meta-info">
          <p className="file-name-label">{img.file.name}</p>
          <p className="file-size-label">Size: {formatFileSize(img.file.size)} → {img.metadata ? 'Processed' : '...'}</p>
        </div>
      </div>

      {/* Right: Content Section */}
      <div className="card-right">
        <div className="metadata-field">
          <div className="field-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Type size={14} color="var(--text-secondary)" />
                  <span className="field-label">Title</span>
              </div>
              <span className="char-count">{img.metadata?.title?.length || 0} characters</span>
          </div>
          <div className="title-box-mockup">
            {img.status === 'done' ? (
              activeMode === 'metadata' ? (
                <span>{img.metadata?.title}</span>
              ) : img.promptOutput
            ) : (
              <div className="status-container">
                {img.status === 'generating' ? (
                   <span style={{ color: '#aaa' }}>Analyzing...</span>
                ) : img.status === 'error' ? (
                   <div style={{ color: '#ff4444', fontSize: '0.8rem' }}>
                     <strong>Error:</strong> {img.error || 'Unknown error'}
                   </div>
                ) : (
                   <span style={{ color: '#aaa' }}>Waiting for generation...</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="metadata-field">
          <div className="field-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Database size={14} color="var(--text-secondary)" />
                  <span className="field-label">Keywords ({img.metadata?.keywords?.length || 0})</span>
              </div>
          </div>
          <div className="keywords-cloud-mockup">
            {img.status === 'done' && img.metadata?.keywords ? (
              img.metadata.keywords.slice(0, 25).map((kw, i) => (
                 <span key={i} className="keyword-pill">{kw}</span>
              ))
            ) : (
              <span style={{ color: '#444' }}>Keywords will appear here</span>
            )}
            {img.metadata?.keywords?.length > 25 && <span className="keyword-pill">+{img.metadata.keywords.length - 25} more</span>}
          </div>
        </div>

        <div className="card-actions-row">
          <div style={{ display: 'flex', gap: '12px' }}>
              <button className="action-btn-outline" onClick={() => copyToClipboard(img.metadata?.title || '')}>
                  <Copy size={16} /> Copy Title
              </button>
              <button className="action-btn-outline" onClick={() => copyToClipboard(img.metadata?.keywords?.join(', ') || '')}>
                  <Copy size={16} /> Copy Keywords
              </button>
          </div>
          <button className="action-btn-regen" onClick={() => onRegenerate(img.id)}>
              <Sparkles size={16} /> {img.status === 'done' ? 'Regenerate' : 'Retry'}
          </button>
        </div>
      </div>
    </div>
  );
});

const DetailsModal = ({ isOpen, onClose, image, activeMode, activeProvider, onRegenerate }) => {
  if (!isOpen || !image) return null;

  const copyToClipboard = useCallback((text) => {
    navigator.clipboard.writeText(text);
    // Simple toast would be nice, but for now we'll just use the button state if we had one
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal details-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Image Details</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{image.file.name}</p>
          </div>
          <X size={24} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={onClose} />
        </div>

        <div className="details-modal-content">
          <div className="details-image-view">
            <img src={image.preview} alt="Large preview" />
          </div>
          <div className="details-info-view">
            {image.status === 'done' ? (
              activeMode === 'metadata' && image.metadata ? (
                <div className="details-sections">
                  <div className="detail-section">
                    <div className="section-header">
                      <p className="section-title">Title</p>
                      <button className="copy-btn-small" onClick={() => copyToClipboard(image.metadata.title)}>
                        <Copy size={14} /> Copy
                      </button>
                    </div>
                    <p className="detail-text">{image.metadata.title}</p>
                  </div>

                  <div className="detail-section">
                    <div className="section-header">
                      <p className="section-title">Description</p>
                      <button className="copy-btn-small" onClick={() => copyToClipboard(image.metadata.description)}>
                        <Copy size={14} /> Copy
                      </button>
                    </div>
                    <p className="detail-text">{image.metadata.description}</p>
                  </div>

                  <div className="detail-section">
                    <div className="section-header">
                      <p className="section-title">Keywords ({image.metadata.keywords.length})</p>
                      <button className="copy-btn-small" onClick={() => copyToClipboard(image.metadata.keywords.join(', '))}>
                        <Copy size={14} /> Copy
                      </button>
                    </div>
                    <div className="card-keywords" style={{ maxHeight: 'none', overflow: 'visible' }}>
                      {image.metadata.keywords.map((kw, i) => (
                        <span key={i} className="keyword-tag" style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          color: '#FFFFFF'
                        }}>
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="detail-section">
                  <div className="section-header">
                    <p className="section-title">Generated Prompt</p>
                    <button className="copy-btn-small" onClick={() => copyToClipboard(image.promptOutput)}>
                      <Copy size={14} /> Copy
                    </button>
                  </div>
                  <p className="detail-text italic">"{image.promptOutput}"</p>
                </div>
              )
            ) : (
              <div className="details-loading">
                <p>Status: {image.status}</p>
                {image.status === 'error' && <p className="error-text">{image.error}</p>}
              </div>
            )}

            <div className="details-footer-actions">
                <button
                  className="regen-btn-full"
                  onClick={() => onRegenerate(image.id)}
                  disabled={image.status === 'generating'}
                >
                  <RefreshCw size={18} className={image.status === 'generating' ? 'animate-spin' : ''} />
                  {image.status === 'generating' ? 'Regenerating...' : 'Regenerate This Image'}
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const LoginModal = ({ isOpen, onClose, onLogin }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay login-overlay" onClick={onClose}>
      <div className="google-login-modal" onClick={e => e.stopPropagation()}>
        <div className="google-modal-content" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <div className="google-logo-wrapper" style={{ marginBottom: '1.5rem' }}>
            <svg viewBox="0 0 24 24" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </div>

          <h2 className="google-h2" style={{ marginBottom: '1rem', color: '#fff' }}>Sign in to Metadata Gen</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '2rem' }}>
            Use your Google Account to access all features.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GoogleLogin
              onSuccess={credentialResponse => {
                onLogin(credentialResponse.credential);
              }}
              onError={() => {
                console.log('Login Failed');
              }}
              theme="filled_blue"
              shape="pill"
              size="large"
            />
          </div>
        </div>
      </div>
    </div>
  );
};


const ApiKeysModal = ({ isOpen, onClose, apiKeys, onAddKey, onRemoveKey, activeProvider, setActiveProvider }) => {
  const [newKey, setNewKey] = useState('');
  const [showKeys, setShowKeys] = useState({});
  const [modalProvider, setModalProvider] = useState(activeProvider);

  const toggleKeyVisibility = (idx) => {
    setShowKeys(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>API Keys Management</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Manage your AI provider API keys. Keys are stored locally and securely.
            </p>
          </div>
          <X size={24} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={onClose} />
        </div>

        <div className="modal-content">
          <div className="api-management-layout">
            <div className="providers-sidebar">
              <p className="section-title">Select AI Provider</p>
              <div
                className={`provider-card ${modalProvider === 'groq' ? 'active' : ''}`}
                onClick={() => setModalProvider('groq')}
              >
                <span className="provider-badge badge-free">Free</span>
                <div className="provider-card-header">
                  <Cpu size={20} color="#5EFF00" />
                  <div className="provider-card-info">
                    <h4>Groq</h4>
                    <p>{activeProvider === 'groq' ? 'Active' : 'Set Active'}</p>
                  </div>
                </div>
              </div>
              <div
                className={`provider-card ${modalProvider === 'gemini' ? 'active' : ''}`}
                onClick={() => setModalProvider('gemini')}
              >
                <span className="provider-badge badge-both">Free & Paid</span>
                <div className="provider-card-header">
                  <Sparkles size={20} color="#5EFF00" />
                  <div className="provider-card-info">
                    <h4>Google Gemini</h4>
                    <p>{activeProvider === 'gemini' ? 'Active' : 'Set Active'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="provider-details">
              <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h3 style={{ marginBottom: '0.5rem' }}>
                        {modalProvider === 'groq' ? 'Groq Configuration' : 'Gemini Configuration'}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {modalProvider === 'groq'
                        ? "Groq's advanced AI models for ultrafast image analysis."
                        : "Google's most capable AI models for multimodal tasks."
                    }
                    </p>
                </div>
                {activeProvider !== modalProvider && (
                    <button
                        onClick={() => setActiveProvider(modalProvider)}
                        style={{ background: '#5EFF00', color: '#000', fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}
                    >
                        Activate {modalProvider === 'groq' ? 'Groq' : 'Gemini'}
                    </button>
                )}
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <p className="section-title">Add New Key</p>
                <div className="api-input-wrapper">
                  <input
                    type="password"
                    placeholder={`Enter ${modalProvider === 'groq' ? 'Groq' : 'Gemini'} API key`}
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter' && newKey.trim()) {
                            onAddKey(modalProvider, newKey.trim());
                            setNewKey('');
                        }
                    }}
                  />
                  <button
                    onClick={() => {
                        if (newKey.trim()) {
                            onAddKey(modalProvider, newKey.trim());
                            setNewKey('');
                        }
                    }}
                    style={{ background: '#5EFF00', color: '#000', padding: '0.75rem' }}
                  >
                    <Plus size={20} />
                  </button>
                </div>
                <a
                  href={modalProvider === 'groq' ? "https://console.groq.com/keys" : "https://aistudio.google.com/app/apikey"}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '0.75rem', color: '#5EFF00', textDecoration: 'none', display: 'inline-block', marginTop: '0.75rem' }}
                >
                  <Terminal size={12} style={{ marginRight: '4px' }} /> Get {modalProvider === 'groq' ? 'Groq' : 'Gemini'} API Key
                </a>
              </div>

              <div>
                <p className="section-title">Stored Keys ({apiKeys[modalProvider]?.length || 0})</p>
                <div className="stored-keys-container">
                  {(apiKeys[modalProvider] || []).map((key, idx) => (
                    <div key={idx} className="stored-key-item">
                      <code style={{ fontSize: '0.85rem' }}>
                        {showKeys[idx] ? key : `••••••••${key.slice(-4)}`}
                      </code>
                      <div className="key-actions">
                        {showKeys[idx] ?
                          <EyeOff size={16} onClick={() => toggleKeyVisibility(idx)} /> :
                          <Eye size={16} onClick={() => toggleKeyVisibility(idx)} />
                        }
                        <Trash2 size={16} className="trash" onClick={() => onRemoveKey(modalProvider, key)} />
                      </div>
                    </div>
                  ))}
                  {(apiKeys[modalProvider]?.length || 0) === 0 && (
                    <p style={{ textAlign: 'center', color: '#444', fontSize: '0.85rem', padding: '2rem' }}>
                      No keys stored. Add an API key to start generating.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [images, setImages] = useState([]);
  const [apiKeys, setApiKeys] = useState(() => {
    const saved = localStorage.getItem('metadata_gen_keys');
    if (saved) return JSON.parse(saved);
    const oldSaved = localStorage.getItem('dmatadata_keys');
    if (oldSaved) return { groq: JSON.parse(oldSaved), gemini: [] };
    return { groq: [], gemini: [] };
  });
  const [activeProvider, setActiveProvider] = useState(() => {
    return localStorage.getItem('dmatadata_active_provider') || 'groq';
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeMode, setActiveMode] = useState('metadata');
  const [showModal, setShowModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [stats, setStats] = useState({ total: 0, completed: 0 });
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('metadata_gen_user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (credential) => {
    try {
      const decoded = jwtDecode(credential);
      const userData = {
        name: decoded.name,
        email: decoded.email,
        avatar: decoded.picture
      };
      setUser(userData);
      localStorage.setItem('metadata_gen_user', JSON.stringify(userData));
      setShowLoginModal(false);
    } catch (error) {
      console.error("Failed to decode Google JWT:", error);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('metadata_gen_user');
  };

  // Settings
  const [titleLen, setTitleLen] = useState([20, 200]);
  const [descLen, setDescLen] = useState([100, 150]);
  const [keywordCount, setKeywordCount] = useState([10, 50]);
  const [promptLen, setPromptLen] = useState(450);
  const [selectedModel, setSelectedModel] = useState("llama-3.2-11b-vision-preview");

  useEffect(() => {
    localStorage.setItem('metadata_gen_keys', JSON.stringify(apiKeys));
    localStorage.setItem('dmatadata_active_provider', activeProvider);
    groqService.setApiKeys(apiKeys.groq || []);
    geminiService.setApiKeys(apiKeys.gemini || []);

    // Ensure selected model belongs to active provider
    if (!providerModels[activeProvider].some(m => m.id === selectedModel)) {
        setSelectedModel(providerModels[activeProvider][0].id);
    }
  }, [apiKeys, activeProvider, selectedModel]);

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
      metadata: null,
      promptOutput: null,
      error: null
    }));
    setImages(prev => [...prev, ...newImages]);
  };

  const addApiKey = (provider, key) => {
    if (key && !apiKeys[provider].includes(key)) {
      setApiKeys(prev => ({
        ...prev,
        [provider]: [...prev[provider], key]
      }));
    }
  };

  const removeApiKey = (provider, key) => {
    setApiKeys(prev => ({
      ...prev,
      [provider]: prev[provider].filter(k => k !== key)
    }));
  };

  const deleteImage = useCallback((id) => {
    setImages(prev => prev.filter(img => img.id !== id));
  }, []);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Helper to ensure text ends correctly and within character limit
  const cleanMetadataText = (text, maxLength, isTitle = false) => {
    if (!text) return "";

    let processed = text.trim();

    // If it's too long, we need to truncate responsibly
    if (processed.length > maxLength) {
      let truncated = processed.substring(0, maxLength);
      const lastPunct = Math.max(
        truncated.lastIndexOf('.'),
        truncated.lastIndexOf('!'),
        truncated.lastIndexOf('?')
      );

      if (lastPunct > maxLength * 0.5) {
        processed = truncated.substring(0, lastPunct + 1).trim();
      } else {
        const lastSpace = truncated.lastIndexOf(' ');
        processed = (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated).trim();
        if (!isTitle) processed += ".";
      }
    }

    if (isTitle) {
      // For titles, strip ANY trailing punctuation like periods, commas, or ellipses
      processed = processed.replace(/[.!,;:\s]+$/, '').trim();
    } else if (!/[.!?]$/.test(processed)) {
      // For descriptions, ensure it ends with a period if not present
      processed += ".";
    }

    return processed;
  };

  const generateSingle = useCallback(async (imgId) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    const currentKeys = apiKeys[activeProvider];
    if (!currentKeys || currentKeys.length === 0) {
      setShowModal(true);
      return;
    }

    setImages(prev => prev.map(i => i.id === imgId ? { ...i, status: 'generating', error: null } : i));

    const service = activeProvider === 'groq' ? groqService : geminiService;

    try {
      const img = images.find(i => i.id === imgId);
      if (!img) return;
      const base64 = await GroqService.fileToBase64(img.file);

      let result;
      if (activeMode === 'metadata') {
         result = await service.generateMetadata(base64, {
            titleLen,
            descLen,
            keywordCount,
            model: selectedModel
          });

        // Apply strict formatting and cleaning
        result.title = cleanMetadataText(result.title, titleLen[1], true);
        result.description = cleanMetadataText(result.description, descLen[1], false);

        setImages(prev => prev.map(i => i.id === imgId ? {
          ...i,
          status: 'done',
          metadata: result
        } : i));
      } else {
         result = await service.generatePrompt(base64, {
          promptLen,
          model: selectedModel
        });
        setImages(prev => prev.map(i => i.id === imgId ? {
          ...i,
          status: 'done',
          promptOutput: result
        } : i));
      }
    } catch (error) {
      setImages(prev => prev.map(i => i.id === imgId ? {
        ...i,
        status: 'error',
        error: error.message
      } : i));
    }
  }, [user, apiKeys, activeProvider, activeMode, titleLen, descLen, keywordCount, promptLen, selectedModel, images]);

  const generateAll = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    const currentKeys = apiKeys[activeProvider];
    if (!currentKeys || currentKeys.length === 0) {
      setShowModal(true);
      return;
    }

    setIsGenerating(true);
    const pendingImages = images.filter(img => img.status !== 'done');
    setStats({ total: pendingImages.length, completed: 0 });

    const service = activeProvider === 'groq' ? groqService : geminiService;

    for (const img of pendingImages) {
      setImages(prev => prev.map(i => i.id === img.id ? { ...i, status: 'generating' } : i));

      try {
        const base64 = await GroqService.fileToBase64(img.file);
        
        let result;
        if (activeMode === 'metadata') {
           result = await service.generateMetadata(base64, {
            titleLen,
            descLen,
            keywordCount,
            model: selectedModel
          });

          // Apply strict formatting and cleaning
          result.title = cleanMetadataText(result.title, titleLen[1], true);
          result.description = cleanMetadataText(result.description, descLen[1], false);

          setImages(prev => prev.map(i => i.id === img.id ? { 
            ...i, 
            status: 'done', 
            metadata: result 
          } : i));
        } else {
           result = await service.generatePrompt(base64, {
            promptLen,
            model: selectedModel
          });
          setImages(prev => prev.map(i => i.id === img.id ? { 
            ...i, 
            status: 'done', 
            promptOutput: result 
          } : i));
        }
        
        setStats(prev => ({ ...prev, completed: prev.completed + 1 }));

        if (pendingImages.indexOf(img) < pendingImages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        setImages(prev => prev.map(i => i.id === img.id ? { 
          ...i, 
          status: 'error', 
          error: error.message 
        } : i));
      }
    }

    setIsGenerating(false);
  };

  const exportCsv = () => {
    const processedImages = images.filter(img => img.status === 'done');
    
    if (processedImages.length === 0) {
      alert("No processed images to export.");
      return;
    }

    const data = processedImages.map(img => {
      if (activeMode === 'metadata' && img.metadata) {
        return {
          Filename: img.file.name,
          Title: img.metadata.title,
          Keywords: img.metadata.keywords.join(', ')
        };
      } else if (activeMode === 'prompt' && img.promptOutput) {
        return {
          Filename: img.file.name,
          Generated_Prompt: img.promptOutput
        };
      }
      return null;
    }).filter(Boolean);

    try {
      const csv = Papa.unparse(data);
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Metadata Gen.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export CSV. Please check browser console.");
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <GoogleOAuthProvider clientId="155072060171-fqvqfn39jl06lcpn2qnqnnhsl884ba5g.apps.googleusercontent.com">
      <div className="app-container">
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
        onLogin={handleLogin} 
      />
      <ApiKeysModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)}
        apiKeys={apiKeys}
        onAddKey={addApiKey}
        onRemoveKey={removeApiKey}
        activeProvider={activeProvider}
        setActiveProvider={setActiveProvider}
      />

      <DetailsModal 
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        image={selectedImage}
        activeMode={activeMode}
        activeProvider={activeProvider}
        onRegenerate={generateSingle}
      />

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <img src="logo.svg" alt="Metadata Gen Logo" style={{ width: '28px', height: '28px' }} />
          Metadata Gen
        </div>

        <div className="sidebar-api-section" onClick={() => setShowModal(true)}>
          <div className="api-section-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Key size={18} color="var(--text-secondary)" />
                <span className="api-section-title">API Keys</span>
            </div>
            <div className={`api-provider-badge badge-${activeProvider}`}>
                {activeProvider}
            </div>
          </div>
        </div>

          <p className="section-title">Model Selection</p>
          <select 
            value={selectedModel} 
            onChange={(e) => setSelectedModel(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '0.75rem',
              color: 'white',
              fontSize: '0.875rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {providerModels[activeProvider].map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>

          <div className="mode-toggle-group">
            <button 
              className={`mode-btn ${activeMode === 'metadata' ? 'active' : ''}`}
              onClick={() => setActiveMode('metadata')}
            >
              <Database size={16} /> Metadata
            </button>
            <button 
              className={`mode-btn ${activeMode === 'prompt' ? 'active' : ''}`}
              onClick={() => setActiveMode('prompt')}
            >
              <Sparkles size={16} /> Prompt
            </button>
          </div>

          {activeMode === 'metadata' ? (
            <div className="control-group">
                <p className="section-title">Length Constraints</p>
                <div className="control-item">
                    <div className="control-label">
                        <span>Title Length</span>
                        <span className="control-value">{titleLen[1]} chars</span>
                    </div>
                    <input 
                        type="range" min="20" max="200" value={titleLen[1]} 
                        onChange={(e) => setTitleLen([0, parseInt(e.target.value)])}
                    />
                </div>
                <div className="control-item">
                    <div className="control-label">
                        <span>Description Length</span>
                        <span className="control-value">{descLen[1]} chars</span>
                    </div>
                    <input 
                        type="range" min="100" max="150" value={descLen[1]} 
                        onChange={(e) => setDescLen([0, parseInt(e.target.value)])}
                    />
                </div>
                <div className="control-item">
                    <div className="control-label">
                        <span>Keyword Count</span>
                        <span className="control-value">{keywordCount[1]} words</span>
                    </div>
                    <input 
                        type="range" min="10" max="50" value={keywordCount[1]} 
                        onChange={(e) => setKeywordCount([0, parseInt(e.target.value)])}
                    />
                </div>
            </div>
          ) : (
            <div className="control-group">
                <p className="section-title">Prompt Settings</p>
                <div className="control-item">
                    <div className="control-label">
                        <span>Prompt Length</span>
                        <span className="control-value">{promptLen} chars</span>
                    </div>
                    <input 
                        type="range" min="450" max="600" value={promptLen} 
                        onChange={(e) => setPromptLen(parseInt(e.target.value))}
                    />
                </div>
            </div>
          )}

        <div style={{ marginTop: 'auto' }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                Powered by {activeProvider === 'groq' ? 'Groq Vision Llama 4' : 'Google Gemini 2.5/3.x'}
            </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="action-bar">
          <div className="stats" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {images.length > 0 && (
              <span>{images.length} images loaded • {images.filter(i => i.status === 'done').length} processed</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {user ? (
              <div className="user-profile-bar">
                <img src={user.avatar} alt={user.name} className="user-avatar-small" />
                <span className="user-name-small">{user.name}</span>
                <button className="logout-btn-minimal" onClick={handleLogout} title="Logout">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button className="google-login-btn" onClick={() => setShowLoginModal(true)}>
                <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Login with Google
              </button>
            )}

            {images.length > 0 && (
              <button className="secondary" onClick={() => setImages([])}>
                <Trash2 size={18} /> Clear
              </button>
            )}
            <button 
                onClick={generateAll} 
                disabled={isGenerating || images.length === 0}
                className={isGenerating ? 'generating-pulse' : ''}
                style={{ background: '#5EFF00', color: '#000' }}
            >
              {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} />}
              {isGenerating ? `Generating (${stats.completed}/${stats.total})` : (activeMode === 'metadata' ? 'Generate Metadata' : 'Generate Prompts')}
            </button>
            <button 
                className="secondary" 
                onClick={exportCsv}
                disabled={!images.some(img => img.status === 'done')}
            >
              <Download size={18} /> Export CSV
            </button>
          </div>
        </header>

        {images.length === 0 ? (
          <label className="upload-zone" style={{ borderStyle: 'dotted', background: 'transparent' }}>
            <input type="file" multiple accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
            <div style={{ background: 'rgba(94, 255, 0, 0.1)', padding: '2rem', borderRadius: '50%', marginBottom: '1rem' }}>
              <Upload size={48} color="#5EFF00" />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fff' }}>Drop images here or click to upload</h2>
            <p style={{ marginTop: '0.5rem' }}>Bulk generation with {activeProvider === 'groq' ? 'Groq' : 'Gemini'}</p>
          </label>
        ) : (
          <div className="image-grid">
            {images.map(img => (
              <ImageCard 
                key={img.id}
                img={img}
                activeMode={activeMode}
                activeProvider={activeProvider}
                onSelect={setSelectedImage}
                onDelete={deleteImage}
                onRegenerate={generateSingle}
                formatFileSize={formatFileSize}
                copyToClipboard={copyToClipboard}
              />
            ))}
            <label className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderStyle: 'dashed', minHeight: '300px', background: 'rgba(255,255,255,0.01)' }}>
                <input type="file" multiple accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <Plus size={32} style={{ marginBottom: '0.5rem' }} />
                    <p>Add Images</p>
                </div>
            </label>
          </div>
        )}
      </main>

      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)}
        onLogin={handleLogin}
      />

      <ApiKeysModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)}
        apiKeys={apiKeys}
        onAddKey={addApiKey}
        onRemoveKey={removeApiKey}
        activeProvider={activeProvider}
        setActiveProvider={setActiveProvider}
      />
      
      <DetailsModal 
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        image={selectedImage}
        activeMode={activeMode}
        activeProvider={activeProvider}
        onRegenerate={generateSingle}
      />
    </div>
    </GoogleOAuthProvider>
  );
};

export default App;
