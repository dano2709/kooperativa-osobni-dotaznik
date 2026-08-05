(()=>{
  const waitForApp=()=>new Promise((resolve,reject)=>{
    const started=Date.now();
    const timer=setInterval(()=>{
      const form=document.getElementById('questionnaire');
      const insurance=document.getElementById('healthInsurance');
      if(form&&insurance){clearInterval(timer);resolve();}
      else if(Date.now()-started>15000){clearInterval(timer);reject(new Error('Formulář se nenačetl.'));}
    },40);
  });

  waitForApp().then(()=>{
    document.documentElement.dataset.appVersion='8';
    const ASSET_BASE='assets/';
    const CORRECT_LOGO=ASSET_BASE+'koop.webp?v=8';
    const OLD_LOGO_PREFIX='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAANwAAABGCAYAAACnp/qk';
    const insurers=[
      {code:'111',name:'Všeobecná zdravotní pojišťovna ČR (VZP)',logo:ASSET_BASE+'111.webp?v=8'},
      {code:'201',name:'Vojenská zdravotní pojišťovna ČR (VoZP)',logo:ASSET_BASE+'201.webp?v=8'},
      {code:'205',name:'Česká průmyslová zdravotní pojišťovna (ČPZP)',logo:ASSET_BASE+'205.webp?v=8'},
      {code:'207',name:'Oborová zdravotní pojišťovna zaměstnanců bank, pojišťoven a stavebnictví (OZP)',logo:ASSET_BASE+'207.webp?v=8'},
      {code:'209',name:'Zaměstnanecká pojišťovna Škoda (ZPŠ)',logo:ASSET_BASE+'209.webp?v=8'},
      {code:'211',name:'Zdravotní pojišťovna ministerstva vnitra ČR (ZPMV ČR)',logo:ASSET_BASE+'211.webp?v=8'},
      {code:'213',name:'RBP, zdravotní pojišťovna',logo:ASSET_BASE+'213.webp?v=8'}
    ];

    if(!window.__koopLogoSetterPatched){
      const descriptor=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
      if(descriptor?.get&&descriptor?.set){
        Object.defineProperty(HTMLImageElement.prototype,'src',{
          configurable:true,
          enumerable:descriptor.enumerable,
          get(){return descriptor.get.call(this);},
          set(value){
            const replacing=typeof value==='string'&&value.startsWith(OLD_LOGO_PREFIX);
            const next=replacing?new URL(CORRECT_LOGO,document.baseURI).href:value;
            if(replacing)this.crossOrigin='anonymous';
            descriptor.set.call(this,next);
          }
        });
      }
      window.__koopLogoSetterPatched=true;
    }
    if(!window.__koopPdfLogoDrawPatched){
      const originalDrawImage=CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage=function(image,...args){
        const source=image instanceof HTMLImageElement?(image.currentSrc||image.src||''):'';
        if(source.includes('/assets/koop.webp')&&this.canvas.width>1000&&this.canvas.height>1500&&args.length===4){
          const previousFill=this.fillStyle;
          this.fillStyle='#ffffff';this.fillRect(56,10,252,145);this.fillStyle=previousFill;
          return originalDrawImage.call(this,image,72,22,220,121);
        }
        return originalDrawImage.call(this,image,...args);
      };
      window.__koopPdfLogoDrawPatched=true;
    }

    const style=document.createElement('style');
    style.textContent=`
      .site-brand-strip{display:flex;align-items:center;justify-content:space-between;gap:22px;padding:14px 18px;margin:0 0 18px;background:#fff;border:1px solid var(--line);border-left:7px solid var(--green);border-radius:12px;box-shadow:0 4px 18px rgba(0,87,63,.06)}
      .site-brand-strip img{display:block;width:150px;max-height:88px;object-fit:contain}
      .site-brand-strip strong{color:var(--green-dark);font-size:22px;line-height:1.2;text-align:right}
      .insurance-field{grid-column:1/-1;position:relative}
      .insurance-control{display:grid;grid-template-columns:76px minmax(0,1fr) 48px;align-items:stretch}
      .insurance-logo-holder{display:grid;place-items:center;min-height:48px;border:1px solid #bdcbc2;border-right:0;border-radius:10px 0 0 10px;background:#fff;padding:5px}
      .insurance-logo-holder img{display:none;max-width:66px;max-height:38px;object-fit:contain}
      .insurance-logo-holder img.show{display:block}
      .insurance-control input{border-radius:0;border-left:0;border-right:0}
      .insurance-control input[readonly]{cursor:pointer;background:#fff}
      .insurance-toggle{border:1px solid #bdcbc2;border-radius:0 10px 10px 0;background:#fff;color:var(--green-dark);font-weight:800;font-size:18px}
      .insurance-toggle:hover{background:#edf8f1}
      .insurance-menu{position:absolute;left:0;right:0;z-index:50;margin-top:8px;border:1px solid var(--line);border-radius:12px;background:#fff;padding:7px;box-shadow:0 10px 28px rgba(0,87,63,.16);max-height:420px;overflow:auto}
      .insurance-menu[hidden]{display:none}
      .insurance-option{display:grid;grid-template-columns:86px 58px minmax(0,1fr);align-items:center;gap:12px;width:100%;padding:10px 12px;border:0;border-bottom:1px solid #edf1ee;background:#fff;text-align:left;border-radius:9px;color:var(--ink)}
      .insurance-option:last-of-type{border-bottom:0}
      .insurance-option:hover,.insurance-option:focus-visible{background:#edf8f1;outline:2px solid rgba(0,132,61,.18);outline-offset:-2px}
      .insurance-option img{display:block;width:80px;height:42px;object-fit:contain}
      .insurance-code{font-size:17px;font-weight:800;color:var(--green-dark)}
      .insurance-name{font-size:13px;line-height:1.35;font-weight:700}
      .insurance-manual{display:block;width:100%;margin-top:8px;padding:11px 12px;border:1px dashed var(--green);border-radius:9px;background:#f7fbf8;color:var(--green-dark);font-weight:800;text-align:left}
      .insurance-manual:hover{background:#edf8f1}
      .insurance-mode-note{display:none;margin-top:6px;color:var(--muted);font-size:12px}
      .insurance-mode-note.show{display:block}
      .help-inline{font-size:11px;font-weight:400;color:var(--muted)}
      @media(max-width:700px){
        .site-brand-strip{align-items:flex-start}.site-brand-strip img{width:116px}.site-brand-strip strong{font-size:17px}
        .insurance-control{grid-template-columns:62px minmax(0,1fr) 44px}
        .insurance-option{grid-template-columns:72px 48px minmax(0,1fr);gap:8px;padding:9px 8px}
        .insurance-option img{width:66px;height:38px}.insurance-name{font-size:12px}
      }
    `;
    document.head.appendChild(style);

    const page=document.querySelector('.page');
    if(page&&!page.querySelector('.site-brand-strip')){
      const brand=document.createElement('div');
      brand.className='site-brand-strip';
      brand.innerHTML=`<img src="${CORRECT_LOGO}" alt="Kooperativa Vienna Insurance Group"><strong>Osobní dotazník zaměstnance</strong>`;
      page.prepend(brand);
    }

    const form=document.getElementById('questionnaire');
    const healthInsurance=document.getElementById('healthInsurance');
    const insuranceField=healthInsurance.closest('.field');
    insuranceField.classList.add('insurance-field');
    insuranceField.classList.remove('third');
    healthInsurance.readOnly=true;
    healthInsurance.autocomplete='off';
    healthInsurance.placeholder='Vyberte zdravotní pojišťovnu';
    healthInsurance.setAttribute('aria-haspopup','listbox');
    healthInsurance.setAttribute('aria-expanded','false');

    const insuranceControl=document.createElement('div');
    insuranceControl.className='insurance-control';
    const logoHolder=document.createElement('div');
    logoHolder.className='insurance-logo-holder';
    const selectedLogo=document.createElement('img');
    selectedLogo.alt='Logo vybrané zdravotní pojišťovny';
    logoHolder.appendChild(selectedLogo);
    const toggle=document.createElement('button');
    toggle.type='button';toggle.className='insurance-toggle';toggle.setAttribute('aria-label','Otevřít seznam zdravotních pojišťoven');toggle.textContent='⌄';
    insuranceField.insertBefore(insuranceControl,healthInsurance);
    insuranceControl.append(logoHolder,healthInsurance,toggle);

    const menu=document.createElement('div');
    menu.className='insurance-menu';menu.hidden=true;menu.setAttribute('role','listbox');
    for(const option of insurers){
      const button=document.createElement('button');
      button.type='button';button.className='insurance-option';button.dataset.code=option.code;button.setAttribute('role','option');
      button.innerHTML=`<img src="${option.logo}" alt=""><span class="insurance-code">${option.code}</span><span class="insurance-name"></span>`;
      button.querySelector('.insurance-name').textContent=option.name;
      menu.appendChild(button);
    }
    const manual=document.createElement('button');
    manual.type='button';manual.className='insurance-manual';manual.textContent='Pojišťovna není uvedena v seznamu – zadat ručně';
    menu.appendChild(manual);
    const modeNote=document.createElement('div');
    modeNote.className='insurance-mode-note';modeNote.textContent='Ručně zadaná zdravotní pojišťovna.';
    insuranceField.append(menu,modeNote);

    const closeMenu=()=>{menu.hidden=true;healthInsurance.setAttribute('aria-expanded','false');toggle.textContent='⌄';};
    const openMenu=()=>{menu.hidden=false;healthInsurance.setAttribute('aria-expanded','true');toggle.textContent='⌃';};
    const choose=(option,notify=true)=>{
      healthInsurance.dataset.mode='list';healthInsurance.readOnly=true;
      healthInsurance.value=`${option.code} - ${option.name}`;
      selectedLogo.src=option.logo;selectedLogo.classList.add('show');
      modeNote.classList.remove('show');closeMenu();
      if(notify){healthInsurance.dispatchEvent(new Event('input',{bubbles:true}));healthInsurance.dispatchEvent(new Event('change',{bubbles:true}));}
    };
    const manualMode=(clear=true)=>{
      healthInsurance.dataset.mode='manual';healthInsurance.readOnly=false;
      selectedLogo.removeAttribute('src');selectedLogo.classList.remove('show');modeNote.classList.add('show');closeMenu();
      if(clear)healthInsurance.value='';
      healthInsurance.dispatchEvent(new Event('input',{bubbles:true}));
      if(clear)setTimeout(()=>healthInsurance.focus(),0);
    };
    const syncInsurance=()=>{
      const value=healthInsurance.value.trim();
      const match=insurers.find(item=>value.startsWith(item.code+' -')||value===item.name);
      if(match)choose(match,false);
      else if(value)manualMode(false);
      else{healthInsurance.dataset.mode='';healthInsurance.readOnly=true;selectedLogo.classList.remove('show');modeNote.classList.remove('show');closeMenu();}
    };
    healthInsurance.addEventListener('click',()=>{if(healthInsurance.readOnly)menu.hidden?openMenu():closeMenu();});
    toggle.addEventListener('click',()=>menu.hidden?openMenu():closeMenu());
    menu.addEventListener('click',event=>{
      const item=event.target.closest('.insurance-option');
      if(item){const option=insurers.find(x=>x.code===item.dataset.code);if(option)choose(option);return;}
      if(event.target.closest('.insurance-manual'))manualMode(true);
    });
    document.addEventListener('click',event=>{if(!insuranceField.contains(event.target))closeMenu();});
    healthInsurance.addEventListener('keydown',event=>{
      if(event.key==='ArrowDown'&&healthInsurance.readOnly){event.preventDefault();openMenu();menu.querySelector('.insurance-option')?.focus();}
      if(event.key==='Escape')closeMenu();
    });
    syncInsurance();

    const bankAccount=document.getElementById('bankAccount');
    const bankNumber=document.getElementById('bankAccountNumber');
    const bankCode=document.getElementById('bankCode');
    const numberField=bankNumber.closest('.field');
    const codeField=bankCode.closest('.field');
    numberField.classList.add('third');codeField.classList.add('third');
    const numberLabel=numberField.querySelector('label');
    if(numberLabel)numberLabel.innerHTML='Číslo bankovního účtu <span class="req">*</span>';
    bankNumber.placeholder='např. 1234567890';
    const prefixField=document.createElement('div');
    prefixField.className='field third';
    prefixField.innerHTML='<label for="bankPrefix">Předčíslí účtu <span class="help-inline">(nepovinné)</span></label><input id="bankPrefix" inputmode="numeric" maxlength="6" name="bankPrefix" placeholder="např. 86"><div class="error-message"></div>';
    numberField.parentNode.insertBefore(prefixField,numberField);
    const prefix=document.getElementById('bankPrefix');

    const valueDescriptor=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');
    if(valueDescriptor?.get&&valueDescriptor?.set&&!bankAccount.dataset.prefixAware){
      Object.defineProperty(bankAccount,'value',{
        configurable:true,
        get(){return valueDescriptor.get.call(this);},
        set(raw){
          let value=String(raw??'');
          const p=prefix.value.trim();
          value=value.replace(/^\d{1,6}-/, '');
          if(p&&value)value=p+'-'+value;
          valueDescriptor.set.call(this,value);
        }
      });
      bankAccount.dataset.prefixAware='true';
    }
    try{
      const saved=JSON.parse(localStorage.getItem('koop-personal-questionnaire-v5')||'{}');
      if(saved.bankPrefix)prefix.value=String(saved.bankPrefix).replace(/\D/g,'').slice(0,6);
      else{
        const combined=String(saved.bankAccount||bankAccount.value||'');
        const match=combined.match(/^(\d{1,6})-(\d+)/);
        if(match)prefix.value=match[1];
      }
    }catch(_){ }
    const resyncBank=()=>{
      prefix.value=prefix.value.replace(/\D/g,'').slice(0,6);
      bankNumber.dispatchEvent(new Event('input',{bubbles:true}));
    };
    prefix.addEventListener('input',resyncBank);
    prefix.addEventListener('blur',()=>{
      const error=prefixField.querySelector('.error-message');
      prefix.classList.remove('invalid');if(error)error.textContent='';
    });
    resyncBank();

    document.querySelectorAll('img').forEach(img=>{
      const src=img.getAttribute('src')||'';
      if(src.startsWith(OLD_LOGO_PREFIX))img.src=CORRECT_LOGO;
    });
  }).catch(error=>console.error('Kooperativa v8 patch:',error));
})();
