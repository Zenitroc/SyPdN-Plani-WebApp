(function () {
  window.courseContext = {
    get() { return localStorage.getItem('spn_selected_course_id'); },
    set(id) { localStorage.setItem('spn_selected_course_id', String(id)); },
    clear() { localStorage.removeItem('spn_selected_course_id'); },
    async require() {
      const id = this.get();
      if (!id) {
        location.href = BASE_APP + '/public/pages/home/';
        throw new Error('No hay curso seleccionado');
      }
      return id;
    },
  };
})();
