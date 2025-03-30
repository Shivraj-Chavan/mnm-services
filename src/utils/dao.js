import pool from "../config/db.js";
export const find = async (table, conditions = {}, populate = []) => {
  let query = `SELECT ${table}.* FROM ${table}`; 
  let values = [];

  if (populate.length) {
    const joins = populate.map(
      (joinTable) =>
        `JOIN ${joinTable} ON ${table}.${joinTable}_id = ${joinTable}.id`
    );
    query += ` ${joins.join(" ")}`;
  }

  if (Object.keys(conditions).length) {
    const whereClause = Object.keys(conditions)
      .map((key) => `${table}.${key} = ?`)
      .join(" AND ");
    query += ` WHERE ${whereClause}`;
    values = Object.values(conditions);
  }

  console.log("Generated Query:", query); // Debugging the query
  console.log({query,values});
  try {
    const [rows] = await pool.query(query, values);
    return rows;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Database query failed");
  }
};


// Insert Function
export const insert = async (table, data) => {
  const keys = Object.keys(data).join(", ");
  const placeholders = Object.keys(data).map(() => "?").join(", ");
  const values = Object.values(data);

  const query = `INSERT INTO ${table} (${keys}) VALUES (${placeholders})`;
  try {
    const [result] = await pool.query(query, values);
    return result.insertId;
  } catch (error) {
    console.error("Database Insert Error:", error);
    throw new Error("Insert operation failed");
  }
};

// Update Function
export const update = async (table, data, conditions) => {
  const setClause = Object.keys(data)
    .map((key) => `${key} = ?`)
    .join(", ");
  const whereClause = Object.keys(conditions)
    .map((key) => `${key} = ?`)
    .join(" AND ");

  const values = [...Object.values(data), ...Object.values(conditions)];
  const query = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;

  try {
    const [result] = await pool.query(query, values);
    return result.affectedRows;
  } catch (error) {
    console.error("Database Update Error:", error);
    throw new Error("Update operation failed");
  }
};

// Delete Function
export const remove = async (table, conditions) => {
  const whereClause = Object.keys(conditions)
    .map((key) => `${key} = ?`)
    .join(" AND ");
  const values = Object.values(conditions);

  const query = `DELETE FROM ${table} WHERE ${whereClause}`;
  try {
    const [result] = await pool.query(query, values);
    return result.affectedRows;
  } catch (error) {
    console.error("Database Delete Error:", error);
    throw new Error("Delete operation failed");
  }
};
