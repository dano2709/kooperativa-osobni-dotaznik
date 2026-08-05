(()=>{
  const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const clean=value=>String(value??'').trim();
  const localElements=(root,name)=>[...root.getElementsByTagName('*')].filter(node=>node.localName===name);
  const directChildren=(root,name)=>[...root.children].filter(node=>node.localName===name);
  const firstDirect=(root,name)=>directChildren(root,name)[0]||null;
  const create=(doc,name)=>doc.createElementNS(W,`w:${name}`);
  const setW=(node,name,value)=>node.setAttributeNS(W,`w:${name}`,value);

  const readDependents=()=>{
    const container=document.getElementById('dependentRows');
    if(!container)return [];
    return [...container.querySelectorAll('.repeat-row')].map(row=>({
      name:clean(row.querySelector('[data-row-field="name"]')?.value),
      personalNumber:clean(row.querySelector('[data-row-field="personalNumber"]')?.value)
    })).filter(person=>person.name||person.personalNumber);
  };

  const cloneRPr=(run,doc)=>{
    const source=run&&firstDirect(run,'rPr');
    return source?source.cloneNode(true):create(doc,'rPr');
  };

  const removeLocal=(root,names)=>{
    directChildren(root,'').forEach(()=>{});
    [...root.children].forEach(child=>{if(names.includes(child.localName))child.remove();});
  };

  const setFont=(rPr,doc,{bold=null,size='22',csSize='18'}={})=>{
    removeLocal(rPr,['rFonts','sz','szCs']);
    const fonts=create(doc,'rFonts');
    setW(fonts,'ascii','Koop Office;Calibri');
    setW(fonts,'hAnsi','Koop Office;Calibri');
    setW(fonts,'cs','Koop Office;Calibri');
    rPr.insertBefore(fonts,rPr.firstChild);
    if(size){const sz=create(doc,'sz');setW(sz,'val',size);rPr.appendChild(sz);}
    if(csSize){const szCs=create(doc,'szCs');setW(szCs,'val',csSize);rPr.appendChild(szCs);}
    if(bold!==null){
      removeLocal(rPr,['b','bCs']);
      if(bold===true){rPr.appendChild(create(doc,'b'));rPr.appendChild(create(doc,'bCs'));}
    }
    return rPr;
  };

  const makeRun=(doc,text,rPr,preserve=false)=>{
    const run=create(doc,'r');
    if(rPr)run.appendChild(rPr.cloneNode(true));
    const t=create(doc,'t');
    if(preserve||/^\s|\s$/.test(text))t.setAttribute('xml:space','preserve');
    t.textContent=text;
    run.appendChild(t);
    return run;
  };

  const replaceCellParagraph=(doc,cell,sourceParagraph,buildRuns)=>{
    const paragraph=create(doc,'p');
    const sourcePPr=sourceParagraph&&firstDirect(sourceParagraph,'pPr');
    if(sourcePPr)paragraph.appendChild(sourcePPr.cloneNode(true));
    buildRuns(paragraph);
    directChildren(cell,'p').forEach(node=>node.remove());
    cell.appendChild(paragraph);
    return paragraph;
  };

  const patchSingleDependentFormatting=(doc,root)=>{
    const dependents=readDependents();
    if(dependents.length!==1)return;

    const rows=localElements(root,'tr');
    const dependentIndex=rows.findIndex(row=>normalize(row.textContent).includes('ostatni vyzivovane osoby'));
    if(dependentIndex<0)return;
    const dependentRow=rows[dependentIndex];
    const dependentCells=directChildren(dependentRow,'tc');
    if(dependentCells.length<11)return;

    let sourceRow=null;
    for(let index=dependentIndex-1;index>=0;index--){
      const cells=directChildren(rows[index],'tc');
      const text=normalize(rows[index].textContent);
      if(cells.length>=11&&!text.includes('manzel')){sourceRow=rows[index];break;}
    }
    if(!sourceRow)return;

    const sourceCells=directChildren(sourceRow,'tc');
    const sourceNameCell=sourceCells[Math.max(0,sourceCells.length-11)];
    const sourceNameParagraph=firstDirect(sourceNameCell,'p');
    const sourceNameRun=localElements(sourceNameParagraph||sourceNameCell,'r').find(run=>clean(run.textContent))||localElements(sourceNameParagraph||sourceNameCell,'r')[0];
    const nameRPr=setFont(cloneRPr(sourceNameRun,doc),doc,{bold:true,size:'22',csSize:'18'});
    const labelRPr=setFont(cloneRPr(sourceNameRun,doc),doc,{bold:false,size:'22',csSize:'18'});

    replaceCellParagraph(doc,dependentCells[0],sourceNameParagraph,paragraph=>{
      paragraph.appendChild(makeRun(doc,'Ostatní vyživované osoby:',labelRPr));
      paragraph.appendChild(makeRun(doc,' '+(dependents[0].name||'Neuvedeno'),nameRPr,true));
    });

    const sourceDigitCells=sourceCells.slice(-10);
    const targetDigitCells=dependentCells.slice(-10);
    targetDigitCells.forEach((cell,index)=>{
      const sourceCell=sourceDigitCells[index];
      const sourceParagraph=sourceCell&&firstDirect(sourceCell,'p');
      const sourceRun=sourceParagraph&&localElements(sourceParagraph,'r').find(run=>clean(run.textContent));
      const digitRPr=setFont(cloneRPr(sourceRun,doc),doc,{bold:false,size:'22',csSize:'18'});
      replaceCellParagraph(doc,cell,sourceParagraph,paragraph=>{
        paragraph.appendChild(makeRun(doc,'',digitRPr));
      });
    });
  };

  const paragraphText=paragraph=>clean(localElements(paragraph,'t').map(node=>node.textContent||'').join(''));

  const ensurePPr=(doc,paragraph)=>{
    let pPr=firstDirect(paragraph,'pPr');
    if(!pPr){pPr=create(doc,'pPr');paragraph.insertBefore(pPr,paragraph.firstChild);}
    return pPr;
  };

  const styleParagraph=(doc,paragraph,{bold=null,justify='both',size='22',csSize='18'}={})=>{
    const pPr=ensurePPr(doc,paragraph);
    removeLocal(pPr,['pStyle','jc']);
    const style=create(doc,'pStyle');setW(style,'val','Normal');pPr.insertBefore(style,pPr.firstChild);
    if(justify){const jc=create(doc,'jc');setW(jc,'val',justify);pPr.appendChild(jc);}
    localElements(paragraph,'r').forEach(run=>{
      let rPr=firstDirect(run,'rPr');
      if(!rPr){rPr=create(doc,'rPr');run.insertBefore(rPr,run.firstChild);}
      setFont(rPr,doc,{bold,size,csSize});
    });
  };

  const addTab=(doc,run)=>run.appendChild(create(doc,'tab'));

  const getSignatureMode=()=>normalize(document.querySelector('input[name="signatureMode"]:checked')?.value||'');
  const isSignedMode=()=>{
    const mode=getSignatureMode();
    return Boolean(mode)&&!mode.includes('print')&&!mode.includes('tisk');
  };

  const findDrawingRun=(paragraphs,startIndex)=>{
    for(let index=paragraphs.length-1;index>=Math.max(0,startIndex);index--){
      const run=localElements(paragraphs[index],'r').find(item=>localElements(item,'drawing').length||localElements(item,'pict').length);
      if(run)return run.cloneNode(true);
    }
    return null;
  };

  const resizeSignatureDrawing=run=>{
    if(!run)return;
    localElements(run,'extent').forEach(extent=>{
      extent.setAttribute('cx','1850000');
      extent.setAttribute('cy','520000');
    });
  };

  const rebuildSignatureParagraph=(doc,paragraph,drawingRun)=>{
    const place=clean(document.getElementById('signaturePlace')?.value);
    const date=clean(document.getElementById('signatureDate')?.value);
    const signed=isSignedMode()&&drawingRun;

    [...paragraph.children].forEach(child=>child.remove());
    const pPr=create(doc,'pPr');
    const style=create(doc,'pStyle');setW(style,'val','Normal');pPr.appendChild(style);
    const tabs=create(doc,'tabs');
    [['clear','720'],['left','2552'],['center','8789']].forEach(([val,pos])=>{
      const tab=create(doc,'tab');setW(tab,'val',val);setW(tab,'pos',pos);if(val!=='clear')setW(tab,'leader','none');tabs.appendChild(tab);
    });
    pPr.appendChild(tabs);
    paragraph.appendChild(pPr);

    const normal=setFont(create(doc,'rPr'),doc,{bold:false,size:'22',csSize:'18'});
    const bold=setFont(create(doc,'rPr'),doc,{bold:true,size:'22',csSize:'18'});

    paragraph.appendChild(makeRun(doc,'V ',normal,true));
    paragraph.appendChild(makeRun(doc,place||'     ',bold,true));
    const tab1=create(doc,'r');tab1.appendChild(normal.cloneNode(true));addTab(doc,tab1);paragraph.appendChild(tab1);
    paragraph.appendChild(makeRun(doc,'dne ',normal,true));
    paragraph.appendChild(makeRun(doc,date||'     ',bold,true));
    const tab2=create(doc,'r');tab2.appendChild(normal.cloneNode(true));addTab(doc,tab2);paragraph.appendChild(tab2);

    if(signed){
      resizeSignatureDrawing(drawingRun);
      paragraph.appendChild(drawingRun);
      paragraph.appendChild(makeRun(doc,' podpis',normal,true));
    }else{
      paragraph.appendChild(makeRun(doc,'………………………………. podpis',normal));
    }
  };

  const patchLegalSignaturePage=(doc,root)=>{
    const paragraphs=localElements(root,'p');
    const confirmationIndex=paragraphs.findIndex(p=>normalize(paragraphText(p)).includes('podpisem tohoto dokumentu potvrzujete'));
    const declarationIndex=paragraphs.findIndex(p=>normalize(paragraphText(p)).includes('prohlasuji, ze jsem nic nezamlcel'));
    if(confirmationIndex<0||declarationIndex<0)return;

    const continuationIndex=Math.max(0,confirmationIndex-1);
    styleParagraph(doc,paragraphs[continuationIndex],{bold:null,justify:'both',size:'22',csSize:'18'});
    styleParagraph(doc,paragraphs[confirmationIndex],{bold:true,justify:'both',size:'22',csSize:'18'});
    styleParagraph(doc,paragraphs[declarationIndex],{bold:false,justify:'both',size:'22',csSize:'18'});

    let signatureIndex=-1;
    for(let index=paragraphs.length-1;index>declarationIndex;index--){
      const text=normalize(paragraphText(paragraphs[index]));
      if((text.includes('podpis')&&text.includes('dne'))||localElements(paragraphs[index],'drawing').length||localElements(paragraphs[index],'pict').length){
        signatureIndex=index;break;
      }
    }
    if(signatureIndex<0){
      const body=localElements(root,'body')[0];
      const section=body&&firstDirect(body,'sectPr');
      const paragraph=create(doc,'p');
      if(section)body.insertBefore(paragraph,section);else body.appendChild(paragraph);
      paragraphs.push(paragraph);
      signatureIndex=paragraphs.length-1;
    }

    const drawingRun=findDrawingRun(paragraphs,declarationIndex);
    rebuildSignatureParagraph(doc,paragraphs[signatureIndex],drawingRun);
  };

  const patchDocumentXml=zip=>{
    const file=zip.file('word/document.xml');
    if(!file)return;
    const xml=file.asText();
    const doc=new DOMParser().parseFromString(xml,'application/xml');
    if(doc.querySelector('parsererror'))return;
    patchSingleDependentFormatting(doc,doc);
    patchLegalSignaturePage(doc,doc);
    zip.file('word/document.xml',new XMLSerializer().serializeToString(doc));
  };

  const patchPizZip=PizZip=>{
    if(!PizZip?.prototype||PizZip.prototype.__koopWordV18)return;
    const originalGenerate=PizZip.prototype.generate;
    if(typeof originalGenerate!=='function')return;
    PizZip.prototype.generate=function(...args){
      try{patchDocumentXml(this);}catch(error){console.error('Úprava Wordu v18:',error);}
      return originalGenerate.apply(this,args);
    };
    PizZip.prototype.__koopWordV18=true;
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
