import{t as e}from"./tint-BJmCUSA_.js";var t=[`F2EEE6`,`C8CDD6`,`D8B48D`,`8C6A4E`,`55505C`,`EAD7AE`,`A9C8B5`,`C4AED6`],n=[`E79AA6`,`DE8FA2`,`F0AEB4`],r=[[6,6],[4,34],[28,28],[6,122],[126,116]],i=(e,t,n,r)=>{let i=50+e*11;return`<g transform="rotate(${e*t} ${i} 42)">
    <rect x="${i-7.5}" y="0" width="15" height="44" rx="7.5" fill="#${n}"/>
    <rect x="${i-3.8}" y="5" width="7.6" height="32" rx="3.8" fill="#${r}"/>
  </g>`},a=(t,n)=>{let r=`#${e(n,.68)}`,i=e=>`<ellipse cx="${e}" cy="57" rx="4.6" ry="5.2" fill="#2A2531"/>
     <circle cx="${e+1.6}" cy="55" r="1.5" fill="#FFFFFF" opacity=".92"/>`,a=e=>`<path d="M${e-4.8} 57q4.8 4.6 9.6 0" stroke="${r}" stroke-width="2.1" fill="none" stroke-linecap="round"/>`,o=e=>`<path d="M${e-4.8} 55.4q4.8 5.4 9.6 0" fill="#2A2531"/>`;return t===0?i(38)+i(62):t===1?a(38)+a(62):t===2?i(38)+a(62):o(38)+o(62)},o={title:`Bunny`,license:{name:`CC0 1.0`,url:`https://creativecommons.org/publicdomain/zero/1.0/`}},s=({prng:o})=>{o.next();let s=t[o.integer(0,t.length-1)],c=n[o.integer(0,n.length-1)],l=e(s,.18),u=e(s,-.3),[d,f]=r[o.integer(0,r.length-1)]??r[0],p=o.integer(0,3),m=o.bool(45),h=o.bool(60),g=o.bool(70);return{attributes:{viewBox:`0 0 100 100`,fill:`none`,"shape-rendering":`auto`},body:`
      <path d="M17 100c0-14 14.8-24 33-24s33 10 33 24Z" fill="#${l}"/>
      ${i(-1,d,s,c)}
      ${i(1,f,s,c)}
      <ellipse cx="50" cy="59" rx="27" ry="24.5" fill="#${s}"/>
      <ellipse cx="50" cy="69" rx="14.5" ry="10" fill="#${u}" opacity=".5"/>
      ${a(p,s)}
      ${m?`<ellipse cx="29" cy="67" rx="5.2" ry="3.3" fill="#${c}" opacity=".5"/>
             <ellipse cx="71" cy="67" rx="5.2" ry="3.3" fill="#${c}" opacity=".5"/>`:``}
      <path d="M46.2 65h7.6L50 69.8Z" fill="#${c}"/>
      <path d="M50 69.8v3.2M50 73q-3.8 3.6-7 0M50 73q3.8 3.6 7 0"
            stroke="#${e(s,.55)}" stroke-width="1.7" fill="none" stroke-linecap="round"/>
      ${h?`<rect x="46.4" y="76" width="7.2" height="6.4" rx="1.7" fill="#FFFDF6"/>
             <path d="M50 76v6.4" stroke="#${e(s,.3)}" stroke-width="1"/>`:``}
      ${g?`<path d="M25 67h-11M25.5 71.5l-10.5 3M75 67h11M74.5 71.5l10.5 3"
                   stroke="#${e(s,.45)}" stroke-width="1.5" stroke-linecap="round" opacity=".7"/>`:``}
    `}};export{s as create,o as meta};