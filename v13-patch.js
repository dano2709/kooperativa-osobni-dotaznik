(()=>{
  const waitForV12=()=>new Promise((resolve,reject)=>{
    const started=Date.now();
    const timer=setInterval(()=>{
      const ready=document.documentElement.dataset.appVersion==='12'
        &&document.getElementById('questionnaire')
        &&document.getElementById('personalNumber')
        &&document.getElementById('birthDate')
        &&document.getElementById('phoneNational');
      if(ready){clearInterval(timer);resolve();}
      else if(Date.now()-started>25000){
        clearInterval(timer);
        reject(new Error('Rozšíření verze 13 se nepodařilo načíst.'));
      }
    },60);
  });

  const addStyles=()=>{
    const style=document.createElement('style');
    style.textContent=`
      .v13-phone-row{
        grid-column:1/-1!important;
        display:grid;
        grid-template-columns:minmax(0,1fr) minmax(0,1fr);
        gap:16px;
        align-items:start;
      }
      .v13-phone-row .v12-phone-field{
        grid-column:1!important;
        min-width:0;
      }
      .v13-phone-row .v11-phone-wrap{
        grid-template-columns:minmax(180px,220px) minmax(190px,1fr)!important;
        gap:10px!important;
      }
      .v13-phone-row #phoneNational{
        width:100%;
        min-width:190px;
      }
      @media(max-width:860px){
        .v13-phone-row{grid-template-columns:1fr}
        .v13-phone-row .v11-phone-wrap{grid-template-columns:1fr!important}
        .v13-phone-row #phoneNational{min-width:0}
      }
    `;
    document.head.appendChild(style);
  };

  const movePhone=()=>{
    const phone=document.getElementById('phoneNational');
    const phoneField=phone?.closest('.field');
    const birthDate=document.getElementById('birthDate');
    const birthDateField=birthDate?.closest('.field');
    const grid=birthDateField?.parentElement;
    if(!phoneField||!birthDateField||!grid||phoneField.closest('.v13-phone-row'))return;

    const row=document.createElement('div');
    row.className='v13-phone-row';
    birthDateField.insertAdjacentElement('afterend',row);
    row.appendChild(phoneField);
  };

  const reportDependencyState=()=>{
    const status=document.querySelector('.v12-output-status');
    const ready=typeof window.html2canvas==='function'&&(window.jspdf?.jsPDF||window.jsPDF);
    if(!ready&&status&&!status.textContent.trim()){
      status.textContent='Načítám knihovny pro tvorbu PDF…';
      status.style.color='#00573f';
    }
    const timer=setInterval(()=>{
      const loaded=typeof window.html2canvas==='function'&&(window.jspdf?.jsPDF||window.jsPDF);
      if(loaded){
        clearInterval(timer);
        if(status?.textContent==='Načítám knihovny pro tvorbu PDF…')status.textContent='';
      }
    },150);
    setTimeout(()=>clearInterval(timer),20000);
  };

  waitForV12().then(()=>{
    document.documentElement.dataset.appVersion='13';
    addStyles();
    movePhone();
    reportDependencyState();
  }).catch(error=>console.error('Kooperativa v13:',error));
})();
