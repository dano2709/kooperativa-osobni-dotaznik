(()=>{
  const parts=[
    'v21-word-template-1.txt?v=20260806-1148',
    'v21-word-template-2.txt?v=20260806-1148'
  ];

  Promise.all(parts.map(path=>fetch(path,{cache:'no-store'}).then(response=>{
    if(!response.ok)throw new Error(`${path}: HTTP ${response.status}`);
    return response.text();
  }))).then(sourceParts=>{
    const script=document.createElement('script');
    script.textContent=sourceParts.join('')+'\n//# sourceURL=v21-word-template-runtime.js';
    document.head.appendChild(script);
  }).catch(error=>{
    console.error('Načtení Word generátoru v21:',error);
    const status=document.querySelector('.v12-output-status');
    if(status){
      status.textContent='Word generátor se nepodařilo načíst. Obnovte stránku.';
      status.style.color='#c5221f';
    }
  });
})();
