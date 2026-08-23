import{t as e}from"./tint-BJmCUSA_.js";var t=[`E8C88F`,`D89A4E`,`A9702F`,`6B4426`,`EFE7DA`,`B9BEC8`,`4A4652`,`E0A882`],n=[`C8434F`,`3F7FD0`,`3E9E72`,`D08A2C`,`8B5BC4`],r=[`drop`,`long`,`perk`,`round`],i=(e,t,n,r)=>{let i=e===-1?``:` transform="scale(-1 1) translate(-100 0)"`;return t===`perk`?`<g${i}><path d="M23 52 L17 22q10 4 16 16Z" fill="#${n}"/>
      <path d="M23.5 47 L19.5 30q5.5 3.5 9 11Z" fill="#${r}"/></g>`:t===`long`?`<g${i}><rect x="11" y="34" width="16" height="46" rx="8" fill="#${n}" transform="rotate(-10 19 40)"/></g>`:t===`round`?`<g${i}><ellipse cx="22" cy="41" rx="9" ry="10" fill="#${n}"/></g>`:`<g${i}><path d="M30 40q-17 1-18 14t9 17q9 2 10-11Z" fill="#${n}"/></g>`},a=(t,n)=>{let r=`#${e(n,.7)}`,i=e=>`<ellipse cx="${e}" cy="55" rx="4.6" ry="5.2" fill="#2A2531"/>
     <circle cx="${e+1.6}" cy="53" r="1.5" fill="#FFFFFF" opacity=".92"/>`,a=e=>`<path d="M${e-5} 55q5 5 10 0" stroke="${r}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,o=e=>`<path d="M${e-5} 57q5-6 10 0" fill="#2A2531"/>`;return t===0?i(38)+i(62):t===1?a(38)+a(62):t===2?i(38)+a(62):o(38)+o(62)},o={title:`Dog`,license:{name:`CC0 1.0`,url:`https://creativecommons.org/publicdomain/zero/1.0/`}},s=({prng:o})=>{o.next();let s=t[o.integer(0,t.length-1)],c=e(s,-.15),l=e(s,-.4),u=r[o.integer(0,r.length-1)],d=o.integer(0,3),f=o.bool(50),p=o.bool(40),m=o.bool(55)?n[o.integer(0,n.length-1)]:null,h=o.bool(35);return{attributes:{viewBox:`0 0 100 100`,fill:`none`,"shape-rendering":`auto`},body:`
      <path d="M18 100c0-13 14.4-22 32-22s32 9 32 22Z" fill="#${e(s,.18)}"/>
      ${m?`<path d="M23 84q27 10 54 0v7q-27 10-54 0Z" fill="#${m}"/>`:``}
      ${i(-1,u,e(s,.1),c)}
      ${i(1,u,e(s,.1),c)}
      <ellipse cx="50" cy="58" rx="27" ry="24" fill="#${s}"/>
      ${p?`<ellipse cx="38" cy="54" rx="11" ry="10.5" fill="#${e(s,.3)}"/>`:``}
      <ellipse cx="50" cy="70" rx="16" ry="11" fill="#${l}"/>
      ${a(d,s)}
      ${h?`<path d="M33 46q5-3 10-1M67 46q-5-3-10-1" stroke="#${e(s,.45)}" stroke-width="2" fill="none" stroke-linecap="round"/>`:``}
      ${f?`<path d="M44 74h12v7a6 6 0 0 1-12 0Z" fill="#E8798C"/>`:``}
      <ellipse cx="50" cy="66" rx="6" ry="4.6" fill="#2A2531"/>
      <path d="M50 70v3M50 73q-4 3.6-7.5 0M50 73q4 3.6 7.5 0"
            stroke="#2A2531" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    `}};export{s as create,o as meta};