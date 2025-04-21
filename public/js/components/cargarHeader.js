export async function cargarHeader() {
    const [header, footer] = await Promise.all([
      fetch('/partials/header.html').then(r => r.text()),
      fetch('/partials/footer.html').then(r => r.text())
    ]);
    document.getElementById('header-container').innerHTML = header;
    document.getElementById('footer-container').innerHTML = footer;
  }
  