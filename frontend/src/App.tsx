import { useState } from 'react';
import axios from 'axios';
import { Activity, ArrowUpRight, BookOpen, CheckCircle2, FileSearch, LayoutDashboard, Plus, Search, Settings2, Sparkles, Sun, Workflow } from 'lucide-react';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000' });
type Project = { id: string; title: string; topic: string; status: string; provider: string; sources_count: number; created_at: string };

export default function App() {
  const [topic, setTopic] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [latestReport, setLatestReport] = useState<{title:string; content:string; provider:string; mock:boolean} | null>(null);

  async function startResearch() {
    if (topic.trim().length < 3) return setMessage('Enter a research topic to begin.');
    setLoading(true); setMessage('');
    try {
      const { data } = await api.post('/api/research', { topic, research_depth: 'standard', max_sources: 8 });
      setProjects((items) => [data, ...items]); setTopic(''); setMessage('Research started. Live workflow events are being collected.');
      const stream = new EventSource(`${api.defaults.baseURL}/api/research/${data.id}/stream`);
      stream.onmessage = (event) => {
        if (event.data === '[DONE]') { stream.close(); return; }
        const update = JSON.parse(event.data);
        if (update.type === 'complete') {
          setProjects((items) => items.map((item) => item.id === data.id ? {...item, status: 'completed', sources_count: update.sources?.length ?? 0} : item));
          setLatestReport(update.report);
          setMessage('Research completed. Your report is ready below.');
        } else if (update.type === 'error') {
          setProjects((items) => items.map((item) => item.id === data.id ? {...item, status: 'failed'} : item));
          setMessage(`Research failed: ${update.message}`); stream.close();
        }
      };
      stream.onerror = () => stream.close();
    } catch { setMessage('Backend unavailable. Start FastAPI on port 8000, then try again.'); }
    finally { setLoading(false); }
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span>ResearchFlow</span></div>
      <nav><a className="active"><LayoutDashboard size={17}/>Overview</a><a><Workflow size={17}/>Live research</a><a><BookOpen size={17}/>Reports</a><a><FileSearch size={17}/>Sources</a><a><Settings2 size={17}/>Settings</a></nav>
      <div className="sidebar-foot"><div className="status-dot"/>Mock workspace active</div>
    </aside>
    <main className="main"><header><div><p className="eyebrow">RESEARCH OPERATIONS</p><h1>Good morning, researcher.</h1><p className="subtle">Turn complex questions into evidence-backed insight.</p></div><button className="icon-btn"><Sun size={18}/></button></header>
      <section className="hero"><div><p className="eyebrow accent">NEW WORKFLOW</p><h2>What would you like to investigate?</h2><p>ResearchFlow will plan, search, extract, verify, and synthesize your topic.</p></div><div className="prompt-box"><Search size={19}/><input value={topic} onChange={e=>setTopic(e.target.value)} onKeyDown={e=>e.key==='Enter'&&startResearch()} placeholder="e.g. How is AI changing drug discovery?"/><button onClick={startResearch} disabled={loading}>{loading?'Starting…':<><Plus size={17}/>Start research</>}</button></div><p className="hint">Try a focused question for stronger evidence and clearer citations.</p>{message&&<div className="notice">{message}</div>}</section>
      <section className="metrics"><Metric icon={<Activity/>} label="Research reports" value={String(projects.length)} delta="this workspace"/><Metric icon={<FileSearch/>} label="Sources collected" value={String(projects.reduce((n,p)=>n+p.sources_count,0))} delta="from public web"/><Metric icon={<CheckCircle2/>} label="Tasks completed" value={projects.length?'1':'0'} delta="current session"/></section>
      {latestReport && <section className="panel report-panel"><div className="panel-head"><div><p className="eyebrow">RESEARCH REPORT</p><h3>{latestReport.title}</h3></div><span className="pill completed">{latestReport.mock ? 'mock' : latestReport.provider}</span></div><div className="report-content">{latestReport.content}</div></section>}
      <section className="content-grid"><div className="panel"><div className="panel-head"><div><p className="eyebrow">WORKSPACE</p><h3>Recent research</h3></div><button className="text-btn">View history <ArrowUpRight size={15}/></button></div>{projects.length===0?<Empty/>:<div className="project-list">{projects.map(p=><div className="project" key={p.id}><div className="project-icon"><Workflow size={17}/></div><div className="project-main"><strong>{p.title}</strong><span>{new Date(p.created_at).toLocaleString()} · {p.provider} provider · {p.sources_count} sources</span></div><span className={'pill '+p.status}>{p.status}</span></div>)}</div>}</div><div className="panel activity"><div className="panel-head"><div><p className="eyebrow">SYSTEM</p><h3>Agent activity</h3></div></div><div className="timeline"><div><b>Planner Agent</b><span>Ready for your next question</span></div><div><b>Research Agent</b><span>DuckDuckGo search connected</span></div><div><b>RAG Retrieval</b><span>Local semantic search ready</span></div></div></div></section>
    </main>
  </div>
}

function Metric({icon,label,value,delta}:{icon:React.ReactNode;label:string;value:string;delta:string}) { return <div className="metric"><div className="metric-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{delta}</small></div></div> }
function Empty(){return <div className="empty"><div className="empty-icon"><Sparkles size={22}/></div><h4>Your research workspace is clear</h4><p>Start with a question above and your projects will appear here.</p></div>}
