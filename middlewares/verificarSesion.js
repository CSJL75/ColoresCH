function verificarSesion(req, res, next) {
    if (!req.session || !req.session.usuario?.id) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    next();
  }

module.exports = verificarSesion;
