(() => {
  // Configure MathJax only if it doesn't exist
  if (!window.MathJax) {
    window.MathJax = {
      tex: {
        inlineMath: [['$', '$'], ['\\(', '\\)']],
        displayMath: [['$$', '$$'], ['\\[', '\\]']],
        processEscapes: true
      },
      options: {
        skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre']
      }
    };
  }
  const isDarkModeByBackground = () => {
    const bodyStyle = window.getComputedStyle(document.body);
    const bgColor = bodyStyle.backgroundColor;
    
    if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
      const rgb = bgColor.match(/\d+/g);
      if (rgb && rgb.length >= 3) {
        const r = parseInt(rgb[0]);
        const g = parseInt(rgb[1]);
        const b = parseInt(rgb[2]);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
        return luminance < 128;
      }
    }
    return false;
  };

  const renderMermaidCode = async (code, container) => {
    if (!code.trim()) {
      container.innerHTML = '<pre>Mermaid: empty code</pre>';
      return;
    }
    if (!window.mermaid) {
      container.innerHTML = '<pre>Mermaid not available</pre>';
      return;
    }
    
    try {
      console.log('[extra-renderer] Initializing mermaid with code:', code.substring(0, 50));
      
      const isDarkMode = isDarkModeByBackground();
      
      await window.mermaid.initialize({
        startOnLoad: false,
        theme: isDarkMode ? 'dark' : 'default',
        securityLevel: 'loose'
      });
      
      const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Use modern async API
      const { svg } = await window.mermaid.render(id, code);
      container.innerHTML = svg;
      console.log('[extra-renderer] Successfully rendered mermaid');
      
    } catch (err) {
      console.error('[extra-renderer] Render error:', err);
      container.innerHTML = `<pre>Mermaid error: ${err?.message || 'Unknown error'}</pre>`;
    }
  };

  const renderMathCode = async (code, container) => {
    if (!code.trim()) {
      container.innerHTML = '<pre>Math: empty code</pre>';
      return;
    }

    try {
      // Use MathJax tex2chtml method
      const node = window.MathJax.tex2chtml(code, { display: true });
      container.appendChild(node);
      
      // Ensure MathJax CSS is applied
      window.MathJax.chtmlStylesheet();
      
    } catch (err) {
      console.error('[extra-renderer] Math render error:', err);
      container.innerHTML = `<pre>Math error: ${err?.message || 'Unknown error'}</pre>`;
    }
  };

  const renderPlantUMLCode = async (code, container) => {
    if (!code.trim()) {
      container.innerHTML = '<pre>PlantUML: empty code</pre>';
      return;
    }

    try {
      console.log('[extra-renderer] Rendering PlantUML with code:', code.substring(0, 50));
      
      const proxyUrl = 'https://kroki.io/plantuml/svg';
      
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: code
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      console.log('[extra-renderer] Response content type:', contentType);
      
      const isDarkMode = isDarkModeByBackground();

      if (contentType && contentType.includes('image/svg+xml')) {
        const svgText = await response.text();
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
        const svgElement = svgDoc.documentElement;
        
        if (isDarkMode) {
          svgElement.style.filter = 'invert(1) hue-rotate(180deg)';
        }
        
        svgElement.style.cssText += 'max-width: 100%; height: auto;';
        container.appendChild(svgElement);
      } else {
        const blob = await response.blob();
        const img = document.createElement('img');
        img.src = URL.createObjectURL(blob);
        img.alt = 'PlantUML Diagram';
        img.style.cssText = 'max-width: 100%; height: auto;';
        
        if (isDarkMode) {
          img.style.filter = 'invert(1) hue-rotate(180deg)';
        }
        
        container.appendChild(img);
      }
      
      console.log('[extra-renderer] PlantUML rendered successfully');
      
    } catch (err) {
      console.error('[extra-renderer] PlantUML render error:', err);
      container.innerHTML = `<pre>PlantUML error: ${err?.message || 'Unknown error'}</pre>`;
    }
  };
  
  const processCodeBlocks = () => {
    console.log('[extra-renderer] processCodeBlocks called');
    
    // Find all mermaid code blocks
    const mermaidBlocks = document.querySelectorAll('code.language-mermaid');
    console.log('[extra-renderer] Found mermaid blocks:', mermaidBlocks.length);
    
    mermaidBlocks.forEach((codeEl) => {
      if (codeEl.dataset.mermaidProcessed) {
        console.log('[extra-renderer] Already processed, skipping');
        return;
      }
      codeEl.dataset.mermaidProcessed = '1';
      
      console.log('[extra-renderer] Processing mermaid block');
      const code = codeEl.textContent || codeEl.innerText;
      const preEl = codeEl.parentElement;
      
      // Replace the pre/code block with mermaid container
      const container = document.createElement('div');
      container.className = 'mermaid-container';
      container.style.cssText = 'margin: 1em 0; text-align: center;';
      
      preEl.parentNode.insertBefore(container, preEl);
      preEl.remove();
      
      renderMermaidCode(code, container).catch(err => {
        console.error('[extra-renderer] Async render error:', err);
        container.innerHTML = `<pre>Mermaid async error: ${err?.message || 'Unknown error'}</pre>`;
      });
    });

    // Find all PlantUML code blocks
    const plantumlBlocks = document.querySelectorAll('code.language-plantuml');
    console.log('[extra-renderer] Found plantuml blocks:', plantumlBlocks.length);
    
    plantumlBlocks.forEach((codeEl) => {
      if (codeEl.dataset.plantumlProcessed) return;
      codeEl.dataset.plantumlProcessed = '1';
      
      console.log('[extra-renderer] Processing plantuml block');
      const code = codeEl.textContent || codeEl.innerText;
      const preEl = codeEl.parentElement;
      
      // Replace the pre/code block with plantuml container
      const container = document.createElement('div');
      container.className = 'plantuml-container';
      container.style.cssText = 'margin: 1em 0; text-align: center;';
      
      preEl.parentNode.insertBefore(container, preEl);
      preEl.remove();
      
      renderPlantUMLCode(code, container).catch(err => {
        console.error('[extra-renderer] PlantUML async render error:', err);
        container.innerHTML = `<pre>PlantUML async error: ${err?.message || 'Unknown error'}</pre>`;
      });
    });

    // Find all paragraphs and check for special content
    const allParagraphs = document.querySelectorAll('p');
    console.log('[extra-renderer] Found paragraphs:', allParagraphs.length);
    
    allParagraphs.forEach((pEl) => {
      if (pEl.dataset.processed) return;
      
      const text = pEl.textContent || pEl.innerText;
      
      // Check for PlantUML blocks
      if (text.includes('@startuml') && text.includes('@enduml')) {
        console.log('[extra-renderer] Found PlantUML in paragraph:', text.substring(0, 50));
        pEl.dataset.processed = '1';
        
        // Replace the paragraph with PlantUML container
        const container = document.createElement('div');
        container.className = 'plantuml-container';
        container.style.cssText = 'margin: 1em 0; text-align: center;';
        
        pEl.parentNode.insertBefore(container, pEl);
        pEl.remove();
        
        renderPlantUMLCode(text, container).catch(err => {
          console.error('[extra-renderer] PlantUML async render error:', err);
          container.innerHTML = `<pre>PlantUML async error: ${err?.message || 'Unknown error'}</pre>`;
        });
      }
      // Check for LaTeX math
      else if (text.includes('\\left') || text.includes('\\sum') || text.includes('\\frac') || text.includes('\\int')) {
        console.log('[extra-renderer] Found LaTeX in paragraph:', text.substring(0, 50));
        pEl.dataset.processed = '1';
        
        // Replace the paragraph with math container
        const container = document.createElement('div');
        container.className = 'math-container';
        container.style.cssText = 'margin: 1em 0; text-align: center;';
        
        pEl.parentNode.insertBefore(container, pEl);
        pEl.remove();
        
        renderMathCode(text, container).catch(err => {
          console.error('[extra-renderer] Math async render error:', err);
          container.innerHTML = `<pre>Math async error: ${err?.message || 'Unknown error'}</pre>`;
        });
      }
    });
  };
  
  const initializeMathJax = () => {
    if (!window.MathJax) {
      console.log('[extra-renderer] MathJax not available');
      return;
    }
    
    // Configure MathJax
    window.MathJax.config = {
      tex: {
        inlineMath: [['$', '$'], ['\\(', '\\)']],
        displayMath: [['$$', '$$'], ['\\[', '\\]']],
        processEscapes: true
      },
      options: {
        skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre']
      }
    };
    
    console.log('[extra-renderer] MathJax configured');
  };

  const loadLibrariesFromCDN = () => {
    let mermaidLoaded = false;
    let mathjaxLoaded = false;
    
    const checkAndProcess = () => {
      if (mermaidLoaded && mathjaxLoaded) {
        console.log('[extra-renderer] Both libraries loaded');
        processCodeBlocks();
      }
    };
    
    // Load Mermaid
    if (window.mermaid) {
      console.log('[extra-renderer] Mermaid already available');
      mermaidLoaded = true;
    } else {
      console.log('[extra-renderer] Loading Mermaid from CDN');
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js';
      script.onload = () => {
        console.log('[extra-renderer] Mermaid loaded');
        mermaidLoaded = true;
        checkAndProcess();
      };
      script.onerror = () => {
        console.error('[extra-renderer] Mermaid failed to load');
        mermaidLoaded = true;
        checkAndProcess();
      };
      document.head.appendChild(script);
    }
    
    // Check if MathJax is properly loaded (has methods, not just config)
    if (window.MathJax && typeof window.MathJax.tex2chtml === 'function') {
      console.log('[extra-renderer] MathJax already available');
      mathjaxLoaded = true;
    } else {
      console.log('[extra-renderer] Loading MathJax from CDN');
      // Clear any existing MathJax config to avoid conflicts
      if (window.MathJax && Object.keys(window.MathJax).length <= 2) {
        delete window.MathJax;
      }
      
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
      script.onload = () => {
        // Wait for MathJax to fully initialize
        const waitForMathJax = () => {
          if (window.MathJax && typeof window.MathJax.tex2chtml === 'function') {
            console.log('[extra-renderer] MathJax loaded and ready');
            mathjaxLoaded = true;
            checkAndProcess();
          } else {
            setTimeout(waitForMathJax, 50);
          }
        };
        waitForMathJax();
      };
      script.onerror = () => {
        console.error('[extra-renderer] MathJax failed to load');
        mathjaxLoaded = true;
        checkAndProcess();
      };
      document.head.appendChild(script);
    }
    
    if (mermaidLoaded && mathjaxLoaded) {
      checkAndProcess();
    }
  };
  
  const init = () => {
    console.log('[extra-renderer] Initializing libraries');
    loadLibrariesFromCDN();
  };
  
  const processPage = () => {
    console.log('[extra-renderer] Processing page content');
    processCodeBlocks();
  };
  
  if (window.jQuery) {
    // Initial load - load libraries and process
    $(document).ready(init);
    // Page transitions - only process content
    $(window).on('action:ajaxify.end', processPage);
  } else {
    if (document.readyState !== 'loading') {
      init();
    } else {
      document.addEventListener('DOMContentLoaded', init);
    }
  }
})();
