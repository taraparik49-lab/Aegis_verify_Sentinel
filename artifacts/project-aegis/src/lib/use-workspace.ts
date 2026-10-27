import { useEffect, useState } from 'react';
import { loadWorkspace, type Workspace } from './model';

export function useWorkspace():[Workspace,(next:Workspace)=>void] {
  const [workspace,setWorkspace]=useState<Workspace>(()=>loadWorkspace());
  useEffect(()=>{const refresh=()=>setWorkspace(loadWorkspace());window.addEventListener('aegis-change',refresh);window.addEventListener('storage',refresh);return()=>{window.removeEventListener('aegis-change',refresh);window.removeEventListener('storage',refresh)}},[]);
  return [workspace,(next)=>{setWorkspace(next);localStorage.setItem('aegis.workspace.v1',JSON.stringify(next));window.dispatchEvent(new Event('aegis-change'))}];
}
