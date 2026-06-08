import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════
// TRIDENT — Radar View v4
// Design principle: solo sailor, night watch, don't overwhelm
// ═══════════════════════════════════════════════════════

const DEFAULT_RANGE = 3;
const GUARD_NM = 2;
const TICK_MS = 1000;
const SPEED_X = 8;
const CPA_DANGER = 0.5;
const CPA_CAUTION = 1.0;
const CX = 350, CY = 280, RR = 230;

const C = {
  bg:"#060a0e",surface:"#0d1319",raised:"#111923",border:"#1a2536",
  borderLt:"#243040",text:"#8899aa",bright:"#c8d6e0",dim:"#4a5a6a",
  value:"#d0dce6",label:"#556677",safe:"#2d8a56",safeBr:"#3aad6e",
  caution:"#c49230",cautionBr:"#daa840",danger:"#c44040",dangerBr:"#e04848",
  dangerDim:"rgba(196,64,64,0.15)",blue:"#3a7abd",own:"#4a9ade",
  guard:"rgba(58,122,189,0.2)",ring:"#121a24",aton:"#8a7a30"
};

function cpaTcpa(rx,ry,vx,vy){
  const dv=rx*vx+ry*vy,v2=vx*vx+vy*vy;
  if(v2<1e-5)return{cpa:Math.hypot(rx,ry),tcpa:Infinity};
  const t=-dv/v2;if(t<0)return{cpa:Math.hypot(rx,ry),tcpa:0};
  return{cpa:Math.hypot(rx+vx*t,ry+vy*t),tcpa:t};
}
function threat(cpa){return cpa<CPA_DANGER?"danger":cpa<CPA_CAUTION?"caution":"safe";}
function tColor(l){return l==="danger"?C.dangerBr:l==="caution"?C.cautionBr:C.safeBr;}

const initTargets=()=>[
  {id:"1",name:"MARIA ELENA",type:"Fishing",brg:128,dist:1.4,cog:325,sog:4.2,vx:-0.015,vy:-0.022,aton:false},
  {id:"2",name:"MAERSK DURBAN",type:"Cargo",brg:42,dist:2.6,cog:210,sog:12.8,vx:-0.008,vy:0.006,aton:false},
  {id:"3",name:"OCEAN PEARL",type:"Tanker",brg:312,dist:2.8,cog:150,sog:11.4,vx:0.005,vy:0.003,aton:false},
  {id:"4",name:"BAHIA SPORT",type:"Sailing",brg:238,dist:3.2,cog:165,sog:5.8,vx:0.002,vy:0.004,aton:false},
  {id:"5",name:"",type:"Class B",brg:348,dist:3.8,cog:180,sog:0.2,vx:0.0,vy:0.001,aton:false},
  {id:"6",name:"Fl G 4s",type:"Nav Aid",brg:95,dist:2.1,cog:0,sog:0,vx:0,vy:0,aton:true},
];
const OWN={sog:6.2,cog:185,heading:185,depth:142};

function playAlarm(ctx){
  if(!ctx)return;
  const o=ctx.createOscillator(),g=ctx.createGain();
  o.connect(g);g.connect(ctx.destination);
  o.frequency.setValueAtTime(880,ctx.currentTime);
  o.frequency.setValueAtTime(660,ctx.currentTime+0.15);
  o.frequency.setValueAtTime(880,ctx.currentTime+0.3);
  g.gain.setValueAtTime(0.3,ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.01,ctx.currentTime+0.5);
  o.start(ctx.currentTime);o.stop(ctx.currentTime+0.5);
}

function playTimerBeep(ctx){
  if(!ctx)return;
  for(let i=0;i<3;i++){
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.connect(g);g.connect(ctx.destination);
    o.frequency.setValueAtTime(1200,ctx.currentTime+i*0.3);
    g.gain.setValueAtTime(0.2,ctx.currentTime+i*0.3);
    g.gain.exponentialRampToValueAtTime(0.01,ctx.currentTime+i*0.3+0.2);
    o.start(ctx.currentTime+i*0.3);o.stop(ctx.currentTime+i*0.3+0.25);
  }
}

// ═══ ALERT MODAL ═══
function AlertModal({target,onAck}){
  if(!target)return null;
  return(
    <div style={{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(6,10,14,0.9)"}} onClick={e=>e.stopPropagation()}>
      <div style={{width:380,background:C.surface,border:`2px solid ${C.danger}`,borderRadius:12,overflow:"hidden",boxShadow:"0 0 80px rgba(224,72,72,0.2)"}}>
        <div style={{background:"rgba(196,64,64,0.15)",padding:"12px 20px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${C.danger}`}}>
          <div style={{width:10,height:10,borderRadius:"50%",background:C.dangerBr,animation:"blink 0.8s step-end infinite"}}/>
          <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:12,fontWeight:700,color:C.dangerBr,textTransform:"uppercase",letterSpacing:"0.1em"}}>COLLISION WARNING</span>
        </div>
        <div style={{padding:"28px 24px",textAlign:"center"}}>
          <div style={{fontSize:20,fontWeight:700,color:C.bright,marginBottom:24}}>{target.name||target.id}</div>
          <div style={{marginBottom:28}}>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:72,fontWeight:700,color:C.dangerBr,lineHeight:1}}>{isFinite(target.tcpa)&&target.tcpa<999?Math.round(target.tcpa):"—"}</div>
            <div style={{fontSize:12,color:C.dim,marginTop:6,textTransform:"uppercase",letterSpacing:"0.08em"}}>minutes to act</div>
          </div>
          <button onClick={onAck} style={{width:"100%",padding:"14px",background:"rgba(196,64,64,0.12)",border:`2px solid ${C.danger}`,borderRadius:8,color:C.dangerBr,fontFamily:"'IBM Plex Mono',monospace",fontSize:12,fontWeight:700,cursor:"pointer",textTransform:"uppercase",letterSpacing:"0.08em"}}>
            ACKNOWLEDGE
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══ TARGET CARD — simplified ═══
function TargetCard({t,selected,onSelect}){
  const col=tColor(t.level);
  const closing=!t.aton&&t.dist>t.cpa;
  return(
    <div onClick={()=>onSelect(t.id)} style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,borderLeft:t.level==="danger"?`3px solid ${C.danger}`:t.level==="caution"?`3px solid ${C.caution}`:`3px solid transparent`,background:t.level==="danger"?C.dangerDim:selected?C.raised:"transparent",cursor:"pointer"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
        <span style={{fontSize:12,fontWeight:600,color:t.name?C.bright:C.dim}}>{t.name||(t.aton?"Nav Aid":t.id)}</span>
        {!t.aton&&<span style={{fontSize:9,fontWeight:600,color:closing?C.dangerBr:C.safeBr}}>{closing?"CLOSING":"opening"}</span>}
      </div>
      {t.aton?(
        <div style={{fontSize:10,color:C.dim}}>Range {t.dist.toFixed(1)} nm · {t.type}</div>
      ):(
        <div style={{display:"flex",gap:16}}>
          {[{l:"CPA",v:t.cpa.toFixed(1)},{l:"TCPA",v:isFinite(t.tcpa)&&t.tcpa<999?Math.round(t.tcpa)+"m":"—"},{l:"Range",v:t.dist.toFixed(1)}].map((m,i)=>(
            <div key={i}>
              <span style={{fontSize:8,fontWeight:600,textTransform:"uppercase",color:C.label,marginRight:4}}>{m.l}</span>
              <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,fontWeight:600,color:i<2?col:C.value}}>{m.v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══ SELECTED DETAIL ═══
function TargetDetail({target,onClose}){
  if(!target)return null;
  const col=tColor(target.level);
  return(
    <div style={{padding:"14px",background:C.raised,borderBottom:`1px solid ${C.border}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <span style={{fontSize:15,fontWeight:700,color:C.bright}}>{target.name||target.id}</span>
        <span onClick={onClose} style={{fontSize:10,color:C.dim,cursor:"pointer",padding:"2px 8px",border:`1px solid ${C.border}`,borderRadius:3}}>✕</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:8}}>
        {[{l:"CPA",v:target.cpa.toFixed(2),u:"nm"},{l:"TCPA",v:isFinite(target.tcpa)&&target.tcpa<999?Math.round(target.tcpa):"—",u:"min"},{l:"Range",v:target.dist.toFixed(2),u:"nm"}].map((m,i)=>(
          <div key={i} style={{textAlign:"center",padding:8,background:C.surface,borderRadius:6,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:8,fontWeight:600,textTransform:"uppercase",color:C.label}}>{m.l}</div>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:22,fontWeight:700,color:col,lineHeight:1,margin:"4px 0 2px"}}>{m.v}</div>
            <div style={{fontSize:9,color:C.dim}}>{m.u}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:12,justifyContent:"center",fontSize:10}}>
        {[{l:"BRG",v:`${Math.round(target.brg)}°`},{l:"COG",v:`${target.cog}°`},{l:"SOG",v:`${target.sog}kt`},{l:"Type",v:target.type}].map((m,i)=>(
          <div key={i} style={{textAlign:"center"}}>
            <span style={{fontSize:8,color:C.label,textTransform:"uppercase"}}>{m.l} </span>
            <span style={{fontFamily:"'IBM Plex Mono',monospace",color:C.value}}>{m.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══ WATCH TIMER — compact ═══
function Timer({audioCtx}){
  const [dur,setDur]=useState(15);
  const [rem,setRem]=useState(null);
  const [on,setOn]=useState(false);
  useEffect(()=>{
    if(!on||rem===null)return;
    if(rem<=0){playTimerBeep(audioCtx);setOn(false);return;}
    const iv=setInterval(()=>setRem(r=>r-1),1000);
    return()=>clearInterval(iv);
  },[on,rem,audioCtx]);
  const mm=rem!==null?Math.floor(rem/60):dur;
  const ss=rem!==null?rem%60:0;
  return(
    <div style={{display:"flex",alignItems:"center",gap:6}}>
      {!on&&rem===null&&<select value={dur} onChange={e=>setDur(Number(e.target.value))} style={{fontSize:13,fontWeight:600,padding:"10px 8px",borderRadius:6,border:`1px solid ${C.borderLt}`,background:C.raised,color:C.text,cursor:"pointer",minHeight:44}}>
        {[5,10,15,20,30].map(m=><option key={m} value={m}>{m}m</option>)}
      </select>}
      <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:16,fontWeight:700,color:on?(rem<60?C.dangerBr:C.text):C.dim}}>
        {String(mm).padStart(2,"0")}:{String(ss).padStart(2,"0")}
      </span>
      <span onClick={()=>{if(on){setOn(false);setRem(null);}else{setRem(dur*60);setOn(true);}}} style={{fontSize:14,fontWeight:700,color:on?C.dangerBr:C.safeBr,cursor:"pointer",padding:"10px 14px",border:`1px solid ${on?C.danger:C.safe}`,borderRadius:6,minHeight:44,minWidth:44,display:"flex",alignItems:"center",justifyContent:"center"}}>
        {on?"■":"▶"}
      </span>
      {!on&&rem!==null&&rem<=0&&<span style={{fontSize:13,fontWeight:700,color:C.dangerBr,animation:"blink 1s step-end infinite"}}>CHECK</span>}
    </div>
  );
}

// ═══ MAIN ═══
export default function TridentRadar(){
  const [targets,setTargets]=useState(initTargets);
  const [now,setNow]=useState(Date.now());
  const [paused,setPaused]=useState(false);
  const [selId,setSelId]=useState(null);
  const [alertAcked,setAlertAcked]=useState({});
  const [filterRange,setFilterRange]=useState(DEFAULT_RANGE);
  const [viewRange,setViewRange]=useState(DEFAULT_RANGE);
  const [displayMode,setDisplayMode]=useState("head-up");
  const audioCtx=useRef(null);

  const initAudio=useCallback(()=>{if(!audioCtx.current)audioCtx.current=new(window.AudioContext||window.webkitAudioContext)();},[]);

  const rotOff=displayMode==="head-up"?-OWN.heading:displayMode==="course-up"?-OWN.cog:0;
  function rotBrg(b){let r=b+rotOff;while(r<0)r+=360;while(r>=360)r-=360;return r;}
  function nm2px(nm){return(nm/viewRange)*RR;}
  function brg2xy(b,d){const rb=rotBrg(b)*Math.PI/180;return[Math.sin(rb)*nm2px(d),-Math.cos(rb)*nm2px(d)];}

  const selectTarget=useCallback((id)=>{
    if(id===selId){setSelId(null);setViewRange(DEFAULT_RANGE);return;}
    setSelId(id);
    const t=targets.find(t=>t.id===id);
    if(t)setViewRange(Math.min(Math.max(1,Math.ceil(t.dist*1.5)),DEFAULT_RANGE+1));
  },[selId,targets]);

  const resetView=useCallback(()=>{setSelId(null);setViewRange(DEFAULT_RANGE);},[]);

  useEffect(()=>{
    if(paused)return;
    const iv=setInterval(()=>{
      setNow(Date.now());
      setTargets(prev=>prev.map(t=>{
        if(t.aton)return t;
        const r=t.brg*Math.PI/180;
        let x=Math.sin(r)*t.dist+t.vx*(SPEED_X*TICK_MS/60000);
        let y=-Math.cos(r)*t.dist+t.vy*(SPEED_X*TICK_MS/60000);
        const nd=Math.hypot(x,y);
        let nb=Math.atan2(x,-y)*180/Math.PI;if(nb<0)nb+=360;
        if(nd>DEFAULT_RANGE*2||nd<0.03){setAlertAcked(a=>({...a,[t.id]:false}));return initTargets().find(i=>i.id===t.id)||t;}
        return{...t,brg:nb,dist:nd};
      }));
    },TICK_MS);
    return()=>clearInterval(iv);
  },[paused]);

  const enriched=targets.map(t=>{
    const r=t.brg*Math.PI/180;
    const rx=Math.sin(r)*t.dist,ry=-Math.cos(r)*t.dist;
    const{cpa,tcpa}=t.aton?{cpa:t.dist,tcpa:Infinity}:cpaTcpa(rx,ry,t.vx,t.vy);
    return{...t,cpa,tcpa,level:t.aton?"safe":threat(cpa),rx,ry};
  });
  const filtered=enriched.filter(t=>t.dist<=filterRange);
  const sorted=[...filtered].sort((a,b)=>a.aton?1:b.aton?-1:a.cpa-b.cpa);
  const selTarget=enriched.find(t=>t.id===selId);
  const unacked=enriched.find(t=>t.level==="danger"&&!alertAcked[t.id]);
  const anyDanger=enriched.find(t=>t.level==="danger");

  useEffect(()=>{
    if(unacked&&audioCtx.current){
      playAlarm(audioCtx.current);
      const iv=setInterval(()=>playAlarm(audioCtx.current),2000);
      return()=>clearInterval(iv);
    }
  },[unacked?.id]);

  const rings=[];for(let i=1;i<=viewRange;i++)rings.push(i);
  const compass=[{l:"N",d:0},{l:"E",d:90},{l:"S",d:180},{l:"W",d:270}];

  return(
    <div onClick={initAudio} style={{display:"grid",gridTemplateRows:"60px 1fr",gridTemplateColumns:"1fr 300px",height:"100vh",width:"100vw",background:C.bg,fontFamily:"'IBM Plex Sans',-apple-system,sans-serif",overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap');
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.65}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        *{margin:0;padding:0;box-sizing:border-box}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:${C.borderLt};border-radius:2px}
      `}</style>

      {unacked&&<AlertModal target={unacked} onAck={()=>setAlertAcked(a=>({...a,[unacked.id]:true}))}/>}

      {/* TOP BAR — big touch targets for 3am */}
      <div style={{gridColumn:"1/-1",display:"flex",alignItems:"center",padding:"0 12px",gap:8,background:C.surface,borderBottom:`1px solid ${C.border}`,zIndex:10}}>
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontWeight:700,fontSize:14,letterSpacing:"0.15em",color:C.bright,flexShrink:0,marginRight:4}}>TRIDENT</div>
        <div style={{display:"flex",gap:3,background:C.raised,borderRadius:8,padding:3,flexShrink:0}}>
          {["Chart","Radar","Dash","Settings"].map(v=>(
            <div key={v} style={{fontSize:12,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.04em",padding:"10px 16px",borderRadius:6,color:v==="Radar"?C.bright:C.dim,background:v==="Radar"?C.borderLt:"transparent",cursor:"pointer",minHeight:44,display:"flex",alignItems:"center"}}>{v}</div>
          ))}
        </div>
        <select value={displayMode} onChange={e=>setDisplayMode(e.target.value)} style={{fontSize:13,fontWeight:600,padding:"10px 12px",borderRadius:6,border:`1px solid ${C.borderLt}`,background:C.raised,color:C.text,cursor:"pointer",minHeight:44,appearance:"none",WebkitAppearance:"none",paddingRight:12}}>
          <option value="head-up">HDG UP</option>
          <option value="course-up">CRS UP</option>
          <option value="north-up">N UP</option>
        </select>
        <select value={filterRange} onChange={e=>{const v=Number(e.target.value);setFilterRange(v);if(!selId)setViewRange(Math.min(v,DEFAULT_RANGE));}} style={{fontSize:13,fontWeight:600,padding:"10px 12px",borderRadius:6,border:`1px solid ${C.borderLt}`,background:C.raised,color:C.text,cursor:"pointer",minHeight:44,appearance:"none",WebkitAppearance:"none",paddingRight:12}}>
          <option value={1}>≤1nm</option><option value={2}>≤2nm</option><option value={3}>≤3nm</option><option value={6}>ALL</option>
        </select>
        <Timer audioCtx={audioCtx.current}/>
        <div style={{flex:1}}/>
        {anyDanger&&alertAcked[anyDanger.id]&&(
          <div style={{display:"flex",alignItems:"center",gap:6,background:C.dangerDim,border:`1px solid ${C.danger}`,borderRadius:6,padding:"8px 14px",fontSize:12,fontWeight:600,color:C.dangerBr,textTransform:"uppercase",minHeight:44}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:C.dangerBr,animation:"blink 1s step-end infinite"}}/>
            {anyDanger.name} — ACK
          </div>
        )}
        <button onClick={()=>setPaused(!paused)} style={{fontSize:14,fontWeight:700,padding:"10px 18px",borderRadius:6,border:`1px solid ${C.borderLt}`,background:paused?"rgba(196,146,48,0.12)":C.raised,color:paused?C.cautionBr:C.dim,cursor:"pointer",minHeight:44,minWidth:44}}>{paused?"▶":"⏸"}</button>
      </div>

      {/* ═══ RADAR ═══ */}
      <div style={{position:"relative",overflow:"hidden"}}>
        <svg viewBox="0 0 700 580" style={{width:"100%",height:"100%"}} preserveAspectRatio="xMidYMid meet" onClick={e=>{if(e.target.tagName==="rect"||e.target.tagName==="svg")resetView();}}>
          <defs>
            <radialGradient id="rbg" cx="50%" cy="50%"><stop offset="0%" stopColor="#090f16"/><stop offset="100%" stopColor="#060a0e"/></radialGradient>
            <filter id="gl"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            <filter id="dgl"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>
          <rect width="700" height="580" fill="url(#rbg)"/>

          {/* Range rings — subtle */}
          {rings.map(r=><circle key={r} cx={CX} cy={CY} r={nm2px(r)} fill="none" stroke={C.ring} strokeWidth="0.4"/>)}
          {rings.map(r=><text key={`l${r}`} x={CX+4} y={CY-nm2px(r)+11} fontFamily="IBM Plex Mono" fontSize="8" fill="#1e2a36">{r}</text>)}

          {/* Minimal crosshairs */}
          <line x1={CX} y1={CY-RR-10} x2={CX} y2={CY+RR+10} stroke={C.ring} strokeWidth="0.3"/>
          <line x1={CX-RR-10} y1={CY} x2={CX+RR+10} y2={CY} stroke={C.ring} strokeWidth="0.3"/>

          {/* Compass — rotated */}
          {compass.map(c=>{
            const rd=rotBrg(c.d)*Math.PI/180;
            const lx=CX+Math.sin(rd)*(RR+16),ly=CY-Math.cos(rd)*(RR+16);
            return <text key={c.l} x={lx} y={ly+3} textAnchor="middle" fontFamily="IBM Plex Mono" fontSize={c.l==="N"?10:9} fontWeight={c.l==="N"?600:400} fill={c.l==="N"?"#3a6a4a":"#2a3a48"}>{c.l}</text>;
          })}

          {/* Guard zone — very subtle */}
          {GUARD_NM<=viewRange&&<circle cx={CX} cy={CY} r={nm2px(GUARD_NM)} fill="none" stroke={C.guard} strokeWidth="0.7" strokeDasharray="6 5"/>}

          {/* Own vessel — clean */}
          <g transform={`translate(${CX},${CY})`} filter="url(#gl)">
            <line x1={0} y1={-14} x2={0} y2={-32} stroke={C.own} strokeWidth="0.8" opacity="0.4"/>
            <polygon points="0,-12 -6,7 0,3 6,7" fill={C.own} opacity="0.85"/>
          </g>

          {/* Targets */}
          {enriched.map(t=>{
            if(t.dist>filterRange)return null;
            const[tx,ty]=brg2xy(t.brg,t.dist);
            const ax=CX+tx,ay=CY+ty;
            if(ax<-50||ax>750||ay<-50||ay>630)return null;
            const col=tColor(t.level);
            const isSel=selId===t.id;
            const cogR=rotBrg(t.cog)*Math.PI/180;
            const predPx=nm2px(t.sog*30/60);

            // CPA point for selected/threat
            let cpaX=ax,cpaY=ay,showCpa=false;
            if(!t.aton&&isFinite(t.tcpa)&&t.tcpa>0&&t.tcpa<200){
              const cn=Math.hypot(t.rx+t.vx*t.tcpa,t.ry+t.vy*t.tcpa);
              const ca=Math.atan2(t.rx+t.vx*t.tcpa,-(t.ry+t.vy*t.tcpa))*180/Math.PI;
              const[cx2,cy2]=brg2xy(ca,cn);
              cpaX=CX+cx2;cpaY=CY+cy2;showCpa=true;
            }

            return(
              <g key={t.id} onClick={e=>{e.stopPropagation();selectTarget(t.id);}} style={{cursor:"pointer"}}>
                {/* Selected: predicted track line (the ONLY line shown) */}
                {isSel&&!t.aton&&<line x1={ax-Math.sin(cogR)*predPx*0.2} y1={ay+Math.cos(cogR)*predPx*0.2} x2={ax+Math.sin(cogR)*predPx*1.5} y2={ay-Math.cos(cogR)*predPx*1.5} stroke={col} strokeWidth="1.2" strokeDasharray="8 5" opacity="0.45"/>}

                {/* CPA line: only when selected OR danger */}
                {showCpa&&(isSel||t.level==="danger")&&(
                  <line x1={ax} y1={ay} x2={cpaX} y2={cpaY} stroke={col} strokeWidth="0.6" strokeDasharray="3 3" opacity="0.25"/>
                )}
                {/* CPA marker when selected */}
                {isSel&&showCpa&&<><circle cx={cpaX} cy={cpaY} r={4} fill="none" stroke={col} strokeWidth="0.8" strokeDasharray="2 2" opacity="0.6"/>
                <text x={cpaX+7} y={cpaY-3} fontFamily="IBM Plex Mono" fontSize="8" fill={col} opacity="0.7">{t.cpa.toFixed(2)}</text></>}

                {/* Unselected: short heading tick only */}
                {!isSel&&!t.aton&&<line x1={ax} y1={ay} x2={ax+Math.sin(cogR)*Math.min(nm2px(t.sog*4/60),16)} y2={ay-Math.cos(cogR)*Math.min(nm2px(t.sog*4/60),16)} stroke={col} strokeWidth="1.2" opacity="0.5"/>}

                {/* Icon */}
                {t.aton?(
                  <g transform={`translate(${ax},${ay})`}><polygon points="0,-6 6,0 0,6 -6,0" fill="none" stroke={C.aton} strokeWidth="1.2"/><circle r="1.5" fill={C.aton}/></g>
                ):(
                  <g transform={`translate(${ax},${ay})`} filter={t.level==="danger"?"url(#dgl)":""}>
                    <g transform={`rotate(${rotBrg(t.cog)})`}>
                      <polygon points="0,-7 -4,5 0,2 4,5" fill={col} opacity={t.level==="safe"&&!isSel?0.5:0.9}/>
                    </g>
                  </g>
                )}

                {/* Selection ring */}
                {isSel&&<circle cx={ax} cy={ay} r={16} fill="none" stroke={col} strokeWidth="1.2" strokeDasharray="4 3" opacity="0.6"/>}

                {/* Label: only threats + selected. Safe targets: no label unless selected */}
                {!t.aton&&t.level!=="safe"&&!isSel&&t.name&&(
                  <text x={ax+12} y={ay+3} fontFamily="IBM Plex Sans" fontSize={9} fontWeight={600} fill={col} opacity="0.8">{t.name}</text>
                )}
                {isSel&&!t.aton&&(
                  <g><rect x={ax+16} y={ay-16} width={125} height={26} rx={3} fill="rgba(13,19,25,0.85)" stroke={col} strokeWidth={0.4}/>
                  <text x={ax+22} y={ay-2} fontFamily="IBM Plex Sans" fontSize={9} fontWeight={600} fill={col}>{t.name||t.id}</text>
                  <text x={ax+22} y={ay+7} fontFamily="IBM Plex Mono" fontSize={8} fill={col} opacity="0.8">CPA {t.cpa.toFixed(1)} · {isFinite(t.tcpa)&&t.tcpa<999?Math.round(t.tcpa)+"m":"—"}</text></g>
                )}
              </g>
            );
          })}
        </svg>

        {/* ═══ HEADING — large, top center ═══ */}
        <div style={{position:"absolute",top:12,left:"50%",transform:"translateX(-50%)",display:"flex",flexDirection:"column",alignItems:"center",background:"rgba(6,10,14,0.75)",padding:"8px 28px",borderRadius:8,zIndex:5}}>
          <div style={{display:"flex",alignItems:"baseline",gap:6}}>
            <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:42,fontWeight:700,color:C.value,lineHeight:1}}>{OWN.heading}°</span>
          </div>
          {selTarget&&!selTarget.aton&&(
            <div style={{marginTop:4,fontSize:13,fontWeight:700,letterSpacing:"0.05em",color:selTarget.dist>selTarget.cpa?C.dangerBr:C.safeBr}}>
              {selTarget.dist>selTarget.cpa?"▼ CLOSING":"▲ OPENING"}
            </div>
          )}
        </div>

        {/* Zoom controls */}
        <div style={{position:"absolute",bottom:12,right:12,display:"flex",gap:6,zIndex:5}}>
          <div onClick={()=>setViewRange(r=>Math.max(1,r-1))} style={{width:48,height:48,background:"rgba(13,19,25,0.9)",border:`1px solid ${C.border}`,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'IBM Plex Mono',monospace",fontSize:22,fontWeight:700,color:C.text,cursor:"pointer"}}>+</div>
          <div style={{minWidth:36,textAlign:"center",fontFamily:"'IBM Plex Mono',monospace",fontSize:13,fontWeight:600,color:C.dim,lineHeight:"48px"}}>{viewRange}</div>
          <div onClick={()=>setViewRange(r=>Math.min(6,r+1))} style={{width:48,height:48,background:"rgba(13,19,25,0.9)",border:`1px solid ${C.border}`,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'IBM Plex Mono',monospace",fontSize:22,fontWeight:700,color:C.text,cursor:"pointer"}}>−</div>
        </div>

        {/* Minimal info line */}
        <div style={{position:"absolute",bottom:12,left:12,fontSize:8,color:"#1e2e3e"}}>
          {displayMode==="head-up"?"HDG UP":displayMode==="course-up"?"CRS UP":"N UP"} · tap background to reset
        </div>
      </div>

      {/* ═══ RIGHT PANEL ═══ */}
      <div style={{background:C.surface,display:"flex",flexDirection:"column",overflow:"hidden",borderLeft:`1px solid ${C.border}`}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",borderBottom:`1px solid ${C.border}`}}>
          <span style={{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.08em",color:C.label}}>Targets</span>
          <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:C.dim}}>{filtered.length}</span>
        </div>
        {selTarget&&<TargetDetail target={selTarget} onClose={resetView}/>}
        <div style={{flex:1,overflowY:"auto"}}>
          {sorted.map(t=><TargetCard key={t.id} t={t} selected={selId===t.id} onSelect={selectTarget}/>)}
        </div>
      </div>
    </div>
  );
}
