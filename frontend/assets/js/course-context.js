(function () {
  window.courseContext = {
    get() { return localStorage.getItem('spn_selected_course_id'); },
    set(id) { localStorage.setItem('spn_selected_course_id', String(id)); },
    clear() { localStorage.removeItem('spn_selected_course_id'); },
    async require() {
      const id = this.get();
      const parsed = Number(id);
      if (!id || !Number.isFinite(parsed) || parsed <= 0) {
        this.clear();
        location.href = window.getPageRoute ? window.getPageRoute('home') : (BASE_APP + '/pages/home/');
        throw new Error('No hay curso seleccionado');
      }
      return parsed;
    },
  };
})();