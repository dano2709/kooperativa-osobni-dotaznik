(()=>{
  const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const FONT='Koop Office';
  const SIZE_DEFAULT='20'; // 10 pt
  const SIZE_SMALL='18';   // 9 pt
  const SIZE_11='22';      // 11 pt
  const SIZE_12='24';      // 12 pt

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
    if(!rPr){
      rPr=create(doc,'rPr');
      run.insertBefore(rPr,run.firstChild);
    }
    return rPr;
  };

  const formatRun=(doc,run,size)=>{
    const rPr=ensureRPr(doc,run);
    removeDirect(rPr,['rFonts','sz','szCs']);

    const fonts=create(doc,'rFonts');
    setW(fonts,'ascii',FONT);
    setW(fonts,'hAnsi',FONT);
    setW(fonts,'eastAsia',FONT);
    setW(fonts,'cs',FONT);
    rPr.insertBefore(fonts,rPr.firstChild);

    const sz=create(doc,'sz');setW(sz,'val',size);rPr.appendChild(sz);
    const szCs=create(doc,'szCs');setW(szCs,'val',size);rPr.appendChild(szCs);
  };

  const formatRuns=(doc,root,size)=>localElements(root,'r').forEach(run=>formatRun(doc,run,size));
  const paragraphText=paragraph=>localElements(paragraph,'t').map(node=>node.textContent||'').join('');
  const cellText=cell=>localElements(cell,'t').map(node=>node.textContent||'').join('');

  const setStyleDefaults=(doc,root)=>{
    const docDefaults=localElements(root,'docDefaults')[0];
    if(docDefaults){
      let rPrDefault=firstDirect(docDefaults,'rPrDefault');
      if(!rPrDefault){rPrDefault=create(doc,'rPrDefault');docDefaults.appendChild(rPrDefault);}
      let rPr=firstDirect(rPrDefault,'rPr');
      if(!rPr){rPr=create(doc,'rPr');rPrDefault.appendChild(rPr);}
      const fakeRun=create(doc,'r');fakeRun.appendChild(rPr);
      formatRun(doc,fakeRun,SIZE_DEFAULT);
      rPrDefault.appendChild(firstDirect(fakeRun,'rPr'));
    }

    localElements(root,'style').forEach(style=>{
      let rPr=firstDirect(style,'rPr');
      if(!rPr){rPr=create(doc,'rPr');style.appendChild(rPr);}
      removeDirect(rPr,['rFonts']);
      const fonts=create(doc,'rFonts');
      setW(fonts,'ascii',FONT);setW(fonts,'hAnsi',FONT);setW(fonts,'eastAsia',FONT);setW(fonts,'cs',FONT);
      rPr.insertBefore(fonts,rPr.firstChild);
    });
  };

  const patchDocument=(doc)=>{
    // Výchozí typografie celého dokumentu: Koop Office, 10 pt.
    formatRuns(doc,doc,SIZE_DEFAULT);

    // Informační blok pod soukromým e-mailem: 9 pt.
    localElements(doc,'tc').forEach(cell=>{
      const text=normalize(cellText(cell));
      if(text.includes('informace o pouziti soukrome emailove adresy pro pracovnepravni ucely')){
        formatRuns(doc,cell,SIZE_SMALL);
      }
    });

    // Jednotlivé číslice rodných čísel v tabulkách: 11 pt.
    localElements(doc,'tc').forEach(cell=>{
      const text=normalize(cellText(cell));
      if(/^\d$/.test(text))formatRuns(doc,cell,SIZE_11);
    });

    // Samostatné odpovědi ANO / NE: 12 pt.
    localElements(doc,'p').forEach(paragraph=>{
      const text=normalize(paragraphText(paragraph));
      if(text==='ano'||text==='ne')formatRuns(doc,paragraph,SIZE_12);
    });

    // Celá část INFORMACE O ZPRACOVÁNÍ OSOBNÍCH ÚDAJŮ včetně V, dne a podpisu: 11 pt.
    const paragraphs=localElements(doc,'p');
    const legalStart=paragraphs.findIndex(paragraph=>normalize(paragraphText(paragraph)).includes('informace o zpracovani osobnich udaju'));
    if(legalStart>=0){
      for(let index=legalStart;index<paragraphs.length;index++)formatRuns(doc,paragraphs[index],SIZE_11);
    }
  };

  const patchXmlPart=(zip,path,mode)=>{
    const file=zip.file(path);
    if(!file)return;
    const source=file.asText();
    const doc=new DOMParser().parseFromString(source,'application/xml');
    if(doc.querySelector('parsererror'))return;

    if(mode==='document')patchDocument(doc);
    else if(mode==='styles')setStyleDefaults(doc,doc);
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
    if(!PizZip?.prototype||PizZip.prototype.__koopTypographyV19)return;
    const originalGenerate=PizZip.prototype.generate;
    if(typeof originalGenerate!=='function')return;

    PizZip.prototype.generate=function(...args){
      try{patchZip(this);}catch(error){console.error('Úprava typografie Wordu v19:',error);}
      return originalGenerate.apply(this,args);
    };
    PizZip.prototype.__koopTypographyV19=true;
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
