(()=>{
  'use strict';
  const clean=value=>String(value??'').trim();
  const normalize=value=>clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ');
  const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];

  const addStyles=()=>{
    if(document.getElementById('v28-final-word-style'))return;
    const style=document.createElement('style');
    style.id='v28-final-word-style';
    style.textContent=`
      #v28FinalWordActions{display:flex;align-items:center;justify-content:flex-end;gap:14px;flex-wrap:wrap;width:100%;margin:18px 0 4px}
      #v28FinalWordActions button{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:12px 20px;border:0;border-radius:12px;background:#00843d!important;color:#fff!important;font-size:16px;font-weight:800;cursor:pointer}
      #v28FinalWordActions button:hover{background:#006f34!important}
      #v28FinalWordActions button:disabled{opacity:.65;cursor:wait}
      #v28FinalWordActions .v12-output-status{width:auto!important;flex:0 1 auto;margin:0!important;min-height:20px;text-align:right}
      #v28FinalWordActions .v12-output-status[hidden]{display:none!important}
    `;
    document.head.appendChild(style);
  };

  const replaceKnownCopy=()=>{
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(node=>{
      const text=node.nodeValue||'';
      if(text.includes('Potvrzení je dokončeno. Nyní můžete vytvořit PDF.')){
        node.nodeValue=text.replace('Potvrzení je dokončeno. Nyní můžete vytvořit PDF.','Potvrzení je dokončeno. Nyní můžete vygenerovat Word.');
      }
      if(text.includes('Při generování PDF jsou data zpracována přímo v tomto prohlížeči.')){
        node.nodeValue=text.replace('Při generování PDF jsou data zpracována přímo v tomto prohlížeči.','Při generování Wordu jsou data zpracována přímo v tomto prohlížeči.');
      }
    });
  };

  const removePdfControls=()=>{
    ['createPdf','generatePdf','previewPdf','downloadPdf','printPdf'].forEach(id=>document.getElementById(id)?.remove());
    $$('button,a').forEach(element=>{
      const text=normalize(element.textContent);
      if(text.includes('pdf')||text==='vytisknout')element.remove();
    });
  };

  const cleanStatus=status=>{
    if(!status)return;
    const text=normalize(status.textContent);
    if(!text||text.includes('pdf')){
      if(text.includes('pdf'))status.textContent='';
      status.hidden=true;
      return;
    }
    status.hidden=false;
  };

  const confirmationMessage=()=>{
    const matches=$$('div,p,aside,section').filter(element=>normalize(element.textContent).includes('potvrzeni je dokonceno'));
    return matches.sort((a,b)=>clean(a.textContent).length-clean(b.textContent).length)[0]||null;
  };

  const wordButton=()=>document.getElementById('generateWordV26')
    ||document.getElementById('generateWordV25')
    ||document.getElementById('generateWordV23')
    ||document.getElementById('generateWordV12')
    ||$$('button,a').find(element=>normalize(element.textContent).includes('vygenerovat word'))
    ||null;

  const place=()=>{
    addStyles();replaceKnownCopy();removePdfControls();
    const message=confirmationMessage();
    const button=wordButton();
    if(!button)return false;
    const status=document.querySelector('.v12-output-status');
    cleanStatus(status);
    if(!message){
      let holding=document.getElementById('v28WordHolding');
      if(!holding){holding=document.createElement('div');holding.id='v28WordHolding';holding.hidden=true;document.body.appendChild(holding);}
      if(button.parentElement!==holding)holding.appendChild(button);
      if(status&&status.parentElement!==holding)holding.appendChild(status);
      return false;
    }

    let actions=document.getElementById('v28FinalWordActions');
    if(!actions){actions=document.createElement('div');actions.id='v28FinalWordActions';}
    if(actions.parentElement!==message.parentElement||actions.previousElementSibling!==message){
      message.insertAdjacentElement('afterend',actions);
    }
    if(status&&status.parentElement!==actions)actions.appendChild(status);
    if(button.parentElement!==actions)actions.appendChild(button);

    $$('button,a').filter(element=>element!==button&&normalize(element.textContent).includes('vygenerovat word')).forEach(element=>element.remove());
    return true;
  };

  let scheduled=false;
  const schedule=()=>{
    if(scheduled)return;scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;place();});
  };
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','hidden','style']});
  document.addEventListener('click',()=>setTimeout(schedule,0),true);
  document.addEventListener('change',()=>setTimeout(schedule,0),true);
  schedule();
})();
