(()=>{
  const parts=[
    'v12-src-1.txt?v=20260805-1428',
    'v12-src-2.txt?v=20260805-1428',
    'v12-src-3.txt?v=20260805-1428',
    'v12-src-4.txt?v=20260805-1428'
  ];
  Promise.all(parts.map(path=>fetch(path,{cache:'no-store'}).then(response=>{
    if(!response.ok)throw new Error(`${path}: HTTP ${response.status}`);
    return response.text();
  }))).then(sourceParts=>{
    const script=document.createElement('script');
    script.textContent=sourceParts.join('')+'\n//# sourceURL=v12-patch.js';
    document.head.appendChild(script);
  }).catch(error=>console.error('Kooperativa v12 loader:',error));
})();
