(()=>{
  const started=Date.now();
  const timer=setInterval(()=>{
    const PizZip=window.PizZip;
    if(!PizZip?.prototype?.file){
      if(Date.now()-started>120000)clearInterval(timer);
      return;
    }
    if(PizZip.prototype.__koopTemplateV24){clearInterval(timer);return;}
    const originalFile=PizZip.prototype.file;
    PizZip.prototype.file=function(name,...args){
      const target=name==='word/media/image2.png'&&args.length
        ?'word/media/image1.png'
        :name;
      return originalFile.call(this,target,...args);
    };
    PizZip.prototype.__koopTemplateV24=true;
    clearInterval(timer);
  },20);
})();
