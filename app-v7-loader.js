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

    // Šablona obsahuje neplatné prázdné části poznámek pod čarou a vysvětlivek.
    // Před stažením DOCX je bezpečně odstraníme včetně všech odkazů v balíčku.
    const originalSaveAs=window.saveAs;
    if(typeof originalSaveAs==='function'&&typeof window.PizZip==='function'){
      window.saveAs=async function(file,name,options){
        const fileName=String(name||file?.name||'');
        const isDocx=/\.docx$/i.test(fileName)||file?.type==='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        if(!isDocx)return originalSaveAs.call(this,file,name,options);
        try{
          const buffer=await file.arrayBuffer();
          const zip=new window.PizZip(buffer);
          [
            'word/footnotes.xml',
            'word/endnotes.xml',
            'word/_rels/footnotes.xml.rels',
            'word/_rels/endnotes.xml.rels'
          ].forEach(path=>zip.remove(path));

          const cleanXml=(path,patterns)=>{
            const entry=zip.file(path);
            if(!entry)return;
            let xml=entry.asText();
            patterns.forEach(pattern=>{xml=xml.replace(pattern,'');});
            zip.file(path,xml);
          };

          cleanXml('word/_rels/document.xml.rels',[
            /<Relationship\b[^>]*(?:Type="[^"]*\/footnotes"|Target="footnotes\.xml")[^>]*\/>/gi,
            /<Relationship\b[^>]*(?:Type="[^"]*\/endnotes"|Target="endnotes\.xml")[^>]*\/>/gi
          ]);
          cleanXml('[Content_Types].xml',[
            /<Override\b[^>]*PartName="\/word\/footnotes\.xml"[^>]*\/>/gi,
            /<Override\b[^>]*PartName="\/word\/endnotes\.xml"[^>]*\/>/gi
          ]);
          cleanXml('word/settings.xml',[
            /<w:footnotePr\b[\s\S]*?<\/w:footnotePr>/gi,
            /<w:endnotePr\b[\s\S]*?<\/w:endnotePr>/gi,
            /<w:footnotePr\b[^>]*\/>/gi,
            /<w:endnotePr\b[^>]*\/>/gi
          ]);

          const repaired=zip.generate({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
          return originalSaveAs.call(this,repaired,name,options);
        }catch(error){
          console.error('Oprava DOCX se nezdařila, ukládám původní soubor.',error);
          return originalSaveAs.call(this,file,name,options);
        }
      };
    }
  }catch(error){
    document.body.innerHTML=`<main style="font-family:Arial,sans-serif;max-width:760px;margin:70px auto;padding:28px"><h1 style="color:#00843D">Aplikaci se nepodařilo načíst</h1><p>${String(error.message||error)}</p><p>Obnovte stránku pomocí Ctrl+F5.</p></main>`;
    console.error(error);
  }
})();
