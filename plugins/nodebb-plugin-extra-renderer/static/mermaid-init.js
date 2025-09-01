(function(){
  function decode(b64){try{return atob(b64);}catch(e){return "";}}
  function renderOne(el){
    var code=decode(el.getAttribute('data-mermaid-code')||'');
    var theme=el.getAttribute('data-theme')||'default';
    var sec=el.getAttribute('data-sec')||'strict';
    var timeout=parseInt(el.getAttribute('data-timeout')||'8000',10);
    if(!code){el.innerHTML='<pre>Mermaid: empty code</pre>';return;}
    if(!window.mermaid||!window.mermaid.initialize){el.innerHTML='<pre>Mermaid not available</pre>';return;}
    try{
      window.mermaid.initialize({startOnLoad:false,theme:theme,securityLevel:sec});
      var rendered=false;
      var timer=setTimeout(function(){if(!rendered){el.innerHTML='<pre>Mermaid render timeout</pre>';}} , timeout);
      window.mermaid.render(el.getAttribute('data-mermaid-id')||('m-'+Date.now()), code, function(svg){
        if(rendered) return; rendered=true; clearTimeout(timer); el.innerHTML=svg;});
    }catch(err){ el.innerHTML='<pre>'+String(err&&err.message||'Mermaid render error')+'</pre>'; }
  }
  function run(){
    document.querySelectorAll('.mermaid-render').forEach(function(el){ if(!el.dataset.hydrated){ el.dataset.hydrated='1'; renderOne(el);} });
  }
  if (window.jQuery){
    $(window).on('action:ajaxify.end', run);
  } else {
    document.addEventListener('DOMContentLoaded', run);
  }
})();
