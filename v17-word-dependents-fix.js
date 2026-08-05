(()=>{
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const clean=value=>String(value??'').trim();

  const readDependents=()=>{
    const container=document.getElementById('dependentRows');
    if(!container)return [];
    return [...container.querySelectorAll('.repeat-row')].map(row=>({
      name:clean(row.querySelector('[data-row-field="name"]')?.value),
      personalNumber:clean(row.querySelector('[data-row-field="personalNumber"]')?.value)
    })).filter(person=>person.name||person.personalNumber);
  };

  const localElements=(root,name)=>[...root.getElementsByTagName('*')].filter(node=>node.localName===name);
  const directChildren=(root,name)=>[...root.children].filter(node=>node.localName===name);

  const setCellText=(documentXml,cell,text)=>{
    const textNodes=localElements(cell,'t');
    if(textNodes.length){
      textNodes[0].textContent=text;
      for(let index=1;index<textNodes.length;index++)textNodes[index].textContent='';
      return;
    }

    let paragraph=directChildren(cell,'p')[0];
    if(!paragraph){
      paragraph=documentXml.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main','w:p');
      cell.appendChild(paragraph);
    }
    const run=documentXml.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main','w:r');
    const textNode=documentXml.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main','w:t');
    textNode.textContent=text;
    run.appendChild(textNode);
    paragraph.appendChild(run);
  };

  const setSingleDependentName=(documentXml,cell,name)=>{
    const textNodes=localElements(cell,'t');
    const labelIndex=textNodes.findIndex(node=>normalize(node.textContent).includes('ostatni vyzivovane osoby'));
    if(labelIndex<0){
      setCellText(documentXml,cell,`Ostatní vyživované osoby: ${name}`);
      return;
    }

    const labelNode=textNodes[labelIndex];
    const original=String(labelNode.textContent||'');
    const colonIndex=original.indexOf(':');

    if(colonIndex>=0&&clean(original.slice(colonIndex+1))){
      labelNode.textContent=`${original.slice(0,colonIndex+1)} ${name}`;
      for(let index=labelIndex+1;index<textNodes.length;index++)textNodes[index].textContent='';
      return;
    }

    labelNode.textContent=colonIndex>=0?original.slice(0,colonIndex+1):'Ostatní vyživované osoby:';
    if(textNodes[labelIndex+1]){
      textNodes[labelIndex+1].textContent=` ${name}`;
      for(let index=labelIndex+2;index<textNodes.length;index++)textNodes[index].textContent='';
      return;
    }

    let paragraph=labelNode.closest('w\\:p')||labelNode.parentElement?.parentElement;
    if(!paragraph||paragraph.localName!=='p')paragraph=directChildren(cell,'p')[0];
    if(!paragraph){
      paragraph=documentXml.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main','w:p');
      cell.appendChild(paragraph);
    }
    const run=documentXml.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main','w:r');
    const textNode=documentXml.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main','w:t');
    textNode.setAttribute('xml:space','preserve');
    textNode.textContent=` ${name}`;
    run.appendChild(textNode);
    paragraph.appendChild(run);
  };

  const patchDocumentXml=zip=>{
    const dependents=readDependents();
    if(dependents.length!==1)return;

    const file=zip.file('word/document.xml');
    if(!file)return;
    const xml=file.asText();
    const documentXml=new DOMParser().parseFromString(xml,'application/xml');
    if(documentXml.querySelector('parsererror'))return;

    const rows=localElements(documentXml,'tr');
    const row=rows.find(item=>normalize(item.textContent).includes('ostatni vyzivovane osoby'));
    if(!row)return;

    const cells=directChildren(row,'tc');
    if(!cells.length)return;

    const dependent=dependents[0];
    setSingleDependentName(documentXml,cells[0],dependent.name||'Neuvedeno');

    const digits=dependent.personalNumber.replace(/\D/g,'').slice(0,10).split('');
    for(let index=1;index<cells.length;index++){
      setCellText(documentXml,cells[index],digits[index-1]||'');
    }

    zip.file('word/document.xml',new XMLSerializer().serializeToString(documentXml));
  };

  const patchPizZip=PizZip=>{
    if(!PizZip?.prototype||PizZip.prototype.__koopDependentsV17)return;
    const originalGenerate=PizZip.prototype.generate;
    if(typeof originalGenerate!=='function')return;

    PizZip.prototype.generate=function(...args){
      try{patchDocumentXml(this);}catch(error){console.error('Úprava vyživované osoby ve Wordu:',error);}
      return originalGenerate.apply(this,args);
    };
    PizZip.prototype.__koopDependentsV17=true;
  };

  if(window.PizZip){
    patchPizZip(window.PizZip);
    return;
  }

  const descriptor=Object.getOwnPropertyDescriptor(window,'PizZip');
  if(descriptor&&!descriptor.configurable)return;

  let storedValue;
  Object.defineProperty(window,'PizZip',{
    configurable:true,
    enumerable:true,
    get(){return storedValue;},
    set(value){storedValue=value;patchPizZip(value);}
  });
})();
