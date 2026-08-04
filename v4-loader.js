(async()=>{
  try{
    // Web-only presentation adjustments requested by the user.
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

    // Use the supplied official full-colour logo on white, in line with the brand manual.
    replaceOrThrow(
      /  const pdfBrand = \(\) => `[\s\S]*?`;\n  const buildPdfElement/,
      "  const KOOP_LOGO = 'kooperativa-logo.svg';\n  const pdfBrand = () => `<header class=\"pdf-header\"><div class=\"pdf-brand\"><img class=\"pdf-logo\" src=\"${KOOP_LOGO}\" alt=\"Kooperativa Vienna Insurance Group\"></div><div class=\"pdf-doc\">OSOBNÍ DOTAZNÍK</div></header>`;\n  const buildPdfElement",
      'logo PDF'
    );

    // The original source was rendered far outside the viewport, which produced blank PDFs on GitHub Pages.
    replaceOrThrow(
      '.pdf-document{position:absolute;left:-20000px;top:0;width:210mm;background:#fff;color:#17231b;font-family:Arial,Helvetica,sans-serif}',
      '.pdf-document{position:absolute;left:0;top:0;z-index:2147483647;width:210mm;background:#fff;color:#17231b;font-family:Arial,Helvetica,sans-serif;pointer-events:none}',
      'viditelný podklad PDF'
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
      /    const element=buildPdfElement\(data\);document\.body\.appendChild\(element\);\n    try\{[\s\S]*?    \}finally\{element\.remove\(\);\}/,
      `    const element=buildPdfElement(data);document.body.appendChild(element);
    try{
      await Promise.all([...element.querySelectorAll('img')].map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.onload=resolve;img.onerror=resolve;})));
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const worker=html2pdf().set({
        margin:0,
        filename:'Osobni_dotaznik_Kooperativa.pdf',
        image:{type:'jpeg',quality:.99},
        html2canvas:{scale:2,useCORS:true,allowTaint:false,backgroundColor:'#ffffff',logging:false,scrollX:0,scrollY:0,windowWidth:Math.ceil(element.scrollWidth)},
        jsPDF:{unit:'mm',format:'a4',orientation:'portrait',compress:true},
        pagebreak:{mode:['css','legacy']}
      }).from(element).toPdf();
      const blob=await worker.outputPdf('blob');
      if(!blob||blob.size<1000)throw new Error('Vytvořený PDF soubor je prázdný. Obnovte stránku pomocí Ctrl+F5 a zkuste to znovu.');
      return blob;
    }finally{element.remove();}`,
      'generování PDF'
    );

    (0,eval)(code);
  }catch(err){
    document.body.innerHTML=`<main style="font-family:Arial,sans-serif;max-width:760px;margin:70px auto;padding:28px"><h1 style="color:#00843D">Aplikaci se nepodařilo načíst</h1><p>${String(err.message||err)}</p><p>Obnovte stránku pomocí Ctrl+F5.</p></main>`;
    console.error(err);
  }
})();
