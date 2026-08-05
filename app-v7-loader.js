(async()=>{
  try{
    const names=[
      'app-v7-1.b64part',
      'app-v7-2.b64part',
      'app-v7-3.b64part',
      'app-v7-4.b64part',
      'app-v7-5.b64part'
    ];
    const chunks=await Promise.all(names.map(async name=>{
      const response=await fetch(name,{cache:'no-store'});
      if(!response.ok)throw new Error(`${name}: ${response.status}`);
      return response.text();
    }));
    const b64=chunks.join('').replace(/\s+/g,'');
    const binary=atob(b64);
    const bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    if(typeof DecompressionStream!=='function'){
      throw new Error('Tento prohlížeč nepodporuje načtení aplikace. Použijte aktuální Chrome, Edge nebo Firefox.');
    }
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    const code=await new Response(stream).text();
    (0,eval)(code);
  }catch(error){
    document.body.innerHTML=`<main style="font-family:Arial,sans-serif;max-width:760px;margin:70px auto;padding:28px"><h1 style="color:#00843D">Aplikaci se nepodařilo načíst</h1><p>${String(error.message||error)}</p><p>Obnovte stránku pomocí Ctrl+F5.</p></main>`;
    console.error(error);
  }
})();
