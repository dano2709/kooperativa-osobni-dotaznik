(()=>{
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const clean=value=>String(value??'').trim();
  const $=(selector,root=document)=>root.querySelector(selector);
  const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
  const byText=text=>$$('button,a').find(element=>normalize(element.textContent).includes(normalize(text)));
  const value=(...ids)=>{
    for(const id of ids){const element=document.getElementById(id);if(element&&clean(element.value))return clean(element.value);}
    return '';
  };
  const radio=name=>clean($(`input[name="${name}"]:checked`)?.value);
  const withTimeout=(promise,ms,message)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(message)),ms))]);

  const waitForApp=()=>new Promise((resolve,reject)=>{
    const started=Date.now();
    const timer=setInterval(()=>{
      const ready=$('#questionnaire')&&($('#generateWordV12')||byText('Vygenerovat Word'))&&byText('Vytvořit PDF');
      if(ready){clearInterval(timer);resolve();}
      else if(Date.now()-started>30000){clearInterval(timer);reject(new Error('PDF rozšíření se nepodařilo načíst.'));}
    },80);
  });

  const loadScript=src=>new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=src;script.async=true;script.crossOrigin='anonymous';
    script.onload=()=>resolve();
    script.onerror=()=>{script.remove();reject(new Error(`Nelze načíst ${src}`));};
    document.head.appendChild(script);
  });

  const loadFirst=async sources=>{
    let lastError=null;
    for(const source of sources){
      try{await withTimeout(loadScript(source),12000,'Načítání PDF knihovny trvalo příliš dlouho.');return;}
      catch(error){lastError=error;}
    }
    throw lastError||new Error('PDF knihovna se nenačetla.');
  };

  const ensurePdfMake=async()=>{
    if(!window.pdfMake?.createPdf){
      await loadFirst([
        'https://cdn.jsdelivr.net/npm/pdfmake@0.2.23/build/pdfmake.min.js',
        'https://unpkg.com/pdfmake@0.2.23/build/pdfmake.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.23/pdfmake.min.js'
      ]);
    }
    if(!window.pdfMake?.vfs||!Object.keys(window.pdfMake.vfs).length){
      await loadFirst([
        'https://cdn.jsdelivr.net/npm/pdfmake@0.2.23/build/vfs_fonts.js',
        'https://unpkg.com/pdfmake@0.2.23/build/vfs_fonts.js',
        'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.23/vfs_fonts.min.js'
      ]);
    }
    if(!window.pdfMake?.createPdf)throw new Error('Knihovna pdfMake není dostupná.');
  };

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
    const prefix=value('bankPrefix');
    const accountNumber=value('bankAccountNumber','bankNumber');
    const bankCode=value('bankCode');
    const bankAccount=[prefix?`${prefix}-${accountNumber}`:accountNumber,bankCode].filter(Boolean).join('/');
    const educationLevel=value('educationLevel')==='__other__'?value('educationLevelOther'):value('educationLevel');
    const education=[educationLevel,value('educationMajor')].filter(Boolean).join('; ')||value('education');
    const birthPlace=[value('birthPlaceCity'),value('birthDistrict')?`okres ${value('birthDistrict').replace(/^okres\s+/i,'')}`:'',value('birthCountry')].filter(Boolean).join('; ')||value('birthPlace');
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

  const loadLogo=async()=>{
    const response=await withTimeout(fetch('assets/koop-white-pdf-v12.b64?v=15',{cache:'no-store'}),10000,'Logo se načítalo příliš dlouho.');
    if(!response.ok)throw new Error('Logo Kooperativy se nepodařilo načíst.');
    return 'data:image/png;base64,'+(await response.text()).replace(/\s+/g,'');
  };

  const safe=value=>clean(value)||'Neuvedeno';
  const item=(label,data)=>({stack:[{text:label.toUpperCase(),style:'fieldLabel'},{text:safe(data),style:'fieldValue'}],margin:[0,2,0,2]});
  const twoColumnRows=items=>{
    const rows=[];
    for(let index=0;index<items.length;index+=2){
      rows.push([items[index]||'',items[index+1]||'']);
    }
    return rows;
  };
  const infoTable=items=>({
    table:{widths:['50%','50%'],body:twoColumnRows(items)},
    layout:{
      hLineColor:()=> '#c7d5cc',vLineColor:()=> '#c7d5cc',
      paddingLeft:()=>8,paddingRight:()=>8,paddingTop:()=>5,paddingBottom:()=>5
    },
    margin:[0,0,0,10]
  });
  const peopleTable=(title,people)=>[
    {text:title,style:'section'},
    {table:{headerRows:1,widths:['65%','35%'],body:[
      [{text:'Jméno a příjmení',style:'tableHead'},{text:'Rodné číslo',style:'tableHead'}],
      ...(people.length?people:[{}]).map(person=>[safe(person.name),safe(person.personalNumber)])
    ]},layout:{hLineColor:()=> '#c7d5cc',vLineColor:()=> '#c7d5cc',paddingLeft:()=>7,paddingRight:()=>7,paddingTop:()=>5,paddingBottom:()=>5},margin:[0,0,0,8]}
  ];
  const question=(label,answer,detail='')=>({
    table:{widths:['*',55],body:[[
      {stack:[{text:label,bold:true,fontSize:8.5},...(detail?[{text:detail,color:'#44534a',fontSize:7.8,margin:[0,3,0,0]}]:[])]},
      {text:safe(answer),bold:true,color:'#00573f',alignment:'center',fillColor:'#e7f3eb',margin:[0,3,0,3]}
    ]]},layout:{hLineColor:()=> '#c7d5cc',vLineColor:()=> '#c7d5cc',paddingLeft:()=>7,paddingRight:()=>7,paddingTop:()=>5,paddingBottom:()=>5},margin:[0,0,0,4]
  });

  const legalContent=()=>{
    const legal=$('#legalCopy');
    if(!legal)return [{text:'Informace o zpracování osobních údajů nejsou dostupné.',fontSize:7}];
    const elements=$$('h1,h2,h3,h4,p',legal);
    if(!elements.length)return [{text:clean(legal.innerText),fontSize:6.8,lineHeight:1.05,alignment:'justify'}];
    return elements.map((element,index)=>{
      const tag=element.tagName.toLowerCase();
      const heading=/^h[1-4]$/.test(tag);
      return {
        text:clean(element.innerText),
        bold:heading||index===0,
        fontSize:heading?7.2:6.55,
        lineHeight:heading?1.05:1.02,
        alignment:heading?'left':'justify',
        margin:heading?[0,index?3:0,0,1]:[0,0,0,2]
      };
    }).filter(entry=>entry.text);
  };

  const buildDefinition=(data,logo)=>({
    pageSize:'A4',
    pageMargins:[38,64,38,34],
    defaultStyle:{font:'Roboto',fontSize:8.5,color:'#17231b'},
    header:()=>({margin:[38,13,38,0],stack:[
      {table:{widths:['*'],body:[[{fillColor:'#00843d',border:[false,false,false,false],columns:[
        {image:logo,width:105,margin:[4,2,0,2]},
        {text:'OSOBNÍ DOTAZNÍK\nZAMĚSTNANCE',alignment:'right',color:'#ffffff',bold:true,fontSize:10,margin:[0,10,4,0]}
      ]}]]},layout:'noBorders'},
      {canvas:[{type:'rect',x:0,y:0,w:519,h:4,color:'#ffcd00'}]}
    ]}),
    footer:(currentPage,pageCount)=>({margin:[38,0,38,12],columns:[
      {text:'Kooperativa pojišťovna, a.s., Vienna Insurance Group',color:'#66756c',fontSize:7},
      {text:`Strana ${currentPage} / ${pageCount}`,alignment:'right',color:'#66756c',fontSize:7}
    ]}),
    content:[
      {text:'Osobní údaje zaměstnance',style:'docTitle'},
      {text:'Údaje vyplněné v elektronickém osobním dotazníku.',style:'subtitle'},
      {text:'Osobní údaje',style:'section'},
      infoTable([
        item('Příjmení, jméno, titul',data.fullName),item('Rodinný stav',data.maritalStatus),
        item('Předchozí příjmení',data.previousSurname),item('Rodné příjmení',data.birthSurname),
        item('Státní občanství',data.citizenship),item('Zdravotní pojišťovna',data.healthInsurance),
        item('Rodné číslo',data.personalNumber),item('Datum narození',data.birthDate),
        item('Telefonní číslo',data.phone),item('Místo narození / okres / stát',data.birthPlace),
        item('Trvalé bydliště',data.permanentAddress),item('PSČ',data.permanentPostal),
        item('Korespondenční adresa',data.correspondenceAddress),item('PSČ korespondenční adresy',data.correspondencePostal),
        item('ID datové schránky',data.dataBox),item('E-mailová adresa',data.email),
        item('Číslo bankovního účtu, kód banky',data.bankAccount),''
      ]),
      {text:[{text:'Informace o použití soukromé e-mailové adresy pro pracovněprávní účely.\n',bold:true},'Zaměstnancem uvedená soukromá e-mailová adresa je určena pro zasílání pracovněprávních dokumentů uvedených v § 21 odst. 1 zákona č. 262/2006 Sb., zákoník práce, ve znění pozdějších předpisů, jsou-li uzavřeny elektronicky.'],style:'note'},

      {text:'',pageBreak:'after'},
      ...peopleTable('Manžel / manželka',[{name:data.spouseName,personalNumber:data.spousePersonalNumber}].filter(person=>person.name||person.personalNumber)),
      ...peopleTable('Děti',data.children),
      ...peopleTable('Ostatní vyživované osoby',data.dependents),
      {text:'Ostatní údaje',style:'section'},
      infoTable([item('Nejvyšší dokončené vzdělání / obor',data.education),item('V roce',data.educationYear)]),
      question('Řidičský průkaz',data.drivingLicence),
      question('Je nebo byla vůči Vám vedena exekuce, insolvenční řízení?',data.executionInsolvency),
      question('Je v Kooperativě zaměstnána Vaše osoba blízká v přímé podřízenosti/nadřízenosti vůči Vám?',data.closePersonEmployed,data.closePersonDetails),
      question('Máte jinou výdělečnou činnost shodnou s předmětem činnosti zaměstnavatele?',data.otherActivity,data.activityType),
      question('Pobíráte důchod?',data.pension,[data.pensionType,data.pensionGrantedDate].filter(Boolean).join('; ')),
      question('Máte zdravotní postižení?',data.disability,[data.disabilityType,data.disabilityDecisionDate].filter(Boolean).join('; ')),

      {text:'',pageBreak:'after'},
      {text:'Informace o zpracování osobních údajů',style:'legalTitle'},
      ...legalContent(),
      {text:'Prohlašuji, že jsem nic nezamlčel/a a všechny mnou uvedené údaje jsou pravdivé.',bold:true,fontSize:6.8,margin:[0,3,0,5]},
      {table:{widths:['33%','25%','42%'],body:[[
        {stack:[{text:'V',fontSize:7},{text:safe(data.signaturePlace),style:'signValue'}]},
        {stack:[{text:'dne',fontSize:7},{text:safe(data.signatureDate),style:'signValue'}]},
        {stack:[{text:'podpis',fontSize:7},data.signatureData?{image:data.signatureData,fit:[120,34],alignment:'center',margin:[0,2,0,0]}:{text:'',margin:[0,24,0,0]}]}
      ]]},layout:{hLineColor:()=> '#333333',vLineWidth:()=>0,hLineWidth:(i,node)=>i===1?1:0,paddingLeft:()=>5,paddingRight:()=>5,paddingTop:()=>3,paddingBottom:()=>3},margin:[0,3,0,0]}
    ],
    styles:{
      docTitle:{fontSize:20,bold:true,color:'#00573f',margin:[0,0,0,3]},
      subtitle:{fontSize:8,color:'#66756c',margin:[0,0,0,9]},
      section:{fontSize:13,bold:true,color:'#00573f',fillColor:'#e7f3eb',margin:[0,8,0,5]},
      fieldLabel:{fontSize:6.7,bold:true,color:'#617067',characterSpacing:.15},
      fieldValue:{fontSize:8.8,bold:true,color:'#17231b'},
      tableHead:{fontSize:8,bold:true,color:'#00573f',fillColor:'#e7f3eb'},
      note:{fontSize:7.2,lineHeight:1.1,fillColor:'#fff7d6',margin:[0,4,0,0]},
      legalTitle:{fontSize:11,bold:true,color:'#00573f',margin:[0,0,0,4]},
      signValue:{fontSize:8,bold:true,alignment:'center',margin:[0,5,0,0]}
    },
    info:{title:'Osobní dotazník zaměstnance',author:'Kooperativa pojišťovna, a.s., Vienna Insurance Group'}
  });

  const filename=data=>`Osobni_dotaznik_${(clean(data.fullName)||'zamestnanec').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_+|_+$/g,'')}.pdf`;
  let state={blob:null,url:'',name:''};
  const revoke=()=>{if(state.url)URL.revokeObjectURL(state.url);state={blob:null,url:'',name:''};};
  const setStatus=(message,error=false)=>{
    const node=$('.v12-output-status');
    if(node){node.textContent=message;node.style.color=error?'#c5221f':'#00573f';}
  };

  const validate=()=>{
    const form=$('#questionnaire');
    if(!form)return false;
    $('#birthDate')?.dispatchEvent(new Event('blur'));
    if(!form.checkValidity()){
      form.reportValidity();
      form.querySelector(':invalid')?.scrollIntoView({behavior:'smooth',block:'center'});
      return false;
    }
    return true;
  };

  const generate=async()=>{
    if(!validate())throw new Error('Doplňte nebo opravte povinné údaje.');
    await ensurePdfMake();
    const data=collectData();
    const logo=await loadLogo();
    const definition=buildDefinition(data,logo);
    const blob=await withTimeout(new Promise((resolve,reject)=>{
      try{window.pdfMake.createPdf(definition).getBlob(resolve);}catch(error){reject(error);}
    }),25000,'Vytvoření PDF trvalo příliš dlouho.');
    revoke();
    state={blob,url:URL.createObjectURL(blob),name:filename(data)};
    return state;
  };

  const makeAction=(tag,id,label,parent)=>{
    const node=document.createElement(tag);
    node.id=id;node.className='btn v15-action';node.href=tag==='a'?'#':undefined;
    node.textContent=`action-${id}`;node.dataset.label=label;node.hidden=true;
    parent.appendChild(node);return node;
  };

  const install=()=>{
    const oldCreate=byText('Vytvořit PDF');
    if(!oldCreate)return;
    const parent=oldCreate.parentElement;
    const create=oldCreate.cloneNode(false);
    create.type='button';create.id='createPdfV15';create.className=oldCreate.className+' v15-create';
    create.textContent='pdf-document';create.dataset.label='Vytvořit PDF';create.disabled=false;
    oldCreate.replaceWith(create);

    ['previewPdf','downloadPdf','printPdf'].forEach(id=>document.getElementById(id)?.remove());
    const preview=makeAction('a','previewPdfV15','Náhled PDF',parent);
    const download=makeAction('a','downloadPdfV15','Stáhnout PDF',parent);
    const print=makeAction('button','printPdfV15','Vytisknout',parent);print.type='button';

    const style=document.createElement('style');
    style.textContent=`
      .v15-create,.v15-action{font-size:0!important}
      .v15-create::before,.v15-action::before{content:attr(data-label);font-size:16px!important;line-height:1.2}
      .v15-action[hidden]{display:none!important}
      .v15-action:not([hidden]){display:inline-flex!important;align-items:center;justify-content:center}
    `;
    document.head.appendChild(style);

    const showActions=()=>[preview,download,print].forEach(node=>{node.hidden=false;node.removeAttribute('hidden');});
    const resetButton=()=>{create.disabled=false;create.dataset.label='Vytvořit PDF';};

    window.addEventListener('click',async event=>{
      const target=event.target.closest('button,a');
      if(!target)return;
      if(target===create){
        event.preventDefault();event.stopImmediatePropagation();
        if(create.disabled)return;
        create.disabled=true;create.dataset.label='Vytvářím PDF…';setStatus('Vytvářím PDF…');
        try{await generate();showActions();setStatus('PDF je připravené k náhledu, stažení nebo tisku.');}
        catch(error){console.error('Přímé vytvoření PDF:',error);setStatus(error.message||'PDF se nepodařilo vytvořit.',true);}
        finally{resetButton();}
      }else if(target===preview){
        event.preventDefault();event.stopImmediatePropagation();
        if(state.url)window.open(state.url,'_blank','noopener');
      }else if(target===download){
        event.preventDefault();event.stopImmediatePropagation();
        if(state.url){const anchor=document.createElement('a');anchor.href=state.url;anchor.download=state.name;document.body.appendChild(anchor);anchor.click();anchor.remove();}
      }else if(target===print){
        event.preventDefault();event.stopImmediatePropagation();
        if(state.url){const win=window.open(state.url,'_blank');if(win)setTimeout(()=>win.print?.(),900);}
      }
    },true);
  };

  waitForApp().then(()=>{
    document.documentElement.dataset.appVersion='15';
    install();
  }).catch(error=>console.error('Kooperativa v15:',error));
})();
