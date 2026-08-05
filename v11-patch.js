(()=>{
  const PDF_LOGO='assets/koop-white-v11.png?v=11';
  const OLD_LOGO_PREFIX='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAANwAAABGCAYAAACnp/qk';
  const PHONE_METADATA_URL='https://cdn.jsdelivr.net/npm/libphonenumber-js@1.13.10/metadata.min.json';

  const waitForV10=()=>new Promise((resolve,reject)=>{
    const started=Date.now();
    const timer=setInterval(()=>{
      const ready=document.documentElement.dataset.appVersion==='10'
        &&document.getElementById('reviewContent')
        &&document.getElementById('phone')
        &&document.getElementById('legalCopy')
        &&document.getElementById('toggleLegal');
      if(ready){clearInterval(timer);resolve();}
      else if(Date.now()-started>20000){clearInterval(timer);reject(new Error('Rozšíření verze 11 se nepodařilo načíst.'));}
    },50);
  });

  const clean=value=>String(value||'').trim();
  const normalize=value=>clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const emit=input=>{
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
  };
  const savedValue=key=>{
    try{
      for(let i=0;i<localStorage.length;i++){
        try{
          const parsed=JSON.parse(localStorage.getItem(localStorage.key(i))||'{}');
          if(parsed&&typeof parsed==='object'&&parsed[key]!=null)return String(parsed[key]);
        }catch(_){ }
      }
    }catch(_){ }
    return '';
  };

  const addStyles=()=>{
    const style=document.createElement('style');
    style.textContent=`
      .v11-family-review{grid-column:1/-1}
      .v11-person-table{overflow:hidden;border:1px solid var(--line);border-radius:10px;background:#fff}
      .v11-person-row{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(135px,.8fr);gap:12px;padding:9px 11px;border-top:1px solid var(--line);align-items:center}
      .v11-person-row:first-child{border-top:0}
      .v11-person-row.v11-head{background:#e8f5ec;color:var(--green-dark);font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.2px}
      .v11-person-row span:last-child{font-variant-numeric:tabular-nums}
      .v11-phone-wrap{display:grid;grid-template-columns:minmax(190px,.9fr) minmax(0,1.1fr);gap:8px}
      .v11-phone-prefix,.v11-phone-custom{min-width:0}
      .v11-phone-custom{margin-top:8px}.v11-phone-custom[hidden]{display:none}
      .v11-phone-help{margin-top:6px;color:var(--muted);font-size:11px}
      @media(max-width:700px){
        .v11-person-row{grid-template-columns:minmax(0,1fr) minmax(110px,.72fr);gap:8px}
        .v11-phone-wrap{grid-template-columns:1fr}
      }
    `;
    document.head.appendChild(style);
  };

  const installPdfLogoFix=()=>{
    const preload=new Image();
    preload.src=PDF_LOGO;
    preload.alt='';
    preload.style.cssText='position:fixed;width:1px;height:1px;opacity:.001;pointer-events:none;left:-20px;top:-20px';
    document.body.appendChild(preload);

    if(!window.__koopPdfLogoSourceV11){
      const descriptor=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
      if(descriptor?.get&&descriptor?.set){
        Object.defineProperty(HTMLImageElement.prototype,'src',{
          configurable:true,
          enumerable:descriptor.enumerable,
          get(){return descriptor.get.call(this);},
          set(value){
            const raw=typeof value==='string'?value:'';
            const replace=raw.startsWith(OLD_LOGO_PREFIX)||raw.includes('/assets/koop-white.png')||raw.startsWith('assets/koop-white.png');
            descriptor.set.call(this,replace?new URL(PDF_LOGO,document.baseURI).href:value);
          }
        });
      }
      window.__koopPdfLogoSourceV11=true;
    }

    if(!window.__koopPdfLogoDrawV11){
      const previousDrawImage=CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage=function(image,...args){
        const src=image instanceof HTMLImageElement?(image.currentSrc||image.src||''):'';
        const isPdf=this.canvas.width===1240&&this.canvas.height===1754;
        const isHeaderCall=args.length===4&&Number(args[1])<=35;
        if(isPdf&&isHeaderCall&&src.includes('koop-white-v11.png')){
          // Celé logo bez ořezu. Transparentní ochranná zóna v dodaném souboru
          // je zachována a logo je zmenšeno, aby nezasahovalo do žluté linky.
          return previousDrawImage.call(this,image,48,0,250,175);
        }
        return previousDrawImage.call(this,image,...args);
      };
      window.__koopPdfLogoDrawV11=true;
    }
  };

  const readPeople=(containerId)=>{
    const container=document.getElementById(containerId);
    if(!container)return [];
    return [...container.querySelectorAll('.repeat-row')].map(row=>({
      name:clean(row.querySelector('[data-row-field="name"]')?.value),
      personalNumber:clean(row.querySelector('[data-row-field="personalNumber"]')?.value)
    })).filter(row=>row.name||row.personalNumber);
  };

  const buildPeopleReview=(dd,rows)=>{
    const key=JSON.stringify(rows);
    if(dd.dataset.v11PeopleKey===key)return;
    dd.dataset.v11PeopleKey=key;
    dd.replaceChildren();
    if(!rows.length){
      const empty=document.createElement('span');
      empty.className='review-empty';empty.textContent='Neuvedeno';dd.appendChild(empty);return;
    }
    const table=document.createElement('div');table.className='v11-person-table';
    const head=document.createElement('div');head.className='v11-person-row v11-head';head.innerHTML='<span>Jméno a příjmení</span><span>Rodné číslo</span>';table.appendChild(head);
    rows.forEach(row=>{
      const line=document.createElement('div');line.className='v11-person-row';
      const name=document.createElement('span');name.textContent=row.name||'Bez jména';
      const number=document.createElement('span');number.textContent=row.personalNumber||'Neuvedeno';
      line.append(name,number);table.appendChild(line);
    });
    dd.appendChild(table);
  };

  const formatFamilyReview=()=>{
    const review=document.getElementById('reviewContent');
    if(!review)return;
    const items=[...review.querySelectorAll('.review-item')];
    const find=label=>items.find(item=>normalize(item.querySelector('dt')?.textContent)===normalize(label));
    const spouse=find('Manžel / manželka');
    if(spouse){
      spouse.classList.add('v11-family-review');
      buildPeopleReview(spouse.querySelector('dd'),[{
        name:clean(document.getElementById('spouseName')?.value),
        personalNumber:clean(document.getElementById('spousePersonalNumber')?.value)
      }].filter(row=>row.name||row.personalNumber));
    }
    const children=find('Děti');
    if(children){children.classList.add('v11-family-review');buildPeopleReview(children.querySelector('dd'),readPeople('childrenRows'));}
    const dependents=find('Ostatní vyživované osoby');
    if(dependents){dependents.classList.add('v11-family-review');buildPeopleReview(dependents.querySelector('dd'),readPeople('dependentRows'));}
  };

  const setupReviewFormatting=()=>{
    const review=document.getElementById('reviewContent');
    let pending=false;
    const schedule=()=>{
      if(pending)return;pending=true;
      queueMicrotask(()=>{pending=false;formatFamilyReview();});
    };
    new MutationObserver(schedule).observe(review,{childList:true,subtree:true,characterData:true});
    document.addEventListener('click',event=>{
      if(event.target.closest('.next,.step,.review-edit'))setTimeout(schedule,0);
    },true);
    document.addEventListener('input',event=>{
      if(event.target.matches('[data-row-field],#spouseName,#spousePersonalNumber'))schedule();
    });
    schedule();
  };

  const setupLegalDefaultOpen=()=>{
    const legal=document.getElementById('legalCopy');
    const toggle=document.getElementById('toggleLegal');
    legal.classList.remove('compact');
    toggle.textContent='Zmenšit znění';
    toggle.setAttribute('aria-expanded','true');
    toggle.addEventListener('click',event=>{
      event.preventDefault();
      event.stopImmediatePropagation();
      const compact=legal.classList.toggle('compact');
      toggle.textContent=compact?'Otevřít celé znění':'Zmenšit znění';
      toggle.setAttribute('aria-expanded',String(!compact));
    },true);
  };

  const flagFor=iso=>{
    if(!/^[A-Z]{2}$/.test(iso))return '';
    return String.fromCodePoint(...[...iso].map(char=>127397+char.charCodeAt(0)));
  };

  const setupPhonePrefix=async()=>{
    const phone=document.getElementById('phone');
    if(!phone||phone.dataset.v11Ready)return;
    phone.dataset.v11Ready='1';
    const field=phone.closest('.field');
    if(!field)return;
    const label=field.querySelector('label');
    if(label){label.htmlFor='phoneNational';label.innerHTML='Telefonní číslo <span class="req">*</span>';}

    const originalFull=clean(phone.value);
    phone.id='phoneNational';
    phone.placeholder='např. 777 123 456';
    phone.autocomplete='tel-national';

    const wrap=document.createElement('div');wrap.className='v11-phone-wrap';
    const select=document.createElement('select');
    select.id='phonePrefixChoice';select.name='phonePrefixChoice';select.className='v11-phone-prefix';select.setAttribute('aria-label','Mezinárodní telefonní předvolba');
    const own=document.createElement('input');
    own.id='phonePrefixCustom';own.name='phonePrefixCustom';own.className='v11-phone-custom';own.placeholder='Vlastní předvolba, např. +999';own.inputMode='tel';own.hidden=true;
    phone.parentNode.insertBefore(wrap,phone);wrap.append(select,phone);wrap.after(own);
    const help=document.createElement('div');help.className='v11-phone-help';help.textContent='Výchozí předvolba je +420. Na konci seznamu lze zadat vlastní předvolbu.';own.after(help);

    const displayNames=typeof Intl.DisplayNames==='function'?new Intl.DisplayNames(['cs'],{type:'region'}):null;
    const savedChoice=savedValue('phonePrefixChoice');
    const savedCustom=savedValue('phonePrefixCustom');
    let entries=[{iso:'CZ',code:'+420',name:'Česko'}];
    const customOption=()=>{const option=document.createElement('option');option.value='__custom__';option.textContent='Vlastní předvolba…';return option;};
    const setOptions=(items,preserve='')=>{
      select.replaceChildren();
      items.forEach(item=>{
        const option=document.createElement('option');
        option.value=`${item.iso}|${item.code}`;
        option.textContent=`${flagFor(item.iso)} ${item.code} — ${item.name}`.trim();
        select.appendChild(option);
      });
      select.appendChild(customOption());
      if(preserve&&[...select.options].some(option=>option.value===preserve))select.value=preserve;
      else select.value='CZ|+420';
    };
    setOptions(entries);

    const chosenCode=()=>select.value==='__custom__'?clean(own.value):clean(select.value.split('|')[1]);
    const fullPhone=()=>[chosenCode(),clean(phone.value)].filter(Boolean).join(' ');
    const currentCodes=()=>[...new Set(entries.map(item=>item.code))].sort((a,b)=>b.length-a.length);
    const splitFull=(value)=>{
      const raw=clean(value);
      if(!raw.startsWith('+'))return {prefix:'+420',national:raw,iso:'CZ'};
      const compact=raw.replace(/[\s().-]/g,'');
      const prefix=currentCodes().find(code=>compact.startsWith(code));
      if(prefix){
        const national=compact.slice(prefix.length);
        const match=entries.find(item=>item.code===prefix);
        return {prefix,national,iso:match?.iso||''};
      }
      const fallback=raw.match(/^(\+\d{1,5})\s*(.*)$/);
      return {prefix:fallback?.[1]||'+420',national:fallback?.[2]||'',iso:''};
    };
    const applyInitial=(value)=>{
      if(savedChoice&&[...select.options].some(option=>option.value===savedChoice)){
        select.value=savedChoice;own.value=savedCustom;
      }else{
        const parsed=splitFull(value);
        const option=[...select.options].find(item=>item.value.endsWith(`|${parsed.prefix}`));
        if(option)select.value=option.value;
        else{select.value='__custom__';own.value=parsed.prefix;}
        phone.value=parsed.national;
      }
      own.hidden=select.value!=='__custom__';
    };
    applyInitial(originalFull);

    if(!window.__koopFormDataPhoneV11){
      const NativeFormData=window.FormData;
      const PatchedFormData=function(...args){
        const fd=new NativeFormData(...args);
        if(args[0]===document.getElementById('questionnaire'))fd.set('phone',fullPhone());
        return fd;
      };
      PatchedFormData.prototype=NativeFormData.prototype;
      Object.setPrototypeOf(PatchedFormData,NativeFormData);
      window.FormData=PatchedFormData;
      window.__koopFormDataPhoneV11=true;
    }

    const updateOwn=()=>{
      own.hidden=select.value!=='__custom__';
      if(!own.hidden&&!own.value)own.value='+';
      emit(phone);
      if(!own.hidden)setTimeout(()=>own.focus(),0);
    };
    select.addEventListener('change',updateOwn);
    own.addEventListener('input',()=>{
      let value=own.value.replace(/[^\d+]/g,'');
      value='+'+value.replace(/\+/g,'').slice(0,5);
      own.value=value;emit(phone);
    });

    try{
      const response=await fetch(PHONE_METADATA_URL,{cache:'force-cache'});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const metadata=await response.json();
      const collator=new Intl.Collator('cs',{sensitivity:'base'});
      entries=Object.entries(metadata.countries||{}).map(([iso,data])=>({
        iso,
        code:`+${data[0]}`,
        name:displayNames?.of(iso)||iso
      })).filter(item=>item.code!=='+undefined');
      entries.sort((a,b)=>a.iso==='CZ'?-1:b.iso==='CZ'?1:collator.compare(a.name,b.name));
      const before=select.value;
      setOptions(entries,before);
      const parsed=splitFull(originalFull);
      if(savedChoice&&[...select.options].some(option=>option.value===savedChoice)){
        select.value=savedChoice;
        own.value=savedCustom;
      }else{
        const exact=entries.find(item=>item.code===parsed.prefix&&(item.iso==='CZ'||parsed.iso===item.iso))||entries.find(item=>item.code===parsed.prefix);
        if(exact)select.value=`${exact.iso}|${exact.code}`;
        else if(parsed.prefix){select.value='__custom__';own.value=parsed.prefix;}
        phone.value=parsed.national;
      }
      own.hidden=select.value!=='__custom__';
      emit(phone);
    }catch(error){
      console.warn('Telefonní předvolby:',error);
    }
  };

  waitForV10().then(()=>{
    document.documentElement.dataset.appVersion='11';
    addStyles();
    installPdfLogoFix();
    setupReviewFormatting();
    setupLegalDefaultOpen();
    setupPhonePrefix();
  }).catch(error=>console.error('Kooperativa v11:',error));
})();
