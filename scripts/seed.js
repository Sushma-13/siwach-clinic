const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  console.log('🌱 Seeding Siwach Sanjeevani database...');

  // Seed users
  const adminHash = await bcrypt.hash('admin123', 12);
  const doctorHash = await bcrypt.hash('doctor123', 12);

  await pool.query(`
    INSERT INTO users (name, email, password_hash, role) VALUES
    ('Dr. Rajesh Siwach', 'admin@siwachsanjeevani.com', $1, 'admin'),
    ('Dr. Priya Sharma', 'priya@siwachsanjeevani.com', $2, 'doctor'),
    ('Neha Receptionist', 'reception@siwachsanjeevani.com', $2, 'receptionist')
    ON CONFLICT (email) DO NOTHING;
  `, [adminHash, doctorHash]);

  // Seed patients
  const patientResult = await pool.query(`
    INSERT INTO patients (first_name, last_name, date_of_birth, gender, phone, email, address, blood_group, emergency_contact_name, emergency_contact_phone)
    VALUES
    ('Amit', 'Kumar', '1985-03-15', 'male', '+91-9876543210', 'amit.kumar@email.com', '12 MG Road, Bengaluru', 'B+', 'Sunita Kumar', '+91-9876543211'),
    ('Sunita', 'Sharma', '1972-07-22', 'female', '+91-9845671234', 'sunita.s@email.com', '45 Indiranagar, Bengaluru', 'O+', 'Raj Sharma', '+91-9845671235'),
    ('Ravi', 'Patel', '1990-11-08', 'male', '+91-9123456789', NULL, '78 Koramangala, Bengaluru', 'A+', 'Meena Patel', '+91-9123456790'),
    ('Lakshmi', 'Nair', '1968-01-30', 'female', '+91-9988776655', 'lakshmi.nair@email.com', '23 Jayanagar, Bengaluru', 'AB+', NULL, NULL),
    ('Deepak', 'Singh', '1978-05-12', 'male', '+91-9001234567', NULL, '56 Whitefield, Bengaluru', 'B-', 'Kavita Singh', '+91-9001234568'),
    ('Pooja', 'Gupta', '2001-09-19', 'female', '+91-8877665544', 'pooja.g@email.com', '34 HSR Layout, Bengaluru', 'O-', 'Anil Gupta', '+91-8877665545'),
    ('Mohammed', 'Khan', '1965-12-05', 'male', '+91-9765432100', NULL, '89 RT Nagar, Bengaluru', 'A-', NULL, NULL),
    ('Anitha', 'Reddy', '1988-06-28', 'female', '+91-9654321000', 'anitha.r@email.com', '15 JP Nagar, Bengaluru', 'B+', 'Krishna Reddy', '+91-9654321001')
    ON CONFLICT DO NOTHING
    RETURNING id;
  `);

  // Fetch patient and user IDs
  const patients = await pool.query('SELECT id FROM patients ORDER BY id LIMIT 8');
  const doctors = await pool.query("SELECT id FROM users WHERE role IN ('admin', 'doctor') ORDER BY id LIMIT 2");

  if (patients.rows.length && doctors.rows.length) {
    const pIds = patients.rows.map(r => r.id);
    const dIds = doctors.rows.map(r => r.id);

    // Seed visits
    await pool.query(`
      INSERT INTO visits (patient_id, doctor_id, visit_date, chief_complaint, diagnosis, treatment, notes, follow_up_date, status)
      VALUES
      ($1, $9, NOW() - INTERVAL '30 days', 'Lower back pain radiating to left leg', 'L4-L5 disc herniation', 'NSAIDs, physiotherapy, rest', 'MRI recommended', CURRENT_DATE + 30, 'completed'),
      ($2, $10, NOW() - INTERVAL '15 days', 'Right knee pain and swelling', 'Osteoarthritis Grade II', 'Intra-articular injection, analgesics', 'Weight loss advised', CURRENT_DATE + 45, 'completed'),
      ($3, $9, NOW() - INTERVAL '7 days', 'Shoulder pain after fall', 'Rotator cuff tear', 'Surgery consultation, immobilization', 'Referred to surgical team', CURRENT_DATE + 14, 'completed'),
      ($4, $10, NOW() - INTERVAL '60 days', 'Hip replacement follow-up', 'Post hip arthroplasty recovery', 'Continued physiotherapy', 'Recovery on track', CURRENT_DATE + 60, 'completed'),
      ($1, $9, NOW() - INTERVAL '90 days', 'Neck stiffness', 'Cervical spondylosis', 'Muscle relaxants, physiotherapy', 'Initial presentation', CURRENT_DATE - 30, 'completed'),
      ($5, $10, NOW() - INTERVAL '3 days', 'Knee pain worsening', 'Meniscus tear', 'MRI ordered, rest and ice', 'Athlete - urgent care needed', CURRENT_DATE + 7, 'completed'),
      ($6, $9, NOW() - INTERVAL '1 day', 'Ankle sprain from sports', 'Grade II lateral ankle sprain', 'RICE protocol, brace', 'First visit', CURRENT_DATE + 14, 'completed'),
      ($7, $10, NOW() - INTERVAL '45 days', 'Chronic hip pain', 'Avascular necrosis Stage II', 'Core decompression planned', 'Staged treatment plan', CURRENT_DATE + 30, 'completed'),
      ($8, $9, NOW() - INTERVAL '5 days', 'Wrist pain after fall', 'Distal radius fracture', 'Cast immobilization', 'Follow-up X-ray in 3 weeks', CURRENT_DATE + 21, 'completed');
    `, [pIds[0], pIds[1], pIds[2], pIds[3], pIds[4], pIds[5], pIds[6], pIds[7], dIds[0], dIds[1] || dIds[0]]);

    // Seed appointments (today and future)
    const today = new Date().toISOString().split('T')[0];
    await pool.query(`
      INSERT INTO appointmentss (patient_id, doctor_id, appointment_date, appointment_time, reason, status)
      VALUES
      ($1, $9, $11, '09:00', 'Follow-up for L4-L5 disc herniation', 'scheduled'),
      ($2, $10, $11, '09:30', 'Knee pain review', 'scheduled'),
      ($3, $9, $11, '10:00', 'Shoulder surgery consultation', 'scheduled'),
      ($5, $10, $11, '10:30', 'MRI results review', 'completed'),
      ($6, $9, $11, '11:00', 'Ankle sprain follow-up', 'scheduled'),
      ($4, $10, $11, '11:30', 'Hip replacement 3-month review', 'completed'),
      ($7, $9, $11, '12:00', 'Pre-op consultation', 'scheduled'),
      ($8, $10, $11::date + INTERVAL '1 day', '09:00', 'New patient evaluation', 'scheduled'),
      ($1, $9, $11::date + INTERVAL '2 days', '10:00', 'Physiotherapy assessment', 'scheduled'),
      ($2, $10, $11::date + INTERVAL '3 days', '09:30', 'Injection therapy', 'scheduled');
    `, [pIds[0], pIds[1], pIds[2], pIds[3], pIds[4], pIds[5], pIds[6], pIds[7], dIds[0], dIds[1] || dIds[0], today]);
  }

  console.log('✅ Database seeded successfully!');
  console.log('');
  console.log('👤 Login credentials:');
  console.log('   Admin:       admin@siwachsanjeevani.com / admin123');
  console.log('   Doctor:      priya@siwachsanjeevani.com / doctor123');
  console.log('   Receptionist: reception@siwachsanjeevani.com / doctor123');
  await pool.end();
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
