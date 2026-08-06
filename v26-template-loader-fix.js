(()=>{
  const originalFetch=window.fetch.bind(window);
  const parts=[
    'assets/word-template-v24-01.b64part',
    'assets/word-template-v24-02.b64part',
    'assets/word-template-v24-03.b64part',
    'assets/word-template-v24-04.b64part',
    'assets/word-template-v24-05.b64part',
    'assets/word-template-v24-06.b64part'
  ];
  const EXPECTED_BASE64_LENGTH=38844;
  const EXPECTED_BYTE_LENGTH=29133;
  let templateResponsePromise=null;

  const hasEndOfCentralDirectory=bytes=>{
    const start=Math.max(0,bytes.length-65557);
    for(let i=bytes.length-22;i>=start;i--){
      if(bytes[i]===0x50&&bytes[i+1]===0x4b&&bytes[i+2]===0x05&&bytes[i+3]===0x06)return true;
    }
    return false;
  };

  const buildTemplateResponse=async()=>{
    const texts=await Promise.all(parts.map(async path=>{
      const response=await originalFetch(`${path}?v=27`,{cache:'no-store'});
      if(!response.ok)throw new Error(`${path}: HTTP ${response.status}`);
      return response.text();
    }));

    const b64=texts.join('').replace(/\s+/g,'');
    if(b64.length!==EXPECTED_BASE64_LENGTH){
      throw new Error(`Word šablona je neúplná (${b64.length}/${EXPECTED_BASE64_LENGTH} znaků).`);
    }

    let binary;
    try{binary=atob(b64)}catch(_){throw new Error('Word šablona obsahuje neplatná data.');}
    const bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);

    if(bytes.length!==EXPECTED_BYTE_LENGTH){
      throw new Error(`Word šablona má chybnou velikost (${bytes.length}/${EXPECTED_BYTE_LENGTH} B).`);
    }
    if(bytes[0]!==0x50||bytes[1]!==0x4b||!hasEndOfCentralDirectory(bytes)){
      throw new Error('Word šablona není platný DOCX soubor.');
    }

    return new Response(bytes,{
      status:200,
      headers:{
        'Content-Type':'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Length':String(bytes.length)
      }
    });
  };

  window.fetch=(input,init)=>{
    const url=typeof input==='string'?input:(input&&input.url)||'';
    if(url.includes('assets/word-template-v24.docx')){
      if(!templateResponsePromise)templateResponsePromise=buildTemplateResponse();
      return templateResponsePromise.then(response=>response.clone()).catch(error=>{
        templateResponsePromise=null;
        throw error;
      });
    }
    return originalFetch(input,init);
  };
})();
