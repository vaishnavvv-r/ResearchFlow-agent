import { useState, type ReactNode } from 'react';
import axios from 'axios';
import { Activity, ArrowUpRight, BookOpen, CheckCircle2, FileSearch, LayoutDashboard, Plus, Search, Settings2, Sparkles, Sun, Workflow } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const api = axios.create({ baseURL: API_BASE });
type View = 'overview' | 'live' | 'reports' | 'sources' | 'settings';
type Project = { id: string; title: string; topic: string; status: string; provider: string; sources_count: number; created_at: string };
type Source = { title: string; url: string; content: string };
type Report = { title: string; content: string; provider: string; mock: boolean; sources?: Source[] };

export default function App() {
  const [topic, setTopic] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [latestReport, setLatestReport] = useState<Report | null>(null);
  const [activeView, setActiveView] = useState<View>('overview');

  async function startResearch() {
    if (topic.trim().length < 3) { setMessage('Enter a research topic to begin.'); return; }
    setLoading(true); setMessage(''); setActiveView('live');
    try {
      const { data } = await api.post('/api/research', { topic, research_depth: 'standard', max_sources: 8 });
      setProjects((items) => [data, ...items]); setTopic(''); setMessage('Research started. Live workflow events are being collected.');
      const stream = new EventSource(`${API_BASE}/api/research/${data.id}/stream`);
      stream.onmessage = (event) => {
        if (event.data === '[DONE]') { stream.close(); return; }
        const update = JSON.parse(event.data);
        if (update.type === 'complete') {
          setProjects((items) => items.map((item) => item.id === data.id ? { ...item, status: 'completed', sources_count: update.sources?.length ?? 0 } : item));
          setLatestReport(update.report); setMessage('Research completed. Your report is ready.'); setActiveView('reports');
        } else if (update.type === 'error') {
          setProjects((items) => items.map((item) => item.id === data.id ? { ...item, status: 'failed' } : item));
          setMessage(`Research failed: ${update.message}`); stream.close();
        }
      };
      stream.onerror = () => { stream.close(); setMessage('The live stream disconnected. Check the backend logs.'); };
    } catch { setMessage('Backend unavailable. Check VITE_API_URL and the backend deployment.'); }
    finally { setLoading(false); }
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span>ResearchFlow</span></div>
      <nav>
        <NavButton active={activeView === 'overview'} onClick={() => setActiveView('overview')}><LayoutDashboard size={17}/>Overview</NavButton>
        <NavButton active={activeView === 'live'} onClick={() => setActiveView('live')}><Workflow size={17}/>Live research</NavButton>
        <NavButton active={activeView === 'reports'} onClick={() => setActiveView('reports')}><BookOpen size={17}/>Reports</NavButton>
        <NavButton active={activeView === 'sources'} onClick={() => setActiveView('sources')}><FileSearch size={17}/>Sources</NavButton>
        <NavButton active={activeView === 'settings'} onClick={() => setActiveView('settings')}><Settings2 size={17}/>Settings</NavButton>
      </nav>
      <div className="sidebar-foot"><div className="status-dot"/>Gemini workspace</div>
    </aside>
    <main className="main">
      <header><div><p className="eyebrow">RESEARCH OPERATIONS</p><h1>Good morning, researcher.</h1><p className="subtle">Turn complex questions into evidence-backed insight.</p></div><button className="icon-btn"><Sun size={18}/></button></header>
      {activeView === 'overview' && <Overview topic={topic} setTopic={setTopic} startResearch={startResearch} loading={loading} message={message} projects={projects} setActiveView={setActiveView} latestReport={latestReport}/>} 
      {activeView === 'live' && <ViewPanel title="Live research"><div className="empty"><div className="empty-icon"><Workflow size={22}/></div><h4>{message || 'Start a research workflow from Overview.'}</h4><p>Planner, search, and report events appear here as the workflow runs.</p></div></ViewPanel>}
      {activeView === 'reports' && <ViewPanel title="Reports"><ReportView report={latestReport}/></ViewPanel>}
      {activeView === 'sources' && <ViewPanel title="Sources"><SourcesView report={latestReport}/></ViewPanel>}
      {activeView === 'settings' && <ViewPanel title="Settings"><div className="settings-grid"><div><span>LLM provider</span><strong>Gemini</strong></div><div><span>Model</span><strong>Configured on backend</strong></div><div><span>Search provider</span><strong>DuckDuckGo</strong></div><div><span>Application mode</span><strong>Evidence-aware research</strong></div></div></ViewPanel>}
    </main>
  </div>;
}

function Overview({ topic, setTopic, startResearch, loading, message, projects, setActiveView, latestReport }: { topic:string; setTopic:(v:string)=>void; startResearch:()=>void; loading:boolean; message:string; projects:Project[]; setActiveView:(v:View)=>void; latestReport:Report|null }) {
  return <>
    <section className="hero"><div><p className="eyebrow accent">NEW WORKFLOW</p><h2>What would you like to investigate?</h2><p>ResearchFlow will plan, search, extract, verify, and synthesize your topic.</p></div><div className="prompt-box"><Search size={19}/><input value={topic} onChange={e=>setTopic(e.target.value)} onKeyDown={e=>e.key==='Enter'&&startResearch()} placeholder="e.g. How is AI changing drug discovery?"/><button onClick={startResearch} disabled={loading}>{loading?'Starting…':<><Plus size={17}/>Start research</>}</button></div><p className="hint">Try a focused question for stronger evidence and clearer citations.</p>{message&&<div className="notice">{message}</div>}</section>
    <section className="metrics"><Metric icon={<Activity/>} label="Research reports" value={String(projects.length)} delta="this workspace"/><Metric icon={<FileSearch/>} label="Sources collected" value={String(projects.reduce((n,p)=>n+p.sources_count,0))} delta="from public web"/><Metric icon={<CheckCircle2/>} label="Tasks completed" value={String(projects.filter(p=>p.status==='completed').length)} delta="current session"/></section>
    {latestReport && <section className="panel report-panel"><div className="panel-head"><div><p className="eyebrow">RESEARCH REPORT</p><h3>{latestReport.title}</h3></div><span className="pill completed">{latestReport.mock ? 'mock' : latestReport.provider}</span></div><div className="report-content">{latestReport.content}</div></section>}
    <section className="content-grid"><div className="panel"><div className="panel-head"><div><p className="eyebrow">WORKSPACE</p><h3>Recent research</h3></div><button className="text-btn" onClick={() => setActiveView('reports')}>View reports <ArrowUpRight size={15}/></button></div>{projects.length===0?<Empty/>:<div className="project-list">{projects.map(p=><div className="project" key={p.id}><div className="project-icon"><Workflow size={17}/></div><div className="project-main"><strong>{p.title}</strong><span>{new Date(p.created_at).toLocaleString()} · {p.provider} provider · {p.sources_count} sources</span></div><span className={'pill '+p.status}>{p.status}</span></div>)}</div>}</div><div className="panel activity"><div className="panel-head"><div><p className="eyebrow">SYSTEM</p><h3>Agent activity</h3></div></div><div className="timeline"><div><b>Planner Agent</b><span>Ready for your next question</span></div><div><b>Research Agent</b><span>DuckDuckGo search connected</span></div><div><b>Report Writer</b><span>{latestReport ? 'Latest report available' : 'Waiting for a research question'}</span></div></div></div></section>
  </>;
}

function NavButton({ active, onClick, children }: { active:boolean; onClick:()=>void; children:ReactNode }) { return <button className={active ? 'active' : ''} onClick={onClick}>{children}</button>; }
function ViewPanel({ title, children }: { title:string; children:ReactNode }) { return <section className="panel page-panel"><p className="eyebrow">WORKSPACE</p><h2>{title}</h2>{children}</section>; }
function ReportView({ report }: { report:Report|null }) { return report ? <><div className="report-meta">Provider: {report.provider}{report.mock ? ' · Mock result' : ''}</div><div className="report-content">{report.content}</div></> : <div className="empty"><div className="empty-icon"><BookOpen size={22}/></div><h4>No report yet</h4><p>Start research from Overview to generate a report.</p></div>; }
function SourcesView({ report }: { report:Report|null }) { return report?.sources?.length ? <div className="source-list">{report.sources.map((source, i)=><a className="source-item" href={source.url} target="_blank" rel="noreferrer" key={`${source.url}-${i}`}><strong>[{i+1}] {source.title || source.url}</strong><span>{source.url}</span></a>)}</div> : <div className="empty"><div className="empty-icon"><FileSearch size={22}/></div><h4>No sources yet</h4><p>Sources will appear after a completed research run.</p></div>; }
function Metric({icon,label,value,delta}:{icon:ReactNode;label:string;value:string;delta:string}) { return <div className="metric"><div className="metric-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{delta}</small></div></div>; }
function Empty(){return <div className="empty"><div className="empty-icon"><Sparkles size={22}/></div><h4>Your research workspace is clear</h4><p>Start with a question above and your projects will appear here.</p></div>;}
