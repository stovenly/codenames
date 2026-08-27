import{t as e}from"./tint-BJmCUSA_.js";var t=[`5FA85C`,`3E8C7E`,`4E7FC4`,`D2703C`,`C4566B`,`8A6FB0`,`C9A24B`,`6E7A6A`],n=[`E9B44C`,`E3705F`,`5FBFA8`,`9C7BD0`,`D9D2C2`],r=[`plates`,`horns`,`sail`,`shield`],i=(e,t,n,r)=>{if(e===`plates`)return`<g fill="#${t}">
        <path d="M62 30 60 14 50 28Z"/>
        <path d="M48 32 42 16 32 32Z"/>
        <path d="M32 38 22 26 18 42Z"/>
        <path d="M20 50 8 44 8 58Z"/>
      </g>`;if(e===`horns`)return`<g fill="#${r}">
        <path d="M80 46 89 25 93 47Z"/>
        <path d="M51 38 43 15 61 33Z"/>
      </g>`;if(e===`sail`)return`<path d="M46 44C40 16 29 7 18 11C6 16 5 43 9 68C18 59 32 50 46 44Z" fill="#${t}"/>
      <g stroke="#${n}" stroke-width="2.6" stroke-linecap="round" fill="none" opacity=".5">
        <path d="M30 48 24 20"/><path d="M21 54 14 28"/><path d="M14 61 9 44"/>
      </g>`;let i=(e,t)=>[38+Math.cos(e)*36*t,46+Math.sin(e)*32*t].map(e=>e.toFixed(1)).join(` `);return`<g fill="#${t}">${Array.from({length:6},(e,t)=>{let n=3.15+1.95*(t+.5)/6;return`<path d="M${i(n-.15,.97)} ${i(n,1.17)} ${i(n+.15,.97)}Z"/>`}).join(``)}<path d="M38 46 L${Array.from({length:13},(e,t)=>i(3.15+1.95*t/12,1)).join(` L`)}Z"/></g>
    <path d="M38 46 L${Array.from({length:13},(e,t)=>i(3.15+1.95*t/12,.72)).join(` L`)}Z"
          fill="#${n}" opacity=".45"/>`},a=(t,n)=>{let r=`#${e(n,.62)}`;return t===1?`<path d="M52 42q5 5 10 0" stroke="${r}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`:t===2?`<ellipse cx="57" cy="42" rx="5" ry="5.6" fill="#FFFDF6"/>
      <path d="M52 42a5 5.6 0 0 0 10 0Z" fill="#2A2531"/>`:`<ellipse cx="57" cy="42" rx="5" ry="5.6" fill="#FFFDF6"/>
    <ellipse cx="57.6" cy="42.2" ${t===3?`rx="1.6" ry="4"`:`rx="2.4" ry="3.6"`} fill="#2A2531"/>
    <circle cx="55.6" cy="39.6" r="1.3" fill="#FFFFFF"/>`},o={title:`Dino`,license:{name:`CC0 1.0`,url:`https://creativecommons.org/publicdomain/zero/1.0/`}},s=({prng:o})=>{o.next();let s=t[o.integer(0,t.length-1)],c=n[o.integer(0,n.length-1)],l=e(s,.2),u=e(s,-.34),d=e(s,.34),f=e(s,-.62),p=r[o.integer(0,r.length-1)],m=o.integer(0,3),h=o.bool(45),g=o.bool(70),_=o.bool(45),v=o.bool(40),y=`<g transform="rotate(${h?15:0} 40 54)">
      <path d="M40 54 94 54q3 4 0 7l-8 3-34 4q-12 0-12-8Z" fill="#${u}"/>
    </g>`;return{attributes:{viewBox:`0 0 100 100`,fill:`none`,"shape-rendering":`auto`},body:`
      <path d="M52 52q-24 8-30 50" stroke="#${l}" stroke-width="34" fill="none" stroke-linecap="round"/>
      ${i(p,d,c,f)}
      ${h?`<path d="M42 53 95 53l-4 15-49-5Z" fill="#4A2432"/>`:``}
      ${y}
      <path d="M30 54q0-20 18-24q16-4 26 6l16 8q7 3 7 7l-1 3L40 54q-10 0-10-8Z" fill="#${s}"/>
      ${_?`<g fill="#${l}" opacity=".45">
               <circle cx="44" cy="38" r="3"/><circle cx="52" cy="32" r="2.4"/>
               <circle cx="36" cy="46" r="2.6"/>
             </g>`:``}
      ${v?`<g stroke="#${l}" stroke-width="2.8" stroke-linecap="round" fill="none" opacity=".4">
               <path d="M70 40l-2 8"/><path d="M78 43l-2 7"/>
             </g>`:``}
      ${g?`<g fill="#FFFDF6">
               <path d="M62 54l2.2 5.4 2.2-5.4Z"/>
               <path d="M72 54l2.2 5.4 2.2-5.4Z"/>
               <path d="M82 54l2 5 2-5Z"/>
             </g>`:``}
      ${a(m,s)}
      <path d="M50 34q8-3 14 1" stroke="#${e(s,.42)}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <ellipse cx="88" cy="47" rx="2.4" ry="1.8" fill="#2A2531" opacity=".8"/>
    `}};export{s as create,o as meta};