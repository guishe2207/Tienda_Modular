const pool = require('../config/database');

async function crear(tokenHash, idUsuario, expiraEn) {
  await pool.query(
    'INSERT INTO sesiones_usuario (token_hash, id_usuario, expira_en) VALUES ($1, $2, $3)',
    [tokenHash, idUsuario, expiraEn],
  );
}

async function buscarActiva(tokenHash) {
  const result = await pool.query(
    `SELECT s.id_usuario AS "idUsuario", u.usuario, u.rol
     FROM sesiones_usuario s
     JOIN usuarios u ON u.id_usuario = s.id_usuario
     WHERE s.token_hash = $1 AND s.expira_en > now()`,
    [tokenHash],
  );
  return result.rows[0] || null;
}

async function eliminar(tokenHash) {
  await pool.query('DELETE FROM sesiones_usuario WHERE token_hash = $1', [tokenHash]);
}

async function eliminarExpiradas() {
  await pool.query('DELETE FROM sesiones_usuario WHERE expira_en <= now()');
}

module.exports = { buscarActiva, crear, eliminar, eliminarExpiradas };
