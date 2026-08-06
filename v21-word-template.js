(()=>{
  const TEMPLATE_DATA_PARTS=[
    'assets/word-template-v21-xml-01.b64part?v=21',
    'assets/word-template-v21-xml-02.b64part?v=21',
    'assets/word-template-v21-xml-03.b64part?v=21',
    'assets/word-template-v21-xml-04.b64part?v=21'
  ];
  const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';

  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
  const clean=value=>String(value??'').trim();
  const localElements=(root,name)=>[...root.getElementsByTagName('*')].filter(node=>node.localName===name);
  const directChildren=(root,name)=>[...root.children].filter(node=>node.localName===name);
  const firstDirect=(root,name)=>directChildren(root,name)[0]||null;
  const create=(doc,name)=>doc.createElementNS(W,`w:${name}`);

  let templateEntries=null;
  let templateLoadError=null;

  const decodeTemplate=async encoded=>{
    if(typeof DecompressionStream!=='function'){
      throw new Error('Prohlížeč nepodporuje načtení Word šablony. Použijte aktuální Chrome, Edge nebo Firefox.');
    }
    const binary=atob(encoded.replace(/\s+/g,''));
    const compressed=new Uint8Array(binary.length);
    for(let index=0;index<binary.length;index++)compressed[index]=binary.charCodeAt(index);
    const stream=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));
    return JSON.parse(await new Response(stream).text());
  };

  const templateReady=Promise.all(TEMPLATE_DATA_PARTS.map(path=>fetch(path,{cache:'no-store'}).then(response=>{
    if(!response.ok)throw new Error(`Word šablona: HTTP ${response.status}`);
    return response.text();
  }))).then(parts=>decodeTemplate(parts.join(''))).then(entries=>{
    templateEntries=entries;
    return entries;
  }).catch(error=>{
    templateLoadError=error;
    console.error('Načtení Word šablony v21:',error);
    throw error;
  });

  window.addEventListener('click',event=>{
    const button=event.target?.closest?.('#generateWordV12');
    if(!button||templateEntries)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    button.disabled=true;
    const status=document.querySelector('.v12-output-status');
    if(status)status.textContent='Načítám přesnou Word šablonu…';
    templateReady.then(()=>{
      button.disabled=false;
      button.click();
    }).catch(error=>{
      button.disabled=false;
      if(status){status.textContent=error.message||'Word šablonu se nepodařilo načíst.';status.style.color='#c5221f';}
    });
  },true);

  const injectTemplate=zip=>{
    if(templateLoadError)throw templateLoadError;
    if(!templateEntries)throw new Error('Word šablona se ještě načítá. Zkuste tlačítko znovu.');
    Object.entries(templateEntries).forEach(([path,content])=>zip.file(path,content));
  };

  const readDependents=()=>{
    const container=document.getElementById('dependentRows');
    if(!container)return [];
    return [...container.querySelectorAll('.repeat-row')].map(row=>({
      name:clean(row.querySelector('[data-row-field="name"]')?.value),
      personalNumber:clean(row.querySelector('[data-row-field="personalNumber"]')?.value)
    })).filter(person=>person.name||person.personalNumber);
  };

  const setRunText=(doc,run,value)=>{
    let texts=localElements(run,'t');
    if(!texts.length){
      const text=create(doc,'t');
      run.appendChild(text);
      texts=[text];
    }
    texts[0].textContent=value;
    if(/^\s|\s$/.test(value))texts[0].setAttribute('xml:space','preserve');
    else texts[0].removeAttribute('xml:space');
    for(let index=1;index<texts.length;index++)texts[index].textContent='';
  };

  const cloneParagraphAndRunFormatting=(doc,sourceCell,targetCell)=>{
    const sourceParagraph=firstDirect(sourceCell,'p');
    let targetParagraph=firstDirect(targetCell,'p');
    if(!targetParagraph){targetParagraph=create(doc,'p');targetCell.appendChild(targetParagraph);}
    const sourcePPr=sourceParagraph&&firstDirect(sourceParagraph,'pPr');
    const targetPPr=firstDirect(targetParagraph,'pPr');
    if(sourcePPr){
      if(targetPPr)targetPPr.replaceWith(sourcePPr.cloneNode(true));
      else targetParagraph.insertBefore(sourcePPr.cloneNode(true),targetParagraph.firstChild);
    }
    const sourceRun=sourceParagraph&&localElements(sourceParagraph,'r').find(run=>clean(run.textContent));
    let targetRun=localElements(targetParagraph,'r').find(run=>clean(run.textContent))||localElements(targetParagraph,'r')[0];
    if(!targetRun){targetRun=create(doc,'r');targetParagraph.appendChild(targetRun);}
    const sourceRPr=sourceRun&&firstDirect(sourceRun,'rPr');
    const targetRPr=firstDirect(targetRun,'rPr');
    if(sourceRPr){
      if(targetRPr)targetRPr.replaceWith(sourceRPr.cloneNode(true));
      else targetRun.insertBefore(sourceRPr.cloneNode(true),targetRun.firstChild);
    }
    return targetRun;
  };

  const setCellTextLike=(doc,targetCell,sourceCell,value)=>{
    const run=cloneParagraphAndRunFormatting(doc,sourceCell,targetCell);
    setRunText(doc,run,value);
    localElements(targetCell,'r').forEach(other=>{
      if(other!==run)localElements(other,'t').forEach(text=>text.textContent='');
    });
  };

  const insuranceCode=()=>{
    const select=document.getElementById('healthInsurance');
    const candidates=[select?.value,select?.selectedOptions?.[0]?.textContent,document.getElementById('healthInsuranceOther')?.value];
    for(const raw of candidates){
      const match=clean(raw).match(/(?:^|\D)(\d{3})(?:\D|$)/);
      if(match)return match[1];
    }
    return '';
  };

  const patchHealthInsurance=doc=>{
    const code=insuranceCode();
    if(!code)return;
    const cell=localElements(doc,'tc').find(item=>normalize(item.textContent).includes('zdravotni pojistovna'));
    if(!cell)return;
    const paragraphs=directChildren(cell,'p');
    const valueParagraph=paragraphs.find((paragraph,index)=>index>0&&clean(paragraph.textContent))||paragraphs[paragraphs.length-1];
    const run=valueParagraph&&(localElements(valueParagraph,'r').find(item=>clean(item.textContent))||localElements(valueParagraph,'r')[0]);
    if(run)setRunText(doc,run,code);
  };

  const patchDependents=doc=>{
    const dependents=readDependents();
    const rows=localElements(doc,'tr');
    const rowIndex=rows.findIndex(item=>normalize(item.textContent).includes('ostatni vyzivovane osoby'));
    if(rowIndex<0)return;
    const row=rows[rowIndex];
    const cells=directChildren(row,'tc');
    if(cells.length<11)return;

    const firstCell=cells[0];
    const runs=localElements(firstCell,'r');
    let valueRun=runs.find(run=>!normalize(run.textContent).includes('ostatni vyzivovane osoby')&&clean(run.textContent));
    if(!valueRun)valueRun=runs[runs.length-1];

    let value='Neuvedeno';
    if(dependents.length===1)value=dependents[0].name||'Neuvedeno';
    else if(dependents.length>1){
      value=dependents.map(person=>[
        person.name||'Neuvedeno',
        person.personalNumber?`(${person.personalNumber})`:''
      ].filter(Boolean).join(' ')).join('; ');
    }
    if(valueRun)setRunText(doc,valueRun,value);

    let sourceCells=null;
    for(let index=rowIndex-1;index>=0;index--){
      const candidate=directChildren(rows[index],'tc');
      const candidateText=normalize(rows[index].textContent);
      if(candidate.length>=11&&!candidateText.includes('manzel')){sourceCells=candidate.slice(-10);break;}
    }
    if(!sourceCells)return;

    const digits=dependents.length===1?dependents[0].personalNumber.replace(/\D/g,'').slice(0,10).split(''):[];
    cells.slice(-10).forEach((cell,index)=>setCellTextLike(doc,cell,sourceCells[index],digits[index]||''));
  };

  const signatureIsPrintMode=()=>{
    const value=normalize(document.querySelector('input[name="signatureMode"]:checked')?.value||'');
    return value.includes('print')||value.includes('tisk');
  };

  const hasSignatureInk=()=>{
    const canvas=document.getElementById('signatureCanvas')||document.getElementById('sigCanvas')||document.querySelector('canvas[id*="signature" i],canvas[id*="sig" i]');
    if(!canvas)return false;
    try{
      const pixels=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,canvas.width,canvas.height).data;
      for(let index=0;index<pixels.length;index+=4){
        if(pixels[index+3]>20&&(pixels[index]<245||pixels[index+1]<245||pixels[index+2]<245))return true;
      }
    }catch(error){console.warn('Kontrola podpisu:',error);}
    return false;
  };

  const patchSignature=doc=>{
    if(!signatureIsPrintMode()&&hasSignatureInk())return;
    const paragraph=[...localElements(doc,'p')].reverse().find(item=>normalize(item.textContent).includes('podpis'));
    if(!paragraph)return;
    const drawingRun=directChildren(paragraph,'r').find(run=>localElements(run,'drawing').length||localElements(run,'pict').length);
    if(!drawingRun)return;
    const replacement=create(doc,'r');
    const rPr=firstDirect(drawingRun,'rPr');
    if(rPr)replacement.appendChild(rPr.cloneNode(true));
    const text=create(doc,'t');
    text.textContent='……………………………….';
    replacement.appendChild(text);
    paragraph.replaceChild(replacement,drawingRun);
  };

  const patchGeneratedZip=zip=>{
    const file=zip.file('word/document.xml');
    if(!file)return;
    const doc=new DOMParser().parseFromString(file.asText(),'application/xml');
    if(doc.querySelector('parsererror'))throw new Error('Word šablonu se nepodařilo zpracovat.');
    patchHealthInsurance(doc);
    patchDependents(doc);
    patchSignature(doc);
    zip.file('word/document.xml',new XMLSerializer().serializeToString(doc));
  };

  const copyStatics=(source,target)=>{
    for(const key of Reflect.ownKeys(source)){
      if(['prototype','name','length'].includes(key))continue;
      try{Object.defineProperty(target,key,Object.getOwnPropertyDescriptor(source,key));}catch(_){/* read-only */}
    }
    try{Object.setPrototypeOf(target,source);}catch(_){/* optional */}
  };

  const wrapPizZip=Original=>{
    if(!Original||Original.__koopWrappedV21)return Original;
    if(typeof Original!=='function')return Original;

    if(!Original.prototype.__koopGenerateV21){
      const originalGenerate=Original.prototype.generate;
      Original.prototype.generate=function(...args){
        try{patchGeneratedZip(this);}catch(error){console.error('Word šablona v21:',error);throw error;}
        return originalGenerate.apply(this,args);
      };
      Original.prototype.__koopGenerateV21=true;
    }

    function WrappedPizZip(data,options){
      const zip=new Original(data,options);
      injectTemplate(zip);
      return zip;
    }
    WrappedPizZip.prototype=Original.prototype;
    copyStatics(Original,WrappedPizZip);
    WrappedPizZip.__koopWrappedV21=true;
    return WrappedPizZip;
  };

  const descriptor=Object.getOwnPropertyDescriptor(window,'PizZip');
  if(window.PizZip){window.PizZip=wrapPizZip(window.PizZip);return;}
  if(descriptor&&!descriptor.configurable)return;
  let storedValue;
  Object.defineProperty(window,'PizZip',{
    configurable:true,
    enumerable:true,
    get(){return descriptor?.get?descriptor.get.call(window):storedValue;},
    set(value){
      const wrapped=wrapPizZip(value);
      if(descriptor?.set)descriptor.set.call(window,wrapped);else storedValue=wrapped;
    }
  });
})();
