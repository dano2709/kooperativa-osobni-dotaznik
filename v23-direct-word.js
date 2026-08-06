(()=>{
  const BASE_TEMPLATE_PARTS=[
    'assets/osobni-dotaznik-template-1.b64part?v=23',
    'assets/osobni-dotaznik-template-2.b64part?v=23',
    'assets/osobni-dotaznik-template-3.b64part?v=23'
  ];
  const EXACT_TEMPLATE_PARTS=[
    'assets/word-template-v21-xml-01.b64part?v=23',
    'assets/word-template-v21-xml-02.b64part?v=23',
    'assets/word-template-v21-xml-03.b64part?v=23',
    'assets/word-template-v21-xml-04.b64part?v=23'
  ];
  const PIZZIP_URLS=[
    'https://cdn.jsdelivr.net/npm/pizzip@3.2.0/dist/pizzip.min.js',
    'https://unpkg.com/pizzip@3.2.0/dist/pizzip.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pizzip/3.2.0/pizzip.min.js'
  ];
  const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';

  const clean=value=>String(value??'').trim();
  const normalize=value=>clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ');
  const $=(selector,root=document)=>root.querySelector(selector);
  const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
  const value=(...ids)=>{
    for(const id of ids){
      const element=document.getElementById(id);
      if(element&&clean(element.value))return clean(element.value);
    }
    return '';
  };
  const radio=name=>clean($(`input[name="${name}"]:checked`)?.value);
  const escapeXml=input=>clean(input).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
  const safe=input=>clean(input)||'Neuvedeno';

  const readPeople=containerId=>{
    const container=document.getElementById(containerId);
    if(!container)return [];
    return $$('.repeat-row',container).map(row=>({
      name:clean($('[data-row-field="name"]',row)?.value),
      personalNumber:clean($('[data-row-field="personalNumber"]',row)?.value)
    })).filter(person=>person.name||person.personalNumber);
  };

  const signatureData=()=>{
    const mode=normalize(radio('signatureMode'));
    if(mode.includes('print')||mode.includes('tisk'))return '';
    const canvas=$('#signatureCanvas')||$('#sigCanvas')||$('canvas[id*="signature" i]')||$('canvas[id*="sig" i]');
    if(!canvas)return '';
    try{return canvas.toDataURL('image/png');}catch(_){return '';}
  };

  const collectData=()=>{
    const bankPrefix=value('bankPrefix');
    const accountNumber=value('bankAccountNumber','bankNumber');
    const bankCode=value('bankCode');
    const bankAccount=[bankPrefix&&accountNumber?`${bankPrefix}-${accountNumber}`:accountNumber,bankCode].filter(Boolean).join('/');
    const educationLevel=value('educationLevel')==='__other__'?value('educationLevelOther'):value('educationLevel');
    const education=[educationLevel,value('educationMajor')].filter(Boolean).join('; ')||value('education');
    const birthPlace=[
      value('birthPlaceCity'),
      value('birthDistrict')?`okres ${value('birthDistrict').replace(/^okres\s+/i,'')}`:'',
      value('birthCountry')
    ].filter(Boolean).join('; ')||value('birthPlace');
    const prefixChoice=clean($('#phonePrefixChoice')?.value||'');
    const phonePrefix=value('phonePrefixCustom')||(prefixChoice.includes('|')?prefixChoice.split('|')[1]:prefixChoice.match(/\+\d+/)?.[0]||'');
    const phone=[phonePrefix,value('phoneNational')].filter(Boolean).join(' ');
    return {
      fullName:value('fullName'),previousSurname:value('previousSurname'),birthSurname:value('birthSurname'),
      maritalStatus:value('maritalStatusOther')||value('maritalStatus'),citizenship:value('citizenshipOther')||value('citizenship'),
      healthInsurance:value('healthInsurance'),personalNumber:value('personalNumber'),birthDate:value('birthDate'),birthPlace,
      permanentAddress:value('permanentAddress'),permanentPostal:value('permanentPostal'),phone,
      correspondenceAddress:value('correspondenceAddress'),correspondencePostal:value('correspondencePostal'),
      dataBox:value('dataBox'),email:value('email'),bankAccount,
      spouseName:value('spouseName'),spousePersonalNumber:value('spousePersonalNumber'),
      children:readPeople('childrenRows'),dependents:readPeople('dependentRows'),education,educationYear:value('educationYear'),
      drivingLicence:radio('drivingLicence'),executionInsolvency:radio('executionInsolvency'),
      closePersonEmployed:radio('closePersonEmployed'),closePersonDetails:value('closePersonDetails'),
      otherActivity:radio('otherActivity'),activityType:value('activityType'),pension:radio('pension'),
      pensionType:value('pensionType'),pensionGrantedDate:value('pensionGrantedDate'),disability:radio('disability'),
      disabilityType:value('disabilityType'),disabilityDecisionDate:value('disabilityDecisionDate'),
      signaturePlace:value('signaturePlace'),signatureDate:value('signatureDate'),signatureData:signatureData()
    };
  };

  const insuranceCode=raw=>clean(raw).match(/(?:^|\D)(\d{3})(?:\D|$)/)?.[1]||'';
  const digits=raw=>clean(raw).replace(/\D/g,'').slice(0,10).split('');
  const splitChildren=children=>{
    if(children.length<=3)return [...children];
    return [children[0],children[1],{
      name:children.slice(2).map(person=>[person.name,person.personalNumber&&`(${person.personalNumber})`].filter(Boolean).join(' ')).join('; '),
      personalNumber:''
    }];
  };

  const valuesFor=data=>{
    const children=splitChildren(data.children);
    while(children.length<3)children.push({name:'',personalNumber:''});
    const oneDependent=data.dependents.length===1?data.dependents[0]:null;
    const dependentsText=data.dependents.length>1
      ?data.dependents.map(person=>[person.name||'Neuvedeno',person.personalNumber&&`(${person.personalNumber})`].filter(Boolean).join(' ')).join('; ')
      :(oneDependent?.name||'Neuvedeno');
    const values={
      FULL_NAME:safe(data.fullName),PREVIOUS_SURNAME:safe(data.previousSurname),BIRTH_SURNAME:safe(data.birthSurname),
      MARITAL_STATUS:safe(data.maritalStatus),CITIZENSHIP:safe(data.citizenship),HEALTH_INSURANCE:insuranceCode(data.healthInsurance)||safe(data.healthInsurance),
      BIRTH_DATE:safe(data.birthDate),BIRTH_PLACE:safe(data.birthPlace),PERMANENT_ADDRESS:safe(data.permanentAddress),
      PERMANENT_POSTAL:safe(data.permanentPostal),PHONE:safe(data.phone),CORRESPONDENCE_ADDRESS:safe(data.correspondenceAddress),
      CORRESPONDENCE_POSTAL:safe(data.correspondencePostal),DATA_BOX:safe(data.dataBox),EMAIL:safe(data.email),BANK_ACCOUNT:safe(data.bankAccount),
      SPOUSE_NAME:safe(data.spouseName),CHILD1_NAME:safe(children[0].name),CHILD2_NAME:safe(children[1].name),CHILD3_NAME:safe(children[2].name),
      DEPENDENTS:dependentsText,EDUCATION:safe(data.education),EDUCATION_YEAR:safe(data.educationYear),
      DRIVING_LICENCE:safe(data.drivingLicence),EXECUTION:safe(data.executionInsolvency),CLOSE_PERSON:safe(data.closePersonEmployed),
      CLOSE_PERSON_DETAILS:safe(data.closePersonDetails),OTHER_ACTIVITY:safe(data.otherActivity),ACTIVITY_TYPE:safe(data.activityType),
      PENSION:safe(data.pension),PENSION_TYPE:safe(data.pensionType),PENSION_DATE:safe(data.pensionGrantedDate),
      DISABILITY:safe(data.disability),DISABILITY_TYPE:safe(data.disabilityType),DISABILITY_DATE:safe(data.disabilityDecisionDate),
      SIGN_PLACE:safe(data.signaturePlace),SIGN_DATE:safe(data.signatureDate)
    };
    const assign=(prefix,raw)=>{const list=digits(raw);for(let i=0;i<10;i++)values[`${prefix}${i+1}`]=list[i]||'';};
    assign('PERSONAL_RC_',data.personalNumber);
    assign('SPOUSE_RC_',data.spousePersonalNumber);
    assign('CHILD1_RC_',children[0].personalNumber);
    assign('CHILD2_RC_',children[1].personalNumber);
    assign('CHILD3_RC_',children[2].personalNumber);
    assign('DEPENDENT_RC_',oneDependent?.personalNumber||'');
    return values;
  };

  const loadScript=src=>new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src=src;script.async=true;script.crossOrigin='anonymous';
    script.onload=resolve;script.onerror=()=>{script.remove();reject(new Error(`Nelze načíst ${src}`));};
    document.head.appendChild(script);
  });

  const ensurePizZip=async()=>{
    if(window.PizZip)return window.PizZip;
    let lastError=null;
    for(const source of PIZZIP_URLS){
      try{await loadScript(source);if(window.PizZip)return window.PizZip;}catch(error){lastError=error;}
    }
    throw lastError||new Error('Knihovna pro vytvoření Wordu se nenačetla.');
  };

  const base64ToBytes=encoded=>{
    const binary=atob(String(encoded||'').replace(/\s+/g,''));
    const bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    return bytes;
  };

  const fetchParts=async paths=>{
    const responses=await Promise.all(paths.map(path=>fetch(path,{cache:'no-store'})));
    const failed=responses.find(response=>!response.ok);
    if(failed)throw new Error(`Word šablona: HTTP ${failed.status}`);
    return (await Promise.all(responses.map(response=>response.text()))).join('');
  };

  const decodeExactEntries=async encoded=>{
    if(typeof DecompressionStream!=='function')throw new Error('Prohlížeč nepodporuje přesnou Word šablonu. Použijte aktuální Chrome, Edge nebo Firefox.');
    const compressed=base64ToBytes(encoded);
    const stream=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));
    return JSON.parse(await new Response(stream).text());
  };

  let templatePromise=null;
  const loadTemplate=()=>templatePromise||(templatePromise=Promise.all([
    fetchParts(BASE_TEMPLATE_PARTS).then(base64ToBytes),
    fetchParts(EXACT_TEMPLATE_PARTS).then(decodeExactEntries)
  ]).then(([baseBytes,exactEntries])=>({baseBytes,exactEntries})));

  const patchPrintSignature=xml=>{
    const doc=new DOMParser().parseFromString(xml,'application/xml');
    if(doc.querySelector('parsererror'))throw new Error('Podpisovou část Wordu se nepodařilo zpracovat.');
    const paragraphs=[...doc.getElementsByTagNameNS(W,'p')];
    const paragraph=paragraphs.reverse().find(item=>normalize(item.textContent).includes('podpis'));
    if(!paragraph)return xml;
    const runs=[...paragraph.children].filter(item=>item.localName==='r');
    const drawingRun=runs.find(run=>run.getElementsByTagNameNS(W,'drawing').length);
    if(!drawingRun)return xml;
    const replacement=doc.createElementNS(W,'w:r');
    const rPr=[...drawingRun.children].find(item=>item.localName==='rPr');
    if(rPr)replacement.appendChild(rPr.cloneNode(true));
    const text=doc.createElementNS(W,'w:t');
    text.textContent='……………………………….';
    replacement.appendChild(text);
    paragraph.replaceChild(replacement,drawingRun);
    return new XMLSerializer().serializeToString(doc);
  };

  const generateWord=async()=>{
    const PizZip=await ensurePizZip();
    const template=await loadTemplate();
    const zip=new PizZip(template.baseBytes);
    Object.entries(template.exactEntries).forEach(([path,content])=>zip.file(path,content));
    const data=collectData();
    if(!data.fullName)throw new Error('Doplňte jméno a příjmení.');
    const replacements=valuesFor(data);
    Object.keys(zip.files).filter(name=>/\.xml$|\.rels$/.test(name)).forEach(name=>{
      const file=zip.file(name);if(!file)return;
      let xml=file.asText();
      for(const [key,val] of Object.entries(replacements))xml=xml.split(`@@${key}@@`).join(escapeXml(val));
      zip.file(name,xml);
    });
    if(data.signatureData){
      const base64=data.signatureData.split(',')[1]||'';
      if(base64)zip.file('word/media/image2.png',base64,{base64:true});
    }else{
      const documentFile=zip.file('word/document.xml');
      if(documentFile)zip.file('word/document.xml',patchPrintSignature(documentFile.asText()));
    }
    const blob=zip.generate({type:'blob',compression:'DEFLATE',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
    const filename=`Osobni_dotaznik_${data.fullName.replace(/[^\p{L}\p{N}]+/gu,'_').replace(/^_+|_+$/g,'')||'zamestnanec'}.docx`;
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),5000);
  };

  const removePdfControls=()=>{
    const ids=['createPdf','generatePdf','previewPdf','downloadPdf','printPdf'];
    ids.forEach(id=>document.getElementById(id)?.remove());
    $$('button,a').forEach(element=>{
      const text=normalize(element.textContent);
      if(text.includes('pdf')||text.includes('vytisknout'))element.remove();
    });
    $$('.print-actions,.pdf-actions').forEach(container=>{
      if(!container.querySelector('#generateWordV12')){
        const word=document.getElementById('generateWordV12');
        if(word)container.appendChild(word);
      }
    });
  };

  const install=()=>{
    removePdfControls();
    const original=document.getElementById('generateWordV12')||$$('button,a').find(el=>normalize(el.textContent).includes('vygenerovat word'));
    if(!original)return false;
    const button=original.cloneNode(true);
    button.id='generateWordV23';
    button.type='button';
    button.textContent='Vygenerovat Word';
    original.replaceWith(button);
    const status=document.querySelector('.v12-output-status');
    button.addEventListener('click',async event=>{
      event.preventDefault();event.stopImmediatePropagation();
      button.disabled=true;button.textContent='Vytvářím Word…';
      if(status){status.textContent='Vytvářím Word…';status.style.color='#00573f';}
      try{
        await generateWord();
        if(status){status.textContent='Word byl vytvořen a stažen.';status.style.color='#00573f';}
      }catch(error){
        console.error('Word v23:',error);
        if(status){status.textContent=error.message||'Word se nepodařilo vytvořit.';status.style.color='#c5221f';}
      }finally{button.disabled=false;button.textContent='Vygenerovat Word';}
    },true);
    loadTemplate().catch(error=>console.error('Načtení Word šablony v23:',error));
    return true;
  };

  const started=Date.now();
  const timer=setInterval(()=>{
    if(install())clearInterval(timer);
    else if(Date.now()-started>30000){clearInterval(timer);console.error('Word ovládání v23 se nepodařilo načíst.');}
  },80);
})();