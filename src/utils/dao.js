import pool from "../config/db.js";

// Generic find function with dynamic table, conditions, and joins
export const find = async (table, conditions = {}, populate = []) => {
  let query = `SELECT * FROM ${table}`;
  let values = [];

  if (populate.length) {
    const joins = populate.map((joinTable) => `JOIN ${joinTable} ON ${table}.${joinTable}_id = ${joinTable}.id`);
    query += ` ${joins.join(" ")}`;
  }

  if (Object.keys(conditions).length) {
    const whereClause = Object.keys(conditions)
      .map((key) => `${key} = ?`)
      .join(" AND ");
    query += ` WHERE ${whereClause}`;
    values = Object.values(conditions);
  }

  const [rows] = await pool.query(query, values);
  return rows;
};

// Generic insert function
export const insert = async (table, data) => {
  const keys = Object.keys(data).join(", ");
  const placeholders = Object.keys(data).map(() => "?").join(", ");
  const values = Object.values(data);

  const query = `INSERT INTO ${table} (${keys}) VALUES (${placeholders})`;
  const [result] = await pool.query(query, values);

  return result.insertId;
};

// Generic update function
export const update = async (table, data, conditions) => {
  const setClause = Object.keys(data)
    .map((key) => `${key} = ?`)
    .join(", ");
  const whereClause = Object.keys(conditions)
    .map((key) => `${key} = ?`)
    .join(" AND ");
  
  const values = [...Object.values(data), ...Object.values(conditions)];
  const query = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;

  const [result] = await pool.query(query, values);
  return result.affectedRows;
};

// Generic delete function
export const remove = async (table, conditions) => {
  const whereClause = Object.keys(conditions)
    .map((key) => `${key} = ?`)
    .join(" AND ");
  const values = Object.values(conditions);

  const query = `DELETE FROM ${table} WHERE ${whereClause}`;
  const [result] = await pool.query(query, values);

  return result.affectedRows;
};
