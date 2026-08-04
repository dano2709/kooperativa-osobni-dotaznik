(async()=>{
  try{
    document.querySelector('.hero')?.remove();
    document.querySelector('input[name="signatureMode"][value="upload"]')?.closest('.signature-option')?.remove();

    const undo=document.getElementById('undoSignature');
    if(undo){undo.hidden=true;undo.setAttribute('aria-hidden','true');undo.tabIndex=-1;}
    const uploadWrap=document.getElementById('uploadSignatureWrap');
    if(uploadWrap){uploadWrap.hidden=true;uploadWrap.setAttribute('aria-hidden','true');}

    const overrides=document.createElement('style');
    overrides.textContent=`
      .stepbar{margin-top:0!important}
      .signature-options{grid-template-columns:repeat(2,minmax(0,1fr))!important}
      @media(max-width:900px){.signature-options{grid-template-columns:1fr!important}}
    `;
    document.head.appendChild(overrides);

    const names=['v4-1.part','v4-2.part','v4-3.part','v4-4.part','v4-5.part','v4-6.part','v4-7.part'];
    const parts=await Promise.all(names.map(async n=>{
      const r=await fetch(n,{cache:'no-store'});
      if(!r.ok)throw new Error(`${n}: ${r.status}`);
      return r.text();
    }));
    let code=parts.join('');

    const replaceOrThrow=(pattern,replacement,label)=>{
      const next=code.replace(pattern,replacement);
      if(next===code)throw new Error(`Aktualizace aplikace selhala: ${label}`);
      code=next;
    };

    replaceOrThrow(
      /  const pdfBrand = \(\) => `[\s\S]*?`;\n  const buildPdfElement/,
      "  const KOOP_LOGO = 'kooperativa-logo.svg';\n  const pdfBrand = () => `<header class=\"pdf-header\"><div class=\"pdf-brand\"><img class=\"pdf-logo\" src=\"${KOOP_LOGO}\" alt=\"Kooperativa Vienna Insurance Group\"></div><div class=\"pdf-doc\">OSOBNÍ DOTAZNÍK</div></header>`;\n  const buildPdfElement",
      'logo PDF'
    );

    replaceOrThrow(
      '.pdf-document{position:absolute;left:-20000px;top:0;width:210mm;background:#fff;color:#17231b;font-family:Arial,Helvetica,sans-serif}',
      '.pdf-document{position:static;left:auto;top:auto;width:210mm;background:#fff;color:#17231b;font-family:Arial,Helvetica,sans-serif}',
      'podklad PDF'
    );

    replaceOrThrow(
      /        \.pdf-header\{height:34mm[\s\S]*?        \.pdf-doc\{font-size:9pt;font-weight:700;letter-spacing:\.5pt\}/,
      `        .pdf-header{height:34mm;margin:0 -12mm 7mm;padding:5mm 12mm 4mm 16mm;background:#fff;color:#00573F;display:flex;align-items:center;justify-content:space-between;position:relative;border-bottom:.65mm solid #00843D}
        .pdf-header:before{content:"";position:absolute;left:0;top:0;bottom:0;width:5mm;background:#00843D}
        .pdf-header:after{content:"";position:absolute;right:12mm;bottom:3.2mm;width:22mm;height:1.2mm;background:#FFCD00}
        .pdf-brand{display:flex;align-items:center}.pdf-logo{display:block;width:34mm;height:auto;max-height:24mm;object-fit:contain}
        .pdf-doc{font-size:10pt;font-weight:700;letter-spacing:.55pt;color:#00573F;padding-bottom:4.5mm}`,
      'vizuální styl PDF'
    );

    replaceOrThrow(
      /  document\.getElementById\('clearSignature'\)\.addEventListener\('click', \(\) => \{[\s\S]*?\n  \}\);/,
      `  document.getElementById('clearSignature').addEventListener('click', () => {
    drawSignatureData='';
    hasDrawn=false;
    strokeHistory=[];
    canvasReady=false;
    setupCanvas();
    const rect=canvas.getBoundingClientRect(),ctx=canvas.getContext('2d');
    if(ctx&&rect.width>0){
      ctx.fillStyle='#fff';
      ctx.fillRect(0,0,rect.width,180);
    }
    updateSignatureReady();
    updateLastPagePreview();
  });`,
      'mazání podpisu'
    );

    replaceOrThrow(
      /  const createPdfBlob = async data => \{[\s\S]*?\n  \};\n\n  genBtn/,
      `  const createPdfBlob = async data => {
    const renderPage=window.html2canvas;
    const JsPDF=window.jspdf&&window.jspdf.jsPDF;
    if(typeof renderPage!=='function'||typeof JsPDF!=='function'){
      throw new Error('Knihovna pro vytvoření PDF se nenačetla. Obnovte stránku pomocí Ctrl+F5.');
    }

    const element=buildPdfElement(data);
    const host=document.createElement('div');
    host.setAttribute('aria-hidden','true');
    host.style.cssText='position:fixed;left:0;top:0;width:210mm;height:297mm;z-index:-2147483647;pointer-events:none;background:#fff;overflow:visible;';
    element.style.position='static';
    element.style.left='auto';
    element.style.top='auto';
    element.style.zIndex='auto';
    host.appendChild(element);
    document.body.appendChild(host);

    try{
      if(document.fonts&&document.fonts.ready)await document.fonts.ready;
      await Promise.all([...element.querySelectorAll('img')].map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.onload=resolve;img.onerror=resolve;})));
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));

      const pages=[...element.querySelectorAll('.pdf-page')];
      if(pages.length!==3)throw new Error('PDF nemá očekávané tři stránky.');
      pages.forEach(page=>{page.style.display='none';page.style.pageBreakAfter='auto';});

      const pdf=new JsPDF({unit:'mm',format:'a4',orientation:'portrait',compress:true});
      for(let index=0;index<pages.length;index++){
        const page=pages[index];
        page.style.display='block';
        await new Promise(resolve=>requestAnimationFrame(resolve));

        const canvasImage=await renderPage(page,{
          scale:2,
          useCORS:true,
          allowTaint:false,
          backgroundColor:'#ffffff',
          logging:false,
          scrollX:0,
          scrollY:0,
          windowWidth:Math.ceil(page.scrollWidth),
          windowHeight:Math.ceil(page.scrollHeight)
        });

        if(!canvasImage||canvasImage.width<500||canvasImage.height<700){
          throw new Error(`Stranu ${index+1} se nepodařilo vykreslit.`);
        }

        const sampleCanvas=document.createElement('canvas');
        sampleCanvas.width=Math.min(220,canvasImage.width);
        sampleCanvas.height=Math.min(220,canvasImage.height);
        const sampleCtx=sampleCanvas.getContext('2d',{willReadFrequently:true});
        sampleCtx.drawImage(canvasImage,0,0,sampleCanvas.width,sampleCanvas.height);
        const pixels=sampleCtx.getImageData(0,0,sampleCanvas.width,sampleCanvas.height).data;
        let nonWhite=0;
        for(let p=0;p<pixels.length;p+=16){
          if(pixels[p]<245||pixels[p+1]<245||pixels[p+2]<245)nonWhite++;
        }
        if(nonWhite<20)throw new Error(`Strana ${index+1} byla vykreslena prázdná.`);

        if(index>0)pdf.addPage('a4','portrait');
        const image=canvasImage.toDataURL('image/jpeg',0.97);
        pdf.addImage(image,'JPEG',0,0,210,297,undefined,'FAST');
        page.style.display='none';
      }

      const blob=pdf.output('blob');
      if(!blob||blob.size<15000)throw new Error('Vytvořený PDF soubor je prázdný nebo neúplný.');
      return blob;
    }finally{
      host.remove();
    }
  };

  genBtn`,
      'generování PDF po jednotlivých stránkách'
    );

    (0,eval)(code);
  }catch(err){
    document.body.innerHTML=`<main style="font-family:Arial,sans-serif;max-width:760px;margin:70px auto;padding:28px"><h1 style="color:#00843D">Aplikaci se nepodařilo načíst</h1><p>${String(err.message||err)}</p><p>Obnovte stránku pomocí Ctrl+F5.</p></main>`;
    console.error(err);
  }
})();
