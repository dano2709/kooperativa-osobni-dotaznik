(async()=>{
  try{
    const names=['v9-1.b64part','v9-2.b64part'];
    const chunks=await Promise.all(names.map(async name=>{
      const response=await fetch(name,{cache:'no-store'});
      if(!response.ok)throw new Error(`${name}: ${response.status}`);
      return response.text();
    }));
    const b64=chunks.join('').replace(/\s+/g,'');
    const binary=atob(b64);
    const bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    if(typeof DecompressionStream!=='function')throw new Error('Tento prohlížeč nepodporuje načtení rozšíření.');
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    const code=await new Response(stream).text();
    (0,eval)(code);
  }catch(error){
    console.error('Kooperativa v9 loader:',error);
  }
})();
