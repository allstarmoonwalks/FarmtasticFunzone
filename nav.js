/* Mobile menu: the menu opens with a CSS checkbox toggle; this closes it when you tap anywhere else,
   press Escape, tap a menu link, or the window grows to desktop width. */
(function () {
  var box = document.getElementById('nav-check');
  if (!box) return;
  function close() { box.checked = false; }
  document.addEventListener('click', function (e) {
    if (!box.checked || e.target === box) return; // the toggle label also fires a click on the hidden checkbox
    if (e.target.closest('.nav-links a') || !e.target.closest('.nav-links, .nav-toggle')) close();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  window.addEventListener('resize', function () { if (window.innerWidth > 900) close(); });
})();
