import{t as e}from"./tint-BJmCUSA_.js";var t=[`5FA85C`,`3E8C7E`,`4E7FC4`,`D2703C`,`C4566B`,`8A6FB0`,`C9A24B`,`6E7A6A`],n=[`E9B44C`,`E3705F`,`5FBFA8`,`9C7BD0`,`D9D2C2`],r=[`plates`,`horns`,`frill`,`fringe`],i=(e,t,n,r)=>{if(e===`plates`)return`<g fill="#${t}">
        <path d="M24 42 27 22 36 36Z"/>
        <path d="M34 36 38 14 47 31Z"/>
        <path d="M43 32 50 8 57 32Z"/>
        <path d="M66 36 62 14 53 31Z"/>
        <path d="M76 42 73 22 64 36Z"/>
      </g>
      <path d="M46 31 50 16 54 31Z" fill="#${n}" opacity=".75"/>`;if(e===`horns`)return`<g fill="#${r}">
        <path d="M30 41q-2-20 1-31q7 11 8 27Z"/>
        <path d="M70 41q2-20-1-31q-7 11-8 27Z"/>
      </g>`;if(e===`frill`){let e=(e,t)=>[50+Math.cos(e)*36*t,42+Math.sin(e)*27*t].map(e=>e.toFixed(1)).join(` `);return`<g fill="#${t}">${Array.from({length:9},(t,n)=>{let r=Math.PI*(1+(n+.5)/9);return`<path d="M${e(r-.13,.98)} ${e(r,1.2)} ${e(r+.13,.98)}Z"/>`}).join(``)}<ellipse cx="50" cy="42" rx="36" ry="27"/></g>
      <ellipse cx="50" cy="43" rx="28" ry="20" fill="#${n}" opacity=".55"/>`}let i=e=>{let t=(t,n)=>[50+Math.cos(e+n)*26*t,50+Math.sin(e+n)*20*t].map(e=>e.toFixed(1)).join(` `);return`<path d="M${t(.95,-.17)} ${t(1.5,0)} ${t(.95,.17)}Z"/>`};return`<g fill="#${t}">${[2.45,2.95,3.45].flatMap(e=>[i(e),i(Math.PI-e)]).join(``)}</g>`},a=(t,n)=>{let r=`#${e(n,.62)}`,i=e=>`<ellipse cx="${e}" cy="46" rx="5.2" ry="5.8" fill="#FFFDF6"/>
     <ellipse cx="${e}" cy="46.4" rx="2.2" ry="4" fill="#2A2531"/>
     <circle cx="${e+1.9}" cy="43.6" r="1.4" fill="#FFFFFF"/>`,a=e=>`<path d="M${e-5.2} 46q5.2 5 10.4 0" stroke="${r}" stroke-width="2.3" fill="none" stroke-linecap="round"/>`,o=e=>`<ellipse cx="${e}" cy="46" rx="5.2" ry="5.8" fill="#FFFDF6"/>
     <path d="M${e-5.2} 46a5.2 5.8 0 0 0 10.4 0Z" fill="#2A2531"/>`;return t===0?i(36)+i(64):t===1?a(36)+a(64):t===2?i(36)+a(64):o(36)+o(64)},o={title:`Dino`,license:{name:`CC0 1.0`,url:`https://creativecommons.org/publicdomain/zero/1.0/`}},s=({prng:o})=>{o.next();let s=t[o.integer(0,t.length-1)],c=n[o.integer(0,n.length-1)],l=e(s,.2),u=e(s,-.34),d=e(s,.34),f=e(s,-.62),p=r[o.integer(0,r.length-1)],m=o.integer(0,3),h=o.bool(60),g=o.bool(45),_=o.bool(40),v=o.bool(35);return{attributes:{viewBox:`0 0 100 100`,fill:`none`,"shape-rendering":`auto`},body:`
      <path d="M16 100c0-14 15-24 34-24s34 10 34 24Z" fill="#${l}"/>
      ${i(p,d,c,f)}
      <ellipse cx="50" cy="50" rx="26" ry="20" fill="#${s}"/>
      <path d="M33 54h34v18q0 12-17 12t-17-12Z" fill="#${s}"/>
      <path d="M37 68h26q0 14-13 14t-13-14Z" fill="#${u}" opacity=".5"/>
      ${g?`<g fill="#${l}" opacity=".45">
               <circle cx="33" cy="56" r="2.8"/><circle cx="67" cy="56" r="2.8"/>
               <circle cx="50" cy="34" r="2.4"/>
             </g>`:``}
      ${_?`<g stroke="#${l}" stroke-width="2.6" stroke-linecap="round" fill="none" opacity=".4">
               <path d="M35 60h6"/><path d="M59 60h6"/>
               <path d="M35.5 66h5"/><path d="M59.5 66h5"/>
             </g>`:``}
      ${a(m,s)}
      ${v?`<path d="M30 39q6-4 12-1M70 39q-6-4-12-1" stroke="#${e(s,.42)}"
                   stroke-width="2.4" fill="none" stroke-linecap="round"/>`:``}
      <path d="M36 72q14 7 28 0" stroke="#${e(s,.5)}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      ${h?`<g fill="#FFFDF6">
               <path d="M40.4 73.1l2.4 4.6 2.4-4.6Z"/>
               <path d="M47.6 73.6l2.4 4.8 2.4-4.8Z"/>
               <path d="M54.8 73.1l2.4 4.6 2.4-4.6Z"/>
             </g>`:``}
      <ellipse cx="43.5" cy="61" rx="2.4" ry="1.8" fill="#2A2531" opacity=".85"/>
      <ellipse cx="56.5" cy="61" rx="2.4" ry="1.8" fill="#2A2531" opacity=".85"/>
    `}};export{s as create,o as meta};