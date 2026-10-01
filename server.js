const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");

const app = express();
app.use(cors());
app.use(express.json());

// ── Pool de conexiones (configurable por variables de entorno en Railway) ─
const pool = mysql.createPool({
  host: process.env.DB_HOST || process.env.MYSQLHOST,
  port: process.env.DB_PORT || process.env.MYSQLPORT || 3306,
  user: process.env.DB_USER || process.env.MYSQLUSER,
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD,
  database: process.env.DB_NAME || process.env.MYSQLDATABASE,
  waitForConnections: true,
  connectionLimit: 10,
});

pool.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Error conectando a MySQL:", err.message);
    console.error(
      "   Revisa las variables DB_HOST / DB_USER / DB_PASSWORD / DB_NAME en Railway."
    );
    return;
  }
  console.log("✅ Conectado a MySQL");
  connection.release();
});

// Ruta de salud (para verificar que el servicio está vivo en Railway)
app.get("/", (req, res) => {
  res.json({ status: "ok", mensaje: "API Cocina Escolar en línea" });
});

// Buscar estudiante por carnet
app.get("/estudiante/:carnet", (req, res) => {
  const sql = "SELECT nombre FROM estudiantes WHERE carnet = ?";
  pool.query(sql, [req.params.carnet], (err, resultados) => {
    if (err) return res.json({ status: "error", mensaje: err.message });
    if (resultados.length === 0) {
      return res.json({ status: "error", mensaje: "Estudiante no encontrado" });
    }
    res.json({ status: "ok", nombre: resultados[0].nombre });
  });
});

// Registrar estudiante nuevo
app.post("/estudiante", (req, res) => {
  const { carnet, nombre } = req.body;
  if (!carnet || !nombre) {
    return res.json({ status: "error", mensaje: "Falta carnet o nombre" });
  }
  const sql =
    "INSERT INTO estudiantes (nombre, carnet, codigo_barra) VALUES (?, ?, '')";
  pool.query(sql, [nombre, carnet], (err) => {
    if (err) return res.json({ status: "error", mensaje: err.message });
    res.json({ status: "ok", mensaje: "Estudiante registrado" });
  });
});

// Registrar retiro
app.post("/retiro", (req, res) => {
  const { carnet, tipo } = req.body;

  if (!carnet || !tipo) {
    return res.json({ status: "error", mensaje: "Falta carnet o tipo de utensilio" });
  }

  const sqlEstudiante = "SELECT id FROM estudiantes WHERE carnet = ?";
  pool.query(sqlEstudiante, [carnet], (err, estudiantes) => {
    if (err) return res.json({ status: "error", mensaje: err.message });
    if (estudiantes.length === 0) {
      return res.json({ status: "error", mensaje: "Estudiante no encontrado" });
    }

    const sqlUtensilio = "SELECT id FROM utensilios WHERE tipo = ?";
    pool.query(sqlUtensilio, [tipo], (err, utensilios) => {
      if (err) return res.json({ status: "error", mensaje: err.message });
      if (utensilios.length === 0) {
        return res.json({ status: "error", mensaje: "Utensilio no encontrado" });
      }

      const sql =
        "INSERT INTO movimientos (estudiante_id, utensilio_id, fecha_retiro) VALUES (?, ?, NOW())";
      pool.query(sql, [estudiantes[0].id, utensilios[0].id], (err) => {
        if (err) return res.json({ status: "error", mensaje: err.message });
        res.json({ status: "ok", mensaje: "Retiro registrado" });
      });
    });
  });
});

// Registrar devolución (por ID de movimiento)
app.put("/devolucion/:id", (req, res) => {
  const sql = "UPDATE movimientos SET fecha_devolucion = NOW() WHERE id = ?";
  pool.query(sql, [req.params.id], (err) => {
    if (err) return res.json({ status: "error", mensaje: err.message });
    res.json({ status: "ok", mensaje: "Devolución registrada" });
  });
});

// Informe diario (agrupado por tipo)
app.get("/informe", (req, res) => {
  const sql = `
    SELECT u.tipo, COUNT(*) AS entregados
    FROM movimientos m
    JOIN utensilios u ON m.utensilio_id = u.id
    WHERE DATE(m.fecha_retiro) = CURDATE()
    GROUP BY u.tipo;
  `;
  pool.query(sql, (err, resultados) => {
    if (err) return res.json({ status: "error", mensaje: err.message });
    res.json(resultados);
  });
});

// Consultar utensilios pendientes por carnet
app.get("/pendientes/:carnet", (req, res) => {
  const carnet = req.params.carnet;
  const sql = `
    SELECT u.tipo, m.fecha_retiro
    FROM movimientos m
    JOIN estudiantes e ON m.estudiante_id = e.id
    JOIN utensilios u ON m.utensilio_id = u.id
    WHERE e.carnet = ? AND m.fecha_devolucion IS NULL;
  `;
  pool.query(sql, [carnet], (err, resultados) => {
    if (err) return res.json({ status: "error", mensaje: err.message });
    res.json(resultados);
  });
});

// Registrar devolución por carnet
app.put("/devolucionCarnet/:carnet", (req, res) => {
  const carnet = req.params.carnet;
  const sqlBuscar = `
    SELECT m.id
    FROM movimientos m
    JOIN estudiantes e ON m.estudiante_id = e.id
    WHERE e.carnet = ? AND m.fecha_devolucion IS NULL
    ORDER BY m.fecha_retiro DESC
    LIMIT 1;
  `;
  pool.query(sqlBuscar, [carnet], (err, filas) => {
    if (err) return res.json({ status: "error", mensaje: err.message });
    if (filas.length === 0) {
      return res.json({
        status: "error",
        mensaje: "No hay retiros pendientes para este carnet",
      });
    }

    pool.query(
      "UPDATE movimientos SET fecha_devolucion = NOW() WHERE id = ?",
      [filas[0].id],
      (err2) => {
        if (err2) return res.json({ status: "error", mensaje: err2.message });
        res.json({ status: "ok", mensaje: "Devolución registrada" });
      }
    );
  });
});

// Informe histórico por fecha
app.get("/informe/:fecha", (req, res) => {
  const fecha = req.params.fecha;
  const sql = `
    SELECT u.tipo, COUNT(*) AS entregados
    FROM movimientos m
    JOIN utensilios u ON m.utensilio_id = u.id
    WHERE DATE(m.fecha_retiro) = ?
    GROUP BY u.tipo;
  `;
  pool.query(sql, [fecha], (err, resultados) => {
    if (err) return res.json({ status: "error", mensaje: err.message });
    res.json(resultados);
  });
});

// ── Endpoints CRUD de Utensilios ──────────────────────────────

// Obtener todos los utensilios
app.get("/utensilios", (req, res) => {
  const sql = "SELECT id, tipo, cantidad FROM utensilios";
  pool.query(sql, (err, resultados) => {
    if (err) return res.json({ status: "error", mensaje: err.message });
    res.json(resultados);
  });
});

// Agregar utensilio
app.post("/utensilios", (req, res) => {
  const { tipo, cantidad } = req.body;
  const sql = "INSERT INTO utensilios (tipo, cantidad) VALUES (?, ?)";
  pool.query(sql, [tipo, cantidad], (err, resultado) => {
    if (err) return res.json({ status: "error", mensaje: err.message });
    res.json({ status: "ok", mensaje: "Utensilio agregado" });
  });
});

// Editar utensilio
app.put("/utensilios/:id", (req, res) => {
  const { tipo, cantidad } = req.body;
  const id = req.params.id;
  const sql = "UPDATE utensilios SET tipo=?, cantidad=? WHERE id=?";
  pool.query(sql, [tipo, cantidad, id], (err, resultado) => {
    if (err) return res.json({ status: "error", mensaje: err.message });
    res.json({ status: "ok", mensaje: "Utensilio actualizado" });
  });
});

// Eliminar utensilio
app.delete("/utensilios/:id", (req, res) => {
  const id = req.params.id;
  const sql = "DELETE FROM utensilios WHERE id=?";
  pool.query(sql, [id], (err, resultado) => {
    if (err) return res.json({ status: "error", mensaje: err.message });
    res.json({ status: "ok", mensaje: "Utensilio eliminado" });
  });
});

// ── Puerto dinámico (Railway asigna process.env.PORT) ─────────────────
const PORT = process.env.PORT || 3006;
app.listen(PORT, '0.0.0.0', () =>
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`)
);
