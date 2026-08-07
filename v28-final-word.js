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
      #v28FinalWordActions{grid-column:1/-1!important;width:100%;margin:22px 0 6px;display:flex;justify-content:flex-end}
      #v28FinalWordBox{width:min(100%,520px);display:flex;flex-direction:column;gap:12px}
      #v28FinalWordCard{display:flex;align-items:center;gap:16px;padding:17px 18px;border:1px solid #d5e1d9;border-radius:14px;background:#fff;box-shadow:0 5px 16px rgba(0,87,63,.07)}
      #v28FinalWordCard img{width:58px;height:58px;object-fit:contain;flex:0 0 58px}
      #v28FinalWordCard .v28-meta{flex:1;min-width:0}
      #v28FinalWordCard .v28-label{margin:0 0 6px;color:#26352d;font-size:13px;font-weight:800}
      #v28FinalWordCard .v28-name{margin:0;color:#16231b;font-size:16px;font-weight:700;line-height:1.3}
      #v28FinalWordCard .v28-type{display:block;margin-top:4px;color:#647168;font-size:13px;font-weight:600}
      #v28FinalWordCard .v28-check{width:34px;height:34px;border:2px solid #86d295;border-radius:50%;display:grid;place-items:center;color:#00843d;font-size:18px;font-weight:900;flex:0 0 34px}
      #v28FinalWordBox .v12-output-status{width:100%!important;margin:0!important;min-height:18px;text-align:left;color:#00573f;font-size:12px;font-weight:700}
      #v28FinalWordBox .v12-output-status[hidden]{display:none!important}
      #v28FinalWordBox button{display:inline-flex;align-items:center;justify-content:center;width:100%;min-height:56px;padding:14px 24px;border:0;border-radius:12px;background:#00843d!important;color:#fff!important;font-size:17px;font-weight:800;cursor:pointer;box-shadow:0 7px 16px rgba(0,132,61,.18)}
      #v28FinalWordBox button:hover{background:#006f34!important}
      #v28FinalWordBox button:disabled{opacity:.65;cursor:wait}
      @media(max-width:720px){#v28FinalWordActions{justify-content:stretch}#v28FinalWordBox{width:100%}}
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

  const buildWordUi=(button,status)=>{
    let actions=document.getElementById('v28FinalWordActions');
    if(!actions){
      actions=document.createElement('div');
      actions.id='v28FinalWordActions';
    }
    let box=document.getElementById('v28FinalWordBox');
    if(!box){
      box=document.createElement('div');
      box.id='v28FinalWordBox';
      const card=document.createElement('div');
      card.id='v28FinalWordCard';
      card.innerHTML=`
        <img src="word-icon.svg" alt="Microsoft Word">
        <div class="v28-meta">
          <p class="v28-label">Dokument k vygenerování</p>
          <p class="v28-name">Osobní dotazník zaměstnance</p>
          <span class="v28-type">Word (.docx)</span>
        </div>
        <span class="v28-check" aria-hidden="true">✓</span>`;
      box.appendChild(card);
      actions.appendChild(box);
    }
    if(actions.firstElementChild!==box)actions.prepend(box);
    if(status&&status.parentElement!==box)box.appendChild(status);
    if(button.parentElement!==box)box.appendChild(button);
    button.textContent='Vygenerovat Word';
    return actions;
  };

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

    const actions=buildWordUi(button,status);
    if(actions.parentElement!==message.parentElement||actions.previousElementSibling!==message){
      message.insertAdjacentElement('afterend',actions);
    }
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
