(()=>{
  const MAPY_API_KEY='Q6ZHcr95UvxQChPYRO-TYeidJjPi7-Z8Tk8ccRJxDuc';
  const PDF_WHITE_LOGO='assets/koop-white.png';

  const waitForV9=()=>new Promise((resolve,reject)=>{
    const started=Date.now();
    const timer=setInterval(()=>{
      const ready=document.documentElement.dataset.appVersion==='9'
        &&document.getElementById('birthPlace')
        &&document.getElementById('education')
        &&document.getElementById('educationYear');
      if(ready){clearInterval(timer);resolve();}
      else if(Date.now()-started>20000){clearInterval(timer);reject(new Error('Rozšíření formuláře se nepodařilo načíst.'));}
    },50);
  });

  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
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
      .v10-hidden-source{display:none!important}
      .v10-suggest-field{position:relative}
      .v10-suggest-menu{position:absolute;z-index:95;left:0;right:0;top:calc(100% + 7px);max-height:350px;overflow:auto;padding:7px;border:1px solid var(--line);border-radius:12px;background:#fff;box-shadow:0 12px 30px rgba(0,87,63,.17)}
      .v10-suggest-menu[hidden]{display:none}
      .v10-suggest-option{display:block;width:100%;padding:10px 12px;border:0;border-bottom:1px solid #edf1ee;border-radius:8px;background:#fff;text-align:left;color:var(--ink)}
      .v10-suggest-option:hover,.v10-suggest-option:focus-visible{background:#edf8f1;outline:2px solid rgba(0,132,61,.18);outline-offset:-2px}
      .v10-suggest-main{display:block;font-size:13px;font-weight:800;color:var(--green-dark)}
      .v10-suggest-sub{display:block;margin-top:3px;font-size:12px;line-height:1.35;color:var(--muted)}
      .v10-suggest-status{padding:11px;color:var(--muted);font-size:12px}
      .v10-mapy-credit{display:flex;align-items:center;justify-content:flex-end;gap:6px;padding:8px 10px 4px;color:var(--muted);font-size:10px}
      .v10-mapy-credit img{width:62px;height:auto}
      .v10-education-other{margin-top:9px}.v10-education-other[hidden]{display:none}
      .v10-education-other label{font-size:12px;color:var(--green-dark)}
      @media(max-width:700px){.v10-suggest-menu{max-height:290px}}
    `;
    document.head.appendChild(style);
  };

  const fixPdfHeaderLogo=()=>{
    if(window.__koopPdfHeaderLogoV10)return;
    const previousDrawImage=CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage=function(image,...args){
      const src=image instanceof HTMLImageElement?(image.currentSrc||image.src||''):'';
      const isPdf=this.canvas.width===1240&&this.canvas.height===1754;
      const isHeaderCall=args.length===4&&Number(args[1])<100&&Number(args[2])>=300;
      if(isPdf&&isHeaderCall&&src.includes(PDF_WHITE_LOGO)){
        return previousDrawImage.call(this,image,94,93,372,204,72,20,230,126);
      }
      return previousDrawImage.call(this,image,...args);
    };

    const previousFillText=CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText=function(text,...args){
      let next=text;
      if(text==='MÍSTO NAROZENÍ, OKRES (STÁT)')next='MÍSTO NAROZENÍ / OKRES / STÁT';
      if(text==='NEJVYŠŠÍ DOKONČENÉ VZDĚLÁNÍ (OBOR)')next='NEJVYŠŠÍ DOKONČENÉ VZDĚLÁNÍ / OBOR';
      return previousFillText.call(this,next,...args);
    };
    window.__koopPdfHeaderLogoV10=true;
  };

  const cleanCountry=name=>{
    const value=String(name||'').trim();
    return /^(Česko|Czechia)$/i.test(value)?'Česká republika':value;
  };
  const cleanDistrict=name=>String(name||'').replace(/^okres\s+/i,'').trim();
  const regionalName=(item,type,index=0)=>{
    const list=Array.isArray(item?.regionalStructure)?item.regionalStructure.filter(part=>part?.type===type):[];
    return list[index]?.name||'';
  };

  const attachMapySuggest=(input,{type,locality='',onChoose,emptyText})=>{
    const field=input.closest('.field');
    if(!field||input.dataset.v10Suggest)return;
    input.dataset.v10Suggest='1';
    field.classList.add('v10-suggest-field');
    input.autocomplete='off';
    input.setAttribute('aria-autocomplete','list');
    input.setAttribute('aria-expanded','false');

    const menu=document.createElement('div');
    menu.className='v10-suggest-menu';
    menu.hidden=true;
    menu.setAttribute('role','listbox');
    field.appendChild(menu);

    let timer=0;
    let controller=null;
    let internal=false;
    const cache=new Map();

    const close=()=>{menu.hidden=true;input.setAttribute('aria-expanded','false');};
    const status=text=>{
      menu.replaceChildren();
      const node=document.createElement('div');node.className='v10-suggest-status';node.textContent=text;menu.appendChild(node);
      menu.hidden=false;input.setAttribute('aria-expanded','true');
    };
    const render=items=>{
      menu.replaceChildren();
      if(!items.length){status(emptyText||'Nebyl nalezen odpovídající údaj. Můžete jej zadat ručně.');return;}
      items.forEach(item=>{
        const button=document.createElement('button');
        button.type='button';button.className='v10-suggest-option';button.setAttribute('role','option');
        const main=document.createElement('span');main.className='v10-suggest-main';main.textContent=item.name||'';
        const sub=document.createElement('span');sub.className='v10-suggest-sub';sub.textContent=[item.label,item.location].filter(Boolean).join(' · ');
        button.append(main,sub);
        button.addEventListener('click',()=>{
          internal=true;
          onChoose?.(item);
          internal=false;
          close();
        });
        menu.appendChild(button);
      });
      const credit=document.createElement('div');
      credit.className='v10-mapy-credit';
      credit.innerHTML='<span>Powered by</span><img src="https://api.mapy.com/img/api/logo-small.svg" alt="Mapy.com">';
      menu.appendChild(credit);
      menu.hidden=false;input.setAttribute('aria-expanded','true');
    };
    const search=async query=>{
      if(query.length<2){close();return;}
      const key=`${type}|${locality}|${query}`;
      if(cache.has(key)){render(cache.get(key));return;}
      controller?.abort();
      controller=new AbortController();
      status('Vyhledávám…');
      try{
        const url=new URL('https://api.mapy.com/v1/suggest');
        const params={lang:'cs',limit:'8',type,apikey:MAPY_API_KEY,query};
        if(locality)params.locality=locality;
        url.search=new URLSearchParams(params).toString();
        const response=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json'}});
        if(!response.ok)throw new Error(`HTTP ${response.status}`);
        const data=await response.json();
        const items=Array.isArray(data.items)?data.items:[];
        cache.set(key,items);
        render(items);
      }catch(error){
        if(error.name==='AbortError')return;
        status('Našeptávač není dostupný. Údaj můžete zadat ručně.');
        console.warn('Mapy.com suggest:',error);
      }
    };

    input.addEventListener('input',()=>{
      if(internal)return;
      clearTimeout(timer);
      timer=setTimeout(()=>search(input.value.trim()),260);
    });
    input.addEventListener('focus',()=>{if(input.value.trim().length>=2)search(input.value.trim());});
    input.addEventListener('keydown',event=>{if(event.key==='Escape')close();});
    document.addEventListener('click',event=>{if(!field.contains(event.target))close();});
  };

  const setupBirthPlace=()=>{
    const source=document.getElementById('birthPlace');
    if(!source||source.dataset.v10Ready)return;
    source.dataset.v10Ready='1';
    const oldField=source.closest('.field');
    if(!oldField)return;

    source.required=false;
    oldField.classList.add('v10-hidden-source');

    const cityField=document.createElement('div');
    cityField.className='field third';
    cityField.innerHTML='<label for="birthPlaceCity">Místo narození <span class="req">*</span></label><input id="birthPlaceCity" name="birthPlaceCity" required placeholder="např. Havířov"><div class="error-message"></div>';
    const districtField=document.createElement('div');
    districtField.className='field third';
    districtField.innerHTML='<label for="birthDistrict">Okres <span class="req">*</span></label><input id="birthDistrict" name="birthDistrict" required placeholder="např. Karviná"><div class="error-message"></div>';
    const countryField=document.createElement('div');
    countryField.className='field third';
    countryField.innerHTML='<label for="birthCountry">Stát <span class="req">*</span></label><input id="birthCountry" name="birthCountry" required placeholder="např. Česká republika"><div class="error-message"></div>';
    oldField.parentNode.insertBefore(cityField,oldField);
    oldField.parentNode.insertBefore(districtField,oldField);
    oldField.parentNode.insertBefore(countryField,oldField);

    const city=cityField.querySelector('input');
    const district=districtField.querySelector('input');
    const country=countryField.querySelector('input');

    const sync=()=>{
      const parts=[];
      if(city.value.trim())parts.push(city.value.trim());
      if(district.value.trim())parts.push(`okres ${cleanDistrict(district.value)}`);
      if(country.value.trim())parts.push(cleanCountry(country.value));
      source.value=parts.join(', ');
      emit(source);
    };

    const savedCity=savedValue('birthPlaceCity');
    const savedDistrict=savedValue('birthDistrict');
    const savedCountry=savedValue('birthCountry');
    if(savedCity||savedDistrict||savedCountry){
      city.value=savedCity;district.value=savedDistrict;country.value=savedCountry;
    }else{
      const old=source.value.trim();
      const match=old.match(/^([^,]+)(?:,\s*okres\s+([^,]+))?(?:,\s*(.+))?$/i);
      if(match){city.value=(match[1]||'').trim();district.value=(match[2]||'').trim();country.value=cleanCountry(match[3]||'');}
      else city.value=old;
    }

    [city,district,country].forEach(input=>input.addEventListener('input',sync));

    attachMapySuggest(city,{
      type:'regional.municipality',locality:'cz',emptyText:'Obec nebyla nalezena. Místo narození můžete zadat ručně.',
      onChoose:item=>{
        city.value=item.name||'';
        const regions=(Array.isArray(item.regionalStructure)?item.regionalStructure:[]).filter(part=>part?.type==='regional.region');
        if(regions[0]?.name)district.value=cleanDistrict(regions[0].name);
        const countryName=regionalName(item,'regional.country');
        if(countryName)country.value=cleanCountry(countryName);
        emit(city);emit(district);emit(country);sync();
      }
    });
    attachMapySuggest(district,{
      type:'regional.region',locality:'cz',emptyText:'Okres nebyl nalezen. Můžete jej zadat ručně.',
      onChoose:item=>{district.value=cleanDistrict(item.name);emit(district);sync();}
    });
    attachMapySuggest(country,{
      type:'regional.country',emptyText:'Stát nebyl nalezen. Můžete jej zadat ručně.',
      onChoose:item=>{country.value=cleanCountry(item.name);emit(country);sync();}
    });
    sync();
  };

  const educationLevels=[
    'Bez vzdělání',
    'Neúplné základní vzdělání',
    'Základní vzdělání',
    'Střední vzdělání bez výučního listu a maturity',
    'Střední odborné vzdělání s výučním listem',
    'Střední vzdělání s maturitní zkouškou',
    'Nástavbové studium',
    'Konzervatoř',
    'Vyšší odborné vzdělání (DiS.)',
    'Vysokoškolské – bakalářské (Bc.)',
    'Vysokoškolské – magisterské / inženýrské (Mgr., Ing. apod.)',
    'Vysokoškolské – doktorské (Ph.D. apod.)'
  ];

  const setupEducation=()=>{
    const source=document.getElementById('education');
    const year=document.getElementById('educationYear');
    if(!source||!year||source.dataset.v10Ready)return;
    source.dataset.v10Ready='1';
    const oldField=source.closest('.field');
    const yearField=year.closest('.field');
    if(!oldField||!yearField)return;

    source.required=false;
    oldField.classList.add('v10-hidden-source');
    yearField.classList.remove('field');
    yearField.className='field third';
    const yearLabel=yearField.querySelector('label');
    if(yearLabel)yearLabel.innerHTML='V roce <span class="req">*</span>';

    const levelField=document.createElement('div');
    levelField.className='field third';
    levelField.innerHTML='<label for="educationLevel">Nejvyšší dokončené vzdělání <span class="req">*</span></label><select id="educationLevel" name="educationLevel" required><option value="">Vyberte</option></select><div class="v10-education-other" hidden><label for="educationLevelOther">Vlastní úroveň vzdělání</label><input id="educationLevelOther" name="educationLevelOther" maxlength="120" placeholder="Napište vlastní úroveň vzdělání"><div class="error-message"></div></div><div class="error-message"></div>';
    const majorField=document.createElement('div');
    majorField.className='field third';
    majorField.innerHTML='<label for="educationMajor">Obor</label><input id="educationMajor" name="educationMajor" maxlength="160" placeholder="např. Informační technologie"><div class="error-message"></div>';
    oldField.parentNode.insertBefore(levelField,oldField);
    oldField.parentNode.insertBefore(majorField,oldField);
    oldField.parentNode.insertBefore(yearField,oldField);

    const level=levelField.querySelector('select');
    const otherWrap=levelField.querySelector('.v10-education-other');
    const other=levelField.querySelector('#educationLevelOther');
    const major=majorField.querySelector('input');
    educationLevels.forEach(text=>{const option=document.createElement('option');option.value=text;option.textContent=text;level.appendChild(option);});
    const custom=document.createElement('option');custom.value='__other__';custom.textContent='Vlastní – zadat ručně';level.appendChild(custom);

    const currentLevel=savedValue('educationLevel');
    const currentOther=savedValue('educationLevelOther');
    const currentMajor=savedValue('educationMajor');
    const oldCombined=source.value.trim();
    if(currentLevel){level.value=currentLevel;other.value=currentOther;major.value=currentMajor;}
    else if(oldCombined){
      const matched=educationLevels.find(item=>oldCombined===item||oldCombined.startsWith(item+' – '));
      if(matched){level.value=matched;major.value=oldCombined.slice(matched.length).replace(/^\s*[–-]\s*/,'');}
      else{level.value='__other__';other.value=oldCombined;}
    }

    const sync=()=>{
      const selected=level.value==='__other__'?other.value.trim():level.value;
      const field=major.value.trim();
      source.value=[selected,field].filter(Boolean).join(' – ');
      emit(source);
    };
    const updateCustom=()=>{
      const own=level.value==='__other__';
      otherWrap.hidden=!own;
      other.required=own;
      if(!own){other.classList.remove('invalid');const err=otherWrap.querySelector('.error-message');if(err)err.textContent='';}
      sync();
      if(own&&!other.value)setTimeout(()=>other.focus(),0);
    };
    level.addEventListener('change',updateCustom);
    other.addEventListener('input',sync);
    major.addEventListener('input',sync);
    updateCustom();
  };

  waitForV9().then(()=>{
    document.documentElement.dataset.appVersion='10';
    addStyles();
    fixPdfHeaderLogo();
    setupBirthPlace();
    setupEducation();
  }).catch(error=>console.error('Kooperativa v10:',error));
})();
