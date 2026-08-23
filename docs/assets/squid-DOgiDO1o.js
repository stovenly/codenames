import{t as e}from"./tint-BJmCUSA_.js";var t=[`E4674F`,`C4557E`,`8E6FC9`,`4E7FD1`,`2F9E9B`,`E39B3C`,`6C7488`,`D46A9E`],n=6,r=[0,.55,-.5,1],i=(e,t,n,r)=>{let i=(e-5/2)*8.4,a=50+i,o=i*.35+t*(i===0?6:i)*.9,s=a+o;return`<path d="M${a} 60q${o*.35} 12 ${s-a} 26" stroke="#${n}" stroke-width="${r}" fill="none" stroke-linecap="round"/>`},a=(t,n)=>{let r=`#${e(n,.55)}`,i=e=>`<ellipse cx="${e}" cy="45" rx="8.5" ry="9" fill="#FFFDF6"/>
     <ellipse cx="${e+1}" cy="45.5" rx="4.2" ry="4.6" fill="#2A2531"/>
     <circle cx="${e+2.6}" cy="42.8" r="1.7" fill="#FFFFFF"/>`,a=e=>`<path d="M${e-7} 45q7 6.5 14 0" stroke="${r}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,o=e=>`<ellipse cx="${e}" cy="45" rx="8.5" ry="9" fill="#FFFDF6"/>
     <path d="M${e-8.5} 45a8.5 9 0 0 0 17 0Z" fill="#2A2531"/>`;return t===0?i(33)+i(67):t===1?a(33)+a(67):t===2?i(33)+a(67):o(33)+o(67)},o={title:`Squid`,license:{name:`CC0 1.0`,url:`https://creativecommons.org/publicdomain/zero/1.0/`}},s=({prng:o})=>{o.next();let s=t[o.integer(0,t.length-1)],c=e(s,.22),l=e(s,-.34),u=r[o.integer(0,r.length-1)],d=o.integer(0,3),f=o.bool(75),p=o.bool(50),m=o.bool(45),h=o.bool(50)?7.5:5.5;return{attributes:{viewBox:`0 0 100 100`,fill:`none`,"shape-rendering":`auto`},body:`
      ${Array.from({length:n},(e,t)=>i(t,u,c,h)).join(``)}
      ${f?`<ellipse cx="20" cy="34" rx="11" ry="6.5" fill="#${c}" transform="rotate(-24 20 34)"/>
             <ellipse cx="80" cy="34" rx="11" ry="6.5" fill="#${c}" transform="rotate(24 80 34)"/>`:``}
      <path d="M50 9c15.5 0 26 13.5 26 30v13c0 8.5-11 13-26 13s-26-4.5-26-13V39C24 22.5 34.5 9 50 9Z" fill="#${s}"/>
      <path d="M50 58c-9 0-16-1.6-20-4.4V50c5 3 12 4.4 20 4.4S65 53 70 50v3.6C66 56.4 59 58 50 58Z" fill="#${l}" opacity=".55"/>
      ${m?`<circle cx="34" cy="24" r="3" fill="#${l}" opacity=".5"/>
             <circle cx="50" cy="18.5" r="2.4" fill="#${l}" opacity=".5"/>
             <circle cx="65" cy="24" r="3" fill="#${l}" opacity=".5"/>`:``}
      ${a(d,s)}
      <path d="M46 59.5q4 4 8 0" stroke="#${e(s,.5)}" stroke-width="2" fill="none" stroke-linecap="round"/>
      ${p?`<g fill="#${l}" opacity=".75">
               <circle cx="42" cy="72" r="1.7"/><circle cx="42" cy="79" r="1.7"/>
               <circle cx="58" cy="72" r="1.7"/><circle cx="58" cy="79" r="1.7"/>
             </g>`:``}
    `}};export{s as create,o as meta};