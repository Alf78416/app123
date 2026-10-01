CREATE DATABASE cocina_escolar;
USE cocina_escolar;

CREATE TABLE estudiantes (
id INT AUTO_INCREMENT PRIMARY KEY,
nombre VARCHAR(100),
carnet VARCHAR(50),
codigo_barra VARCHAR(100)
);
CREATE TABLE utensilios (
id INT AUTO_INCREMENT PRIMARY KEY,
tipo VARCHAR(50) -- Plato, Vaso, Taza
);
CREATE TABLE movimientos (
id INT AUTO_INCREMENT PRIMARY KEY,
estudiante_id INT,
utensilio_id INT,
fecha_retiro DATETIME,
fecha_devolucion DATETIME,
FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id),
FOREIGN KEY (utensilio_id) REFERENCES utensilios(id)
);

INSERT INTO estudiantes (nombre, carnet, codigo_barra) VALUES ('Prueba', '010203', '');
INSERT INTO utensilios (tipo) VALUES ('Plato'), ('Vaso'), ('Taza');
INSERT INTO estudiantes (nombre, carnet, codigo_barra) VALUES ('Alvaro Serrano', '7193593', '');