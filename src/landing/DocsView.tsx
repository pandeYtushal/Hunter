import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  BookOpen,
  Layers,
  Zap,
  Code2,
  Check,
  Copy,
  ArrowRight,
  ArrowLeft,
  Terminal,
  Shield,
  FileText,
  Eye,
  Bot,
  Sparkles,
  Cpu,
  Globe,
  Database,
  ArrowUpRight,
  Lock,
  Brain
} from 'lucide-react';
import './index.css';

export interface DocsViewProps {
  onBackToLanding?: () => void;
}

export const DocsView: React.FC<DocsViewProps> = ({ onBackToLanding }) => {
  const [activeTab, setActiveTab] = useState<'quickstart' | 'howitworks' | 'ai-resume' | 'developer'>('quickstart');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  return (
    <div className="docs-wrapper">
      {/* MINIMAL HERO HEADER */}
      <section className="docs-hero">
        <div className="docs-crumb-row">
          <div className="docs-hero-tag">
            <span className="square-orange-tag" />
            HUNTER DOCUMENTATION
          </div>

          {onBackToLanding && (
            <button className="btn-secondary-link" onClick={onBackToLanding}>
              <ArrowLeft size={14} />
              <span>RETURN HOME</span>
            </button>
          )}
        </div>

        <h1 className="docs-hero-title">
          Fast, Minimal Guide<span className="accent-dot" />
        </h1>

        <p className="docs-hero-subtitle">
          Hunter is a private AI browser agent that automates job applications, parses resumes, and researches the web — 100% locally in your browser.
        </p>

        {/* 4 MINIMAL NAV TABS - VERTICALLY STACKED ON MOBILE */}
        <div className="minimal-docs-tabs">
          <button
            className={`minimal-tab-btn ${activeTab === 'quickstart' ? 'active' : ''}`}
            onClick={() => setActiveTab('quickstart')}
          >
            <Zap size={15} />
            <span>1. QUICK START</span>
          </button>

          <button
            className={`minimal-tab-btn ${activeTab === 'howitworks' ? 'active' : ''}`}
            onClick={() => setActiveTab('howitworks')}
          >
            <Bot size={15} />
            <span>2. HOW IT WORKS</span>
          </button>

          <button
            className={`minimal-tab-btn ${activeTab === 'ai-resume' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai-resume')}
          >
            <FileText size={15} />
            <span>3. RESUME &amp; AI</span>
          </button>

          <button
            className={`minimal-tab-btn ${activeTab === 'developer' ? 'active' : ''}`}
            onClick={() => setActiveTab('developer')}
          >
            <Code2 size={15} />
            <span>4. DEVELOPER &amp; API</span>
          </button>
        </div>
      </section>

      {/* MAIN MINIMAL CONTENT BODY */}
      <main className="docs-content-container">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {/* TAB 1: QUICK START (SETUP IN 60 SECONDS) */}
            {activeTab === 'quickstart' && (
              <div>
                <div className="minimal-section-badge"><Zap size={14} /> SETUP IN 60 SECONDS</div>
                <h2 className="docs-article-title">Get Started with Hunter</h2>
                <p className="docs-article-lead">
                  Install the browser extension locally, add your AI key, and run your first automated task.
                </p>

                {/* 01, 02, 03 CARDS STACKED VERTICALLY ON MOBILE */}
                <div className="minimal-grid-3col">
                  {/* CARD 01 */}
                  <div className="minimal-card">
                    <div className="minimal-card-num">01</div>
                    <h3 className="minimal-card-title">Clone &amp; Build</h3>
                    <p className="minimal-card-desc">Run these terminal commands to compile the Manifest V3 bundle:</p>

                    <div className="docs-code-card">
                      <div className="code-header">
                        <span className="code-filename"><Terminal size={12} /> bash</span>
                        <button className="copy-code-btn" onClick={() => handleCopy(`git clone https://github.com/pandeYtushal/Hunter.git\ncd Hunter\nnpm install\nnpm run build`, 'c1')}>
                          {copiedCodeId === 'c1' ? <Check size={12} /> : <Copy size={12} />}
                          <span>{copiedCodeId === 'c1' ? 'COPIED' : 'COPY'}</span>
                        </button>
                      </div>
                      <pre className="code-content-block">
                        {`git clone https://github.com/pandeYtushal/Hunter.git
cd Hunter
npm install
npm run build`}
                      </pre>
                    </div>
                  </div>

                  {/* CARD 02 */}
                  <div className="minimal-card">
                    <div className="minimal-card-num">02</div>
                    <h3 className="minimal-card-title">Load into Chrome</h3>
                    <p className="minimal-card-desc">Open extension panel and load unpacked build:</p>
                    <ul className="minimal-bullet-list">
                      <li>Go to <code>chrome://extensions</code></li>
                      <li>Enable <strong>Developer mode</strong> (top right toggle)</li>
                      <li>Click <strong>Load unpacked</strong> &amp; select the <code>dist</code> folder</li>
                    </ul>
                  </div>

                  {/* CARD 03 */}
                  <div className="minimal-card">
                    <div className="minimal-card-num">03</div>
                    <h3 className="minimal-card-title">Run Slash Command</h3>
                    <p className="minimal-card-desc">Open extension sidepanel and trigger an agent task:</p>

                    <div className="docs-code-card">
                      <div className="code-header">
                        <span className="code-filename"><Zap size={12} /> sidepanel prompt</span>
                        <button className="copy-code-btn" onClick={() => handleCopy(`/apply Autofill job application form using my resume.`, 'c2')}>
                          {copiedCodeId === 'c2' ? <Check size={12} /> : <Copy size={12} />}
                          <span>{copiedCodeId === 'c2' ? 'COPIED' : 'COPY'}</span>
                        </button>
                      </div>
                      <pre className="code-content-block">
                        {`/apply Autofill job application form using my resume.`}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* ZERO LEAKAGE GUARANTEE */}
                <div className="docs-callout callout-tip" style={{ marginTop: '2.5rem' }}>
                  <Shield size={20} className="callout-icon" />
                  <div>
                    <strong>100% Local &amp; Private:</strong> All resume data and prompt histories stay inside your browser's encrypted <code>chrome.storage.local</code>. Zero data leakage to middleman servers.
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: HOW IT WORKS */}
            {activeTab === 'howitworks' && (
              <div>
                <div className="minimal-section-badge"><Bot size={14} /> AUTOMATION ENGINE</div>
                <h2 className="docs-article-title">How Hunter Works</h2>
                <p className="docs-article-lead">
                  Hunter translates natural language requests into deterministic DOM click and form fill actions.
                </p>

                <div className="minimal-flow-steps">
                  <div className="flow-step-item">
                    <div className="flow-step-icon"><FileText size={20} /></div>
                    <div>
                      <h4 className="flow-step-title">1. Upload Resume PDF</h4>
                      <p className="flow-step-desc">Extracts skills, work timeline, projects, and education into typed profile storage.</p>
                    </div>
                  </div>

                  <div className="flow-step-arrow">→</div>

                  <div className="flow-step-item">
                    <div className="flow-step-icon"><Eye size={20} /></div>
                    <div>
                      <h4 className="flow-step-title">2. DOM Snapshot &amp; Vision</h4>
                      <p className="flow-step-desc">Scans webpage inputs, dropdowns, and file upload fields for target mapping.</p>
                    </div>
                  </div>

                  <div className="flow-step-arrow">→</div>

                  <div className="flow-step-item">
                    <div className="flow-step-icon"><Bot size={20} /></div>
                    <div>
                      <h4 className="flow-step-title">3. Autofill &amp; Execute</h4>
                      <p className="flow-step-desc">Fills out fields via Chrome Debugger API with sub-second execution speed.</p>
                    </div>
                  </div>
                </div>

                <div className="minimal-grid-3col" style={{ marginTop: '2.5rem' }}>
                  <div className="minimal-card">
                    <div className="minimal-card-icon-header"><Globe size={20} /></div>
                    <h3 className="minimal-card-title">Job Board Autofill</h3>
                    <p className="minimal-card-desc">Supported on Lever, Greenhouse, Workday, LinkedIn, Indeed, and custom portals.</p>
                  </div>

                  <div className="minimal-card">
                    <div className="minimal-card-icon-header"><Sparkles size={20} /></div>
                    <h3 className="minimal-card-title">Cover Letter Generator</h3>
                    <p className="minimal-card-desc">Generates tailored 2-paragraph cover letters matching role requirements instantly.</p>
                  </div>

                  <div className="minimal-card">
                    <div className="minimal-card-icon-header"><Cpu size={20} /></div>
                    <h3 className="minimal-card-title">Vision Fallback Clicker</h3>
                    <p className="minimal-card-desc">If CSS selectors fail, computes exact X/Y pixel reticle coordinates to click visually.</p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: RESUME & AI */}
            {activeTab === 'ai-resume' && (
              <div>
                <div className="minimal-section-badge"><Brain size={14} /> INTELLIGENCE PIPELINE</div>
                <h2 className="docs-article-title">Resume Parsing &amp; AI Integration</h2>
                <p className="docs-article-lead">
                  Connect your favorite AI provider or run completely offline with local Ollama &amp; DeepSeek models to parse PDF resumes and automate form fields with 100% data privacy.
                </p>

                <h3 className="docs-section-heading">Supported AI Providers</h3>
                <div className="minimal-grid-4col">
                  <div className="minimal-provider-card">
                    <div className="provider-name">Google Gemini</div>
                    <div className="provider-model">2.0 Flash / 1.5 Pro</div>
                    <div className="provider-badge">Fastest API</div>
                  </div>

                  <div className="minimal-provider-card">
                    <div className="provider-name">OpenAI</div>
                    <div className="provider-model">GPT-4o / o3-Mini</div>
                    <div className="provider-badge">High Reasoning</div>
                  </div>

                  <div className="minimal-provider-card">
                    <div className="provider-name">Anthropic</div>
                    <div className="provider-model">Claude 3.5 Sonnet</div>
                    <div className="provider-badge">Precise Extraction</div>
                  </div>

                  <div className="minimal-provider-card">
                    <div className="provider-name">Local Ollama</div>
                    <div className="provider-model">DeepSeek R1 / Llama 3.2</div>
                    <div className="provider-badge">100% Offline</div>
                  </div>
                </div>

                <h3 className="docs-section-heading" style={{ marginTop: '2.5rem' }}>Resume Extraction &amp; Processing Workflow</h3>
                <p className="docs-paragraph">
                  When you upload a PDF resume, Hunter uses <code>pdfjs-dist</code> to extract the raw text layer in your browser, then sends it to your selected AI provider with strict JSON schema constraints.
                </p>

                <div className="docs-table-wrapper">
                  <table className="docs-table">
                    <thead>
                      <tr>
                        <th>SECTION</th>
                        <th>VALIDATION RULE</th>
                        <th>AUTOMATION USE CASE</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Personal Info</strong></td>
                        <td>Validates email, phone, LinkedIn, GitHub, and portfolio URLs.</td>
                        <td>Fills contact &amp; social links across forms.</td>
                      </tr>
                      <tr>
                        <td><strong>Work Experience</strong></td>
                        <td>Requires Role, Company, and Start/End dates.</td>
                        <td>Autofills Work History &amp; Employment forms.</td>
                      </tr>
                      <tr>
                        <td><strong>Skills &amp; Tech Stack</strong></td>
                        <td>Categorized into Languages, Frameworks, and Tools.</td>
                        <td>Matches job skill requirements &amp; tags.</td>
                      </tr>
                      <tr>
                        <td><strong>Education</strong></td>
                        <td>Degree type, Field of Study, Institution, and Year.</td>
                        <td>Fills Education dropdowns &amp; fields.</td>
                      </tr>
                      <tr>
                        <td><strong>Projects &amp; Publications</strong></td>
                        <td>Title, Description, and Link extraction.</td>
                        <td>Fills Portfolio/Project details.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h3 className="docs-section-heading" style={{ marginTop: '2.5rem' }}>Extracted Resume Schema (JSON)</h3>
                <div className="docs-code-card">
                  <div className="code-header">
                    <span className="code-filename"><Code2 size={14} /> src/types/Memory.ts — ResumeProfile</span>
                    <button
                      className="copy-code-btn"
                      onClick={() => handleCopy(`{\n  "personalInfo": {\n    "fullName": "Jane Doe",\n    "email": "jane@example.com",\n    "phone": "+1 555-0199",\n    "location": "San Francisco, CA",\n    "linkedin": "https://linkedin.com/in/janedoe",\n    "github": "https://github.com/janedoe"\n  },\n  "workExperience": [\n    {\n      "company": "Acme Corp",\n      "role": "Senior Frontend Engineer",\n      "startDate": "2022-01",\n      "endDate": "Present",\n      "description": "Led React & TypeScript migration."\n    }\n  ],\n  "skills": ["TypeScript", "React", "Node.js", "TailwindCSS"],\n  "education": [\n    {\n      "institution": "Stanford University",\n      "degree": "B.S. Computer Science",\n      "year": 2021\n    }\n  ]\n}`, 'c_resume_schema')}
                    >
                      {copiedCodeId === 'c_resume_schema' ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copiedCodeId === 'c_resume_schema' ? 'COPIED' : 'COPY SCHEMA'}</span>
                    </button>
                  </div>
                  <pre className="code-content-block">
                    <code>{`{
  "personalInfo": {
    "fullName": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+1 555-0199",
    "location": "San Francisco, CA",
    "linkedin": "https://linkedin.com/in/janedoe",
    "github": "https://github.com/janedoe"
  },
  "workExperience": [
    {
      "company": "Acme Corp",
      "role": "Senior Frontend Engineer",
      "startDate": "2022-01",
      "endDate": "Present",
      "description": "Led React & TypeScript migration."
    }
  ],
  "skills": ["TypeScript", "React", "Node.js", "TailwindCSS"],
  "education": [
    {
      "institution": "Stanford University",
      "degree": "B.S. Computer Science",
      "year": 2021
    }
  ]
}`}</code>
                  </pre>
                </div>

                <div className="minimal-card" style={{ marginTop: '2rem', borderLeft: '3px solid var(--accent-orange)' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Lock size={16} style={{ color: 'var(--accent-orange)' }} /> Zero-Knowledge Local Storage Security
                  </h4>
                  <p className="minimal-card-desc" style={{ marginTop: '0.5rem' }}>
                    All parsed resume fields and API keys are stored exclusively in your browser's encrypted <code>chrome.storage.local</code>. API keys are never stored on any remote cloud database.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 4: DEVELOPER & API */}
            {activeTab === 'developer' && (
              <div>
                <div className="minimal-section-badge"><Code2 size={14} /> DEVELOPER REFERENCE</div>
                <h2 className="docs-article-title">TypeScript API &amp; Commands</h2>
                <p className="docs-article-lead">
                  Extend Hunter or call core action engines programmatically.
                </p>

                <h3 className="docs-section-heading">Slash Commands</h3>
                <div className="minimal-grid-3col">
                  <div className="minimal-card">
                    <code style={{ fontSize: '1rem', color: 'var(--accent-orange)' }}>/apply</code>
                    <p className="minimal-card-desc" style={{ marginTop: '0.5rem' }}>Autofill job application forms on active page.</p>
                  </div>

                  <div className="minimal-card">
                    <code style={{ fontSize: '1rem', color: 'var(--accent-orange)' }}>/research</code>
                    <p className="minimal-card-desc" style={{ marginTop: '0.5rem' }}>Gather company background, products, and metrics.</p>
                  </div>

                  <div className="minimal-card">
                    <code style={{ fontSize: '1rem', color: 'var(--accent-orange)' }}>/profile</code>
                    <p className="minimal-card-desc" style={{ marginTop: '0.5rem' }}>Open profile &amp; resume manager settings.</p>
                  </div>
                </div>

                <h3 className="docs-section-heading" style={{ marginTop: '2.5rem' }}>ActionEngine API Snippet</h3>

                <div className="docs-code-card">
                  <div className="code-header">
                    <span className="code-filename"><Code2 size={14} /> src/actions/ActionEngine.ts</span>
                    <button className="copy-code-btn" onClick={() => handleCopy(`export class ActionEngine {\n  async executeAction(action: BrowserAction): Promise<ActionResult>;\n  async fillInput(selector: string, value: string): Promise<boolean>;\n  async clickElement(selector: string): Promise<boolean>;\n}`, 'c3')}>
                      {copiedCodeId === 'c3' ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copiedCodeId === 'c3' ? 'COPIED' : 'COPY'}</span>
                    </button>
                  </div>
                  <pre className="code-content-block">
                    {`export class ActionEngine {
  // Execute a browser action (click, fill, scroll, select)
  async executeAction(action: BrowserAction): Promise<ActionResult>;

  // Fill text input element by CSS selector
  async fillInput(selector: string, value: string): Promise<boolean>;

  // Click element by CSS selector
  async clickElement(selector: string): Promise<boolean>;
}`}
                  </pre>
                </div>
              </div>
            )}

            {/* TAB BOTTOM SWITCHER */}
            <div className="docs-prev-next-nav" style={{ marginTop: '3.5rem' }}>
              <button
                className="nav-page-card"
                onClick={() => {
                  if (activeTab === 'howitworks') setActiveTab('quickstart');
                  else if (activeTab === 'ai-resume') setActiveTab('howitworks');
                  else if (activeTab === 'developer') setActiveTab('ai-resume');
                }}
                style={{ visibility: activeTab === 'quickstart' ? 'hidden' : 'visible' }}
              >
                <div className="nav-page-direction">← PREVIOUS SECTION</div>
                <div className="nav-page-title">
                  {activeTab === 'howitworks' && '1. Quick Start'}
                  {activeTab === 'ai-resume' && '2. How It Works'}
                  {activeTab === 'developer' && '3. Resume & AI'}
                </div>
              </button>

              <button
                className="nav-page-card"
                style={{ textAlign: 'right', visibility: activeTab === 'developer' ? 'hidden' : 'visible' }}
                onClick={() => {
                  if (activeTab === 'quickstart') setActiveTab('howitworks');
                  else if (activeTab === 'howitworks') setActiveTab('ai-resume');
                  else if (activeTab === 'ai-resume') setActiveTab('developer');
                }}
              >
                <div className="nav-page-direction">NEXT SECTION →</div>
                <div className="nav-page-title">
                  {activeTab === 'quickstart' && '2. How It Works'}
                  {activeTab === 'howitworks' && '3. Resume & AI'}
                  {activeTab === 'ai-resume' && '4. Developer & API'}
                </div>
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};
