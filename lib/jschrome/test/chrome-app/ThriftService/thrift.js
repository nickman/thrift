
  var script = document.createElement('script');
  script.type = 'text/javascript';
  // script.setAttribute('autorequire', "/app/main.js");
  script.setAttribute('moduledir', "/");
  script.src = "/module.js";
  document.head.appendChild(script);

  console.info("module.js loaded");

