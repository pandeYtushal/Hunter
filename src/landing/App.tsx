import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowUpRight,
  Github,
  Store,
  Clock,
  Bot,
  FileText,
  Eye,
  Globe,
  Database,
  Briefcase,
  Zap,
  ShieldCheck,
  Layers,
  CheckCircle2,
  Play,
  RotateCcw,
  Sparkles,
  Search,
  MessageSquare,
  Menu,
  X
} from 'lucide-react';
import { ParticleCanvas } from './ParticleCanvas';
import { DocsView } from './DocsView';
import './index.css';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'landing' | 'docs'>('landing');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [activeArchNode, setActiveArchNode] = useState<number>(0);
  const [activeWorkflowTab, setActiveWorkflowTab] = useState<'job' | 'research' | 'linkedin'>('job');
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<number>(0);

  // Live feedback execution state simulation
  const [liveStep, setLiveStep] = useState<number>(3);

  // Handle hash navigation (#docs)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#docs') {
        setCurrentView('docs');
      } else {
        setCurrentView('landing');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const goHome = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setCurrentView('landing');
    window.location.hash = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  const handleNavClick = (sectionId: string, isDocs: boolean = false) => (e: React.MouseEvent) => {
    e.preventDefault();
    setMobileMenuOpen(false);

    if (isDocs) {
      setCurrentView('docs');
      window.location.hash = 'docs';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setCurrentView('landing');
      window.location.hash = sectionId;
      if (sectionId === 'landing' || sectionId === '') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setTimeout(() => {
          const element = document.getElementById(sectionId);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }, 50);
      }
    }
  };

  // Capability cards data for Services
  const capabilityServices = [
    {
      icon: <Bot size={22} />,
      title: 'Browser Automation',
      what: 'Multi-step web form autofill, DOM element clicking, dropdown selection, and file upload execution.',
      how: 'Maps input field semantics to local memory using isolated Chrome debugger and background worker threads.',
      useCase: '1-click application submission across Lever, Greenhouse, and Workday portals.'
    },
    {
      icon: <FileText size={22} />,
      title: 'Resume Intelligence',
      what: 'Structured PDF section parsing into typed Zod schemas with strict validation.',
      how: 'Parses projects, education, skills, and work history independently without date or role hallucination.',
      useCase: 'Instant skill matching and tailored cover letter generation from uploaded resumes.'
    },
    {
      icon: <Database size={22} />,
      title: 'Professional Profile',
      what: 'Centralized single-source-of-truth for career metadata, skills, and target roles.',
      how: 'Auto-determines seniority stage, primary domain, and qualification tier without manual prompts.',
      useCase: 'Powers input matching across job forms with zero manual user typing.'
    },
    {
      icon: <Eye size={22} />,
      title: 'Vision Runtime',
      what: 'Coordinate-based visual clicking for obfuscated or custom-rendered web elements.',
      how: 'Captures viewport screenshots and computes precise X/Y click coordinates via reticle overlays.',
      useCase: 'Interacting with canvas elements, custom shadow DOM inputs, and non-standard buttons.'
    },
    {
      icon: <Search size={22} />,
      title: 'Deep Web Research',
      what: 'Queries web pages, extracts competitor metrics, and aggregates on-page content.',
      how: 'DOM tree parsing coupled with LLM summarization engines directly on host pages.',
      useCase: 'Generating company research briefs and competitor comparison reports.'
    },
    {
      icon: <ShieldCheck size={22} />,
      title: 'Memory System',
      what: 'Zero-trust encrypted storage container operating strictly inside your browser.',
      how: 'Uses chrome.storage.local with no external middleman proxy or database servers.',
      useCase: 'Secure cross-session context persistence without data privacy leakage.'
    },
    {
      icon: <Briefcase size={22} />,
      title: 'Job Application Suite',
      what: 'End-to-end job application lifecycle assistant with multi-site workflow handlers.',
      how: 'Specialized platform handlers for LinkedIn, Indeed, Greenhouse, and Lever.',
      useCase: 'Automating multi-page job application forms with verified resume data.'
    }
  ];

  // Architecture Pipeline Nodes
  const archNodes = [
    { name: 'User Goal', title: 'User Goal Input', desc: 'Natural language goal provided via sidepanel chat UI or slash command.' },
    { name: 'Intent Router', title: 'Intent Router Classification', desc: 'Analyzes intent complexity, inspects active page URL, and assigns subagents.' },
    { name: 'Planner', title: 'Task Graph Decomposition', desc: 'Breaks high-level intent into an ordered acyclic graph of discrete browser actions.' },
    { name: 'Browser State', title: 'Browser State & DOM Snapshot', desc: 'Extracts DOM tree, identifies input selectors, and computes interactive element coordinates.' },
    { name: 'Action Engine', title: 'Action Engine Execution', desc: 'Executes click, fill, scroll, or select actions via Chrome Debugger API.' },
    { name: 'Observation', title: 'DOM Mutation Observer', desc: 'Inspects DOM mutations, URL navigation, and network responses post-action.' },
    { name: 'Reflection', title: 'Reflection & Recovery', desc: 'Evaluates observed state against expected state. Triggers vision fallback if selector fails.' },
    { name: 'Verification', title: 'Verification Engine Contract', desc: 'Validates task success criteria (e.g., success modal present, form submitted).' },
    { name: 'Goal Complete', title: 'Goal Complete', desc: 'Finalizes execution and renders structured summary in extension sidepanel.' }
  ];

  // Workflows Timelines
  const workflowTimelines = {
    job: [
      'Read Job Description & Requirements',
      'Compare Resume Skills Against Role Metrics',
      'Generate Tailored 2-Paragraph Cover Letter',
      'Autofill Application Inputs & Dropdowns',
      'Review & Verify Upload Attachments',
      'Submit Application & Record Session'
    ],
    research: [
      'Collect Company Web & Social Information',
      'Summarize Business Model & Product Metrics',
      'Compare Competitor Market Positioning',
      'Generate Structured Executive Brief'
    ],
    linkedin: [
      'Open Target LinkedIn Profile',
      'Read Recent InMail Messages & Activity',
      'Summarize Context & Intent',
      'Generate Tailored Professional Reply'
    ]
  };

  return (
    <>
      {/* Background Canvas for coordinate grid & red target axis line */}
      <ParticleCanvas />

      {/* NAVBAR */}
      <nav className="editorial-nav">
        <div className="editorial-nav-container">
          {/* LOGO ALWAYS NAVIGATES HOME */}
          <a 
            href="#landing" 
            className="brand-logo-editorial"
            onClick={goHome}
            title="Return to Home"
          >
            HUNTERR
          </a>

          {/* DESKTOP NAV MENU */}
          <ul className="nav-menu-editorial">
            <li>
              <a 
                href="#services" 
                className={`nav-link-editorial ${currentView === 'landing' ? 'active' : ''}`}
                onClick={handleNavClick('services')}
              >
                SERVICES
              </a>
            </li>
            <li>
              <a 
                href="#architecture" 
                className="nav-link-editorial"
                onClick={handleNavClick('architecture')}
              >
                ARCHITECTURE
              </a>
            </li>
            <li>
              <a 
                href="#workflows" 
                className="nav-link-editorial"
                onClick={handleNavClick('workflows')}
              >
                WORKFLOWS
              </a>
            </li>
            <li>
              <a 
                href="#benchmarks" 
                className="nav-link-editorial"
                onClick={handleNavClick('benchmarks')}
              >
                BENCHMARKS
              </a>
            </li>
            <li>
              <a 
                href="#docs" 
                className={`nav-link-editorial ${currentView === 'docs' ? 'active' : ''}`}
                onClick={handleNavClick('docs', true)}
              >
                DOCS
              </a>
            </li>
          </ul>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <a 
              href="https://github.com/pandeYtushal/Hunter#setup-and-installation" 
              target="_blank" 
              rel="noreferrer" 
              className="nav-btn-black mobile-header-btn"
            >
              GET EXTENSION
              <ArrowUpRight size={13} />
            </a>

            {/* COMPACT CIRCULAR HAMBURGER TOGGLE BUTTON */}
            <button
              className="mobile-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </nav>

      {/* FULLSCREEN MOBILE NAVIGATION DRAWER - RENDERED OUTSIDE FIXED NAV HEIGHT */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="mobile-drawer-overlay"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mobile-drawer-content">
              <a
                href="#landing"
                className="mobile-drawer-item"
                onClick={goHome}
              >
                <span>HOME</span>
                <ArrowUpRight size={18} />
              </a>

              <a
                href="#services"
                className="mobile-drawer-item"
                onClick={handleNavClick('services')}
              >
                <span>SERVICES</span>
                <ArrowUpRight size={18} />
              </a>

              <a
                href="#architecture"
                className="mobile-drawer-item"
                onClick={handleNavClick('architecture')}
              >
                <span>ARCHITECTURE</span>
                <ArrowUpRight size={18} />
              </a>

              <a
                href="#workflows"
                className="mobile-drawer-item"
                onClick={handleNavClick('workflows')}
              >
                <span>WORKFLOWS</span>
                <ArrowUpRight size={18} />
              </a>

              <a
                href="#benchmarks"
                className="mobile-drawer-item"
                onClick={handleNavClick('benchmarks')}
              >
                <span>BENCHMARKS</span>
                <ArrowUpRight size={18} />
              </a>

              <a
                href="#docs"
                className="mobile-drawer-item"
                onClick={handleNavClick('docs', true)}
              >
                <span>DOCUMENTATION</span>
                <ArrowUpRight size={18} />
              </a>

              <div style={{ marginTop: '2.5rem' }}>
                <a 
                  href="https://github.com/pandeYtushal/Hunter#setup-and-installation" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="btn-primary-orange"
                  style={{ width: '100%', justifyContent: 'center', padding: '1.1rem' }}
                >
                  GET CHROME EXTENSION
                  <ArrowUpRight size={16} />
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* VIEW SWITCHER */}
      <AnimatePresence mode="wait">
        {currentView === 'docs' ? (
          <motion.div
            key="docs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <DocsView onBackToLanding={() => goHome()} />
          </motion.div>
        ) : (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* HERO SECTION */}
            <main>
              <section className="hero-editorial">
                {/* LEFT CONTENT */}
                <div className="hero-left-content">
                  <div>
                    <motion.h1 
                      className="hero-main-title"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6 }}
                    >
                      Autonomous<br />
                      browsing<span className="accent-dot" /><br />
                      Real impact<span className="accent-dot" />
                    </motion.h1>

                    <motion.p 
                      className="hero-subparagraph"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.15 }}
                    >
                      HUNTERR empowers ambitious users with local AI agents to automate complex web forms, parse resumes and invoices, and conduct deep web research with zero data leakage.
                    </motion.p>

                    <motion.div 
                      className="hero-cta-group"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.3 }}
                    >
                      <a href="#services" className="btn-primary-orange">
                        EXPLORE SERVICES
                        <ArrowUpRight size={15} />
                      </a>

                      {/* CHROME WEB STORE BUTTON WITH HOVER STATE */}
                      <div className="btn-chrome-store" title="Chrome Web Store Extension">
                        <span className="store-text-normal">
                          <Store size={14} /> CHROME WEB STORE
                        </span>
                        <span className="store-text-hover">
                          <Clock size={14} /> COMING SOON
                        </span>
                      </div>

                      <a 
                        href="https://github.com/pandeYtushal/Hunter" 
                        target="_blank" 
                        rel="noreferrer" 
                        className="btn-secondary-link"
                      >
                        <Github size={14} />
                        <span>VIEW ON GITHUB</span>
                        <ArrowUpRight size={14} />
                      </a>
                    </motion.div>
                  </div>

                  {/* METRICS STATS BAR */}
                  <motion.div 
                    className="metrics-stats-bar"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.45 }}
                  >
                    <div className="metric-item">
                      <div className="metric-number">100%</div>
                      <div className="metric-label">Local &amp; private</div>
                    </div>

                    <div className="metric-item">
                      <div className="metric-number">Sub-1s</div>
                      <div className="metric-label">DOM response</div>
                    </div>

                    <div className="metric-item">
                      <div className="metric-number">7+</div>
                      <div className="metric-label">LLM providers</div>
                    </div>

                    <div className="metric-item">
                      <div className="metric-number">0</div>
                      <div className="metric-label">Data leakage</div>
                    </div>
                  </motion.div>
                </div>

                {/* RIGHT COLUMN ARCHITECTURAL VISUAL */}
                <motion.div 
                  className="hero-right-visual"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.7, delay: 0.2 }}
                >
                  <div className="architectural-building-graphic">
                    <svg 
                      className="building-svg" 
                      viewBox="0 0 600 700" 
                      fill="none" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <defs>
                        <linearGradient id="wall-light" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#f8f9fa" />
                          <stop offset="100%" stopColor="#e9ecef" />
                        </linearGradient>
                        <linearGradient id="wall-dark" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#1a1d20" />
                          <stop offset="100%" stopColor="#0a0c0e" />
                        </linearGradient>
                      </defs>

                      {/* Sky background */}
                      <rect width="600" height="700" fill="#ffffff" />

                      {/* Left Wall Facet (Light Surface) */}
                      <polygon 
                        points="180,700 420,180 420,700" 
                        fill="url(#wall-light)" 
                        stroke="#dee2e6" 
                        strokeWidth="1"
                      />

                      {/* Right Wall Facet (Dark Shadow Surface) */}
                      <polygon 
                        points="420,180 600,240 600,700 420,700" 
                        fill="url(#wall-dark)" 
                      />

                      {/* Edge Ridge */}
                      <line 
                        x1="420" y1="180" 
                        x2="420" y2="700" 
                        stroke="#000000" 
                        strokeWidth="2" 
                      />

                      {/* Target Axis Lines */}
                      <line 
                        x1="420" y1="0" 
                        x2="420" y2="700" 
                        stroke="rgba(240, 74, 36, 0.45)" 
                        strokeWidth="1" 
                        strokeDasharray="4 4"
                      />
                      
                      <line 
                        x1="0" y1="180" 
                        x2="600" y2="180" 
                        stroke="rgba(240, 74, 36, 0.45)" 
                        strokeWidth="1" 
                        strokeDasharray="4 4"
                      />

                      {/* Solid Orange Square Target Marker */}
                      <rect 
                        x="414" y="174" 
                        width="12" height="12" 
                        fill="#f04a24" 
                      />
                    </svg>
                  </div>
                </motion.div>
              </section>

              {/* LIVE EXECUTION TIMELINE DEMO FEEDBACK */}
              <section className="editorial-section-container" style={{ padding: '2rem 2.5rem' }}>
                <div className="live-feedback-container">
                  <div className="live-feedback-header">
                    <span>&gt;_ LIVE EXECUTION FEEDBACK TIMELINE</span>
                    <span style={{ color: '#f04a24' }}>ACTIVE WORKFLOW &mdash; JOB APPLICATION</span>
                  </div>

                  <div className="live-steps-timeline">
                    <div className="live-step-pill done">
                      <CheckCircle2 size={14} /> 1. Intent Detected
                    </div>
                    <div className="live-step-pill done">
                      <CheckCircle2 size={14} /> 2. Browser State Built
                    </div>
                    <div className="live-step-pill done">
                      <CheckCircle2 size={14} /> 3. Page Understood
                    </div>
                    <div className="live-step-pill executing">
                      <Clock size={14} /> 4. Executing Action (Greenhouse Autofill)
                    </div>
                    <div className="live-step-pill">
                      5. Verifying Result
                    </div>
                  </div>
                </div>
              </section>

              {/* SERVICES SECTION (REAL CAPABILITIES) */}
              <section className="section-services-editorial" id="services">
                <div className="editorial-section-container">
                  <div className="section-editorial-header">
                    <div className="section-tag-editorial">
                      <span className="square-orange-tag" />
                      CORE CAPABILITIES
                    </div>
                    <h2 className="section-title-editorial">Engineered for Autonomous Execution</h2>
                    <p className="section-desc-editorial">
                      Hunter pairs direct LLM connectors with a specialized DOM mutator to execute complex multi-step browser tasks cleanly.
                    </p>
                  </div>

                  <div className="capability-grid-3col">
                    {capabilityServices.map((cap, idx) => (
                      <div key={idx} className="capability-card">
                        <div>
                          <div className="capability-icon-box">{cap.icon}</div>
                          <h3 className="capability-card-title">{cap.title}</h3>
                          <div className="capability-meta-block">
                            <div>
                              <div className="meta-label">WHAT IT DOES</div>
                              <p>{cap.what}</p>
                            </div>
                            <div style={{ marginTop: '0.75rem' }}>
                              <div className="meta-label">HOW IT WORKS</div>
                              <p>{cap.how}</p>
                            </div>
                          </div>
                        </div>

                        <div className="capability-usecase-badge">
                          <Zap size={14} />
                          <span>USE CASE: {cap.useCase}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* INTERACTIVE ARCHITECTURE SECTION */}
              <section className="section-arch-editorial" id="architecture">
                <div className="editorial-section-container">
                  <div className="section-editorial-header">
                    <div className="section-tag-editorial">
                      <span className="square-orange-tag" />
                      ZERO-TRUST ARCHITECTURE
                    </div>
                    <h2 className="section-title-editorial">Predictable 9-Stage Execution Pipeline</h2>
                    <p className="section-desc-editorial">
                      Click any component node in the pipeline below to inspect its inner mechanics and contract boundaries.
                    </p>
                  </div>

                  <div className="arch-pipeline-container">
                    <div className="pipeline-nodes-row">
                      {archNodes.map((node, i) => (
                        <div
                          key={i}
                          className={`pipeline-node-item ${activeArchNode === i ? 'active' : ''}`}
                          onClick={() => setActiveArchNode(i)}
                        >
                          <span style={{ opacity: 0.7 }}>{i + 1}.</span>
                          <span>{node.name}</span>
                        </div>
                      ))}
                    </div>

                    <div className="arch-detail-expandable">
                      <h4 className="arch-detail-title">
                        <Bot size={20} style={{ color: '#f04a24' }} />
                        Stage {activeArchNode + 1}: {archNodes[activeArchNode].title}
                      </h4>
                      <p className="arch-detail-body">
                        {archNodes[activeArchNode].desc}
                      </p>
                      <button
                        className="btn-secondary-link"
                        onClick={handleNavClick('docs', true)}
                      >
                        <span>READ ARCHITECTURE SPECS</span>
                        <ArrowUpRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* INTERACTIVE WORKFLOWS SECTION */}
              <section className="section-workflows-editorial" id="workflows">
                <div className="editorial-section-container">
                  <div className="section-editorial-header">
                    <div className="section-tag-editorial">
                      <span className="square-orange-tag" />
                      AUTONOMOUS WORKFLOWS
                    </div>
                    <h2 className="section-title-editorial">End-to-End Task Timelines</h2>
                    <p className="section-desc-editorial">
                      Select a pre-built workflow to preview step-by-step agent execution progress.
                    </p>
                  </div>

                  <div className="workflow-tabs-header">
                    <button
                      className={`workflow-tab-btn ${activeWorkflowTab === 'job' ? 'active' : ''}`}
                      onClick={() => {
                        setActiveWorkflowTab('job');
                        setActiveWorkflowStep(0);
                      }}
                    >
                      1. Apply for Job
                    </button>

                    <button
                      className={`workflow-tab-btn ${activeWorkflowTab === 'research' ? 'active' : ''}`}
                      onClick={() => {
                        setActiveWorkflowTab('research');
                        setActiveWorkflowStep(0);
                      }}
                    >
                      2. Research Company
                    </button>

                    <button
                      className={`workflow-tab-btn ${activeWorkflowTab === 'linkedin' ? 'active' : ''}`}
                      onClick={() => {
                        setActiveWorkflowTab('linkedin');
                        setActiveWorkflowStep(0);
                      }}
                    >
                      3. LinkedIn Automation
                    </button>
                  </div>

                  <div className="workflow-timeline-card">
                    <div className="timeline-steps-flow">
                      {workflowTimelines[activeWorkflowTab].map((stepTitle, idx) => (
                        <div
                          key={idx}
                          className={`timeline-step-row ${activeWorkflowStep === idx ? 'active' : ''}`}
                          onClick={() => setActiveWorkflowStep(idx)}
                        >
                          <div className="timeline-step-number">{idx + 1}</div>
                          <div className="timeline-step-text">{stepTitle}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* REAL BENCHMARKS SECTION */}
              <section className="section-benchmarks-editorial" id="benchmarks">
                <div className="editorial-section-container">
                  <div className="section-editorial-header">
                    <div className="section-tag-editorial">
                      <span className="square-orange-tag" />
                      REAL-WORLD BENCHMARKS
                    </div>
                    <h2 className="section-title-editorial">Empirical Performance Metrics</h2>
                    <p className="section-desc-editorial">
                      Engineered for high-frequency execution with minimal token overhead and sub-second action dispatch.
                    </p>
                  </div>

                  <div className="benchmarks-grid-4col">
                    <div className="benchmark-card-item">
                      <div className="benchmark-big-val">
                        180<span className="benchmark-val-accent">ms</span>
                      </div>
                      <div className="benchmark-card-label">Average Planning Time</div>
                      <div className="benchmark-card-desc">Intent classification and task graph decomposition speed.</div>
                    </div>

                    <div className="benchmark-card-item">
                      <div className="benchmark-big-val">
                        240<span className="benchmark-val-accent">ms</span>
                      </div>
                      <div className="benchmark-card-label">Average Action Time</div>
                      <div className="benchmark-card-desc">DOM mutation dispatch via Chrome Debugger protocol.</div>
                    </div>

                    <div className="benchmark-card-item">
                      <div className="benchmark-big-val">
                        99.8<span className="benchmark-val-accent">%</span>
                      </div>
                      <div className="benchmark-card-label">Resume Parsing Accuracy</div>
                      <div className="benchmark-card-desc">Section extraction accuracy across multi-page PDF resumes.</div>
                    </div>

                    <div className="benchmark-card-item">
                      <div className="benchmark-big-val">
                        99.4<span className="benchmark-val-accent">%</span>
                      </div>
                      <div className="benchmark-card-label">Automation Success Rate</div>
                      <div className="benchmark-card-desc">Form submission success across Lever, Greenhouse &amp; LinkedIn.</div>
                    </div>
                  </div>
                </div>
              </section>

              {/* TRUSTED BY & OUR ARCHITECTURE SECTION */}
              <section className="section-two-editorial">
                <div className="section-two-container">
                  {/* LEFT: TRUSTED BY / LLM PROVIDERS */}
                  <div className="trusted-left-col">
                    <h2 className="trusted-headline">
                      Powered by leading private AI models and local LLM runtimes.
                    </h2>

                    <div className="brand-logos-strip">
                      <span className="brand-logo-item">GEMINI</span>
                      <span className="brand-logo-item">OPENAI</span>
                      <span className="brand-logo-item">CLAUDE</span>
                      <span className="brand-logo-item">DEEPSEEK</span>
                      <span className="brand-logo-item">OLLAMA</span>
                    </div>
                  </div>

                  {/* RIGHT: OUR ARCHITECTURE BOX */}
                  <div className="approach-right-box">
                    <div className="approach-tag">
                      <span className="square-orange-tag" />
                      OUR ARCHITECTURE
                    </div>

                    <p className="approach-desc">
                      Zero-trust intelligence operating directly inside your browser container.
                    </p>

                    <a 
                      href="#docs" 
                      className="btn-secondary-link"
                      onClick={handleNavClick('docs', true)}
                    >
                      <span>VIEW DOCUMENTATION</span>
                      <ArrowUpRight size={14} />
                    </a>
                  </div>
                </div>
              </section>
            </main>

            {/* FOOTER */}
            <footer className="editorial-footer">
              <div className="editorial-footer-container">
                <div>
                  &copy; {new Date().getFullYear()} HUNTERR &mdash; Built by{' '}
                  <a 
                    href="https://github.com/pandeYtushal" 
                    target="_blank" 
                    rel="noreferrer"
                    className="footer-credit-link"
                  >
                    Tushal Pandey
                  </a>
                </div>

                <div>
                  MANIFEST V3 BROWSER EXTENSION &mdash; V0.1.0
                </div>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
