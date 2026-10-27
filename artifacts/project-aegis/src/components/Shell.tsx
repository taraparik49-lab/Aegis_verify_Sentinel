import { Link, useLocation } from 'wouter';
import { Activity, Archive, ClipboardCheck, FileSearch, FileText, Fingerprint, LayoutDashboard, Menu, RotateCcw, ShieldCheck } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { clearBlobs, createDemoWorkspace, saveWorkspace } from '@/lib/model';
import { useWorkspace } from '@/lib/use-workspace';

const nav=[
 {href:'/',label:'Overview',icon:LayoutDashboard},
 {href:'/applications',label:'Applications',icon:FileSearch},
 {href:'/reviews',label:'Review queue',icon:ClipboardCheck},
 {href:'/rules',label:'Rules library',icon:FileText},
 {href:'/analytics',label:'Evaluation',icon:Activity},
 {href:'/audit',label:'Audit history',icon:Archive},
];
export function Shell({children}:{children:ReactNode}) {
 const [path]=useLocation(); const [mobileOpen,setMobileOpen]=useState(false);const [workspace]=useWorkspace();const pendingReviews=workspace.reviews.filter(review=>review.reviewStatus==='Open').length;
 return <div className="aegis-shell md:flex">
  <aside className="aegis-sidebar fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col md:flex">
   <Link href="/" className="flex items-center gap-3 px-6 py-6" data-testid="link-aegis-home">
    <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#167d70] text-white"><ShieldCheck size={19}/></span>
    <span><span className="block font-display text-[17px] font-extrabold tracking-tight text-white">AEGIS</span><span className="font-mono text-[9px] tracking-[.2em] text-slate-400">CASE DESK / LOCAL</span></span>
   </Link>
   <div className="mx-4 mb-4 rounded-md border border-white/10 bg-white/[.04] px-3 py-3">
    <div className="flex items-center gap-2 text-[11px] text-slate-200"><Fingerprint size={14} className="text-[#67c8b5]"/> Demo Reviewer</div>
    <div className="mt-1 pl-[22px] text-[10px] text-slate-400">Single local identity · no auth</div>
   </div>
   <div className="px-6 pb-2 eyebrow !text-slate-500">WORKSPACE</div>
   <nav className="flex flex-col gap-1 px-3">{nav.map(({href,label,icon:Icon})=><Link key={href} href={href} onClick={()=>setMobileOpen(false)} className={`aegis-sidebar-link ${path===href|| (href!=='/'&&path.startsWith(href+'/'))?'active':''}`} data-testid={`nav-${label.toLowerCase().replaceAll(' ','-')}`}><Icon size={17}/><span>{label}</span>{label==='Review queue'&&pendingReviews>0&&<span className="ml-auto rounded bg-[#a16a18] px-1.5 py-0.5 font-mono text-[10px] text-white">{pendingReviews}</span>}</Link>)}</nav>
   <div className="mt-auto border-t border-white/10 p-4">
    <div className="rounded-md bg-[#112d35] p-3"><div className="flex items-center gap-2 text-xs font-semibold text-[#9be0cf]"><span className="h-1.5 w-1.5 rounded-full bg-[#59c6a7]"/>Local-only workspace</div><p className="mt-1.5 text-[10px] leading-relaxed text-slate-400">Fictional records. No live verification or approval decision.</p></div>
   </div>
  </aside>
  <div className="min-w-0 flex-1 md:ml-[248px]">
   <header className="sticky top-0 z-20 flex h-[60px] items-center justify-between border-b border-slate-200 bg-[#f8faf9]/95 px-4 backdrop-blur md:px-8">
    <div className="flex items-center gap-3">
     <button className="btn-quiet grid h-9 w-9 place-items-center rounded md:hidden" onClick={()=>setMobileOpen(!mobileOpen)} aria-label="Toggle navigation" data-testid="button-mobile-menu"><Menu size={19}/></button>
     <div className="hidden text-[11px] text-slate-500 sm:block">REGULATORY DOSSIER WORKSTATION <span className="mx-2 text-slate-300">/</span><span className="font-mono text-slate-700">DEMO ENVIRONMENT</span></div>
     <div className="text-[11px] text-slate-500 sm:hidden">AEGIS / LOCAL DEMO</div>
    </div>
    <div className="flex items-center gap-2"><span className="hidden rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-mono text-[10px] text-amber-800 sm:inline">SYNTHETIC DATA</span><span className="grid h-8 w-8 place-items-center rounded-full bg-[#d9ebe6] text-xs font-bold text-[#176d60]">DR</span></div>
   </header>
   {mobileOpen&&<nav className="grid grid-cols-2 gap-1 border-b bg-white p-3 md:hidden">{nav.map(({href,label,icon:Icon})=><Link key={href} href={href} onClick={()=>setMobileOpen(false)} className="flex items-center gap-2 rounded-md p-2 text-sm text-slate-700"><Icon size={16}/>{label}</Link>)}</nav>}
   <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 md:px-9 md:py-8">{children}</main>
    <footer className="mx-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 py-4 text-[10px] text-slate-500 sm:mx-6 md:mx-9"><span>Project Aegis · browser-local demonstration</span><span>Agreement is not authenticity · a hash is not issuer proof</span><button className="btn-quiet flex items-center gap-1 rounded px-2 py-1" onClick={()=>{if(confirm('Reset this browser demo to the original fictional scenarios? This also deletes uploaded files stored in this browser.')){saveWorkspace(createDemoWorkspace());void clearBlobs().catch(()=>undefined)}}} data-testid="button-reset-workspace"><RotateCcw size={12}/> Reset demo</button></footer>
  </div>
 </div>
}
