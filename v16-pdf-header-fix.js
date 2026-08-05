(()=>{
  const findImage=node=>{
    if(!node||typeof node!=='object')return '';
    if(typeof node.image==='string'&&node.image)return node.image;
    if(Array.isArray(node)){
      for(const item of node){const found=findImage(item);if(found)return found;}
      return '';
    }
    for(const value of Object.values(node)){
      const found=findImage(value);
      if(found)return found;
    }
    return '';
  };

  const patchDefinition=definition=>{
    if(!definition||definition.__koopHeaderV16)return definition;
    definition.__koopHeaderV16=true;

    const originalHeader=definition.header;
    definition.pageMargins=[38,86,38,34];

    definition.header=(currentPage,pageCount,pageSize)=>{
      let originalResult=null;
      try{
        originalResult=typeof originalHeader==='function'
          ? originalHeader(currentPage,pageCount,pageSize)
          : originalHeader;
      }catch(error){
        console.warn('Původní PDF hlavičku se nepodařilo přečíst:',error);
      }

      const logo=findImage(originalResult);
      const availableWidth=(pageSize?.width||595.28)-76;
      const headerCell={
        fillColor:'#00843d',
        border:[false,false,false,false],
        columns:[
          logo
            ? {image:logo,fit:[112,32],width:112,height:32,alignment:'left',margin:[9,6,0,6]}
            : {text:'Kooperativa',color:'#ffffff',bold:true,fontSize:17,margin:[9,11,0,10]},
          {
            text:'OSOBNÍ DOTAZNÍK\nZAMĚSTNANCE',
            alignment:'right',
            color:'#ffffff',
            bold:true,
            fontSize:9.5,
            lineHeight:1.05,
            margin:[0,11,9,0]
          }
        ]
      };

      return {
        margin:[38,12,38,0],
        stack:[
          {
            table:{widths:['*'],heights:[44],body:[[headerCell]]},
            layout:{
              hLineWidth:()=>0,
              vLineWidth:()=>0,
              paddingLeft:()=>0,
              paddingRight:()=>0,
              paddingTop:()=>0,
              paddingBottom:()=>0
            }
          },
          {canvas:[{type:'rect',x:0,y:0,w:availableWidth,h:3,color:'#ffcd00'}]}
        ]
      };
    };

    return definition;
  };

  const patchPdfMake=()=>{
    const pdfMake=window.pdfMake;
    if(!pdfMake?.createPdf||pdfMake.__koopHeaderV16)return false;

    const originalCreatePdf=pdfMake.createPdf.bind(pdfMake);
    pdfMake.createPdf=(definition,...args)=>originalCreatePdf(patchDefinition(definition),...args);
    pdfMake.__koopHeaderV16=true;
    return true;
  };

  const timer=setInterval(()=>{
    if(patchPdfMake())clearInterval(timer);
  },10);
  setTimeout(()=>clearInterval(timer),120000);
})();
