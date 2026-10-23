const database = require("./database");

const db = {
    /**
     * Récupère une seule ligne
     * @param {string} table - Nom de la table
     * @param {object} where - Conditions
     * @param {string|string[]} select - Colonne(s) à récupérer (optionnel, défaut: *)
     */
    findOne(table, where, select = "*") {
        return new Promise((resolve, reject) => {
            const whereClause = Object.keys(where).map((key) => `${key} = ?`).join(" AND ");
            const values = Object.values(where);
            const columns = Array.isArray(select) ? select.join(", ") : select;
            const sql = `SELECT ${columns} FROM ${table} WHERE ${whereClause}`;

            database.get(sql, values, (err, row) => {
                if (err) reject(err);
                else resolve(row || null);
            });
        });
    },

    /**
     * Récupère toutes les lignes avec condition optionnelle
     * @param {string} table - Nom de la table
     * @param {object} where - Conditions (optionnel)
     * @param {string|string[]} select - Colonne(s) à récupérer (optionnel, défaut: *)
     */
    findMany(table, where = {}, select = "*") {
        return new Promise((resolve, reject) => {
            let sql = `SELECT`;
            const values = [];
            const columns = Array.isArray(select) ? select.join(", ") : select;
            sql += ` ${columns} FROM ${table}`;

            if (Object.keys(where).length > 0) {
                const whereClause = Object.keys(where).map((key) => `${key} = ?`).join(" AND ");
                sql += ` WHERE ${whereClause}`;
                values.push(...Object.values(where));
            }

            database.all(sql, values, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    },

    /**
     * Insère une ligne
     */
    insert(table, data) {
        return new Promise((resolve, reject) => {
            const keys = Object.keys(data);
            const values = Object.values(data);
            const placeholders = keys.map(() => "?").join(", ");

            const sql = `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})`;

            database.run(sql, values, function (err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, changes: this.changes });
            });
        });
    },

    /**
     * Insère ou ignore
     */
    insertOrIgnore(table, data) {
        return new Promise((resolve, reject) => {
            const keys = Object.keys(data);
            const values = Object.values(data);
            const placeholders = keys.map(() => "?").join(", ");

            const sql = `INSERT OR IGNORE INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})`;

            database.run(sql, values, function (err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, changes: this.changes });
            });
        });
    },

    /**
     * Met à jour une ou plusieurs lignes
     */
    update(table, data, where) {
        return new Promise((resolve, reject) => {
            const setClause = Object.keys(data).map((key) => `${key} = ?`).join(", ");
            const whereClause = Object.keys(where).map((key) => `${key} = ?`).join(" AND ");

            const values = [...Object.values(data), ...Object.values(where)];
            const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;

            database.run(sql, values, function (err) {
                if (err) reject(err);
                else resolve({ changes: this.changes });
            });
        });
    },

    /**
     * Supprime une ou plusieurs lignes
     */
    delete(table, where) {
        return new Promise((resolve, reject) => {
            const whereClause = Object.keys(where).map((key) => `${key} = ?`).join(" AND ");
            const values = Object.values(where);

            const sql = `DELETE FROM ${table} WHERE ${whereClause}`;

            database.run(sql, values, function (err) {
                if (err) reject(err);
                else resolve({ changes: this.changes });
            });
        });
    },

    /**
     * Compte les lignes
     */
    count(table, where = {}) {
        return new Promise((resolve, reject) => {
            let sql = `SELECT COUNT(*) as count FROM ${table}`;
            const values = [];

            if (Object.keys(where).length > 0) {
                const whereClause = Object.keys(where).map((key) => `${key} = ?`).join(" AND ");
                sql += ` WHERE ${whereClause}`;
                values.push(...Object.values(where));
            }

            database.get(sql, values, (err, row) => {
                if (err) reject(err);
                else resolve(row?.count || 0);
            });
        });
    },

    /**
     * Exécute une requête SQL personnalisée (une ligne)
     */
    query(sql, params = []) {
        return new Promise((resolve, reject) => {
            database.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row || null);
            });
        });
    },

    /**
     * Exécute une requête SQL personnalisée (toutes les lignes)
     */
    queryAll(sql, params = []) {
        return new Promise((resolve, reject) => {
            database.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    },

    /**
     * Exécute une requête SQL personnalisée (insert/update/delete)
     */
    exec(sql, params = []) {
        return new Promise((resolve, reject) => {
            database.run(sql, params, function (err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, changes: this.changes });
            });
        });
    }
};

module.exports = db;
