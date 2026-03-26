'use client';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

// ─── Constants ────────────────────────────────────────────────────────────────
const GW = 6, GD = 6, MAX_H = 22;
const CELLS_PER_LAYER = GW * GD;

const PC = [ // piece hex colors
  0xff3366, 0xffcc00, 0x33ee77, 0x3399ff, 0xcc44ff, 0xff8833, 0x00ddcc,
] as const;
const PC_CSS = [
  '#ff3366','#ffcc00','#33ee77','#3399ff','#cc44ff','#ff8833','#00ddcc',
];

const SHAPES: [number,number][][] = [
  [[0,0],[1,0],[2,0],[3,0]],
  [[0,0],[1,0],[0,1],[1,1]],
  [[0,0],[1,0],[2,0],[1,1]],
  [[1,0],[2,0],[0,1],[1,1]],
  [[0,0],[1,0],[1,1],[2,1]],
  [[0,0],[0,1],[1,1],[2,1]],
  [[2,0],[0,1],[1,1],[2,1]],
];

// ─── Types ────────────────────────────────────────────────────────────────────
type Cell = number | null;
interface Piece { shape:[number,number][]; ci:number; x:number; y:number; z:number; }
interface LBEntry { id:number; name:string; score:number; checkpoint:number; }

// ─── Helpers ─────────────────────────────────────────────────────────────────
function mkBoard(): Cell[][][] {
  return Array.from({length: MAX_H+4}, ()=>Array.from({length:GW},()=>Array(GD).fill(null)));
}
function rotateCW(s:[number,number][]): [number,number][] {
  const mz = Math.max(...s.map(([,z])=>z));
  return s.map(([x,z])=>[mz-z,x] as [number,number]);
}
function fits(board:Cell[][][], p:Piece): boolean {
  for(const [dx,dz] of p.shape){
    const px=p.x+dx, py=p.y, pz=p.z+dz;
    if(px<0||px>=GW||pz<0||pz>=GD||py<0||py>=board.length) return false;
    if(board[py][px][pz]!==null) return false;
  }
  return true;
}
function lock(board:Cell[][][], p:Piece){ for(const [dx,dz] of p.shape) board[p.y][p.x+dx][p.z+dz]=p.ci; }
function clearFull(board:Cell[][][]): number {
  let cleared=0;
  for(let y=board.length-1;y>=0;y--){
    if(board[y].every(r=>r.every(c=>c!==null))){
      board.splice(y,1);
      board.push(Array.from({length:GW},()=>Array(GD).fill(null)));
      cleared++;
    }
  }
  return cleared;
}
function ghostY(board:Cell[][][], p:Piece): number {
  let y=p.y;
  while(y>0&&fits(board,{...p,y:y-1})) y--;
  return y;
}
function topY(board:Cell[][][]): number {
  for(let y=board.length-1;y>=0;y--)
    for(let x=0;x<GW;x++) for(let z=0;z<GD;z++) if(board[y][x][z]!==null) return y+1;
  return 0;
}
function spawnPos(shape:[number,number][]): {x:number;z:number} {
  const mxX=Math.max(...shape.map(([x])=>x));
  const mxZ=Math.max(...shape.map(([,z])=>z));
  return {x:Math.floor((GW-mxX-1)/2), z:Math.floor((GD-mxZ-1)/2)};
}
function dropInterval(level:number){ return Math.max(250, 1200-level*70); }

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ThePlay3DPage() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [score, setScore]       = useState(0);
  const [level, setLevel]       = useState(1);
  const [chk, setChk]           = useState(0);
  const [phase, setPhase]       = useState<'idle'|'playing'|'dead'>('idle');
  const [nextCi, setNextCi]     = useState(0);
  const [nextSi, setNextSi]     = useState(0);
  const [lb, setLb]             = useState<LBEntry[]>([]);
  const [showSub, setShowSub]   = useState(false);
  const [pname, setPname]       = useState('');
  const [submitting, setSubmit] = useState(false);
  const phaseRef = useRef<'idle'|'playing'|'dead'>('idle');
  const scoreRef = useRef(0);
  const chkRef   = useRef(0);
  const startRef = useRef<()=>void>(()=>{});
  const flashRef = useRef(false);

  // Leaderboard polling
  const fetchLbOnMount = () => fetch('/api/play3d').then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setLb(d); });
  useEffect(()=>{ fetchLbOnMount(); const t=setInterval(fetchLbOnMount,20000); return()=>clearInterval(t); },[]);

  // Three.js engine
  useEffect(()=>{
    const el = mountRef.current!;
    const W = ()=>el.clientWidth, H = ()=>el.clientHeight;

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    renderer.shadowMap.enabled = true;
    renderer.setSize(W(),H());
    el.appendChild(renderer.domElement);

    // ── Scene ──
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe8d8ff);
    scene.fog = new THREE.Fog(0xe8d8ff,30,60);

    // ── Camera ──
    const camera = new THREE.PerspectiveCamera(55, W()/H(), 0.1, 100);

    // ── Lights ──
    scene.add(new THREE.AmbientLight(0xffffff,0.7));
    const sun = new THREE.DirectionalLight(0xffffff,1.2);
    sun.position.set(8,20,10); sun.castShadow=true; scene.add(sun);
    const pl1 = new THREE.PointLight(0xff44aa,1.5,30); pl1.position.set(-4,8,-2); scene.add(pl1);
    const pl2 = new THREE.PointLight(0x44aaff,1.5,30); pl2.position.set(10,8,10); scene.add(pl2);

    // ── Floor ──
    const floorG = new THREE.PlaneGeometry(40,40);
    const floorM = new THREE.MeshStandardMaterial({color:0xf0e8ff,roughness:0.9,metalness:0});
    const floor  = new THREE.Mesh(floorG,floorM);
    floor.rotation.x=-Math.PI/2; floor.position.y=-0.6; floor.receiveShadow=true;
    scene.add(floor);

    // ── Printer frame ──
    const frameM = new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.3,metalness:0.5});
    const pillarG = new THREE.BoxGeometry(0.12,MAX_H+2,0.12);
    const corners:[number,number][] = [[0,0],[GW,0],[0,GD],[GW,GD]];
    for(const [cx,cz] of corners){
      const m=new THREE.Mesh(pillarG,frameM); m.position.set(cx,(MAX_H+2)/2-0.6,cz);
      m.castShadow=true; scene.add(m);
    }
    const barH = MAX_H+1.5;
    const topBarG = new THREE.BoxGeometry(GW,0.12,0.12);
    const topBarG2 = new THREE.BoxGeometry(0.12,0.12,GD);
    for(const cz of [0,GD]){
      const b=new THREE.Mesh(topBarG,frameM); b.position.set(GW/2,barH,cz); scene.add(b);
    }
    for(const cx of [0,GW]){
      const b=new THREE.Mesh(topBarG2,frameM); b.position.set(cx,barH,GD/2); scene.add(b);
    }

    // ── Printer bed / platform ──
    const bedG = new THREE.BoxGeometry(GW,0.12,GD);
    const bedM = new THREE.MeshStandardMaterial({color:0xff8844,roughness:0.4,metalness:0.3});
    const bed  = new THREE.Mesh(bedG,bedM); bed.position.set(GW/2,-0.56,GD/2); bed.receiveShadow=true;
    scene.add(bed);

    // Grid lines on bed
    const gh = new THREE.GridHelper(Math.max(GW,GD),Math.max(GW,GD),0xffffff,0xffffff);
    gh.position.set(GW/2,-0.49,GD/2); gh.material.opacity=0.4; gh.material.transparent=true;
    scene.add(gh);

    // ── Board meshes ──
    const boardGroup = new THREE.Group(); scene.add(boardGroup);
    const pieceGroup = new THREE.Group(); scene.add(pieceGroup);
    const ghostGroup = new THREE.Group(); scene.add(ghostGroup);
    const cellGeo    = new THREE.BoxGeometry(0.88,0.88,0.88);
    const cellMats   = PC.map(c=>new THREE.MeshStandardMaterial({color:c,roughness:0.3,metalness:0.1,emissive:c,emissiveIntensity:0.15}));
    const ghostMat   = new THREE.MeshStandardMaterial({color:0xffffff,transparent:true,opacity:0.18,roughness:1,metalness:0});

    function mkMesh(ci:number, ghost=false): THREE.Mesh {
      const m = new THREE.Mesh(cellGeo, ghost ? ghostMat : cellMats[ci]);
      m.castShadow=true; return m;
    }
    function cellPos(x:number,y:number,z:number){ return new THREE.Vector3(x+0.5,y+0.5,z+0.5); }

    // ── Game state ──
    let board   = mkBoard();
    let piece:Piece|null = null;
    let lScore  = 0, lLevel = 1, lChk = 0, lPhase:'idle'|'playing'|'dead'='idle';
    let nSi     = Math.floor(Math.random()*7);
    let nCi     = nSi;
    let dropAcc = 0;

    function pushUI(){
      setScore(lScore); setLevel(lLevel); setChk(lChk);
      setPhase(lPhase); setNextCi(nCi); setNextSi(nSi);
      phaseRef.current = lPhase;
      scoreRef.current = lScore;
      chkRef.current   = lChk;
    }

    function rebuildBoard(){
      boardGroup.clear();
      for(let y=0;y<board.length;y++) for(let x=0;x<GW;x++) for(let z=0;z<GD;z++){
        const ci=board[y][x][z];
        if(ci!==null){ const m=mkMesh(ci); m.position.copy(cellPos(x,y,z)); boardGroup.add(m); }
      }
    }

    function rebuildPiece(){
      pieceGroup.clear(); ghostGroup.clear();
      if(!piece) return;
      const gy = ghostY(board,piece);
      for(const [dx,dz] of piece.shape){
        const pm=mkMesh(piece.ci); pm.position.copy(cellPos(piece.x+dx,piece.y,piece.z+dz)); pieceGroup.add(pm);
        if(gy!==piece.y){ const gm=mkMesh(piece.ci,true); gm.position.copy(cellPos(piece.x+dx,gy,piece.z+dz)); ghostGroup.add(gm); }
      }
    }

    function flashClear(cb:()=>void){
      flashRef.current=true;
      // Turn all board cells white for 350ms
      boardGroup.children.forEach(c=>{ ((c as THREE.Mesh).material as THREE.MeshStandardMaterial).color.set(0xffffff); ((c as THREE.Mesh).material as THREE.MeshStandardMaterial).emissive.set(0xffffff); ((c as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity=0.8; });
      setTimeout(()=>{ flashRef.current=false; cb(); },380);
    }

    function spawnPiece(): boolean {
      const si=nSi, ci=nCi;
      nSi=Math.floor(Math.random()*7); nCi=nSi;
      const shape=SHAPES[si];
      const ty=topY(board);
      const {x,z}=spawnPos(shape);
      const p:Piece={shape,ci,x,y:ty,z};
      if(!fits(board,p)) return false;
      piece=p; return true;
    }

    function hardDrop(){
      if(!piece||lPhase!=='playing') return;
      const gy=ghostY(board,piece);
      piece={...piece,y:gy};
      placePiece();
    }

    function placePiece(){
      if(!piece) return;
      lock(board,piece);
      piece=null;
      const cleared=clearFull(board);
      if(cleared>0){
        lChk+=cleared;
        lScore+=cleared===1?100:cleared===2?300:cleared===3?500:800;
        lLevel=Math.floor(lChk/3)+1;
        const snap=mkBoard(); board.forEach((layer,y)=>{ layer.forEach((row,x)=>{ row.forEach((c,z)=>{ snap[y][x][z]=c; }); }); }); board=snap;
        flashClear(()=>{ rebuildBoard(); pushUI(); if(!spawnPiece()) endGame(); else{ rebuildPiece(); pushUI(); } });
      } else {
        lScore+=5;
        rebuildBoard(); rebuildPiece(); pushUI();
        if(!spawnPiece()) endGame(); else{ rebuildPiece(); pushUI(); }
      }
    }

    function tryDrop(){
      if(!piece||lPhase!=='playing') return;
      const moved={...piece,y:piece.y-1};
      if(fits(board,moved)){ piece=moved; rebuildPiece(); }
      else placePiece();
    }

    function movePiece(dx:number,dz:number){
      if(!piece||lPhase!=='playing') return;
      const moved={...piece,x:piece.x+dx,z:piece.z+dz};
      if(fits(board,moved)){ piece=moved; rebuildPiece(); }
    }

    function rotatePiece(){
      if(!piece||lPhase!=='playing') return;
      const ns=rotateCW(piece.shape);
      const moved={...piece,shape:ns};
      if(fits(board,moved)){ piece=moved; rebuildPiece(); }
      else {
        // wall kicks
        for(const [kx,kz] of [[1,0],[-1,0],[0,1],[0,-1],[2,0],[-2,0]]){
          const k={...moved,x:moved.x+kx,z:moved.z+kz};
          if(fits(board,k)){ piece=k; rebuildPiece(); return; }
        }
      }
    }

    function endGame(){
      lPhase='dead'; piece=null; rebuildPiece();
      pushUI(); setShowSub(true);
    }

    function startGame(){
      board=mkBoard(); piece=null; lScore=0; lLevel=1; lChk=0; lPhase='playing';
      nSi=Math.floor(Math.random()*7); nCi=nSi;
      boardGroup.clear(); pieceGroup.clear(); ghostGroup.clear();
      setShowSub(false);
      if(!spawnPiece()){ endGame(); return; }
      rebuildPiece(); pushUI();
    }

    startRef.current = startGame;

    // ── Orbit camera ──
    let theta=0.7, phi=1.0, radius=14;
    let isDrag=false, lmx=0, lmy=0;

    function updateCamera(){
      const tx=GW/2, ty=Math.max(3,topY(board)/2+1), tz=GD/2;
      camera.position.set(
        tx + radius*Math.sin(phi)*Math.sin(theta),
        ty + radius*Math.cos(phi),
        tz + radius*Math.sin(phi)*Math.cos(theta),
      );
      camera.lookAt(tx,ty,tz);
    }

    // ── Camera-relative movement ──
    function getDir(key:string): [number,number] {
      const fwd:   [number,number] = [-Math.sin(theta),-Math.cos(theta)];
      const right: [number,number] = [ Math.cos(theta),-Math.sin(theta)];
      let vx=0, vz=0;
      if(key==='ArrowRight'||key==='d'){[vx,vz]=[right[0],right[1]];}
      if(key==='ArrowLeft' ||key==='a'){[vx,vz]=[-right[0],-right[1]];}
      if(key==='ArrowUp'   ||key==='w'){[vx,vz]=[fwd[0],fwd[1]];}
      if(key==='ArrowDown' ||key==='s'){[vx,vz]=[-fwd[0],-fwd[1]];}
      if(Math.abs(vx)>=Math.abs(vz)) return [Math.round(vx)>0?1:-1,0];
      return [0,Math.round(vz)>0?1:-1];
    }

    // ── Input ──
    const onKey=(e:KeyboardEvent)=>{
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
      if(phaseRef.current==='idle'||phaseRef.current==='dead'){
        if(e.key===' '||e.key==='Enter') startGame(); return;
      }
      if(e.key==='r'||e.key==='R') rotatePiece();
      else if(e.key===' ') hardDrop();
      else if(['ArrowRight','ArrowLeft','ArrowUp','ArrowDown','a','d','w','s'].includes(e.key)){
        const [dx,dz]=getDir(e.key); movePiece(dx,dz);
      }
    };

    const onMD=(e:MouseEvent)=>{
      if(e.target!==renderer.domElement) return;
      isDrag=true; lmx=e.clientX; lmy=e.clientY;
    };
    const onMM=(e:MouseEvent)=>{
      if(!isDrag) return;
      theta+=(e.clientX-lmx)*0.008;
      phi  +=(e.clientY-lmy)*0.006;
      phi=Math.max(0.15,Math.min(Math.PI/2-0.05,phi));
      lmx=e.clientX; lmy=e.clientY;
    };
    const onMU=()=>{ isDrag=false; };
    const onWhl=(e:WheelEvent)=>{ radius=Math.max(8,Math.min(24,radius+e.deltaY*0.01)); };

    // Touch orbit
    let tStart:[number,number]|null=null;
    const onTD=(e:TouchEvent)=>{ if(e.touches.length===1){ tStart=[e.touches[0].clientX,e.touches[0].clientY]; } };
    const onTM=(e:TouchEvent)=>{
      if(!tStart||e.touches.length!==1) return;
      theta+=(e.touches[0].clientX-tStart[0])*0.008;
      phi  +=(e.touches[0].clientY-tStart[1])*0.006;
      phi=Math.max(0.15,Math.min(Math.PI/2-0.05,phi));
      tStart=[e.touches[0].clientX,e.touches[0].clientY];
    };
    const onTU=()=>{ tStart=null; };

    window.addEventListener('keydown',onKey);
    window.addEventListener('mousedown',onMD);
    window.addEventListener('mousemove',onMM);
    window.addEventListener('mouseup',onMU);
    window.addEventListener('wheel',onWhl,{passive:true});
    renderer.domElement.addEventListener('touchstart',onTD,{passive:true});
    renderer.domElement.addEventListener('touchmove',onTM,{passive:true});
    renderer.domElement.addEventListener('touchend',onTU);

    // ── Resize ──
    const onResize=()=>{ renderer.setSize(W(),H()); camera.aspect=W()/H(); camera.updateProjectionMatrix(); };
    window.addEventListener('resize',onResize);

    // ── Game loop ──
    let rafId:number, last=0;
    const animate=(now:number)=>{
      rafId=requestAnimationFrame(animate);
      const dt=now-last; last=now;
      if(lPhase==='playing'&&!flashRef.current){
        dropAcc+=dt;
        if(dropAcc>=dropInterval(lLevel)){ dropAcc=0; tryDrop(); }
      }
      updateCamera();
      renderer.render(scene,camera);
    };
    rafId=requestAnimationFrame(animate);

    return ()=>{
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown',onKey);
      window.removeEventListener('mousedown',onMD);
      window.removeEventListener('mousemove',onMM);
      window.removeEventListener('mouseup',onMU);
      window.removeEventListener('wheel',onWhl);
      window.removeEventListener('resize',onResize);
      renderer.dispose();
      if(el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  // ─── Submit score ─────────────────────────────────────────────────────────
  const submitScore = async () => {
    if(!pname.trim()||submitting) return;
    setSubmit(true);
    try {
      const tr = await fetch(`/api/play3d/token?score=${scoreRef.current}&checkpoint=${chkRef.current}`);
      const {token} = await tr.json();
      await fetch('/api/play3d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:pname.trim(),token})});
      setShowSub(false); doFetchLB();
    } finally { setSubmit(false); }
  };
  const doFetchLB = ()=>fetch('/api/play3d').then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setLb(d); });

  // ─── Piece preview ────────────────────────────────────────────────────────
  const pv = SHAPES[nextSi];
  const pvW = Math.max(...pv.map(([x])=>x))+1;
  const pvH = Math.max(...pv.map(([,z])=>z))+1;

  return (
    <div style={{position:'relative',width:'100vw',height:'100vh',overflow:'hidden',fontFamily:'system-ui,sans-serif'}}>
      {/* Canvas */}
      <div ref={mountRef} style={{position:'absolute',inset:0}} />

      {/* Top bar */}
      <div style={{position:'absolute',top:0,left:0,right:0,display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 18px',background:'rgba(255,255,255,0.55)',backdropFilter:'blur(8px)',borderBottom:'1px solid rgba(150,80,255,0.2)'}}>
        <span style={{fontWeight:900,fontSize:18,color:'#7c3aed',letterSpacing:1}}>▶ PLAY3D</span>
        <div style={{display:'flex',gap:24}}>
          {[['ניקוד',score],['שלב',level],['שכבות',chk]].map(([l,v])=>(
            <div key={l as string} style={{textAlign:'center'}}>
              <div style={{fontSize:10,color:'#9c60ff',fontWeight:700,letterSpacing:1}}>{l}</div>
              <div style={{fontSize:22,fontWeight:900,color:'#5b21b6',lineHeight:1}}>{v as number}</div>
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:8,fontSize:11,color:'#7c3aed',opacity:0.8,flexDirection:'column',alignItems:'flex-end'}}>
          <span>🖱 גרור = סיבוב מצלמה</span>
          <span>← → ↑ ↓ = זוז • R = סובב • Space = נפל</span>
        </div>
      </div>

      {/* Next piece + leaderboard panel */}
      <div style={{position:'absolute',top:70,right:14,display:'flex',flexDirection:'column',gap:12,width:170}}>
        {/* Next */}
        <div style={{background:'rgba(255,255,255,0.7)',backdropFilter:'blur(8px)',borderRadius:12,padding:12,border:'1px solid rgba(150,80,255,0.25)'}}>
          <div style={{fontSize:10,color:'#9c60ff',fontWeight:700,marginBottom:8,letterSpacing:1}}>הבלוק הבא</div>
          <div style={{display:'grid',gridTemplateColumns:`repeat(${pvW},20px)`,gridTemplateRows:`repeat(${pvH},20px)`,gap:2,margin:'0 auto',width:'fit-content'}}>
            {Array.from({length:pvH},(_,z)=>Array.from({length:pvW},(_,x)=>(
              <div key={`${x},${z}`} style={{width:20,height:20,borderRadius:4,background:pv.some(([px,pz])=>px===x&&pz===z)?PC_CSS[nextCi]:'rgba(0,0,0,0.07)'}} />
            )))}
          </div>
        </div>

        {/* Leaderboard */}
        <div style={{background:'rgba(255,255,255,0.7)',backdropFilter:'blur(8px)',borderRadius:12,padding:12,border:'1px solid rgba(150,80,255,0.25)'}}>
          <div style={{fontSize:10,color:'#9c60ff',fontWeight:700,marginBottom:8,letterSpacing:1}}>🏆 טבלת שיאים</div>
          {lb.length===0 && <div style={{fontSize:11,color:'#aaa',textAlign:'center'}}>עוד אין שחקנים</div>}
          {lb.slice(0,10).map((e,i)=>(
            <div key={e.id} style={{display:'flex',alignItems:'center',gap:6,padding:'3px 0',borderBottom:'1px solid rgba(0,0,0,0.05)'}}>
              <span style={{fontSize:10,color:i<3?['#f59e0b','#94a3b8','#b45309'][i]:'#c4b5fd',fontWeight:700,width:14,flexShrink:0}}>{i+1}</span>
              <span style={{fontSize:11,fontWeight:600,color:'#4c1d95',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.name}</span>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:11,fontWeight:800,color:'#7c3aed'}}>{e.score}</div>
                <div style={{fontSize:9,color:'#a78bfa'}}>שכבה {e.checkpoint}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Idle overlay */}
      {phase==='idle' && (
        <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'rgba(200,170,255,0.35)',backdropFilter:'blur(4px)'}}>
          <div style={{background:'white',borderRadius:24,padding:'40px 56px',textAlign:'center',boxShadow:'0 8px 40px rgba(100,50,200,0.2)',border:'2px solid rgba(140,80,255,0.3)'}}>
            <div style={{fontSize:48,marginBottom:8}}>🖨️</div>
            <h1 style={{fontSize:30,fontWeight:900,color:'#5b21b6',margin:'0 0 6px'}}>PLAY3D</h1>
            <p style={{color:'#8b5cf6',fontSize:14,margin:'0 0 28px'}}>מלא שכבות שלמות כדי להדפיס!</p>
            <div style={{fontSize:13,color:'#6d28d9',marginBottom:24,lineHeight:2}}>
              ← → ↑ ↓ / WASD — הזזה<br/>
              R — סיבוב<br/>
              Space — נפילה מהירה<br/>
              🖱 גרור — סיבוב מצלמה
            </div>
            <button onClick={()=>startRef.current()} style={{padding:'12px 40px',background:'linear-gradient(135deg,#7c3aed,#db2777)',border:'none',borderRadius:12,color:'white',fontSize:16,fontWeight:800,cursor:'pointer',letterSpacing:1}}>
              התחל משחק
            </button>
          </div>
        </div>
      )}

      {/* Dead overlay */}
      {phase==='dead' && !showSub && (
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(200,170,255,0.35)',backdropFilter:'blur(4px)'}}>
          <div style={{background:'white',borderRadius:24,padding:'36px 50px',textAlign:'center',boxShadow:'0 8px 40px rgba(100,50,200,0.2)'}}>
            <div style={{fontSize:40,marginBottom:8}}>💥</div>
            <h2 style={{fontSize:24,fontWeight:900,color:'#5b21b6',margin:'0 0 12px'}}>המשחק נגמר!</h2>
            <div style={{fontSize:32,fontWeight:900,color:'#7c3aed',marginBottom:4}}>{score}</div>
            <div style={{fontSize:13,color:'#a78bfa',marginBottom:24}}>שכבות שהושלמו: {chk}</div>
            <div style={{display:'flex',gap:10,justifyContent:'center'}}>
              <button onClick={()=>setShowSub(true)} style={{padding:'10px 28px',background:'linear-gradient(135deg,#7c3aed,#db2777)',border:'none',borderRadius:10,color:'white',fontSize:14,fontWeight:700,cursor:'pointer'}}>שמור תוצאה</button>
              <button onClick={()=>startRef.current()} style={{padding:'10px 28px',background:'#f3f0ff',border:'1px solid #c4b5fd',borderRadius:10,color:'#5b21b6',fontSize:14,fontWeight:700,cursor:'pointer'}}>שחק שוב</button>
            </div>
          </div>
        </div>
      )}

      {/* Submit dialog */}
      {showSub && (
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(200,170,255,0.35)',backdropFilter:'blur(4px)'}}>
          <div style={{background:'white',borderRadius:24,padding:'36px 50px',textAlign:'center',boxShadow:'0 8px 40px rgba(100,50,200,0.2)',minWidth:280}}>
            <div style={{fontSize:36,marginBottom:8}}>🏆</div>
            <h3 style={{fontSize:20,fontWeight:900,color:'#5b21b6',margin:'0 0 6px'}}>שמור את השיא שלך</h3>
            <div style={{fontSize:26,fontWeight:900,color:'#7c3aed',marginBottom:16}}>{score} נק׳ · שכבה {chk}</div>
            <input
              value={pname} onChange={e=>setPname(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&submitScore()}
              placeholder="השם שלך"
              maxLength={20}
              style={{width:'100%',padding:'10px 14px',borderRadius:10,border:'1px solid #c4b5fd',fontSize:15,textAlign:'center',outline:'none',marginBottom:14,boxSizing:'border-box',color:'#3b0764'}}
            />
            <div style={{display:'flex',gap:10}}>
              <button onClick={submitScore} disabled={submitting||!pname.trim()} style={{flex:1,padding:'10px',background:'linear-gradient(135deg,#7c3aed,#db2777)',border:'none',borderRadius:10,color:'white',fontSize:14,fontWeight:700,cursor:'pointer',opacity:submitting||!pname.trim()?0.5:1}}>
                {submitting?'שומר...':'שמור'}
              </button>
              <button onClick={()=>startRef.current()} style={{flex:1,padding:'10px',background:'#f3f0ff',border:'1px solid #c4b5fd',borderRadius:10,color:'#5b21b6',fontSize:14,fontWeight:700,cursor:'pointer'}}>
                שחק שוב
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
