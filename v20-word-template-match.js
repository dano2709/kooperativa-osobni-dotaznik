(()=>{
  const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const FONT='Koop Office';
  const SIZE_DEFAULT='20';
  const SIZE_EMAIL_INFO='18';
  const SIZE_RC='22';
  const SIZE_ANSWER='24';
  const SIZE_LEGAL='22';
  const SIZE_TITLE='28';

  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
  const localElements=(root,name)=>[...root.getElementsByTagName('*')].filter(node=>node.localName===name);
  const directChildren=(root,name)=>[...root.children].filter(node=>node.localName===name);
  const firstDirect=(root,name)=>directChildren(root,name)[0]||null;
  const create=(doc,name)=>doc.createElementNS(W,`w:${name}`);
  const setW=(node,name,value)=>node.setAttributeNS(W,`w:${name}`,value);

  const removeDirect=(root,names)=>{
    [...root.children].forEach(child=>{if(names.includes(child.localName))child.remove();});
  };

  const ensureRPr=(doc,run)=>{
    let rPr=firstDirect(run,'rPr');
    if(!rPr){rPr=create(doc,'rPr');run.insertBefore(rPr,run.firstChild);}
    return rPr;
  };

  const formatRun=(doc,run,size)=>{
    const rPr=ensureRPr(doc,run);
    removeDirect(rPr,['rFonts','sz','szCs']);
    const fonts=create(doc,'rFonts');
    ['ascii','hAnsi','eastAsia','cs'].forEach(name=>setW(fonts,name,FONT));
    rPr.insertBefore(fonts,rPr.firstChild);
    const sz=create(doc,'sz');setW(sz,'val',size);rPr.appendChild(sz);
    const szCs=create(doc,'szCs');setW(szCs,'val',size);rPr.appendChild(szCs);
  };

  const formatRuns=(doc,root,size)=>localElements(root,'r').forEach(run=>formatRun(doc,run,size));
  const paragraphText=paragraph=>localElements(paragraph,'t').map(node=>node.textContent||'').join('');
  const cellText=cell=>localElements(cell,'t').map(node=>node.textContent||'').join('');

  const setStyleFont=(doc,rPr,size=null)=>{
    removeDirect(rPr,['rFonts']);
    const fonts=create(doc,'rFonts');
    ['ascii','hAnsi','eastAsia','cs'].forEach(name=>setW(fonts,name,FONT));
    rPr.insertBefore(fonts,rPr.firstChild);
    if(size){
      removeDirect(rPr,['sz','szCs']);
      const sz=create(doc,'sz');setW(sz,'val',size);rPr.appendChild(sz);
      const szCs=create(doc,'szCs');setW(szCs,'val',size);rPr.appendChild(szCs);
    }
  };

  const patchStyles=(doc)=>{
    const docDefaults=localElements(doc,'docDefaults')[0];
    if(docDefaults){
      let rPrDefault=firstDirect(docDefaults,'rPrDefault');
      if(!rPrDefault){rPrDefault=create(doc,'rPrDefault');docDefaults.appendChild(rPrDefault);}
      let rPr=firstDirect(rPrDefault,'rPr');
      if(!rPr){rPr=create(doc,'rPr');rPrDefault.appendChild(rPr);}
      setStyleFont(doc,rPr,SIZE_DEFAULT);
    }
    localElements(doc,'style').forEach(style=>{
      let rPr=firstDirect(style,'rPr');
      if(!rPr){rPr=create(doc,'rPr');style.appendChild(rPr);}
      const styleId=style.getAttributeNS(W,'styleId')||'';
      setStyleFont(doc,rPr,styleId==='Normal'?SIZE_DEFAULT:null);
    });
  };

  const restorePageLayout=(doc)=>{
    localElements(doc,'sectPr').forEach(section=>{
      let margins=firstDirect(section,'pgMar');
      if(!margins){margins=create(doc,'pgMar');section.appendChild(margins);}
      const values={top:'568',right:'567',bottom:'426',left:'567',header:'284',footer:'0',gutter:'0'};
      Object.entries(values).forEach(([name,value])=>setW(margins,name,value));
    });
  };

  const restoreParagraphFlow=(doc)=>{
    localElements(doc,'pPr').forEach(pPr=>{
      removeDirect(pPr,['keepNext','keepLines','spacing','pageBreakBefore']);
    });
  };

  const patchDocument=(doc)=>{
    restorePageLayout(doc);
    restoreParagraphFlow(doc);
    formatRuns(doc,doc,SIZE_DEFAULT);
    const paragraphs=localElements(doc,'p');

    paragraphs.forEach(paragraph=>{
      if(normalize(paragraphText(paragraph))==='osobni data zamestnance')formatRuns(doc,paragraph,SIZE_TITLE);
    });

    paragraphs.forEach(paragraph=>{
      const text=normalize(paragraphText(paragraph));
      if(text.startsWith('informace o pouziti soukrome emailove adresy pro pracovnepravni ucely')
        ||text.startsWith('zamestnancem uvedena soukroma emailova adresa je urcena')){
        formatRuns(doc,paragraph,SIZE_EMAIL_INFO);
      }
    });

    localElements(doc,'tc').forEach(cell=>{
      if(/^\d$/.test(normalize(cellText(cell))))formatRuns(doc,cell,SIZE_RC);
    });

    paragraphs.forEach(paragraph=>{
      const text=normalize(paragraphText(paragraph));
      if(text==='ano'||text==='ne')formatRuns(doc,paragraph,SIZE_ANSWER);
    });

    const legalStart=paragraphs.findIndex(paragraph=>normalize(paragraphText(paragraph)).includes('informace o zpracovani osobnich udaju'));
    if(legalStart>=0){
      for(let index=legalStart;index<paragraphs.length;index++)formatRuns(doc,paragraphs[index],SIZE_LEGAL);
    }
  };

  const patchXmlPart=(zip,path,mode)=>{
    const file=zip.file(path);if(!file)return;
    const source=file.asText();
    const doc=new DOMParser().parseFromString(source,'application/xml');
    if(doc.querySelector('parsererror'))return;
    if(mode==='document')patchDocument(doc);
    else if(mode==='styles')patchStyles(doc);
    else formatRuns(doc,doc,SIZE_DEFAULT);
    zip.file(path,new XMLSerializer().serializeToString(doc));
  };

  const patchZip=zip=>{
    patchXmlPart(zip,'word/styles.xml','styles');
    patchXmlPart(zip,'word/document.xml','document');
    Object.keys(zip.files)
      .filter(path=>/^word\/(header|footer)\d*\.xml$/i.test(path))
      .forEach(path=>patchXmlPart(zip,path,'generic'));
  };

  const patchPizZip=PizZip=>{
    if(!PizZip?.prototype||PizZip.prototype.__koopTemplateMatchV20)return;
    const originalGenerate=PizZip.prototype.generate;
    if(typeof originalGenerate!=='function')return;
    PizZip.prototype.generate=function(...args){
      try{patchZip(this);}catch(error){console.error('Obnovení formátu původní Word šablony:',error);}
      return originalGenerate.apply(this,args);
    };
    PizZip.prototype.__koopTemplateMatchV20=true;
  };

  if(window.PizZip){patchPizZip(window.PizZip);return;}
  const previous=Object.getOwnPropertyDescriptor(window,'PizZip');
  if(previous&&!previous.configurable)return;
  let storedValue;
  Object.defineProperty(window,'PizZip',{
    configurable:true,
    enumerable:true,
    get(){return previous?.get?previous.get.call(window):storedValue;},
    set(value){
      if(previous?.set)previous.set.call(window,value);else storedValue=value;
      patchPizZip(value);
    }
  });
})();
