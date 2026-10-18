const updateHomeHeadline = () => {
  if (location.pathname !== "/") return;
  const headline = document.querySelector(".hero h1");
  if (!headline || headline.dataset.purchaseCopy) return;
  headline.innerHTML = 'Repasse de veículos<br><span class="accent">é na Swiftcar.</span>';
  headline.dataset.purchaseCopy = "true";
};

new MutationObserver(updateHomeHeadline).observe(document.querySelector("#conteudo"), {
  childList: true,
  subtree: true,
});

updateHomeHeadline();
