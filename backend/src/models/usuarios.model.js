const pool = require('../config/database');

async function buscarPorUsuario(usuario) {
  const result = await pool.query(
    'SELECT id_usuario AS "idUsuario", usuario, password_hash AS "passwordHash", rol FROM usuarios WHERE usuario = $1',
    [usuario],
  );
  return result.rows[0] || null;
}

async function crear(usuario, passwordHash, rol = 'cliente') {
  const result = await pool.query(
    `INSERT INTO usuarios (usuario, password_hash, rol)
     VALUES ($1, $2, $3)
     RETURNING id_usuario AS "idUsuario", usuario, rol`,
    [usuario, passwordHash, rol],
  );
  return result.rows[0];
}

module.exports = { buscarPorUsuario, crear };
