import pool from "../config/db.js";


// Submit contact form
export const submitContactForm = async(req,res) =>{
    const {companyName, username, phone, enquiry} = req.body;

    if (!companyName || !username || !phone || !enquiry) {
        return res.status(400).json({ message: "All fields are required" });
      }

      try {
        const query = `INSERT INTO contact_us (company_name, user_name, phone, enquiry) VALUES (?, ?, ?, ?)`;
        await pool.execute(query, [companyName, username, phone, enquiry]);
        res.status(201).json({ message: "Contact form submitted successfully" });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
      }
}


// Get all contact
export const getAllContacts = async (req,res) => {
    try {
    const [rows] = await pool.query(`SELECT * FROM contact_us ORDER BY created_at DESC`);
    res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};