'use client';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

// ─── Constants ────────────────────────────────────────────────────────────────
const GW = 8, GD = 8, MAX_H = 8;

// Gemstone deep colors
const PC: readonly number[] = [
  0x7b2d8b, // amethyst
  0x1a3a8f, // sapphire
  0x1a6b3a, // emerald
  0x8b1a2d, // ruby
  0xb5630a, // topaz
  0x2d6b7b, // aquamarine
  0x5a1a8b, // alexandrite
  0xb8860b, // gold (single)
  0xb5145a, // rose (pair)
  0x1a6b6b, // teal (3×3)
] as const;
const PC_CSS = ['#9b3dbb','#2a5abf','#2a9b5a','#bf2a3d','#d4770a','#3d9bbb','#7a2dbb','#d4a010','#d41870','#1a9b9b'];
const SHAPE_COUNT = 10;

const SHAPES: [number,number][][] = [
  [[0,0],[1,0],[2,0],[3,0]],           // I
  [[0,0],[1,0],[0,1],[1,1]],           // O
  [[0,0],[1,0],[2,0],[1,1]],           // T
  [[1,0],[2,0],[0,1],[1,1]],           // S
  [[0,0],[1,0],[1,1],[2,1]],           // Z
  [[0,0],[0,1],[1,1],[2,1]],           // J
  [[2,0],[0,1],[1,1],[2,1]],           // L
  [[0,0]],                             // single cube
  [[0,0],[1,0]],                       // pair
  [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2]], // 3×3
];

// ─── Types ────────────────────────────────────────────────────────────────────
type Cell = number | null;
interface Piece { shape:[number,number][]; ci:number; x:number; y:number; z:number; }
interface LBEntry { id:number; name:string; score:number; checkpoint:number; }

// ─── Helpers ─────────────────────────────────────────────────────────────────
function mkBoard(): Cell[][][] {
  return Array.from({length:MAX_H+2},()=>Array.from({length:GW},()=>Array(GD).fill(null)));
}
function rotateCW(s:[number,number][]): [number,number][] {
  const mz=Math.max(...s.map(([,z])=>z));
  return s.map(([x,z])=>[mz-z,x] as [number,number]);
}
function fits(board:Cell[][][],p:Piece): boolean {
  for(const [dx,dz] of p.shape){
    const px=p.x+dx,py=p.y,pz=p.z+dz;
    if(px<0||px>=GW||pz<0||pz>=GD||py<0||py>=board.length) return false;
    if(board[py][px][pz]!==null) return false;
  }
  return true;
}
function lock(board:Cell[][][],p:Piece){ for(const [dx,dz] of p.shape) board[p.y][p.x+dx][p.z+dz]=p.ci; }
function clearLines(board:Cell[][][]): number {
  let cleared=0,changed=true;
  while(changed){
    changed=false;
    outer:
    for(let y=0;y<MAX_H;y++){
      for(let z=0;z<GD;z++){
        if(board[y].every(r=>r[z]!==null)){
          for(let x=0;x<GW;x++){
            for(let ny=y;ny<board.length-1;ny++) board[ny][x][z]=board[ny+1][x][z];
            board[board.length-1][x][z]=null;
          }
          cleared++;changed=true;break outer;
        }
      }
      for(let x=0;x<GW;x++){
        if(board[y][x].every(c=>c!==null)){
          for(let z=0;z<GD;z++){
            for(let ny=y;ny<board.length-1;ny++) board[ny][x][z]=board[ny+1][x][z];
            board[board.length-1][x][z]=null;
          }
          cleared++;changed=true;break outer;
        }
      }
    }
  }
  return cleared;
}
function ghostY(board:Cell[][][],p:Piece): number {
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
  return {x:Math.floor((GW-mxX-1)/2),z:Math.floor((GD-mxZ-1)/2)};
}
function dropInterval(level:number){ return Math.max(600,2400-level*90); }

// ─── Web Audio music ──────────────────────────────────────────────────────────
function startMusic(ctx:AudioContext): ()=>void {
  const master=ctx.createGain(); master.gain.value=0.18; master.connect(ctx.destination);
  // Reverb (simple delay)
  const delay=ctx.createDelay(0.4); delay.delayTime.value=0.32;
  const fb=ctx.createGain(); fb.gain.value=0.38;
  delay.connect(fb); fb.connect(delay); delay.connect(master);
  // Bass drone
  const bass=ctx.createOscillator(); const bassG=ctx.createGain();
  const bassF=ctx.createBiquadFilter(); bassF.type='lowpass'; bassF.frequency.value=180;
  bass.type='sawtooth'; bass.frequency.value=65.41; // C2
  bassG.gain.value=0.35; bass.connect(bassF); bassF.connect(bassG); bassG.connect(master);
  bass.start();
  // Melody arpeggio C minor pentatonic
  const scale=[261.63,311.13,349.23,392,466.16,523.25,622.25,698.46];
  let step=0,running=true;
  function playNote(){
    if(!running) return;
    const osc=ctx.createOscillator(); const g=ctx.createGain();
    osc.type='triangle';
    osc.frequency.value=scale[step%scale.length];
    const t=ctx.currentTime;
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.22,t+0.04);
    g.gain.exponentialRampToValueAtTime(0.001,t+1.2);
    osc.connect(g); g.connect(master); g.connect(delay);
    osc.start(t); osc.stop(t+1.2);
    step++; if(step%4===0) step+=Math.random()<0.3?1:0;
    setTimeout(playNote,step%3===0?700:450);
  }
  playNote();
  return ()=>{ running=false; try{bass.stop();}catch{} };
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ThePlay3DPage() {
  const mountRef   = useRef<HTMLDivElement>(null);
  const [score,setScore]     = useState(0);
  const [level,setLevel]     = useState(1);
  const [chk,setChk]         = useState(0);
  const [phase,setPhase]     = useState<'idle'|'playing'|'dead'>('idle');
  const [nextCi,setNextCi]   = useState(0);
  const [nextSi,setNextSi]   = useState(0);
  const [lb,setLb]           = useState<LBEntry[]>([]);
  const [showSub,setShowSub] = useState(false);
  const [pname,setPname]     = useState('');
  const [submitting,setSub]  = useState(false);
  const [isTouch,setIsTouch] = useState(false);

  const phaseRef   = useRef<'idle'|'playing'|'dead'>('idle');
  const scoreRef   = useRef(0);
  const chkRef     = useRef(0);
  const startRef   = useRef<()=>void>(()=>{});
  const flashRef   = useRef(false);
  const moveRef    = useRef<(dx:number,dz:number)=>void>(()=>{});
  const rotateRef  = useRef<()=>void>(()=>{});
  const dropRef    = useRef<()=>void>(()=>{});
  const getDirRef  = useRef<(k:string)=>[number,number]>(()=>[0,0]);
  const musicStop  = useRef<(()=>void)|null>(null);

  useEffect(()=>{ setIsTouch('ontouchstart' in window||navigator.maxTouchPoints>0); },[]);

  // Leaderboard
  const fetchLb=()=>fetch('/api/play3d').then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setLb(d); });
  useEffect(()=>{ fetchLb(); const t=setInterval(fetchLb,20000); return()=>clearInterval(t); },[]);

  // ── Three.js engine ──────────────────────────────────────────────────────────
  useEffect(()=>{
    const el=mountRef.current!;
    const W=()=>el.clientWidth, H=()=>el.clientHeight;

    const renderer=new THREE.WebGLRenderer({antialias:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    renderer.shadowMap.enabled=true;
    renderer.setSize(W(),H());
    el.appendChild(renderer.domElement);

    const scene=new THREE.Scene();
    scene.background=new THREE.Color(0x0d0720);
    scene.fog=new THREE.FogExp2(0x0d0720,0.035);

    const camera=new THREE.PerspectiveCamera(50,W()/H(),0.1,120);

    // Lights
    scene.add(new THREE.AmbientLight(0x9966cc,0.5));
    const sun=new THREE.DirectionalLight(0xffffff,0.8); sun.position.set(10,20,8); sun.castShadow=true; scene.add(sun);
    const pl1=new THREE.PointLight(0x4422ff,2,25); pl1.position.set(-2,6,-2); scene.add(pl1);
    const pl2=new THREE.PointLight(0xff2266,1.5,20); pl2.position.set(GW+2,5,GD+2); scene.add(pl2);
    const pl3=new THREE.PointLight(0x22ffcc,1.2,20); pl3.position.set(GW/2,MAX_H+3,GD/2); scene.add(pl3);

    // Floor
    const floorM=new THREE.MeshStandardMaterial({color:0x0a0518,roughness:1,metalness:0});
    const flr=new THREE.Mesh(new THREE.PlaneGeometry(60,60),floorM);
    flr.rotation.x=-Math.PI/2; flr.position.y=-0.1; flr.receiveShadow=true; scene.add(flr);

    // Printer frame — encloses exactly MAX_H=8 layers
    const frameM=new THREE.MeshStandardMaterial({color:0xccccee,roughness:0.2,metalness:0.8});
    const pillarH=MAX_H+0.1;
    const pillarG=new THREE.BoxGeometry(0.1,pillarH,0.1);
    for(const [cx,cz] of [[0,0],[GW,0],[0,GD],[GW,GD]] as [number,number][]){
      const m=new THREE.Mesh(pillarG,frameM);
      m.position.set(cx,pillarH/2,cz); m.castShadow=true; scene.add(m);
    }
    // Top cap
    for(const cz of [0,GD]){
      const b=new THREE.Mesh(new THREE.BoxGeometry(GW,0.08,0.08),frameM);
      b.position.set(GW/2,MAX_H+0.04,cz); scene.add(b);
    }
    for(const cx of [0,GW]){
      const b=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.08,GD),frameM);
      b.position.set(cx,MAX_H+0.04,GD/2); scene.add(b);
    }
    // Height markers on pillars (every 2 layers)
    const markerM=new THREE.MeshStandardMaterial({color:0x6644aa,roughness:0.5,metalness:0.3,transparent:true,opacity:0.6});
    for(let y=2;y<=MAX_H;y+=2){
      for(const [cx,cz] of [[0,0],[GW,0],[0,GD],[GW,GD]] as [number,number][]){
        const m=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.04,0.2),markerM);
        m.position.set(cx,y,cz); scene.add(m);
      }
    }

    // Bed — top face at y=0.06 (= bottom of first cell layer)
    const bedM=new THREE.MeshStandardMaterial({color:0x1a0f3a,roughness:0.3,metalness:0.6,emissive:0x220055,emissiveIntensity:0.5});
    const bed=new THREE.Mesh(new THREE.BoxGeometry(GW,0.12,GD),bedM);
    bed.position.set(GW/2,0,GD/2); bed.receiveShadow=true; scene.add(bed);

    // Grid on bed surface
    const gh=new THREE.GridHelper(GW,GW,0x6633cc,0x3311aa);
    gh.position.set(GW/2,0.07,GD/2);
    (gh.material as THREE.Material).transparent=true;
    (gh.material as THREE.Material).opacity=0.7;
    scene.add(gh);

    // Transparent walls (playfield guides)
    const wallM=new THREE.MeshStandardMaterial({color:0x4422aa,transparent:true,opacity:0.06,side:THREE.DoubleSide,depthWrite:false});
    for(const [wx,wz,rotY] of [[GW/2,0,0],[GW/2,GD,0],[0,GD/2,Math.PI/2],[GW,GD/2,Math.PI/2]] as [number,number,number][]){
      const w=new THREE.Mesh(new THREE.PlaneGeometry(GW,MAX_H),wallM);
      w.position.set(wx,MAX_H/2,wz); w.rotation.y=rotY; scene.add(w);
    }

    // Board / piece meshes
    const boardGroup=new THREE.Group(); scene.add(boardGroup);
    const pieceGroup=new THREE.Group(); scene.add(pieceGroup);
    const ghostGroup=new THREE.Group(); scene.add(ghostGroup);
    const cellGeo=new THREE.BoxGeometry(0.88,0.88,0.88);
    const cellMats=PC.map(c=>new THREE.MeshStandardMaterial({
      color:c,roughness:0.15,metalness:0.7,
      emissive:c,emissiveIntensity:0.25,
    }));
    function mkMesh(ci:number,ghost=false): THREE.Mesh {
      const m=ghost
        ? new THREE.Mesh(cellGeo,new THREE.MeshStandardMaterial({color:PC[ci],transparent:true,opacity:0.35,emissive:PC[ci],emissiveIntensity:0.5,depthWrite:false}))
        : new THREE.Mesh(cellGeo,cellMats[ci]);
      m.castShadow=!ghost; return m;
    }
    function cellPos(x:number,y:number,z:number){ return new THREE.Vector3(x+0.5,y+0.5,z+0.5); }

    // ── Game state ──
    let board=mkBoard();
    let piece:Piece|null=null;
    let lScore=0,lLevel=1,lChk=0,lPhase:'idle'|'playing'|'dead'='idle';
    let nSi=Math.floor(Math.random()*SHAPE_COUNT),nCi=nSi;
    let dropAcc=0;

    function pushUI(){
      setScore(lScore);setLevel(lLevel);setChk(lChk);
      setPhase(lPhase);setNextCi(nCi);setNextSi(nSi);
      phaseRef.current=lPhase;scoreRef.current=lScore;chkRef.current=lChk;
    }
    function rebuildBoard(){
      boardGroup.clear();
      for(let y=0;y<MAX_H;y++) for(let x=0;x<GW;x++) for(let z=0;z<GD;z++){
        const ci=board[y][x][z];
        if(ci!==null){const m=mkMesh(ci);m.position.copy(cellPos(x,y,z));boardGroup.add(m);}
      }
    }
    function rebuildPiece(){
      pieceGroup.clear();ghostGroup.clear();
      if(!piece) return;
      const gy=ghostY(board,piece);
      for(const [dx,dz] of piece.shape){
        const pm=mkMesh(piece.ci); pm.position.copy(cellPos(piece.x+dx,piece.y,piece.z+dz)); pieceGroup.add(pm);
        if(gy!==piece.y){const gm=mkMesh(piece.ci,true);gm.position.copy(cellPos(piece.x+dx,gy,piece.z+dz));ghostGroup.add(gm);}
      }
    }
    function flashClear(cb:()=>void){
      flashRef.current=true;
      boardGroup.children.forEach(c=>{
        const mat=(c as THREE.Mesh).material as THREE.MeshStandardMaterial;
        mat.color.set(0xffffff);mat.emissive.set(0xffffff);mat.emissiveIntensity=1;
      });
      setTimeout(()=>{
        // Reset shared materials back to original gemstone colors before rebuild
        PC.forEach((c,i)=>{ cellMats[i].color.set(c); cellMats[i].emissive.set(c); cellMats[i].emissiveIntensity=0.25; });
        flashRef.current=false; cb();
      },420);
    }
    function spawnPiece(): boolean {
      const si=nSi,ci=nCi;
      nSi=Math.floor(Math.random()*SHAPE_COUNT);nCi=nSi;
      const shape=SHAPES[si];
      if(topY(board)>=MAX_H) return false;
      const {x,z}=spawnPos(shape);
      const p:Piece={shape,ci,x,y:MAX_H-1,z};
      if(!fits(board,p)) return false;
      piece=p; return true;
    }
    function hardDrop(){
      if(!piece||lPhase!=='playing') return;
      piece={...piece,y:ghostY(board,piece)};
      placePiece();
    }
    function placePiece(){
      if(!piece) return;
      lock(board,piece); piece=null; dropAcc=0;
      const cleared=clearLines(board);
      if(cleared>0){
        lChk+=cleared;
        lScore+=cleared===1?150:cleared===2?400:cleared===3?750:1200;
        lLevel=Math.floor(lChk/4)+1;
        const snap=mkBoard();
        board.forEach((layer,y)=>layer.forEach((row,x)=>row.forEach((c,z)=>{snap[y][x][z]=c;})));
        board=snap;
        flashClear(()=>{rebuildBoard();pushUI();if(!spawnPiece())endGame();else{rebuildPiece();pushUI();}});
      } else {
        rebuildBoard();rebuildPiece();pushUI();
        if(!spawnPiece()) endGame(); else{rebuildPiece();pushUI();}
      }
    }
    function tryDrop(){
      if(!piece||lPhase!=='playing') return;
      const moved={...piece,y:piece.y-1};
      if(fits(board,moved)){piece=moved;rebuildPiece();}
      else placePiece();
    }
    function movePiece(dx:number,dz:number){
      if(!piece||lPhase!=='playing') return;
      const moved={...piece,x:piece.x+dx,z:piece.z+dz};
      if(fits(board,moved)){piece=moved;rebuildPiece();}
    }
    function rotatePiece(){
      if(!piece||lPhase!=='playing') return;
      const ns=rotateCW(piece.shape);
      const moved={...piece,shape:ns};
      if(fits(board,moved)){piece=moved;rebuildPiece();return;}
      for(const [kx,kz] of [[1,0],[-1,0],[0,1],[0,-1],[2,0],[-2,0]]){
        const k={...moved,x:moved.x+kx,z:moved.z+kz};
        if(fits(board,k)){piece=k;rebuildPiece();return;}
      }
    }
    function endGame(){
      lPhase='dead';piece=null;rebuildPiece();pushUI();setShowSub(true);
      musicStop.current?.();musicStop.current=null;
    }
    function startGame(){
      board=mkBoard();piece=null;lScore=0;lLevel=1;lChk=0;lPhase='playing';
      nSi=Math.floor(Math.random()*SHAPE_COUNT);nCi=nSi;dropAcc=0;
      boardGroup.clear();pieceGroup.clear();ghostGroup.clear();setShowSub(false);
      // Start music
      musicStop.current?.();
      try{
        const ctx=new AudioContext();
        if(ctx.state==='suspended') ctx.resume();
        musicStop.current=startMusic(ctx);
      }catch{}
      if(!spawnPiece()){endGame();return;}
      rebuildPiece();pushUI();
    }
    startRef.current=startGame;
    moveRef.current=movePiece;
    rotateRef.current=rotatePiece;
    dropRef.current=hardDrop;

    // ── Camera orbit ──
    let theta=0.65,phi=0.88,radius=20;
    let isDrag=false,lmx=0,lmy=0;
    function updateCamera(){
      const tx=GW/2,ty=MAX_H/2,tz=GD/2;
      camera.position.set(
        tx+radius*Math.sin(phi)*Math.sin(theta),
        ty+radius*Math.cos(phi),
        tz+radius*Math.sin(phi)*Math.cos(theta),
      );
      camera.lookAt(tx,ty,tz);
    }
    function getDir(key:string): [number,number] {
      const fwd:[number,number]=[-Math.sin(theta),-Math.cos(theta)];
      const right:[number,number]=[Math.cos(theta),-Math.sin(theta)];
      let vx=0,vz=0;
      if(key==='r'||key==='ArrowRight'){[vx,vz]=[right[0],right[1]];}
      if(key==='l'||key==='ArrowLeft'){[vx,vz]=[-right[0],-right[1]];}
      if(key==='u'||key==='ArrowUp'){[vx,vz]=[fwd[0],fwd[1]];}
      if(key==='d'||key==='ArrowDown'){[vx,vz]=[-fwd[0],-fwd[1]];}
      if(Math.abs(vx)>=Math.abs(vz)) return [Math.round(vx)>0?1:-1,0];
      return [0,Math.round(vz)>0?1:-1];
    }
    getDirRef.current=getDir;

    // ── Keyboard ──
    const onKey=(e:KeyboardEvent)=>{
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
      if(e.key==='Control'||e.key==='Alt') e.preventDefault();
      if(phaseRef.current!=='playing'){
        if(e.key===' '||e.key==='Enter') startGame(); return;
      }
      if(e.key==='r'||e.key==='R'||e.key==='Control'||e.key==='Alt') rotatePiece();
      else if(e.key===' ') hardDrop();
      else if(['ArrowRight','ArrowLeft','ArrowUp','ArrowDown','a','d','w','s'].includes(e.key)){
        const k=e.key==='a'?'ArrowLeft':e.key==='d'?'ArrowRight':e.key==='w'?'ArrowUp':e.key==='s'?'ArrowDown':e.key;
        const [dx,dz]=getDir(k); movePiece(dx,dz);
      }
    };
    // ── Mouse orbit ──
    const onMD=(e:MouseEvent)=>{if(e.target!==renderer.domElement)return;isDrag=true;lmx=e.clientX;lmy=e.clientY;};
    const onMM=(e:MouseEvent)=>{if(!isDrag)return;theta-=(e.clientX-lmx)*0.007;phi-=(e.clientY-lmy)*0.005;phi=Math.max(0.1,Math.min(1.5,phi));lmx=e.clientX;lmy=e.clientY;};
    const onMU=()=>{isDrag=false;};
    const onWhl=(e:WheelEvent)=>{radius=Math.max(10,Math.min(30,radius+e.deltaY*0.012));};
    // ── Touch orbit (2-finger = orbit, single = game) ──
    let orbitT:[number,number]|null=null;
    const onTD=(e:TouchEvent)=>{if(e.touches.length===2){orbitT=[e.touches[0].clientX,e.touches[0].clientY];}};
    const onTM=(e:TouchEvent)=>{
      if(!orbitT||e.touches.length!==2)return;
      theta+=(e.touches[0].clientX-orbitT[0])*0.007;
      phi+=(e.touches[0].clientY-orbitT[1])*0.005;
      phi=Math.max(0.1,Math.min(1.5,phi));
      orbitT=[e.touches[0].clientX,e.touches[0].clientY];
    };
    const onTU=()=>{orbitT=null;};

    window.addEventListener('keydown',onKey);
    window.addEventListener('mousedown',onMD);
    window.addEventListener('mousemove',onMM);
    window.addEventListener('mouseup',onMU);
    window.addEventListener('wheel',onWhl,{passive:true});
    renderer.domElement.addEventListener('touchstart',onTD,{passive:true});
    renderer.domElement.addEventListener('touchmove',onTM,{passive:true});
    renderer.domElement.addEventListener('touchend',onTU);
    const onResize=()=>{renderer.setSize(W(),H());camera.aspect=W()/H();camera.updateProjectionMatrix();};
    window.addEventListener('resize',onResize);

    // ── Game loop ──
    let rafId:number,last=0;
    const animate=(now:number)=>{
      rafId=requestAnimationFrame(animate);
      const dt=Math.min(now-last,100);last=now;
      if(lPhase==='playing'&&!flashRef.current){
        dropAcc+=dt;
        if(dropAcc>=dropInterval(lLevel)){dropAcc=0;tryDrop();}
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
      musicStop.current?.();
      if(el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  // ── Submit score ──────────────────────────────────────────────────────────────
  const submitScore=async()=>{
    if(!pname.trim()||submitting) return;
    setSub(true);
    try{
      const {token}=await fetch(`/api/play3d/token?score=${scoreRef.current}&checkpoint=${chkRef.current}`).then(r=>r.json());
      await fetch('/api/play3d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:pname.trim(),token})});
      setShowSub(false);fetchLb();
    }finally{setSub(false);}
  };

  // ── Piece preview ─────────────────────────────────────────────────────────────
  const pv=SHAPES[nextSi];
  const pvW=Math.max(...pv.map(([x])=>x))+1;
  const pvH=Math.max(...pv.map(([,z])=>z))+1;

  // D-pad handler
  const dpad=(action:string)=>{
    if(phaseRef.current!=='playing') return;
    if(action==='rotate') rotateRef.current();
    else if(action==='drop') dropRef.current();
    else { const [dx,dz]=getDirRef.current(action); moveRef.current(dx,dz); }
  };

  const panelBg='rgba(15,8,40,0.82)';
  const panelBorder='1px solid rgba(120,60,220,0.35)';

  return (
    <div style={{position:'relative',width:'100vw',height:'100vh',overflow:'hidden',fontFamily:'system-ui,sans-serif',background:'#0d0720'}}>
      <div ref={mountRef} style={{position:'absolute',inset:0}} />

      {/* Top bar */}
      <div style={{position:'absolute',top:0,left:0,right:0,display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 16px',background:panelBg,backdropFilter:'blur(12px)',borderBottom:panelBorder}}>
        <span style={{fontWeight:900,fontSize:16,color:'#bb88ff',letterSpacing:2}}>▶ PLAY3D</span>
        <div style={{display:'flex',gap:20}}>
          {[['ניקוד',score],['שלב',level],['שורות',chk]].map(([l,v])=>(
            <div key={l as string} style={{textAlign:'center'}}>
              <div style={{fontSize:9,color:'#8855cc',fontWeight:700,letterSpacing:1}}>{l}</div>
              <div style={{fontSize:20,fontWeight:900,color:'#ddaaff',lineHeight:1}}>{v as number}</div>
            </div>
          ))}
        </div>
        {!isTouch && <div style={{fontSize:10,color:'#7744aa',textAlign:'right',lineHeight:1.8}}>
          🖱 גרור = מצלמה &nbsp;←→↑↓ = זוז<br/>R = סובב &nbsp;Space = נפל
        </div>}
      </div>

      {/* Side panel */}
      <div style={{position:'absolute',top:56,right:12,display:'flex',flexDirection:'column',gap:10,width:158}}>
        <div style={{background:panelBg,backdropFilter:'blur(12px)',borderRadius:12,padding:12,border:panelBorder}}>
          <div style={{fontSize:9,color:'#8855cc',fontWeight:700,marginBottom:8,letterSpacing:1}}>הבלוק הבא</div>
          <div style={{display:'grid',gridTemplateColumns:`repeat(${pvW},22px)`,gridTemplateRows:`repeat(${pvH},22px)`,gap:2,margin:'0 auto',width:'fit-content'}}>
            {Array.from({length:pvH},(_,z)=>Array.from({length:pvW},(_,x)=>(
              <div key={`${x},${z}`} style={{width:22,height:22,borderRadius:5,background:pv.some(([px,pz])=>px===x&&pz===z)?PC_CSS[nextCi]:'rgba(80,40,120,0.3)',boxShadow:pv.some(([px,pz])=>px===x&&pz===z)?`0 0 8px ${PC_CSS[nextCi]}88`:undefined}} />
            )))}
          </div>
        </div>
        <div style={{background:panelBg,backdropFilter:'blur(12px)',borderRadius:12,padding:12,border:panelBorder}}>
          <div style={{fontSize:9,color:'#8855cc',fontWeight:700,marginBottom:8,letterSpacing:1}}>🏆 שיאים</div>
          {lb.length===0 && <div style={{fontSize:10,color:'#664488',textAlign:'center'}}>אין עדיין</div>}
          {lb.slice(0,10).map((e,i)=>(
            <div key={e.id} style={{display:'flex',alignItems:'center',gap:5,padding:'3px 0',borderBottom:'1px solid rgba(80,40,120,0.2)'}}>
              <span style={{fontSize:9,color:i<3?['#ffd700','#c0c0c0','#cd7f32'][i]:'#7755aa',fontWeight:700,width:12,flexShrink:0}}>{i+1}</span>
              <span style={{fontSize:10,fontWeight:600,color:'#ccaaee',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.name}</span>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:10,fontWeight:800,color:'#bb88ff'}}>{e.score}</div>
                <div style={{fontSize:8,color:'#7755aa'}}>×{e.checkpoint}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile D-pad */}
      {isTouch && phase==='playing' && (
        <div style={{position:'absolute',bottom:20,left:0,right:0,display:'flex',justifyContent:'space-between',alignItems:'flex-end',padding:'0 20px',pointerEvents:'none'}}>
          {/* Left: directional */}
          <div style={{display:'grid',gridTemplateColumns:'60px 60px 60px',gridTemplateRows:'60px 60px 60px',gap:6,pointerEvents:'auto'}}>
            {[
              [null,'u',null],
              ['l',null,'r'],
              [null,'d',null],
            ].map((row,ri)=>row.map((a,ci)=>(
              a ? <button key={`${ri},${ci}`} onPointerDown={e=>{e.preventDefault();dpad(a);}}
                style={{width:60,height:60,borderRadius:14,background:'rgba(80,30,160,0.75)',border:'1px solid rgba(160,80,255,0.5)',color:'#ddaaff',fontSize:22,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',touchAction:'none',backdropFilter:'blur(6px)'}}
              >{a==='u'?'↑':a==='d'?'↓':a==='l'?'←':'→'}</button>
              : <div key={`${ri},${ci}`} style={{width:60,height:60}} />
            )))}
          </div>
          {/* Right: rotate + drop */}
          <div style={{display:'flex',flexDirection:'column',gap:10,pointerEvents:'auto'}}>
            <button onPointerDown={e=>{e.preventDefault();dpad('rotate');}}
              style={{width:70,height:70,borderRadius:14,background:'rgba(120,30,100,0.75)',border:'1px solid rgba(220,80,180,0.5)',color:'#ffaadd',fontSize:28,cursor:'pointer',touchAction:'none',backdropFilter:'blur(6px)'}}>↻</button>
            <button onPointerDown={e=>{e.preventDefault();dpad('drop');}}
              style={{width:70,height:70,borderRadius:14,background:'rgba(30,80,160,0.75)',border:'1px solid rgba(80,160,255,0.5)',color:'#aaddff',fontSize:22,cursor:'pointer',touchAction:'none',backdropFilter:'blur(6px)'}}>⬇⬇</button>
          </div>
        </div>
      )}

      {/* Idle overlay */}
      {phase==='idle' && (
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(10,4,30,0.7)',backdropFilter:'blur(6px)'}}>
          <div style={{background:'rgba(20,10,50,0.95)',borderRadius:24,padding:'36px 48px',textAlign:'center',border:'1px solid rgba(140,70,255,0.4)',boxShadow:'0 0 60px rgba(100,40,200,0.3)'}}>
            <div style={{fontSize:44,marginBottom:8}}>🖨️</div>
            <h1 style={{fontSize:28,fontWeight:900,color:'#cc88ff',margin:'0 0 6px',letterSpacing:2}}>PLAY3D</h1>
            <p style={{color:'#9966cc',fontSize:13,margin:'0 0 20px'}}>מלא שורות ועמודות כדי לנקות אותן!</p>
            <div style={{fontSize:12,color:'#7744aa',marginBottom:24,lineHeight:2,textAlign:'right'}}>
              {isTouch?<>כפתורי D-pad לשחק<br/>2 אצבעות = סיבוב מצלמה</>:<>←→↑↓ = זוז יחסית למצלמה<br/>R = סובב · Space = נפל מהיר<br/>🖱 גרור = סיבוב מצלמה</>}
            </div>
            <button onClick={()=>startRef.current()} style={{padding:'12px 44px',background:'linear-gradient(135deg,#6622cc,#cc2266)',border:'none',borderRadius:12,color:'white',fontSize:16,fontWeight:800,cursor:'pointer',letterSpacing:1,boxShadow:'0 0 20px rgba(100,30,200,0.5)'}}>
              התחל משחק
            </button>
          </div>
        </div>
      )}

      {/* Dead / submit */}
      {phase==='dead' && !showSub && (
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(10,4,30,0.7)',backdropFilter:'blur(6px)'}}>
          <div style={{background:'rgba(20,10,50,0.95)',borderRadius:24,padding:'32px 44px',textAlign:'center',border:'1px solid rgba(140,70,255,0.4)'}}>
            <div style={{fontSize:38,marginBottom:8}}>💎</div>
            <h2 style={{fontSize:22,fontWeight:900,color:'#cc88ff',margin:'0 0 10px'}}>המשחק נגמר!</h2>
            <div style={{fontSize:30,fontWeight:900,color:'#ffaaff',marginBottom:4}}>{score}</div>
            <div style={{fontSize:12,color:'#9966cc',marginBottom:22}}>שורות שהושלמו: {chk}</div>
            <div style={{display:'flex',gap:10,justifyContent:'center'}}>
              <button onClick={()=>setShowSub(true)} style={{padding:'10px 24px',background:'linear-gradient(135deg,#6622cc,#cc2266)',border:'none',borderRadius:10,color:'white',fontSize:13,fontWeight:700,cursor:'pointer'}}>שמור תוצאה</button>
              <button onClick={()=>startRef.current()} style={{padding:'10px 24px',background:'rgba(60,30,100,0.8)',border:'1px solid rgba(120,60,200,0.5)',borderRadius:10,color:'#cc88ff',fontSize:13,fontWeight:700,cursor:'pointer'}}>שחק שוב</button>
            </div>
          </div>
        </div>
      )}
      {showSub && (
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(10,4,30,0.7)',backdropFilter:'blur(6px)'}}>
          <div style={{background:'rgba(20,10,50,0.95)',borderRadius:24,padding:'32px 44px',textAlign:'center',border:'1px solid rgba(140,70,255,0.4)',minWidth:280}}>
            <div style={{fontSize:34,marginBottom:8}}>🏆</div>
            <h3 style={{fontSize:18,fontWeight:900,color:'#cc88ff',margin:'0 0 6px'}}>שמור את השיא</h3>
            <div style={{fontSize:24,fontWeight:900,color:'#ffaaff',marginBottom:14}}>{score} נק׳ · {chk} שורות</div>
            <input value={pname} onChange={e=>setPname(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submitScore()} placeholder="השם שלך" maxLength={20}
              style={{width:'100%',padding:'10px 14px',borderRadius:10,border:'1px solid rgba(120,60,200,0.6)',fontSize:14,textAlign:'center',outline:'none',marginBottom:12,boxSizing:'border-box',color:'#ddaaff',background:'rgba(40,20,80,0.8)'}} />
            <div style={{display:'flex',gap:10}}>
              <button onClick={submitScore} disabled={submitting||!pname.trim()} style={{flex:1,padding:'10px',background:'linear-gradient(135deg,#6622cc,#cc2266)',border:'none',borderRadius:10,color:'white',fontSize:13,fontWeight:700,cursor:'pointer',opacity:submitting||!pname.trim()?0.4:1}}>
                {submitting?'שומר...':'שמור'}
              </button>
              <button onClick={()=>startRef.current()} style={{flex:1,padding:'10px',background:'rgba(60,30,100,0.8)',border:'1px solid rgba(120,60,200,0.5)',borderRadius:10,color:'#cc88ff',fontSize:13,fontWeight:700,cursor:'pointer'}}>שחק שוב</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
