(() => {
  const main = document.querySelector("main");
  if (!main) return;
  const supabaseConfig=window.SWIFTCAR_CONFIG||{};
  const supabaseHeaders=(json=false)=>{const session=JSON.parse(sessionStorage.getItem("swiftcar-session")||"null"),headers={apikey:supabaseConfig.apiKey};if(session?.access_token)headers.Authorization=`Bearer ${session.access_token}`;if(json)headers["Content-Type"]="application/json";return headers};
  const supabaseFetch=(path,options={})=>fetch(`${supabaseConfig.apiBase}${path}`,{...options,headers:{...supabaseHeaders(options.body!=null&&!(options.body instanceof Blob)),...(options.headers||{})}});
  // Se o bucket lead-images for privado (supabase/storage-hardening.sql), gera URLs assinadas em uma única chamada.
  const signedLeadImages=async paths=>{
    const keys=paths.map(path=>String(path||"").trim().replace(/^\/+/,"").replace(/^lead-images\//i,"")),signable=keys.filter(key=>key&&!/^https?:\/\//i.test(key));
    if(!signable.length)return [];
    try{
      const response=await supabaseFetch("/storage/v1/object/sign/lead-images",{method:"POST",body:JSON.stringify({expiresIn:3600,paths:signable})});
      if(!response.ok)return [];
      const signed=await response.json(),base=supabaseConfig.apiBase.replace(/\/$/,"");
      return keys.map(key=>{const url=signed.find(item=>item.path===key&&item.signedURL)?.signedURL;return url?`${base}/storage/v1${url}`:null});
    }catch{return []}
  };
  // Dados já carregados por site.js (window.swiftcar); evita repetir consultas ao Supabase.
  const shared=()=>window.swiftcar?.state||{};
  const removeVehicleObjects=paths=>supabaseFetch("/storage/v1/object/vehicle-images",{method:"DELETE",body:JSON.stringify({prefixes:paths.flatMap(path=>window.swiftcar?.storagePaths?.(path)||[path])})});
  const leadStorageImage=path=>{const value=String(path||"").trim();if(/^https?:\/\//i.test(value))return value;const clean=value.replace(/^\/+/,"").replace(/^lead-images\//i,"");return `${supabaseConfig.apiBase.replace(/\/$/,"")}/storage/v1/object/public/lead-images/${clean.split("/").map(encodeURIComponent).join("/")}`};
  function enhance() {
    let path = decodeURIComponent(location.pathname).replace(/\/$/, "") || "/";
    if (path === "/admin/painel") {
      history.replaceState({}, "", "/admin");
      path = "/admin";
      dispatchEvent(new PopStateEvent("popstate"));
      return;
    }
    document.body.classList.toggle("admin-auth-page", path === "/admin/login" || path === "/admin/esqueci-senha" || path === "/admin/redefinir-senha");
    document.body.classList.toggle("admin-panel-page", path.startsWith("/admin") && !["/admin/login","/admin/esqueci-senha","/admin/redefinir-senha"].includes(path));
    if (path === "/admin/login") {
      const form = document.querySelector("#auth-form");
      if (form && !form.classList.contains("auth-enhanced")) {
        form.classList.add("auth-enhanced");
        const eyebrow = form.querySelector(".eyebrow");
        const heading = form.querySelector("h1");
        if (eyebrow) eyebrow.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg><span>Swift<span>car</span></span>';
        if (heading) {
          heading.textContent = "Área administrativa";
          heading.insertAdjacentHTML("afterend", '<p class="auth-subtitle">Acesso exclusivo da equipe Swiftcar.</p>');
        }
        const loginInput = form.querySelector('input[name="email"]');
        const loginField = loginInput?.closest(".field");
        if (loginInput) {
          loginInput.type = "email";
          loginInput.autocomplete = "email";
          loginInput.placeholder = "Digite seu e-mail";
          loginField.querySelector("span").textContent = "E-mail *";
        }
        form.insertAdjacentHTML("beforeend", '<p class="email-verification-note">Acesso protegido por usuário, senha e perfil de administrador.</p>');
      }
      const status = form?.querySelector(".form-status");
    }
    if (path === "/admin/estoque") {
      translateAdminStatuses();
      enhanceAdminVehicleThumbnails();
      enhanceAdminActionButtons();
      enhanceAdminInventoryView();
      enhanceAdminStockSearch();
    } else if (path === "/admin") {
      enhanceDashboard();
    } else if (path.startsWith("/admin/estoque/") && path.endsWith("/editar") || path === "/admin/estoque/novo") {
      translateVehicleStatusSelect();
      simplifyVehicleForm();
      ensureVehiclePhotoDeleteButtons();
    } else if (path === "/admin/leads") {
      translateLeadStatuses();
      enhanceLeadsPanel();
    } else if (path === "/vender") {
      enhanceSellSteps();
    } else if (path === "/contato") {
      if (!main.querySelector(".contact-page-redesign")) renderContactPage();
    } else if (path === "/") {
      const steps = document.querySelectorAll(".steps .step:not(.step-enhanced)");
      const content = [
        ["Avaliação", "Envie os dados do carro pelo WhatsApp ou faça sua avaliação pelo site.", '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 1M9 2h6M12 2v3"/></svg>'],
        ["Oferta", "Receba uma proposta justa em poucos minutos, mesmo com avarias.", '<svg viewBox="0 0 24 24"><path d="M4 14h4l3 3 7-7a2 2 0 0 0-3-3l-4 4-2-2H4v5Z"/><path d="M3 18h8l2 2h5M8 6l2-2 2 2"/></svg>'],
        ["Pagamento", "Aprovou? O pagamento é feito à vista, com segurança.", '<svg viewBox="0 0 24 24"><path d="M12 2 20 6v6c0 5-3.4 8.3-8 10-4.6-1.7-8-5-8-10V6l8-4Z"/><path d="m9 12 2 2 4-4"/></svg>'],
        ["Pronto", "Cuidamos da documentação e orientamos a transferência.", '<svg viewBox="0 0 24 24"><path d="m14 6 4-4 4 4-4 4M13 7 4 16l-2 6 6-2 9-9"/><path d="m4 16 4 4"/></svg>']
      ];
      steps.forEach((step, index) => {
        const [title, text, icon] = content[index];
        step.classList.add("step-enhanced");
        step.querySelector("b").textContent = `${index + 1}.`;
        step.querySelector("h3").textContent = title;
        step.querySelector("p").textContent = text;
        step.insertAdjacentHTML("afterbegin", `<span class="step-icon" aria-hidden="true">${icon}</span>`);
      });
      const visitEyebrow = [...document.querySelectorAll(".eyebrow")].find((element) => element.textContent.includes("Visite a Swiftcar"));
      const visitColumn = visitEyebrow?.parentElement;
      if (visitColumn && !visitColumn.classList.contains("visit-enhanced")) {
        visitColumn.classList.add("visit-enhanced");
        visitColumn.innerHTML = '<h2>Venha nos visitar</h2><a class="visit-address" href="https://www.google.com/maps/search/?api=1&amp;query=Estr.%20V%C3%A2nius%20Ab%C3%ADlio%20dos%20Santos%2C%20435%2C%20Gravata%C3%AD%20RS" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg><span>Estr. Vânius Abílio dos Santos, 435 - Santa Cruz, Gravataí - RS, 94175-032</span></a><div class="visit-hours"><div><span>Segunda a sexta-feira</span><strong>09:00 às 18:00 · Sem fechar ao meio-dia</strong></div><div><span>Sábado</span><strong>09:00 às 13:00</strong></div><div><span>Domingo</span><strong>Fechado</strong></div></div><a class="button primary visit-whatsapp" href="https://wa.me/5551981127614?text=Ol%C3%A1%21%20Quero%20falar%20com%20a%20Swiftcar." target="_blank" rel="noopener">Chamar no WhatsApp · (51) 98112-7614</a>';
      }
    } else if (path === "/estoque") {
      const heading = document.querySelector(".page-hero h1");
      const description = document.querySelector(".page-hero p.muted");
      const cards = document.querySelectorAll("#stock-grid .vehicle-card");
      const loading = document.querySelector("#stock-grid .skeleton");
      if (heading && heading.textContent !== "Estoque de veículos") heading.textContent = "Estoque de veículos";
      if (description && !loading) {
        const total = cards.length;
        const text = `${total} ${total === 1 ? "veículo disponível" : "veículos disponíveis"} em Gravataí-RS. Use os filtros, escolha seu carro e fale com um consultor pelo WhatsApp.`;
        if (description.textContent !== text) description.textContent = text;
      }
      const count = document.querySelector("#result-count");
      if (count && !count.nextElementSibling?.classList.contains("stock-guidance")) {
        count.insertAdjacentHTML("afterend", '<p class="stock-guidance">Selecione um veículo abaixo para ver fotos, preço, características e as opções de atendimento.</p>');
      }
    } else if (path.startsWith("/estoque/")) {
      const aside = document.querySelector(".detail-aside");
      if (aside && !aside.querySelector(".purchase-steps")) {
        const guide = document.createElement("div");
        guide.className = "purchase-steps";
        guide.innerHTML = '<strong>Gostou deste veículo?</strong><ol><li>Confira as fotos e características.</li><li>Clique em “Falar sobre este veículo”.</li><li>Converse com o consultor e agende sua visita.</li></ol>';
        aside.insertBefore(guide, aside.querySelector(".spec-grid"));
      }
      enhanceVehicleDetail(path);
    }
  }
  async function enhanceVehicleDetail(path) {
    const aside=main.querySelector(".detail-aside");
    if(!aside||aside.classList.contains("detail-enhanced"))return;
    aside.classList.add("detail-enhanced");
    try{
      const slug=decodeURIComponent(path.split("/").pop()),loaded=shared().detail;
      let vehicle=loaded?.slug===slug?loaded:null;
      if(!vehicle){const response=await supabaseFetch(`/rest/v1/vehicles?select=*&slug=eq.${encodeURIComponent(slug)}&limit=1`);if(!response.ok)return;vehicle=(await response.json())[0]}
      if(!vehicle)return;const price=Number(vehicle.price)||0,fipe=Number(vehicle.fipe_price)||0,difference=Math.max(0,fipe-price),percentage=fipe>price?Math.round(difference/fipe*100):0;
      const priceElement=aside.querySelector(".price"),fipeElement=aside.querySelector(".fipe");
      if(priceElement){
        const panel=document.createElement("section");panel.className="detail-price-panel";
        panel.innerHTML=`<div class="detail-price-heading"><span>Preço Swiftcar</span>${percentage?`<strong>${percentage}% abaixo da FIPE</strong>`:""}</div>`;
        priceElement.before(panel);panel.append(priceElement);if(fipeElement)panel.append(fipeElement);
        if(difference)panel.insertAdjacentHTML("beforeend",`<p class="detail-saving">Economia de <strong>${new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(difference)}</strong> em relação à FIPE</p>`);
      }
      const specifications=[
        ["Ano de fabricação",vehicle.manufacture_year||vehicle.year],
        ["Ano do modelo",vehicle.model_year||vehicle.year],
        ["Quilometragem",vehicle.mileage!=null?`${Number(vehicle.mileage).toLocaleString("pt-BR")} km`:null],
        ["Combustível",vehicle.fuel],
        ["Câmbio",vehicle.transmission],
        ["Cor",vehicle.color],
        ["Carroceria",vehicle.body_type],
        ["Motor",vehicle.engine],
        ["Portas",vehicle.doors]
      ].filter(([,value])=>value!==null&&value!==undefined&&value!=="");
      const grid=aside.querySelector(".spec-grid");
      if(grid){grid.innerHTML=specifications.map(([label,value])=>`<div class="spec"><small>${label}</small><strong>${String(value).replace(/[&<>\"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char])}</strong></div>`).join("");grid.insertAdjacentHTML("beforebegin",'<div class="detail-spec-heading"><span class="eyebrow">Ficha técnica</span><h2>Informações do veículo</h2></div>')}
    }catch{}
  }
  new MutationObserver(enhance).observe(main, { childList: true, subtree: true });
  addEventListener("popstate", enhance);
  enhance();

  function renderFirstAccess() {
    main.innerHTML = '<section class="section"><div class="container first-access-container"><form id="first-access-form" class="panel form auth-enhanced"><p class="eyebrow"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg><span>Swift<span>car</span></span></p><h1>Primeiro acesso</h1><p class="auth-subtitle">Crie a primeira conta administrativa da Swiftcar.</p><label class="field"><span>Nome completo *</span><input class="input" name="full_name" required autocomplete="name"></label><label class="field"><span>Nome de usuário *</span><input class="input" name="username" required minlength="3" maxlength="32" pattern="[A-Za-z0-9._-]+" autocomplete="username" placeholder="seu.usuario"></label><label class="field"><span>Senha *</span><input class="input" name="password" type="password" minlength="8" required autocomplete="new-password"></label><label class="field"><span>Confirmar senha *</span><input class="input" name="password_confirmation" type="password" minlength="8" required autocomplete="new-password"></label><button class="button primary" type="submit">Criar conta de administrador</button><div class="form-status muted" aria-live="polite"></div><button class="back-to-login" type="button">Voltar ao login</button></form></div></section>';
    const form = document.querySelector("#first-access-form");
    form.querySelector(".back-to-login").onclick = () => location.reload();
    form.onsubmit = async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      const status = form.querySelector(".form-status");
      const username = normalizeUsername(data.username);
      if (!username || username.length < 3) {
        status.textContent = "Use pelo menos 3 caracteres: letras, números, ponto, hífen ou sublinhado.";
        return;
      }
      if (data.password !== data.password_confirmation) {
        status.textContent = "As senhas não são iguais.";
        return;
      }
      status.textContent = "Criando conta...";
      try {
        const response = await supabaseFetch("/auth/v1/signup", {
          method: "POST",
          body: JSON.stringify({ email: `${username}@swiftcar.local`, password: data.password, data: { full_name: data.full_name, username } })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.msg || result.message || "Não foi possível criar a conta.");
        if (result.user?.identities?.length === 0) throw new Error("Este nome de usuário já está cadastrado.");
        if (!result.access_token) throw new Error("Não foi possível iniciar a sessão administrativa.");
        form.innerHTML = '<div class="first-access-success"><h2>Conta criada</h2><p>O administrador já pode entrar usando o nome de usuário e a senha cadastrados.</p><button class="button primary back-to-login" type="button">Ir para o login</button></div>';
        form.querySelector(".back-to-login").onclick = () => location.reload();
      } catch (error) {
        status.textContent = error.message;
      }
    };
  }
  function normalizeUsername(value) {
    return String(value || "").trim().toLowerCase().replace(/@admin\.swiftcar\.local$/i, "").replace(/[^a-z0-9._-]/g, "");
  }
  function renderContactPage() {
    main.innerHTML = '<section class="section contact-page-redesign"><div class="container contact-layout"><div class="contact-info-column"><a class="contact-info-card" href="https://wa.me/5551981127614" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-12.7 7.4L3 20.5l1.7-5.1A8.5 8.5 0 1 1 21 11.5Z"/></svg><span><strong>WhatsApp</strong><small>(51) 98112-7614</small></span></a><a class="contact-info-card" href="tel:+5551981127614"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8.1 9.8a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2.1Z"/></svg><span><strong>Telefone</strong><small>(51) 98112-7614</small></span></a><a class="contact-info-card" href="https://www.google.com/maps/search/?api=1&amp;query=Estr.%20V%C3%A2nius%20Ab%C3%ADlio%20dos%20Santos%2C%20435%2C%20Gravata%C3%AD%20RS" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg><span><strong>Endereço</strong><small>Estr. Vânius Abílio dos Santos, 435 - Santa Cruz, Gravataí - RS, 94175-032</small></span></a><div class="contact-map-wrap"><a href="https://www.google.com/maps/search/?api=1&amp;query=Estr.%20V%C3%A2nius%20Ab%C3%ADlio%20dos%20Santos%2C%20435%2C%20Gravata%C3%AD%20RS" target="_blank" rel="noopener">Abrir no Maps ↗</a><iframe title="Mapa da Swiftcar" loading="lazy" src="https://www.google.com/maps?q=Estr.+V%C3%A2nius+Ab%C3%ADlio+dos+Santos,+435,+Gravata%C3%AD&output=embed"></iframe></div></div><form id="whatsapp-contact-form" class="panel contact-message-form"><h1>Envie uma mensagem</h1><label class="sr-only" for="contact-name">Seu nome</label><input id="contact-name" class="input" name="name" placeholder="Seu nome" required><label class="sr-only" for="contact-phone">Telefone / WhatsApp</label><input id="contact-phone" class="input" name="phone" type="tel" placeholder="Telefone / WhatsApp" required><label class="sr-only" for="contact-message">Como podemos ajudar?</label><textarea id="contact-message" class="input" name="message" rows="5" placeholder="Como podemos ajudar?" required></textarea><button class="button primary" type="submit">Enviar pelo WhatsApp</button></form></div></section>';
    main.querySelector(".contact-page-redesign").insertAdjacentHTML("beforebegin", '<section class="contact-intro"><div class="container"><p class="eyebrow">Entre em contato</p><h1>Fale com a Swiftcar.</h1><p class="contact-intro-copy">Atendimento rápido pelo WhatsApp. Também recebemos você em nossa loja, em Gravataí-RS.</p></div></section>');
    document.querySelector("#whatsapp-contact-form").onsubmit = (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget));
      const message = `Olá! Meu nome é ${data.name}. Meu telefone é ${data.phone}.\n\n${data.message}`;
      window.open(`https://wa.me/5551981127614?text=${encodeURIComponent(message)}`, "_blank", "noopener");
    };
  }
  function enhanceSellSteps() {
    const heading = [...main.querySelectorAll("h2")].find((element) => element.textContent.includes("Simples do início ao fim"));
    const column = heading?.parentElement;
    if (!column || column.classList.contains("sell-steps-enhanced")) return;
    column.classList.add("sell-steps-enhanced");
    const items = [
      ["Avaliação", "Envie os dados e as condições do seu veículo.", '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 1M9 2h6M12 2v3"/></svg>'],
      ["Oferta", "Receba uma proposta justa e sem compromisso.", '<svg viewBox="0 0 24 24"><path d="M4 14h4l3 3 7-7a2 2 0 0 0-3-3l-4 4-2-2H4v5Z"/><path d="M3 18h8l2 2h5"/></svg>'],
      ["Pagamento", "Com o aceite, receba o pagamento à vista.", '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/></svg>'],
      ["Documentação", "Orientamos a transferência com segurança.", '<svg viewBox="0 0 24 24"><path d="M6 2h9l4 4v16H6Z"/><path d="M14 2v5h5m-9 6 2 2 4-4"/></svg>']
    ];
    const cards = column.querySelectorAll(".feature");
    cards.forEach((card, index) => {
      const [title, text, icon] = items[index];
      card.innerHTML = `<span class="standard-icon sell-step-icon" aria-hidden="true">${icon}</span><div><small>0${index + 1}</small><h3>${title}</h3><p>${text}</p></div>`;
    });
    column.querySelector(".grid")?.classList.add("sell-steps-grid");
    enhanceSellFormJourney(main.querySelector("#lead-form"));
  }
  function enhanceSellFormJourney(form) {
    if(form.classList.contains("sell-form-journey"))return;
    form.classList.add("sell-form-journey");
    const grid=form.querySelector(".form-grid"),fields=[...grid?.children||[]];
    if(grid&&fields.length){
      fields[0].insertAdjacentHTML("beforebegin",'<div class="sell-form-section-title"><span>01</span><div><strong>Seus dados</strong><small>Como nossa equipe entrará em contato.</small></div></div>');
      const vehicleStart=fields.find(field=>field.querySelector('[name="vehicle_brand"]'));
      vehicleStart?.insertAdjacentHTML("beforebegin",'<div class="sell-form-section-title"><span>02</span><div><strong>Dados do veículo</strong><small>Informações para uma avaliação mais precisa.</small></div></div>');
    }
    const photoField=form.querySelector(".lead-photo-field");
    const compactGuide=form.querySelector(".lead-photo-guide .photo-guide-open");
    if(compactGuide&&!compactGuide.dataset.guideReady){compactGuide.dataset.guideReady="true";compactGuide.addEventListener("click",openCompactPhotoGuide)}
    if(photoField&&!form.querySelector(".lead-photo-guide")){
      const guide=document.createElement("section");guide.className="photo-guide-callout";
      guide.innerHTML='<div class="photo-guide-number">03</div><div><span class="eyebrow">Antes de enviar</span><h3>Fotografe seu veículo do jeito certo</h3><p>Fotos claras e completas ajudam nossos avaliadores a entender melhor a condição do carro.</p><button class="button photo-guide-open" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4Z"/><path d="m8 14 2-2 2 2 3-4 3 4M8 9h.01"/></svg>Leia o manual de fotos</button></div>';
      photoField.before(guide);
      guide.querySelector("button").addEventListener("click",openPhotoGuide);
    }
  }
  function openPhotoGuide() {
    const illustrations={
      front:'<svg viewBox="0 0 160 72"><g><path d="M7 47l5-17h55l5 17v13H7Z"/><path d="M18 30l8-12h28l9 12M7 47h65M17 51h12M50 51h12"/><circle cx="18" cy="59" r="4"/><circle cx="61" cy="59" r="4"/></g><g><path d="M88 47l5-17h55l5 17v13H88Z"/><path d="M99 30l8-12h28l9 12M88 47h65M101 51h10M130 51h10M113 55h15"/><circle cx="99" cy="59" r="4"/><circle cx="142" cy="59" r="4"/></g><path class="view-divider" d="M80 14v48"/></svg>',
      side:'<svg viewBox="0 0 120 72"><path d="M10 51l8-18 25-6 17-15h25l17 18 9 5v16H10Z"/><path d="M43 27h48M58 13v14M18 33h83"/><circle cx="31" cy="52" r="10"/><circle cx="91" cy="52" r="10"/></svg>',
      rear:'<svg viewBox="0 0 120 72"><path d="M9 49l8-16 27-6 15-13h24l15 17 10 5v13H9Z"/><circle cx="29" cy="51" r="9"/><circle cx="91" cy="51" r="9"/><path d="M44 27h45M58 15v12"/><circle class="damage-lens" cx="73" cy="34" r="15"/><path class="damage-lens" d="m84 45 13 13M67 27l5 5-4 5 7 5"/></svg>',
      inside:'<svg viewBox="0 0 120 72"><path d="M11 58V18h98v40M11 43h98M61 18v40"/><circle cx="36" cy="38" r="13"/><circle cx="36" cy="38" r="4"/><path d="M36 25v9M24 40l8-2M48 40l-8-2M72 28h26M72 36h26M76 48h18M17 58v-8h38v8M67 58v-8h36v8"/></svg>',
      damage:'<svg viewBox="0 0 120 72"><path d="M9 49l8-16 27-6 15-13h24l15 17 10 5v13H9Z"/><circle cx="29" cy="51" r="9"/><circle cx="91" cy="51" r="9"/><path d="M44 27h45M58 15v12"/><circle class="damage-lens" cx="73" cy="34" r="15"/><path class="damage-lens" d="m84 45 13 13M67 27l5 5-4 5 7 5"/></svg>'
    };
    const modal=document.createElement("div");modal.className="photo-guide-modal";
    modal.innerHTML=`<div class="photo-guide-dialog" role="dialog" aria-modal="true" aria-labelledby="photo-guide-title"><button class="photo-guide-close" type="button" aria-label="Fechar">×</button><header><span class="eyebrow">Manual rápido de fotos</span><h2 id="photo-guide-title">Boas fotos aceleram sua avaliação.</h2><p>Siga esta sequência. Não precisa ser profissional — apenas clara, completa e verdadeira.</p></header><div class="photo-guide-alert"><svg viewBox="0 0 24 24"><path d="M12 3 2 21h20L12 3Z"/><path d="M12 9v5M12 18h.01"/></svg><p><strong>Antes de começar:</strong> limpe a lente da câmera, fotografe durante o dia e mantenha o celular firme para evitar imagens tremidas.</p></div><div class="photo-guide-grid"><article><span>01</span><div class="photo-guide-illustration">${illustrations.front}</div><h3>Frente e traseira</h3><p>Enquadre o carro inteiro, sem cortar para-choques, rodas ou teto.</p></article><article><span>02</span><div class="photo-guide-illustration">${illustrations.side}</div><h3>As duas laterais</h3><p>Fotografe de perfil e também em diagonal para mostrar a carroceria.</p></article><article><span>03</span><div class="photo-guide-illustration">${illustrations.inside}</div><h3>Parte interna</h3><p>Mostre painel, bancos, volante, porta-malas e quilometragem.</p></article><article><span>04</span><div class="photo-guide-illustration">${illustrations.rear}</div><h3>Avarias e detalhes</h3><p>Aproxime riscos, amassados, trincas ou peças danificadas. Isso torna a avaliação mais justa.</p></article></div><div class="photo-guide-tips"><div>✓ Use boa iluminação</div><div>✓ Evite reflexos fortes</div><div>✓ Não use filtros</div><div>✓ Envie fotos nítidas</div></div><button class="button primary photo-guide-understood" type="button">Entendi, vou adicionar as fotos</button></div>`;
    const photoGuideViews=[
      ["front","Exemplo fotográfico da frente do veículo"],
      ["side","Exemplo fotográfico da lateral do veículo"],
      ["inside","Exemplo fotográfico da parte interna do veículo"],
      ["damage","Exemplo fotográfico de uma avaria do veículo"]
    ];
    modal.querySelectorAll(".photo-guide-illustration").forEach((element,index)=>{
      const [view,label]=photoGuideViews[index];
      element.className=`photo-guide-photo photo-guide-photo-${view}`;
      element.innerHTML="";
      element.setAttribute("role","img");
      element.setAttribute("aria-label",label);
    });
    modal.classList.add("photo-guide-text-only");
    modal.querySelectorAll(".photo-guide-photo").forEach(element=>element.remove());
    const detailedSteps=[
      "Afaste-se o suficiente para o carro aparecer inteiro. Tire uma foto de frente e outra de traseira, mantendo teto, para-choques, faróis, lanternas, placa e as quatro rodas visíveis. Evite cortar qualquer parte do veículo.",
      "Fotografe o lado do motorista e o lado do passageiro. Faça uma foto reta de cada lateral e, se possível, mais duas na diagonal, mostrando ao mesmo tempo a frente, a traseira e o estado geral da carroceria.",
      "Abra as portas e fotografe painel, volante, bancos dianteiros e traseiros, forros das portas e porta-malas. Ligue o painel e faça uma foto nítida da quilometragem, sem esconder luzes ou avisos acesos.",
      "Mostre de perto todos os riscos, amassados, trincas, peças quebradas, manchas ou sinais de desgaste. Faça também uma foto mais afastada para indicar onde fica cada avaria. Não use filtros nem tente esconder defeitos."
    ];
    modal.querySelectorAll(".photo-guide-grid article p").forEach((paragraph,index)=>{
      paragraph.textContent=detailedSteps[index];
    });
    document.body.append(modal);document.body.classList.add("modal-open");
    const close=()=>{modal.remove();document.body.classList.remove("modal-open");main.querySelector('input[name="lead_photos"]')?.focus()};
    modal.querySelector(".photo-guide-close").onclick=close;modal.querySelector(".photo-guide-understood").onclick=close;modal.addEventListener("click",event=>{if(event.target===modal)close()});
    document.addEventListener("keydown",function escape(event){if(event.key==="Escape"){close();document.removeEventListener("keydown",escape)}},{once:true});
  }
  function openCompactPhotoGuide(){const steps=[["01","Frente","Carro inteiro, de frente."],["02","Traseira","Carro inteiro, por trás."],["03","Laterais","Uma foto de cada lado."],["04","Interior","Bancos, painel e volante."],["05","Quilometragem","Painel ligado com o KM visível."],["06","Motor","Foto do cofre do motor."],["07","Pneus","Mostre o estado dos pneus."],["08","Avarias","Fotografe riscos, amassados ou defeitos."]],modal=document.createElement("div");modal.className="photo-guide-modal compact-photo-guide-modal";modal.innerHTML=`<div class="photo-guide-dialog" role="dialog" aria-modal="true" aria-labelledby="compact-photo-guide-title"><button class="photo-guide-close" type="button" aria-label="Fechar">×</button><header><h2 id="compact-photo-guide-title">Como tirar boas fotos</h2><p>Fotos claras ajudam nossa equipe a avaliar seu veículo com mais precisão.</p></header><div class="compact-photo-guide-grid">${steps.map(([number,title,text])=>`<article><span>${number}</span><div><h3>${title}</h3><p>${text}</p></div></article>`).join("")}</div></div>`;document.body.append(modal);document.body.classList.add("modal-open");const close=()=>{modal.remove();document.body.classList.remove("modal-open")};modal.querySelector(".photo-guide-close").onclick=close;modal.addEventListener("click",event=>{if(event.target===modal)close()});document.addEventListener("keydown",function escape(event){if(event.key==="Escape"){close();document.removeEventListener("keydown",escape)}},{once:true})}
  function enhanceAdminStockSearch() {
    const stock = main.querySelector("#admin-stock");
    const sectionHead = stock?.parentElement?.querySelector(".section-head");
    if (!stock || !sectionHead || sectionHead.nextElementSibling?.classList.contains("admin-stock-search")) return;
    const search = document.createElement("div");
    search.className = "admin-stock-search panel";
    search.innerHTML = '<label for="admin-vehicle-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><span class="sr-only">Pesquisar veículo</span></label><input id="admin-vehicle-search" class="input" type="search" placeholder="Pesquisar por marca, modelo, versão, ano ou status..." autocomplete="off"><span class="admin-search-count" aria-live="polite"></span>';
    sectionHead.insertAdjacentElement("afterend", search);
    const input = search.querySelector("input"), count = search.querySelector(".admin-search-count");
    const normalizeSearch = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/\s+/g, " ").trim();
    const filter = () => {
      const terms = normalizeSearch(input.value).split(" ").filter(Boolean);
      const rows = [...stock.querySelectorAll("tbody tr")];
      let visible = 0;
      rows.forEach(row => {
        const searchable = normalizeSearch(row.dataset.searchText || row.textContent);
        const matches = row.dataset.inventoryView !== "hidden" && terms.every(term => searchable.includes(term));
        row.hidden = !matches;
        if(matches)row.style.removeProperty("display");else row.style.setProperty("display","none","important");
        if (matches) visible++;
      });
      count.textContent = rows.length ? `${visible} de ${rows.length} veículo(s)` : "";
    };
    input.addEventListener("input", filter);
    new MutationObserver(filter).observe(stock, { childList: true, subtree: true });
    filter();
  }
  function enhanceDashboard() {
    const stats = main.querySelector("#stats");
    const container = stats?.closest(".container");
    if (!stats || !container || stats.querySelector(".loading") || container.classList.contains("dashboard-enhanced")) return;
    container.classList.add("dashboard-enhanced");
    const currentVehicles = Array.isArray(shared().vehicles) ? shared().vehicles : [];
    const icons = [
      '<svg viewBox="0 0 24 24"><path d="M3 13l2-5h14l2 5v6h-3v-2H6v2H3v-6Z"/><path d="M5 13h14M7 8l2-3h6l2 3M7 15h.01M17 15h.01"/></svg>',
      '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>',
      '<svg viewBox="0 0 24 24"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z"/></svg>',
      '<svg viewBox="0 0 24 24"><path d="M4 5h16v12H8l-4 4V5Z"/><path d="M8 9h8M8 13h5"/></svg>'
    ];
    stats.querySelectorAll(".stat").forEach((card,index) => card.insertAdjacentHTML("afterbegin", `<span class="dashboard-stat-icon" aria-hidden="true">${icons[index]}</span>`));
    const now = new Date();
    const months = Array.from({length:6},(_,index) => {
      const date = new Date(now.getFullYear(),now.getMonth()-5+index,1);
      return {year:date.getFullYear(),month:date.getMonth(),label:new Intl.DateTimeFormat("pt-BR",{month:"short"}).format(date).replace(".",""),count:0};
    });
    const sold = currentVehicles.filter(vehicle => vehicle.status === "sold");
    sold.forEach(vehicle => {
      const date = new Date(vehicle.updated_at || vehicle.created_at);
      const month = months.find(item => item.year === date.getFullYear() && item.month === date.getMonth());
      if (month) month.count++;
    });
    const maximum = Math.max(1,...months.map(item => item.count));
    const counts = currentVehicles.reduce((result,vehicle) => { result[vehicle.status]=(result[vehicle.status]||0)+1; return result; },{});
    const total = Math.max(1,currentVehicles.length);
    const statusItems = [["available","Disponíveis"],["reserved","Reservados"],["sold","Vendidos"],["archived","Arquivados"]].filter(([value]) => counts[value]);
    const recent = [...sold].sort((a,b) => new Date(b.updated_at)-new Date(a.updated_at)).slice(0,4);
    container.insertAdjacentHTML("beforeend", `<section class="dashboard-grid" aria-label="Indicadores gerenciais"><article class="dashboard-panel sales-chart"><div class="dashboard-panel-head"><div><span class="eyebrow">Desempenho</span><h2>Veículos vendidos</h2></div><span class="dashboard-period">Últimos 6 meses</span></div><div class="chart-area" role="img" aria-label="Gráfico de veículos vendidos nos últimos seis meses">${months.map(item=>`<div class="chart-column"><strong>${item.count}</strong><div class="chart-track"><span style="height:${Math.max(item.count?12:3,item.count/maximum*100)}%"></span></div><small>${item.label}</small></div>`).join("")}</div></article><article class="dashboard-panel inventory-summary"><div class="dashboard-panel-head"><div><span class="eyebrow">Estoque</span><h2>Distribuição atual</h2></div><strong class="dashboard-total">${currentVehicles.length}</strong></div><div class="inventory-progress" aria-hidden="true">${statusItems.map(([value])=>`<span class="progress-${value}" style="width:${(counts[value]/total)*100}%"></span>`).join("")}</div><div class="inventory-legend">${statusItems.map(([value,label])=>`<div><span class="legend-dot dot-${value}"></span><span>${label}</span><strong>${counts[value]}</strong></div>`).join("") || '<p class="muted">Nenhum veículo cadastrado.</p>'}</div></article></section><section class="dashboard-panel dashboard-activity"><div class="dashboard-panel-head"><div><span class="eyebrow">Movimentação</span><h2>Vendas recentes</h2></div><a href="/admin/estoque" data-link>Gerenciar estoque →</a></div>${recent.length?`<div class="activity-list">${recent.map(vehicle=>`<div><span class="activity-icon">✓</span><p><strong>${[vehicle.brand,vehicle.model,vehicle.version].filter(Boolean).join(" ")}</strong><small>Vendido em ${new Intl.DateTimeFormat("pt-BR").format(new Date(vehicle.updated_at||vehicle.created_at))}</small></p></div>`).join("")}</div>`:'<div class="dashboard-empty"><span>✓</span><div><strong>Nenhuma venda registrada ainda</strong><p>Ao marcar um veículo como vendido, ele aparecerá aqui e no gráfico.</p></div></div>'}</section>`);
    refreshDashboardInventory(container);
  }
  async function refreshDashboardInventory(container) {
    try {
      let vehicles=shared().vehicles;
      if(!Array.isArray(vehicles)){const response=await supabaseFetch("/rest/v1/vehicles?select=*&order=created_at.desc");if(!response.ok)return;vehicles=await response.json()}
      const counts=vehicles.reduce((result,vehicle)=>{const key=String(vehicle.status||"").toLowerCase();result[key]=(result[key]||0)+1;return result},{}),total=Math.max(1,vehicles.length),statuses=[["available","Disponíveis"],["reserved","Reservados"],["sold","Vendidos"],["archived","Arquivados"]].filter(([value])=>counts[value]);
      const money=value=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0}).format(value||0),totalValue=vehicles.reduce((sum,vehicle)=>sum+(Number(vehicle.price)||0),0),average=vehicles.length?totalValue/vehicles.length:0,withFipe=vehicles.filter(vehicle=>Number(vehicle.fipe_price)>0),discounts=withFipe.filter(vehicle=>Number(vehicle.fipe_price)>Number(vehicle.price)).map(vehicle=>(1-Number(vehicle.price)/Number(vehicle.fipe_price))*100),averageDiscount=discounts.length?discounts.reduce((sum,value)=>sum+value,0)/discounts.length:0;
      const sold=vehicles.filter(vehicle=>String(vehicle.status||"").toLowerCase()==="sold"),now=new Date(),months=Array.from({length:6},(_,index)=>{const date=new Date(now.getFullYear(),now.getMonth()-5+index,1);return{year:date.getFullYear(),month:date.getMonth(),label:new Intl.DateTimeFormat("pt-BR",{month:"short"}).format(date).replace(".",""),count:0}});
      sold.forEach(vehicle=>{const date=new Date(vehicle.updated_at||vehicle.created_at),month=months.find(item=>item.year===date.getFullYear()&&item.month===date.getMonth());if(month)month.count++});
      const maximum=Math.max(1,...months.map(item=>item.count)),chart=container.querySelector(".sales-chart .chart-area");if(chart)chart.innerHTML=months.map(item=>`<div class="chart-column"><strong>${item.count}</strong><div class="chart-track"><span style="height:${Math.max(item.count?12:3,item.count/maximum*100)}%"></span></div><small>${item.label}</small></div>`).join("");
      const soldCard=[...container.querySelectorAll("#stats .stat")].find(card=>card.textContent.includes("Vendidos"));if(soldCard)soldCard.querySelector("strong").textContent=String(sold.length);
      const escape=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]),recent=[...sold].sort((a,b)=>new Date(b.updated_at||b.created_at)-new Date(a.updated_at||a.created_at)).slice(0,4),activity=container.querySelector(".dashboard-activity");
      if(activity){const head=activity.querySelector(".dashboard-panel-head")?.outerHTML||"";activity.innerHTML=head+(recent.length?`<div class="activity-list">${recent.map(vehicle=>`<div><span class="activity-icon">✓</span><p><strong>${escape([vehicle.brand,vehicle.model,vehicle.version].filter(Boolean).join(" "))}</strong><small>Vendido em ${new Intl.DateTimeFormat("pt-BR").format(new Date(vehicle.updated_at||vehicle.created_at))}</small></p></div>`).join("")}</div>`:'<div class="dashboard-empty"><span>✓</span><div><strong>Nenhuma venda registrada ainda</strong><p>Ao marcar um veículo como vendido, ele aparecerá aqui e no gráfico.</p></div></div>')}
      const financial=container.querySelector(".inventory-summary");
      if(financial)financial.innerHTML=`<div class="dashboard-panel-head"><div><span class="eyebrow">Indicadores</span><h2>Valor do estoque</h2></div><span class="financial-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 7h16v12H4Z"/><path d="M4 10h16M8 15h4"/></svg></span></div><div class="financial-total"><small>Total anunciado</small><strong>${money(totalValue)}</strong></div><div class="financial-metrics"><div><small>Ticket médio</small><strong>${money(average)}</strong></div><div><small>Com preço FIPE</small><strong>${withFipe.length} veículo${withFipe.length===1?"":"s"}</strong></div><div><small>Desconto médio</small><strong>${averageDiscount?`${averageDiscount.toFixed(1).replace(".",",")}% abaixo da FIPE`:"Sem desconto calculado"}</strong></div></div>`;
      const totalElement=container.querySelector(".dashboard-total");if(totalElement)totalElement.innerHTML=`${vehicles.length}<small>cadastrados</small>`;
      const progress=container.querySelector(".inventory-progress");if(progress)progress.innerHTML=statuses.map(([value])=>`<span class="progress-${value}" style="width:${counts[value]/total*100}%"></span>`).join("");
      const legend=container.querySelector(".inventory-legend");if(legend)legend.innerHTML=statuses.map(([value,label])=>`<div><span class="legend-dot dot-${value}"></span><span>${label}</span><strong>${counts[value]}</strong></div>`).join("")||'<p class="muted">Nenhum veículo cadastrado.</p>';
    } catch {}
  }
  function translateAdminStatuses() {
    const labels = { available: "Disponível", reserved: "Reservado", sold: "Vendido", archived: "Arquivado" };
    main.querySelectorAll("#admin-stock tbody tr").forEach(row => {
      const badge = row.children[3]?.querySelector(".status");
      if (!badge) return;
      const value = badge.dataset.statusValue || badge.textContent.trim().toLowerCase();
      badge.dataset.statusValue = value;
      badge.classList.add(`status-${value}`);
      const translated = labels[value] || value;
      if (badge.textContent !== translated) badge.textContent = translated;
    });
  }
  function translateVehicleStatusSelect() {
    const labels = { available: "Disponível", reserved: "Reservado", sold: "Vendido", archived: "Arquivado" };
    const select = main.querySelector('select[name="status"]');
    select?.querySelectorAll("option").forEach(option => {
      const internalValue=option.getAttribute("value")||option.value;
      option.value=internalValue;
      const translated = labels[internalValue] || internalValue;
      if (option.textContent !== translated) option.textContent = translated;
    });
  }
  function simplifyVehicleForm() {
    const form=main.querySelector("#vehicle-form");
    if(!form||form.classList.contains("vehicle-form-simplified"))return;
    form.classList.add("vehicle-form-simplified");
    form.querySelector('textarea[name="observations"]')?.closest(".field")?.remove();
    const features=form.querySelector('input[name="features"]');
    if(features){
      const value=features.value;
      const field=features.closest(".field");
      const hidden=document.createElement("input");hidden.type="hidden";hidden.name="features";hidden.value=value;
      field?.replaceWith(hidden);
    }
    enhanceVehiclePhotoPreview(form);
  }
  function enhanceVehiclePhotoPreview(form) {
    const input=form.querySelector('input[type="file"][name="images"]');
    if(!input||input.dataset.previewReady)return;
    input.dataset.previewReady="true";
    const existing=form.querySelector(".thumbs");
    if(existing){
      existing.classList.add("vehicle-existing-photos");existing.insertAdjacentHTML("beforebegin",'<h3 class="vehicle-photos-title">Fotos atuais</h3>');
      [...existing.querySelectorAll(":scope > img")].forEach((image,index)=>{
        const item=document.createElement("figure");item.className="vehicle-existing-photo";
        const remove=document.createElement("button");remove.type="button";remove.className="vehicle-photo-delete";remove.setAttribute("aria-label",`Excluir foto ${index+1}`);remove.title="Excluir foto";remove.textContent="X";
        image.before(item);item.append(image,remove);
        remove.addEventListener("click",async()=>{
          if(!confirm("Excluir esta foto do veículo?"))return;
          const marker="/vehicle-images/",source=new URL(image.src,location.origin).pathname,path=image.dataset.path||decodeURIComponent(source.slice(source.indexOf(marker)+marker.length));
          remove.disabled=true;
          try{
            const response=await removeVehicleObjects([path]);
            if(!response.ok){const error=await response.json().catch(()=>({}));throw new Error(error.message||"Não foi possível excluir a foto.")}
            await supabaseFetch(`/rest/v1/vehicle_images?storage_path=eq.${encodeURIComponent(path)}`,{method:"DELETE",headers:{Prefer:"return=minimal"}});
            item.remove();
            if(!existing.querySelector(".vehicle-existing-photo")){existing.previousElementSibling?.remove();existing.remove()}
          }catch(error){alert(error.message);remove.disabled=false}
        });
      });
    }
    const preview=document.createElement("div");preview.className="vehicle-photo-preview";preview.hidden=true;
    input.closest(".field")?.insertAdjacentElement("afterend",preview);
    input.addEventListener("change",()=>{
      preview.innerHTML="";
      const files=[...input.files];preview.hidden=!files.length;
      if(!files.length)return;
      preview.insertAdjacentHTML("beforeend",`<h3 class="vehicle-photos-title">Novas fotos selecionadas <span>${files.length}</span></h3><div class="vehicle-photo-grid"></div>`);
      const grid=preview.querySelector(".vehicle-photo-grid");
      files.forEach((file,index)=>{
        const url=URL.createObjectURL(file),item=document.createElement("figure");
        item.innerHTML=`<img src="${url}" alt="Prévia da foto ${index+1}"><figcaption>${index===0?"Foto de capa":`Foto ${index+1}`}</figcaption>`;
        item.querySelector("img").addEventListener("load",()=>URL.revokeObjectURL(url),{once:true});grid.append(item);
      });
    });
  }
  function ensureVehiclePhotoDeleteButtons(){
    const form=main.querySelector("#vehicle-form"),gallery=form?.querySelector(".vehicle-existing-photos");
    if(!form||!gallery)return;
    [...gallery.querySelectorAll(":scope > img")].forEach(image=>{
      const item=document.createElement("figure");item.className="vehicle-existing-photo";image.before(item);item.append(image);
    });
    gallery.querySelectorAll(".vehicle-existing-photo").forEach((item,index)=>{
      if(item.querySelector(".vehicle-photo-delete"))return;
      const image=item.querySelector("img");if(!image)return;
      const remove=document.createElement("button");remove.type="button";remove.className="vehicle-photo-delete";remove.textContent="X";remove.title="Excluir foto";remove.setAttribute("aria-label",`Excluir foto ${index+1}`);item.append(remove);
      remove.addEventListener("click",async()=>{
        if(!confirm("Excluir esta foto do veículo?"))return;
        const marker="/vehicle-images/",source=new URL(image.src,location.origin).pathname,path=image.dataset.path||decodeURIComponent(source.slice(source.indexOf(marker)+marker.length));remove.disabled=true;
        try{
          const response=await removeVehicleObjects([path]);
          if(!response.ok){const error=await response.json().catch(()=>({}));throw new Error(error.message||"Não foi possível excluir a foto.")}
          await supabaseFetch(`/rest/v1/vehicle_images?storage_path=eq.${encodeURIComponent(path)}`,{method:"DELETE",headers:{Prefer:"return=minimal"}});item.remove();if(!gallery.children.length){gallery.previousElementSibling?.remove();gallery.remove()}
        }catch(error){alert(error.message);remove.disabled=false}
      });
    });
  }
  function translateLeadStatuses() {
    const labels = { new: "Novo", contacted: "Contatado", negotiating: "Em negociação", completed: "Concluído", discarded: "Descartado" };
    main.querySelectorAll("#leads select[data-lead] option").forEach(option => {
      const translated = labels[option.value] || option.value;
      if (option.textContent !== translated) option.textContent = translated;
    });
  }
  function enhanceLeadsPanel() {
    const leads = main.querySelector("#leads");
    const container = leads?.closest(".container");
    const table = leads?.querySelector("table");
    if (!leads || !container || !table || container.classList.contains("leads-enhanced")) return;
    container.classList.add("leads-enhanced");
    const heading = container.querySelector("h1");
    heading?.insertAdjacentHTML("afterend", '<p class="leads-subtitle">Acompanhe os contatos recebidos e atualize cada etapa do atendimento.</p>');
    const toolbar = document.createElement("div");
    toolbar.className = "leads-toolbar panel";
    toolbar.innerHTML = '<label for="lead-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><span class="sr-only">Pesquisar lead</span></label><input id="lead-search" class="input" type="search" placeholder="Pesquisar por nome, telefone, cidade ou veículo..." autocomplete="off"><span class="leads-count" aria-live="polite"></span>';
    leads.before(toolbar);
    const input = toolbar.querySelector("input"), count = toolbar.querySelector(".leads-count");
    const rows = [...table.querySelectorAll("tbody tr")];
    const update = () => {
      const query = input.value.trim().toLocaleLowerCase("pt-BR");
      let visible = 0;
      rows.forEach(row => {
        const matches = !query || row.textContent.toLocaleLowerCase("pt-BR").includes(query);
        row.hidden = !matches;
        if (matches) visible++;
      });
      count.textContent = `${visible} de ${rows.length} contato${rows.length === 1 ? "" : "s"}`;
    };
    const styleStatus = select => {
      select.classList.remove("lead-new","lead-contacted","lead-negotiating","lead-completed","lead-discarded");
      select.classList.add(`lead-${select.value}`);
    };
    table.querySelectorAll("select[data-lead]").forEach(styleStatus);
    table.addEventListener("change", event => { if (event.target.matches("select[data-lead]")) styleStatus(event.target); });
    input.addEventListener("input", update);
    update();
    loadLeadDetails(table);
  }
  async function loadLeadDetails(table) {
    try {
      const details=Array.isArray(shared().leads)?shared().leads:[],rows=[...table.querySelectorAll("tbody tr")];
      const headerRow=table.querySelector("thead tr");
      if(headerRow&&!headerRow.querySelector(".lead-actions-heading")){const heading=document.createElement("th");heading.className="lead-actions-heading";heading.textContent="Ações";headerRow.append(heading)}
      rows.forEach(row=>{
        // Associa pelo id do lead (e não pela posição) para nunca excluir o contato errado.
        const leadId=row.querySelector("select[data-lead]")?.dataset.lead,lead=details.find(item=>String(item.id)===leadId);if(!lead)return;
        let actions=row.querySelector(".lead-actions-cell");
        if(!actions){actions=document.createElement("td");actions.className="lead-actions-cell";row.append(actions)}
        const button=document.createElement("button");button.type="button";button.className="lead-details-button";button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></svg><span>Ver detalhes</span>';
        const remove=document.createElement("button");remove.type="button";remove.className="lead-delete-button";remove.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7m4 4v6m4-6v6"/></svg><span>Excluir</span>';
        button.addEventListener("click",()=>openLeadDetails(lead));
        remove.addEventListener("click",async()=>{
          if(!confirm(`Excluir o lead de ${lead.name||"este contato"}?`))return;
          remove.disabled=true;
          try{
            const session=JSON.parse(sessionStorage.getItem("swiftcar-session")||"null");
            const response=await supabaseFetch(`/rest/v1/leads?id=eq.${encodeURIComponent(lead.id)}`,{method:"DELETE"});
            if(!response.ok)throw new Error("Não foi possível excluir o lead.");
            row.remove();
            document.querySelector("#lead-search")?.dispatchEvent(new Event("input"));
          }catch(error){alert(error.message);remove.disabled=false}
        });
        const actionButtons=document.createElement("div");actionButtons.className="lead-action-buttons";actionButtons.append(button,remove);actions.append(actionButtons);
      });
    } catch {}
  }
  async function openLeadDetails(lead) {
    const safe=value=>String(value??"").replace(/[&<>\"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
    const value=value=>value===null||value===undefined||value===""?"Não informado":safe(value);
    const plate=String(lead.plate||"").toUpperCase(),formattedPlate=/^[A-Z]{3}[0-9]{4}$/.test(plate)?`${plate.slice(0,3)}-${plate.slice(3)}`:plate;
    const fields=[["Nome",lead.name],["WhatsApp",lead.phone],["Cidade",lead.city],["Estado",lead.state],["Marca",lead.brand],["Modelo",lead.model],["Versão",lead.version],["Ano",lead.year],["Placa",formattedPlate],["Quilometragem",lead.mileage!=null?`${Number(lead.mileage).toLocaleString("pt-BR")} km`:null],["Combustível",lead.fuel],["Câmbio",lead.transmission],["Avarias",lead.damage||lead.vehicle_condition],["Financiamento",lead.financed===true?"Financiado":lead.financed===false?"Quitado":null],["Recebido em",new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short"}).format(new Date(lead.created_at))]];
    const modal=document.createElement("div");modal.className="lead-details-modal";modal.innerHTML=`<div class="lead-details-dialog" role="dialog" aria-modal="true" aria-labelledby="lead-dialog-title"><button class="lead-modal-close" type="button" aria-label="Fechar">×</button><p class="eyebrow">Solicitação de avaliação</p><h2 id="lead-dialog-title">${value([lead.brand,lead.model,lead.version,lead.year].filter(Boolean).join(" "))}</h2><div class="lead-details-grid">${fields.map(([label,item])=>`<div><small>${label}</small><strong>${value(item)}</strong></div>`).join("")}</div><section class="lead-notes"><h3>Observações</h3><p>${value(lead.notes||lead.description)}</p></section><section class="lead-photos" hidden><h3>Fotos do veículo <span></span></h3><div></div></section></div>`;
    document.body.append(modal);document.body.classList.add("modal-open");
    const close=()=>{modal.remove();document.body.classList.remove("modal-open")};
    modal.querySelector(".lead-modal-close").onclick=close;modal.addEventListener("click",event=>{if(event.target===modal)close()});
    document.addEventListener("keydown",function escape(event){if(event.key==="Escape"){close();document.removeEventListener("keydown",escape)}});
    try{const response=await supabaseFetch(`/rest/v1/lead_images?select=storage_path,position&lead_id=eq.${encodeURIComponent(lead.id)}&order=position.asc`);if(!response.ok)throw new Error("Não foi possível carregar as fotos.");const images=await response.json(),section=modal.querySelector(".lead-photos");if(images.length){section.hidden=false;section.querySelector("h3 span").textContent=`(${images.length})`;section.querySelector("div").innerHTML=images.map((image,index)=>{const src=leadStorageImage(image.storage_path);return `<button type="button" data-lead-image="${safe(src)}" aria-label="Ampliar foto ${index+1}"><img src="${safe(src)}" alt="Foto ${index+1} do veículo" loading="lazy"></button>`}).join("");let signedFallback=false;section.addEventListener("error",async event=>{if(signedFallback||event.target.tagName!=="IMG")return;signedFallback=true;const urls=await signedLeadImages(images.map(image=>image.storage_path));section.querySelectorAll("[data-lead-image]").forEach((button,index)=>{if(!urls[index])return;button.dataset.leadImage=urls[index];button.querySelector("img").src=urls[index]})},true);section.addEventListener("click",event=>{const button=event.target.closest("[data-lead-image]");if(button)openLeadImage(button.dataset.leadImage)})}}catch(error){console.error("Falha ao carregar fotos do lead:",error)}
  }
  function openLeadImage(src){const lightbox=document.createElement("div");lightbox.className="lead-image-lightbox";lightbox.innerHTML=`<button type="button" aria-label="Fechar foto ampliada">×</button><img src="${src.replace(/\"/g,"&quot;")}" alt="Foto ampliada do veículo">`;document.body.append(lightbox);const close=()=>lightbox.remove();lightbox.addEventListener("click",event=>{if(event.target===lightbox||event.target.tagName==="BUTTON")close()});document.addEventListener("keydown",function escape(event){if(event.key==="Escape"){close();document.removeEventListener("keydown",escape)}},{once:true})}
  function enhanceAdminActionButtons() {
    const icons = {
      edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z"/><path d="m14 7 3 3"/></svg>',
      sold: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.3 2.3 4.8-5"/></svg>',
      archive: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v13H4Z"/><path d="M3 3h18v4H3Zm6 9h6"/></svg>',
      delete: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7m4 4v6m4-6v6"/></svg>',
      add: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>'
    };
    const newVehicle = main.querySelector('a[href="/admin/estoque/novo"]');
    if (newVehicle && !newVehicle.querySelector("svg")) newVehicle.insertAdjacentHTML("afterbegin", icons.add);
    main.querySelectorAll("#admin-stock tbody td:last-child").forEach(cell => {
      if (cell.querySelector(".admin-row-actions")) return;
      const edit = cell.querySelector('a[href*="/editar"]'), sold = cell.querySelector('[data-status="sold"]'), archive = cell.querySelector('[data-status="archived"]'), remove = cell.querySelector("[data-delete]");
      if (edit) edit.insertAdjacentHTML("afterbegin", icons.edit);
      if (sold) sold.insertAdjacentHTML("afterbegin", icons.sold);
      if (archive) archive.insertAdjacentHTML("afterbegin", icons.archive);
      if (remove) remove.insertAdjacentHTML("afterbegin", icons.delete);
      const group = document.createElement("div");
      group.className = "admin-row-actions";
      [...cell.children].forEach(button => group.append(button));
      cell.append(group);
    });
  }
  function enhanceAdminVehicleThumbnails() {
    const rows=[...main.querySelectorAll("#admin-stock tbody tr")];
    const vehicles=Array.isArray(shared().vehicles)?shared().vehicles:[];
    rows.forEach((row,index)=>{
      const cell=row.children[0],name=cell?.querySelector("strong");
      if(!cell||!name||cell.classList.contains("admin-vehicle-cell"))return;
      const featureVehicleId=row.querySelector("[data-id]")?.dataset.id||row.querySelector("[data-delete]")?.dataset.delete;
      const vehicle=vehicles.find(item=>String(item.id)===String(featureVehicleId))||vehicles[index]||{};
      row.dataset.searchText=[vehicle.brand,vehicle.model,vehicle.version,vehicle.year,vehicle.manufacture_year,vehicle.model_year,vehicle.status,vehicle.status==="available"?"disponível disponivel":vehicle.status==="sold"?"vendido":vehicle.status==="archived"?"arquivado":"",name.textContent].filter(Boolean).join(" ");
      const source=row.dataset.cover||null;
      cell.classList.add("admin-vehicle-cell");
      const media=document.createElement("span");media.className="admin-vehicle-thumb";
      media.innerHTML=source?`<img src="${String(source).replace(/\"/g,"&quot;")}" alt="${String(name.textContent).replace(/[&<>\"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char])}" loading="lazy">`:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 13l2-5h14l2 5v6h-3v-2H6v2H3v-6Z"/><path d="M5 13h14M7 15h.01M17 15h.01"/></svg>';
      if(featureVehicleId){
        const star=document.createElement("button"),setFeatured=active=>{star.classList.toggle("active",active);star.setAttribute("aria-pressed",String(active));star.title=active?"Remover dos destaques":"Marcar como destaque"};
        star.type="button";star.className="admin-feature-toggle";star.setAttribute("aria-label","Alternar veículo em destaque");star.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z"/></svg>';setFeatured(Boolean(vehicle.featured));
        star.addEventListener("click",async event=>{event.preventDefault();event.stopPropagation();const next=!star.classList.contains("active");star.disabled=true;try{const response=await supabaseFetch(`/rest/v1/vehicles?id=eq.${encodeURIComponent(featureVehicleId)}`,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({featured:next})}),saved=(await response.json())[0];if(!response.ok)throw new Error(saved?.message||"Não foi possível atualizar o destaque.");vehicle.featured=Boolean(saved.featured);setFeatured(vehicle.featured)}catch(error){alert(error.message)}finally{star.disabled=false}});
        media.append(star);
      }
      const content=document.createElement("span");content.className="admin-vehicle-name";name.before(content);content.append(name);cell.prepend(media);
    });
  }
  function enhanceAdminInventoryView() {
    const archivedView = new URLSearchParams(location.search).get("view") === "archived";
    const sectionHead = main.querySelector("#admin-stock")?.parentElement?.querySelector(".section-head");
    const newVehicle = sectionHead?.querySelector('a[href="/admin/estoque/novo"]');
    if (sectionHead && newVehicle && !sectionHead.querySelector(".admin-stock-head-actions")) {
      if (!newVehicle.querySelector("svg")) {
        newVehicle.insertAdjacentHTML("afterbegin", '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>');
      }
      newVehicle.classList.add("admin-new-vehicle");
      const group = document.createElement("div");
      group.className = "admin-stock-head-actions";
      newVehicle.before(group);
      group.append(newVehicle);
      const archivedTotal = [...main.querySelectorAll("#admin-stock tbody tr")].filter(row => row.children[3]?.querySelector(".status")?.dataset.statusValue === "archived").length;
      const viewLink = document.createElement("a");
      viewLink.className = "button admin-archive-view";
      viewLink.href = archivedView ? "/admin/estoque" : "/admin/estoque?view=archived";
      viewLink.innerHTML = archivedView ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 14-4-4 4-4"/><path d="M5 10h9a5 5 0 0 1 5 5v2"/></svg><span>Voltar ao estoque</span>' : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v13H4Z"/><path d="M3 3h18v4H3Zm6 9h6"/></svg><span>Arquivados${archivedTotal ? ` (${archivedTotal})` : ""}</span>`;
      group.prepend(viewLink);
    }
    main.querySelectorAll("#admin-stock tbody tr").forEach(row => {
      const isArchived = row.children[3]?.querySelector(".status")?.dataset.statusValue === "archived";
      row.dataset.inventoryView = archivedView === isArchived ? "visible" : "hidden";
      row.hidden = archivedView !== isArchived;
      if (archivedView) {
        const archiveButton = row.querySelector('[data-status="archived"]');
        if (archiveButton) {
          archiveButton.dataset.status = "available";
          const icon = archiveButton.querySelector("svg")?.outerHTML || "";
          archiveButton.innerHTML = `${icon}Restaurar`;
        }
      }
    });
  }
})();
