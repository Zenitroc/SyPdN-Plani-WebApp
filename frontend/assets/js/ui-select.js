(function () {
  function enhance(select) {
    if (!select || select.dataset.enhanced === '1') return;
    select.dataset.enhanced = '1';

    // Wrapper y botón
    const wrap = document.createElement('div');
    wrap.className = 'uiselect';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'uiselect-btn';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', select.id + '_menu');

    // Menú
    const menu = document.createElement('ul');
    menu.className = 'uiselect-menu';
    menu.id = select.id + '_menu';
    menu.setAttribute('role', 'listbox');
    menu.tabIndex = -1;

    // Sincronía label/valor
    function labelOf(val) {
      const opt = Array.from(select.options).find(o => o.value == val);
      return opt ? (opt.textContent || opt.value) : 'Seleccionar...';
    }
    function setValue(val, fire = true) {
      select.value = val;
      btn.firstChild.nodeValue = labelOf(val) + ' ';
      Array.from(menu.children).forEach(li => {
        li.setAttribute('aria-selected', li.dataset.value == val ? 'true' : 'false');
      });
      if (fire) select.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Contenido del botón
    btn.appendChild(document.createTextNode(labelOf(select.value) + ' '));

    // Opciones
    Array.from(select.options).forEach((o, idx) => {
      const li = document.createElement('li');
      li.className = 'uiselect-option';
      li.setAttribute('role', 'option');
      li.dataset.value = o.value;
      li.textContent = o.textContent || o.value;
      if (o.disabled) li.setAttribute('aria-disabled', 'true');
      if (o.value == select.value) li.setAttribute('aria-selected', 'true');
      li.addEventListener('click', () => {
        if (o.disabled) return;
        setValue(o.value);
        close();
        btn.focus();
      });
      menu.appendChild(li);
    });

    // Insertar y ocultar select nativo
    select.style.display = 'none';
    select.parentNode.insertBefore(wrap, select.nextSibling);
    wrap.appendChild(btn);
    wrap.appendChild(menu);

    // Apertura/cierre
    function open() {
      wrap.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      // foco al seleccionado
      const sel = menu.querySelector('[aria-selected="true"]') || menu.firstElementChild;
      if (sel) sel.classList.add('focused'), sel.scrollIntoView({ block: 'nearest' });
      document.addEventListener('click', onDocClick, { capture: true });
      document.addEventListener('keydown', onKey);
    }
    function close() {
      wrap.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      menu.querySelectorAll('.focused').forEach(n => n.classList.remove('focused'));
      document.removeEventListener('click', onDocClick, { capture: true });
      document.removeEventListener('keydown', onKey);
    }
    function toggle() { wrap.classList.contains('open') ? close() : open(); }

    function onDocClick(e) { if (!wrap.contains(e.target)) close(); }

    // Teclado
    function focusMove(delta) {
      const items = Array.from(menu.querySelectorAll('.uiselect-option'));
      let idx = items.findIndex(x => x.classList.contains('focused'));
      if (idx < 0) idx = items.findIndex(x => x.getAttribute('aria-selected') === 'true');
      idx = Math.max(0, Math.min(items.length - 1, (idx < 0 ? 0 : idx + delta)));
      items.forEach(x => x.classList.remove('focused'));
      items[idx].classList.add('focused');
      items[idx].scrollIntoView({ block: 'nearest' });
    }
    function onKey(e) {
      if (!wrap.classList.contains('open')) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); focusMove(+1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); focusMove(-1); }
      else if (e.key === 'Home') { e.preventDefault(); menu.firstElementChild?.classList.add('focused'); }
      else if (e.key === 'End') { e.preventDefault(); menu.lastElementChild?.classList.add('focused'); }
      else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const f = menu.querySelector('.focused');
        if (f) { setValue(f.dataset.value); close(); btn.focus(); }
      } else if (e.key === 'Escape') { e.preventDefault(); close(); btn.focus(); }
    }

    btn.addEventListener('click', toggle);
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); open(); }
    });

    // API simple
    return { setValue, open, close };
  }

  window.SelectBox = {
    enhanceById(id) { return enhance(document.getElementById(id)); },
    enhance(el) { return enhance(el); }
  };
})();
