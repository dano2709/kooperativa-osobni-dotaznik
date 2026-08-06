(()=>{
  'use strict';

  const originalFetch=window.fetch.bind(window);
  const parts=[
    'assets/word-template-v30-01.b64part',
    'assets/word-template-v30-02.b64part',
    'assets/word-template-v30-03.b64part',
    'assets/word-template-v30-04a.b64part',
    'assets/word-template-v30-04b.b64part',
    'assets/word-template-v30-05c01.b64part',
    'assets/word-template-v30-05c02.b64part',
    'assets/word-template-v30-05c03.b64part',
    'assets/word-template-v30-05c04.b64part',
    'assets/word-template-v30-05c05.b64part',
    'assets/word-template-v30-05c06.b64part',
    'assets/word-template-v30-05c07.b64part',
    'assets/word-template-v30-05c08.b64part'
  ];
  const EXPECTED_BASE64_LENGTH=43772;
  const EXPECTED_BYTE_LENGTH=32828;
  let templatePromise=null;

  const hasEndOfCentralDirectory=bytes=>{
    const start=Math.max(0,bytes.length-65557);
    for(let i=bytes.length-22;i>=start;i--){
      if(bytes[i]===0x50&&bytes[i+1]===0x4b&&bytes[i+2]===0x05&&bytes[i+3]===0x06)return true;
    }
    return false;
  };

  const buildTemplate=async()=>{
    const chunks=await Promise.all(parts.map(async path=>{
      const response=await originalFetch(`${path}?v=30`,{cache:'no-store'});
      if(!response.ok)throw new Error(`Word šablona se nenačetla (${path}: HTTP ${response.status}).`);
      return response.text();
    }));

    const base64=chunks.join('').replace(/\s+/g,'');
    if(base64.length!==EXPECTED_BASE64_LENGTH){
      throw new Error(`Word šablona je neúplná (${base64.length}/${EXPECTED_BASE64_LENGTH} znaků).`);
    }

    let binary;
    try{
      binary=atob(base64);
    }catch(_){
      throw new Error('Word šablona obsahuje neplatná data.');
    }

    const bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);

    if(bytes.length!==EXPECTED_BYTE_LENGTH){
      throw new Error(`Word šablona má chybnou velikost (${bytes.length}/${EXPECTED_BYTE_LENGTH} B).`);
    }
    if(bytes[0]!==0x50||bytes[1]!==0x4b||!hasEndOfCentralDirectory(bytes)){
      throw new Error('Word šablona není platný DOCX soubor.');
    }

    // Ověření nejdůležitějších položek centrálního adresáře před předáním knihovně PizZip.
    const tail=new TextDecoder('latin1').decode(bytes.slice(Math.max(0,bytes.length-4096)));
    if(!tail.includes('word/document.xml')||!tail.includes('[Content_Types].xml')){
      throw new Error('Word šablona nemá úplnou strukturu DOCX.');
    }

    return bytes;
  };

  const getTemplate=()=>{
    if(!templatePromise){
      templatePromise=buildTemplate().catch(error=>{
        templatePromise=null;
        throw error;
      });
    }
    return templatePromise;
  };

  window.fetch=(input,init)=>{
    const url=typeof input==='string'?input:(input&&input.url)||'';
    if(url.includes('assets/word-template-v24.docx')){
      return getTemplate().then(bytes=>new Response(bytes.slice(),{
        status:200,
        headers:{
          'Content-Type':'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Length':String(bytes.length),
          'Cache-Control':'no-store'
        }
      }));
    }
    return originalFetch(input,init);
  };

  window.__koopWordTemplateLoaderVersion='30-validated-template';
})();
