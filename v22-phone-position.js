(()=>{
  const waitForForm=()=>new Promise((resolve,reject)=>{
    const started=Date.now();
    const timer=setInterval(()=>{
      const phone=document.getElementById('phoneNational');
      const marital=document.getElementById('maritalStatus');
      const insurance=document.getElementById('healthInsurance');
      if(phone&&marital&&insurance){clearInterval(timer);resolve({phone,marital,insurance});}
      else if(Date.now()-started>25000){clearInterval(timer);reject(new Error('Přesunutí telefonního čísla se nepodařilo načíst.'));}
    },60);
  });

  const addStyles=()=>{
    const style=document.createElement('style');
    style.textContent=`
      .v22-phone-row{
        grid-column:1/-1!important;
        display:block;
        min-width:0;
      }
      .v22-phone-row .v12-phone-field{
        width:100%;
        grid-column:1/-1!important;
        min-width:0;
      }
      .v22-phone-row .v11-phone-wrap{
        display:grid;
        grid-template-columns:minmax(220px,280px) minmax(240px,1fr)!important;
        gap:10px!important;
        width:100%;
      }
      .v22-phone-row #phoneNational{
        width:100%;
        min-width:0!important;
      }
      .v22-phone-row .v11-phone-help{
        max-width:680px;
      }
      @media(max-width:760px){
        .v22-phone-row .v11-phone-wrap{grid-template-columns:1fr!important}
      }
    `;
    document.head.appendChild(style);
  };

  const movePhone=({phone,insurance})=>{
    const phoneField=phone.closest('.field');
    const insuranceField=insurance.closest('.field');
    const grid=insuranceField?.parentElement;
    if(!phoneField||!insuranceField||!grid)return;

    let row=document.querySelector('.v22-phone-row');
    if(!row){
      row=document.createElement('div');
      row.className='v22-phone-row';
    }

    insuranceField.insertAdjacentElement('beforebegin',row);
    row.appendChild(phoneField);

    document.querySelectorAll('.v13-phone-row').forEach(oldRow=>{
      if(!oldRow.children.length)oldRow.remove();
    });
  };

  waitForForm().then(elements=>{
    addStyles();
    movePhone(elements);
  }).catch(error=>console.error('Kooperativa v22:',error));
})();
