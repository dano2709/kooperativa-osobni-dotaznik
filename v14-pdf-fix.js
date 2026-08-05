(()=>{
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const byText=text=>[...document.querySelectorAll('button,a')].find(el=>normalize(el.textContent).includes(normalize(text)));
  const timeout=(promise,ms,message)=>Promise.race([
    promise,
    new Promise((_,reject)=>setTimeout(()=>reject(new Error(message)),ms))
  ]);

  let fallbackState={blob:null,url:'',name:''};
  let recoveryRunning=false;

  try{
    if(document.fonts){
      Object.defineProperty(document.fonts,'ready',{
        configurable:true,
        get(){return Promise.resolve(document.fonts);}
      });
    }
  }catch(error){
    console.warn('Nelze přepsat document.fonts.ready:',error);
  }

  const statusNode=()=>document.querySelector('.v12-output-status');
  const setStatus=(message,error=false)=>{
    const status=statusNode();
    if(!status)return;
    status.textContent=message;
    status.style.color=error?'#c5221f':'#00573f';
  };

  const revealActions=state=>{
    const preview=document.getElementById('previewPdf')||byText('Náhled PDF');
    const download=document.getElementById('downloadPdf')||byText('Stáhnout PDF');
    const print=document.getElementById('printPdf')||byText('Vytisknout');
    [preview,download,print].forEach(action=>{
      if(!action)return;
      action.hidden=false;
      action.removeAttribute('hidden');
      action.classList.remove('hide','hidden');
      action.classList.add('v13-visible');
      action.style.setProperty('display','inline-flex','important');
      action.style.setProperty('visibility','visible','important');
      action.style.setProperty('opacity','1','important');
    });
    if(preview){preview.href=state.url;preview.target='_blank';}
    if(download){download.href=state.url;download.download=state.name;}
  };

  const filename=()=>{
    const name=(document.getElementById('fullName')?.value||'zamestnanec')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^A-Za-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
    return `Osobni_dotaznik_${name||'zamestnanec'}.pdf`;
  };

  const buildFromStage=async stage=>{
    if(typeof window.html2canvas!=='function')throw new Error('Knihovna html2canvas není dostupná.');
    const JsPdf=window.jspdf?.jsPDF||window.jsPDF;
    if(!JsPdf)throw new Error('Knihovna jsPDF není dostupná.');
    const pages=[...stage.querySelectorAll('.v12-pdf-page')];
    if(!pages.length)throw new Error('Nebyly nalezeny stránky PDF.');

    const pdf=new JsPdf({orientation:'portrait',unit:'mm',format:'a4',compress:true});
    for(let index=0;index<pages.length;index++){
      const canvas=await timeout(
        window.html2canvas(pages[index],{
          scale:1.65,
          backgroundColor:'#fff',
          useCORS:true,
          allowTaint:false,
          imageTimeout:3000,
          logging:false,
          width:794,
          height:1123,
          windowWidth:794,
          windowHeight:1123,
          scrollX:0,
          scrollY:0,
          removeContainer:true
        }),
        25000,
        `Vykreslení strany ${index+1} trvalo příliš dlouho.`
      );
      if(index)pdf.addPage('a4','portrait');
      pdf.addImage(canvas.toDataURL('image/jpeg',0.93),'JPEG',0,0,210,297,undefined,'FAST');
    }

    if(fallbackState.url)URL.revokeObjectURL(fallbackState.url);
    const blob=pdf.output('blob');
    fallbackState={blob,url:URL.createObjectURL(blob),name:filename()};
    return fallbackState;
  };

  const waitForStage=()=>new Promise((resolve,reject)=>{
    const existing=document.querySelector('.v12-pdf-stage');
    if(existing){resolve(existing);return;}
    const started=Date.now();
    const observer=new MutationObserver(()=>{
      const stage=document.querySelector('.v12-pdf-stage');
      if(stage){observer.disconnect();resolve(stage);}
      else if(Date.now()-started>12000){observer.disconnect();reject(new Error('Generátor nevytvořil podklad PDF.'));}
    });
    observer.observe(document.body,{childList:true,subtree:true});
    setTimeout(()=>{
      observer.disconnect();
      const stage=document.querySelector('.v12-pdf-stage');
      stage?resolve(stage):reject(new Error('Generátor nevytvořil podklad PDF.'));
    },12000);
  });

  const recoverPdf=async createButton=>{
    if(recoveryRunning)return;
    recoveryRunning=true;
    const originalLabel=createButton?.dataset.v14OriginalLabel||'Vytvořit PDF';
    try{
      await new Promise(resolve=>setTimeout(resolve,900));
      if(normalize(statusNode()?.textContent).includes('pdf je pripravené'))return;
      const stage=await waitForStage();
      const state=await buildFromStage(stage);
      revealActions(state);
      setStatus('PDF je připravené k náhledu, stažení nebo tisku.');
    }catch(error){
      console.error('Nouzové vytvoření PDF:',error);
      setStatus(error.message||'PDF se nepodařilo vytvořit.',true);
    }finally{
      recoveryRunning=false;
      if(createButton){
        createButton.disabled=false;
        createButton.textContent=originalLabel;
      }
    }
  };

  window.addEventListener('click',event=>{
    const target=event.target.closest('button,a');
    if(!target)return;
    const text=normalize(target.textContent);

    if(text.includes('vytvorit pdf')||text.includes('vytvarim pdf')){
      if(!target.dataset.v14OriginalLabel)target.dataset.v14OriginalLabel='Vytvořit PDF';
      setTimeout(()=>recoverPdf(target),0);
      return;
    }

    if(!fallbackState.url)return;
    if(target.id==='previewPdf'||text.includes('nahled pdf')){
      event.preventDefault();event.stopImmediatePropagation();
      window.open(fallbackState.url,'_blank','noopener');
    }else if(target.id==='downloadPdf'||text.includes('stahnout pdf')){
      event.preventDefault();event.stopImmediatePropagation();
      const anchor=document.createElement('a');
      anchor.href=fallbackState.url;anchor.download=fallbackState.name;
      document.body.appendChild(anchor);anchor.click();anchor.remove();
    }else if(target.id==='printPdf'||text.includes('vytisknout')){
      event.preventDefault();event.stopImmediatePropagation();
      const win=window.open(fallbackState.url,'_blank');
      if(win)setTimeout(()=>win.print?.(),900);
    }
  },true);
})();
