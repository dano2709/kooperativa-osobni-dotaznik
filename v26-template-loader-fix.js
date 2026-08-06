(()=>{
  const originalFetch=window.fetch.bind(window);
  const parts=[
    'assets/word-template-v24-01.b64part',
    'assets/word-template-v24-02.b64part',
    'assets/word-template-v24-03.b64part',
    'assets/word-template-v24-04.b64part'
  ];

  let templateResponsePromise=null;

  const buildTemplateResponse=async()=>{
    const texts=await Promise.all(parts.map(async path=>{
      const response=await originalFetch(`${path}?v=26`,{cache:'no-store'});
      if(!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
      return response.text();
    }));

    const b64=texts.join('').replace(/\s+/g,'');
    const binary=atob(b64);
    const bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);

    return new Response(bytes,{
      status:200,
      headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}
    });
  };

  window.fetch=(input,init)=>{
    const url=typeof input==='string'?input:(input&&input.url)||'';
    if(url.includes('assets/word-template-v24.docx')){
      if(!templateResponsePromise) templateResponsePromise=buildTemplateResponse();
      return templateResponsePromise.then(response=>response.clone()).catch(error=>{
        templateResponsePromise=null;
        throw error;
      });
    }
    return originalFetch(input,init);
  };
})();
