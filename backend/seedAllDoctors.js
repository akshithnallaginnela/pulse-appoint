require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Doctor = require('./models/Doctor');

const doctors = [
  // ── Cardiologist (2) ──
  {
    firstName: 'Rajesh', lastName: 'Sharma', email: 'dr.rajesh.sharma@pulse.com', phone: '9876543210',
    dateOfBirth: '1980-05-15', gender: 'male', city: 'Mumbai', state: 'Maharashtra',
    license: 'MHMC100001', specialization: 'Cardiologist', experience: 12, fee: 1200,
    degree: 'MD', institution: 'AIIMS Delhi', year: 2008, bio: 'Experienced cardiologist specializing in heart disease prevention and treatment.',
    languages: ['English', 'Hindi', 'Marathi'], services: ['ECG', 'Echo', 'Stress Test', 'Heart Checkup'],
    schedule: { start: '09:00', end: '17:00', breakStart: '13:00', breakEnd: '14:00', sat: true }
  },
  {
    firstName: 'Meena', lastName: 'Iyer', email: 'dr.meena.iyer@pulse.com', phone: '9876543211',
    dateOfBirth: '1982-09-22', gender: 'female', city: 'Chennai', state: 'Tamil Nadu',
    license: 'TNMC100002', specialization: 'Cardiologist', experience: 10, fee: 1100,
    degree: 'DM', institution: 'Madras Medical College', year: 2010, bio: 'Interventional cardiologist with expertise in angioplasty and pacemaker implantation.',
    languages: ['English', 'Hindi', 'Tamil'], services: ['Angioplasty', 'Pacemaker', 'ECG', 'Cardiac Rehab'],
    schedule: { start: '10:00', end: '18:00', breakStart: '13:30', breakEnd: '14:30', sat: false }
  },

  // ── Pediatrician (2) ──
  {
    firstName: 'Priya', lastName: 'Patel', email: 'dr.priya.patel@pulse.com', phone: '9876543212',
    dateOfBirth: '1985-08-20', gender: 'female', city: 'Bangalore', state: 'Karnataka',
    license: 'KAMC100003', specialization: 'Pediatrician', experience: 8, fee: 1000,
    degree: 'MD', institution: "St. John's Medical College", year: 2013, bio: 'Caring pediatrician with expertise in child health and development.',
    languages: ['English', 'Hindi', 'Kannada'], services: ['Child Health Checkup', 'Vaccination', 'Growth Monitoring', 'Newborn Care'],
    schedule: { start: '10:00', end: '18:00', breakStart: '13:30', breakEnd: '14:30', sat: true }
  },
  {
    firstName: 'Suresh', lastName: 'Nair', email: 'dr.suresh.nair@pulse.com', phone: '9876543213',
    dateOfBirth: '1979-03-14', gender: 'male', city: 'Kochi', state: 'Kerala',
    license: 'KLMC100004', specialization: 'Pediatrician', experience: 14, fee: 900,
    degree: 'MD', institution: 'Government Medical College Kochi', year: 2007, bio: 'Senior pediatrician specializing in neonatal care and childhood infections.',
    languages: ['English', 'Hindi', 'Malayalam'], services: ['Neonatal Care', 'Vaccination', 'Child Development', 'Infection Treatment'],
    schedule: { start: '09:00', end: '16:00', breakStart: '12:30', breakEnd: '13:30', sat: false }
  },

  // ── Dermatologist (2) ──
  {
    firstName: 'Ananya', lastName: 'Reddy', email: 'dr.ananya.reddy@pulse.com', phone: '9876543214',
    dateOfBirth: '1988-12-05', gender: 'female', city: 'Hyderabad', state: 'Telangana',
    license: 'TSMC100005', specialization: 'Dermatologist', experience: 6, fee: 800,
    degree: 'MD', institution: 'Osmania Medical College', year: 2016, bio: 'Dermatologist specializing in acne, eczema, and cosmetic procedures.',
    languages: ['English', 'Hindi', 'Telugu'], services: ['Acne Treatment', 'Laser Therapy', 'Skin Biopsy', 'Cosmetic Dermatology'],
    schedule: { start: '10:00', end: '17:00', breakStart: '13:00', breakEnd: '14:00', sat: true }
  },
  {
    firstName: 'Vikram', lastName: 'Mehta', email: 'dr.vikram.mehta@pulse.com', phone: '9876543215',
    dateOfBirth: '1983-07-18', gender: 'male', city: 'Pune', state: 'Maharashtra',
    license: 'MHMC100006', specialization: 'Dermatologist', experience: 11, fee: 1000,
    degree: 'MD', institution: 'B.J. Medical College Pune', year: 2011, bio: 'Expert in treating psoriasis, hair loss, and allergic skin conditions.',
    languages: ['English', 'Hindi', 'Marathi'], services: ['Psoriasis Treatment', 'Hair Loss Therapy', 'Allergy Testing', 'Skin Surgery'],
    schedule: { start: '09:30', end: '17:30', breakStart: '13:00', breakEnd: '14:00', sat: false }
  },

  // ── Orthopedic Surgeon (2) ──
  {
    firstName: 'Amit', lastName: 'Kumar', email: 'dr.amit.kumar@pulse.com', phone: '9876543216',
    dateOfBirth: '1978-11-10', gender: 'male', city: 'New Delhi', state: 'Delhi',
    license: 'DLMC100007', specialization: 'Orthopedic Surgeon', experience: 15, fee: 1500,
    degree: 'MS', institution: 'AIIMS Delhi', year: 2006, bio: 'Senior orthopedic surgeon specializing in joint replacements and sports injuries.',
    languages: ['English', 'Hindi', 'Punjabi'], services: ['Joint Replacement', 'Fracture Treatment', 'Sports Medicine', 'Spine Surgery'],
    schedule: { start: '08:00', end: '16:00', breakStart: '12:30', breakEnd: '13:30', sat: true }
  },
  {
    firstName: 'Deepa', lastName: 'Krishnan', email: 'dr.deepa.krishnan@pulse.com', phone: '9876543217',
    dateOfBirth: '1986-04-25', gender: 'female', city: 'Coimbatore', state: 'Tamil Nadu',
    license: 'TNMC100008', specialization: 'Orthopedic Surgeon', experience: 7, fee: 1100,
    degree: 'MS', institution: 'PSG Medical College', year: 2015, bio: 'Orthopedic specialist focused on arthroscopy and minimally invasive surgery.',
    languages: ['English', 'Hindi', 'Tamil'], services: ['Arthroscopy', 'Fracture Care', 'Physiotherapy Guidance', 'Ligament Repair'],
    schedule: { start: '09:00', end: '17:00', breakStart: '13:00', breakEnd: '14:00', sat: false }
  },

  // ── Neurologist (2) ──
  {
    firstName: 'Sanjay', lastName: 'Verma', email: 'dr.sanjay.verma@pulse.com', phone: '9876543218',
    dateOfBirth: '1977-06-30', gender: 'male', city: 'Lucknow', state: 'Uttar Pradesh',
    license: 'UPMC100009', specialization: 'Neurologist', experience: 16, fee: 1400,
    degree: 'DM', institution: 'SGPGI Lucknow', year: 2005, bio: 'Expert neurologist treating epilepsy, migraines, and movement disorders.',
    languages: ['English', 'Hindi'], services: ['EEG', 'EMG', 'Migraine Treatment', 'Stroke Management'],
    schedule: { start: '09:00', end: '17:00', breakStart: '13:00', breakEnd: '14:00', sat: false }
  },
  {
    firstName: 'Kavitha', lastName: 'Sundaram', email: 'dr.kavitha.sundaram@pulse.com', phone: '9876543219',
    dateOfBirth: '1984-01-12', gender: 'female', city: 'Bangalore', state: 'Karnataka',
    license: 'KAMC100010', specialization: 'Neurologist', experience: 9, fee: 1300,
    degree: 'DM', institution: 'NIMHANS Bangalore', year: 2013, bio: 'Neurologist specializing in headache disorders and neurodegenerative diseases.',
    languages: ['English', 'Hindi', 'Kannada', 'Tamil'], services: ['Headache Clinic', 'Nerve Conduction', 'Memory Assessment', 'Botox for Migraine'],
    schedule: { start: '10:00', end: '18:00', breakStart: '13:30', breakEnd: '14:30', sat: true }
  },

  // ── General Physician (2) ──
  {
    firstName: 'Ramesh', lastName: 'Gupta', email: 'dr.ramesh.gupta@pulse.com', phone: '9876543220',
    dateOfBirth: '1975-09-08', gender: 'male', city: 'Jaipur', state: 'Rajasthan',
    license: 'RJMC100011', specialization: 'General Physician', experience: 20, fee: 600,
    degree: 'MD', institution: 'SMS Medical College Jaipur', year: 2002, bio: 'Trusted family physician providing comprehensive primary care for all ages.',
    languages: ['English', 'Hindi'], services: ['General Checkup', 'Fever Treatment', 'Diabetes Management', 'Blood Pressure Control'],
    schedule: { start: '08:30', end: '17:30', breakStart: '13:00', breakEnd: '14:00', sat: true }
  },
  {
    firstName: 'Lakshmi', lastName: 'Rao', email: 'dr.lakshmi.rao@pulse.com', phone: '9876543221',
    dateOfBirth: '1990-02-28', gender: 'female', city: 'Visakhapatnam', state: 'Andhra Pradesh',
    license: 'APMC100012', specialization: 'General Physician', experience: 4, fee: 500,
    degree: 'MD', institution: 'Andhra Medical College', year: 2020, bio: 'Young and dedicated physician focused on preventive care and lifestyle medicine.',
    languages: ['English', 'Hindi', 'Telugu'], services: ['Health Screening', 'Preventive Care', 'Chronic Disease Management', 'Vaccination'],
    schedule: { start: '09:00', end: '18:00', breakStart: '13:00', breakEnd: '14:00', sat: true }
  },

  // ── Gynecologist (2) ──
  {
    firstName: 'Sunita', lastName: 'Deshmukh', email: 'dr.sunita.deshmukh@pulse.com', phone: '9876543222',
    dateOfBirth: '1981-10-03', gender: 'female', city: 'Nagpur', state: 'Maharashtra',
    license: 'MHMC100013', specialization: 'Gynecologist', experience: 13, fee: 1100,
    degree: 'MD', institution: 'Government Medical College Nagpur', year: 2009, bio: 'Experienced gynecologist for pregnancy care, PCOS, and minimally invasive surgeries.',
    languages: ['English', 'Hindi', 'Marathi'], services: ['Pregnancy Care', 'PCOS Treatment', 'Laparoscopy', 'Fertility Consultation'],
    schedule: { start: '09:00', end: '17:00', breakStart: '13:00', breakEnd: '14:00', sat: false }
  },
  {
    firstName: 'Fatima', lastName: 'Khan', email: 'dr.fatima.khan@pulse.com', phone: '9876543223',
    dateOfBirth: '1987-05-19', gender: 'female', city: 'Bhopal', state: 'Madhya Pradesh',
    license: 'MPMC100014', specialization: 'Gynecologist', experience: 7, fee: 900,
    degree: 'MS', institution: 'Gandhi Medical College Bhopal', year: 2015, bio: 'Compassionate gynecologist specializing in high-risk pregnancies and reproductive health.',
    languages: ['English', 'Hindi'], services: ['High-Risk Pregnancy', 'Ultrasound', 'Menstrual Disorders', 'Cervical Screening'],
    schedule: { start: '10:00', end: '18:00', breakStart: '13:30', breakEnd: '14:30', sat: true }
  },

  // ── Psychiatrist (2) ──
  {
    firstName: 'Arjun', lastName: 'Bhat', email: 'dr.arjun.bhat@pulse.com', phone: '9876543224',
    dateOfBirth: '1983-08-11', gender: 'male', city: 'Bangalore', state: 'Karnataka',
    license: 'KAMC100015', specialization: 'Psychiatrist', experience: 10, fee: 1200,
    degree: 'MD', institution: 'NIMHANS Bangalore', year: 2012, bio: 'Psychiatrist with expertise in anxiety, depression, and addiction treatment.',
    languages: ['English', 'Hindi', 'Kannada'], services: ['CBT', 'Anxiety Treatment', 'Depression Management', 'Addiction Counseling'],
    schedule: { start: '10:00', end: '18:00', breakStart: '13:00', breakEnd: '14:00', sat: false }
  },
  {
    firstName: 'Neha', lastName: 'Saxena', email: 'dr.neha.saxena@pulse.com', phone: '9876543225',
    dateOfBirth: '1989-11-27', gender: 'female', city: 'New Delhi', state: 'Delhi',
    license: 'DLMC100016', specialization: 'Psychiatrist', experience: 5, fee: 1000,
    degree: 'MD', institution: 'AIIMS Delhi', year: 2018, bio: 'Child and adolescent psychiatrist focused on ADHD, anxiety, and behavioral issues.',
    languages: ['English', 'Hindi', 'Punjabi'], services: ['Child Psychiatry', 'ADHD Treatment', 'Sleep Disorders', 'Stress Management'],
    schedule: { start: '09:30', end: '17:30', breakStart: '13:00', breakEnd: '14:00', sat: true }
  },

  // ── Ophthalmologist (2) ──
  {
    firstName: 'Ravi', lastName: 'Shankar', email: 'dr.ravi.shankar@pulse.com', phone: '9876543226',
    dateOfBirth: '1976-04-09', gender: 'male', city: 'Chennai', state: 'Tamil Nadu',
    license: 'TNMC100017', specialization: 'Ophthalmologist', experience: 18, fee: 1000,
    degree: 'MS', institution: 'Sankara Nethralaya Chennai', year: 2004, bio: 'Senior eye surgeon specializing in cataract and LASIK procedures.',
    languages: ['English', 'Hindi', 'Tamil'], services: ['Cataract Surgery', 'LASIK', 'Glaucoma Treatment', 'Retina Care'],
    schedule: { start: '08:30', end: '16:30', breakStart: '12:30', breakEnd: '13:30', sat: true }
  },
  {
    firstName: 'Pooja', lastName: 'Aggarwal', email: 'dr.pooja.aggarwal@pulse.com', phone: '9876543227',
    dateOfBirth: '1991-07-14', gender: 'female', city: 'Chandigarh', state: 'Punjab',
    license: 'PBMC100018', specialization: 'Ophthalmologist', experience: 3, fee: 700,
    degree: 'MS', institution: 'PGI Chandigarh', year: 2021, bio: 'Young ophthalmologist focused on pediatric eye care and contact lens fitting.',
    languages: ['English', 'Hindi', 'Punjabi'], services: ['Eye Exam', 'Pediatric Eye Care', 'Contact Lens', 'Dry Eye Treatment'],
    schedule: { start: '10:00', end: '18:00', breakStart: '13:30', breakEnd: '14:30', sat: false }
  },

  // ── ENT Specialist (2) ──
  {
    firstName: 'Manoj', lastName: 'Tiwari', email: 'dr.manoj.tiwari@pulse.com', phone: '9876543228',
    dateOfBirth: '1980-12-20', gender: 'male', city: 'Patna', state: 'Bihar',
    license: 'BRMC100019', specialization: 'ENT Specialist', experience: 13, fee: 800,
    degree: 'MS', institution: 'PMCH Patna', year: 2009, bio: 'ENT surgeon specializing in sinus surgery and hearing restoration.',
    languages: ['English', 'Hindi'], services: ['Sinus Surgery', 'Hearing Test', 'Tonsillectomy', 'Allergy Treatment'],
    schedule: { start: '09:00', end: '17:00', breakStart: '13:00', breakEnd: '14:00', sat: true }
  },
  {
    firstName: 'Divya', lastName: 'Menon', email: 'dr.divya.menon@pulse.com', phone: '9876543229',
    dateOfBirth: '1986-06-05', gender: 'female', city: 'Trivandrum', state: 'Kerala',
    license: 'KLMC100020', specialization: 'ENT Specialist', experience: 8, fee: 900,
    degree: 'MS', institution: 'Medical College Trivandrum', year: 2014, bio: 'ENT specialist with expertise in voice disorders and pediatric ENT problems.',
    languages: ['English', 'Hindi', 'Malayalam'], services: ['Voice Therapy', 'Ear Surgery', 'Snoring Treatment', 'Pediatric ENT'],
    schedule: { start: '10:00', end: '17:00', breakStart: '13:00', breakEnd: '14:00', sat: false }
  },

  // ── Gastroenterologist (2) ──
  {
    firstName: 'Ashok', lastName: 'Joshi', email: 'dr.ashok.joshi@pulse.com', phone: '9876543230',
    dateOfBirth: '1979-02-17', gender: 'male', city: 'Ahmedabad', state: 'Gujarat',
    license: 'GJMC100021', specialization: 'Gastroenterologist', experience: 14, fee: 1300,
    degree: 'DM', institution: 'GI Institute Ahmedabad', year: 2008, bio: 'Expert gastroenterologist specializing in liver diseases and endoscopy.',
    languages: ['English', 'Hindi', 'Gujarati'], services: ['Endoscopy', 'Colonoscopy', 'Liver Treatment', 'IBS Management'],
    schedule: { start: '09:00', end: '17:00', breakStart: '13:00', breakEnd: '14:00', sat: false }
  },
  {
    firstName: 'Swati', lastName: 'Banerjee', email: 'dr.swati.banerjee@pulse.com', phone: '9876543231',
    dateOfBirth: '1985-10-30', gender: 'female', city: 'Kolkata', state: 'West Bengal',
    license: 'WBMC100022', specialization: 'Gastroenterologist', experience: 9, fee: 1100,
    degree: 'DM', institution: 'IPGMER Kolkata', year: 2013, bio: 'Gastroenterologist focused on acid reflux, ulcers, and inflammatory bowel disease.',
    languages: ['English', 'Hindi', 'Bengali'], services: ['Acid Reflux Treatment', 'Ulcer Care', 'IBD Management', 'Nutrition Counseling'],
    schedule: { start: '10:00', end: '18:00', breakStart: '13:30', breakEnd: '14:30', sat: true }
  },

  // ── Pulmonologist (2) ──
  {
    firstName: 'Anil', lastName: 'Kapoor', email: 'dr.anil.kapoor@pulse.com', phone: '9876543232',
    dateOfBirth: '1981-03-22', gender: 'male', city: 'Mumbai', state: 'Maharashtra',
    license: 'MHMC100023', specialization: 'Pulmonologist', experience: 12, fee: 1200,
    degree: 'DM', institution: 'KEM Hospital Mumbai', year: 2010, bio: 'Pulmonologist specializing in asthma, COPD, and sleep apnea treatment.',
    languages: ['English', 'Hindi', 'Marathi'], services: ['Asthma Treatment', 'COPD Care', 'Pulmonary Function Test', 'Sleep Study'],
    schedule: { start: '09:00', end: '17:00', breakStart: '13:00', breakEnd: '14:00', sat: false }
  },
  {
    firstName: 'Revathi', lastName: 'Pillai', email: 'dr.revathi.pillai@pulse.com', phone: '9876543233',
    dateOfBirth: '1987-08-15', gender: 'female', city: 'Bangalore', state: 'Karnataka',
    license: 'KAMC100024', specialization: 'Pulmonologist', experience: 7, fee: 1000,
    degree: 'MD', institution: 'MS Ramaiah Medical College', year: 2015, bio: 'Pulmonologist with focus on tuberculosis, bronchitis, and lung infections.',
    languages: ['English', 'Hindi', 'Kannada', 'Malayalam'], services: ['TB Treatment', 'Bronchoscopy', 'Lung Infection Care', 'Allergy Testing'],
    schedule: { start: '10:00', end: '18:00', breakStart: '13:00', breakEnd: '14:00', sat: true }
  },

  // ── Urologist (2) ──
  {
    firstName: 'Nikhil', lastName: 'Sinha', email: 'dr.nikhil.sinha@pulse.com', phone: '9876543234',
    dateOfBirth: '1980-01-05', gender: 'male', city: 'Kolkata', state: 'West Bengal',
    license: 'WBMC100025', specialization: 'Urologist', experience: 14, fee: 1400,
    degree: 'MCh', institution: 'AIIMS Delhi', year: 2008, bio: 'Urologist specializing in kidney stones, prostate disorders, and urinary infections.',
    languages: ['English', 'Hindi', 'Bengali'], services: ['Kidney Stone Treatment', 'Prostate Care', 'UTI Treatment', 'Urological Surgery'],
    schedule: { start: '09:00', end: '16:00', breakStart: '12:30', breakEnd: '13:30', sat: false }
  },
  {
    firstName: 'Geeta', lastName: 'Malhotra', email: 'dr.geeta.malhotra@pulse.com', phone: '9876543235',
    dateOfBirth: '1988-04-12', gender: 'female', city: 'New Delhi', state: 'Delhi',
    license: 'DLMC100026', specialization: 'Urologist', experience: 6, fee: 1100,
    degree: 'MCh', institution: 'Safdarjung Hospital Delhi', year: 2016, bio: 'Female urologist specializing in pediatric urology and minimally invasive surgery.',
    languages: ['English', 'Hindi'], services: ['Pediatric Urology', 'Bladder Disorders', 'Minimally Invasive Surgery', 'Incontinence Treatment'],
    schedule: { start: '10:00', end: '18:00', breakStart: '13:00', breakEnd: '14:00', sat: true }
  },

  // ── Endocrinologist (2) ──
  {
    firstName: 'Prakash', lastName: 'Chandra', email: 'dr.prakash.chandra@pulse.com', phone: '9876543236',
    dateOfBirth: '1978-07-20', gender: 'male', city: 'Hyderabad', state: 'Telangana',
    license: 'TSMC100027', specialization: 'Endocrinologist', experience: 16, fee: 1300,
    degree: 'DM', institution: 'Nizam Institute of Medical Sciences', year: 2006, bio: 'Leading endocrinologist treating diabetes, thyroid disorders, and hormonal imbalances.',
    languages: ['English', 'Hindi', 'Telugu'], services: ['Diabetes Management', 'Thyroid Treatment', 'Hormone Therapy', 'Obesity Management'],
    schedule: { start: '09:00', end: '17:00', breakStart: '13:00', breakEnd: '14:00', sat: true }
  },
  {
    firstName: 'Ishita', lastName: 'Roy', email: 'dr.ishita.roy@pulse.com', phone: '9876543237',
    dateOfBirth: '1990-11-08', gender: 'female', city: 'Guwahati', state: 'Assam',
    license: 'ASMC100028', specialization: 'Endocrinologist', experience: 4, fee: 900,
    degree: 'DM', institution: 'Gauhati Medical College', year: 2020, bio: 'Endocrinologist focused on PCOS-related hormonal issues and pediatric endocrinology.',
    languages: ['English', 'Hindi', 'Bengali'], services: ['PCOS Hormonal Care', 'Growth Disorders', 'Adrenal Disorders', 'Calcium Disorders'],
    schedule: { start: '10:00', end: '17:00', breakStart: '13:00', breakEnd: '14:00', sat: false }
  },

  // ── Dentist (2) ──
  {
    firstName: 'Rohit', lastName: 'Sethi', email: 'dr.rohit.sethi@pulse.com', phone: '9876543238',
    dateOfBirth: '1984-05-25', gender: 'male', city: 'Chandigarh', state: 'Punjab',
    license: 'PBMC100029', specialization: 'Dentist', experience: 10, fee: 700,
    degree: 'BDS', institution: 'Government Dental College Chandigarh', year: 2012, bio: 'Experienced dentist specializing in root canals, crowns, and cosmetic dentistry.',
    languages: ['English', 'Hindi', 'Punjabi'], services: ['Root Canal', 'Teeth Whitening', 'Dental Implants', 'Braces'],
    schedule: { start: '09:00', end: '17:00', breakStart: '13:00', breakEnd: '14:00', sat: true }
  },
  {
    firstName: 'Shruti', lastName: 'Das', email: 'dr.shruti.das@pulse.com', phone: '9876543239',
    dateOfBirth: '1992-09-10', gender: 'female', city: 'Bhubaneswar', state: 'Odisha',
    license: 'ODMC100030', specialization: 'Dentist', experience: 3, fee: 500,
    degree: 'BDS', institution: 'SCB Dental College Cuttack', year: 2021, bio: 'Young dentist skilled in cavity fillings, gum care, and preventive dentistry.',
    languages: ['English', 'Hindi'], services: ['Cavity Filling', 'Gum Treatment', 'Scaling', 'Tooth Extraction'],
    schedule: { start: '10:00', end: '18:00', breakStart: '13:30', breakEnd: '14:30', sat: false }
  },

  // ── Oncologist (1) ──
  {
    firstName: 'Vivek', lastName: 'Mishra', email: 'dr.vivek.mishra@pulse.com', phone: '9876543240',
    dateOfBirth: '1976-12-01', gender: 'male', city: 'Mumbai', state: 'Maharashtra',
    license: 'MHMC100031', specialization: 'Oncologist', experience: 20, fee: 2000,
    degree: 'DM', institution: 'Tata Memorial Hospital Mumbai', year: 2002, bio: 'Senior oncologist with 20 years of experience in cancer treatment and chemotherapy.',
    languages: ['English', 'Hindi', 'Marathi'], services: ['Chemotherapy', 'Cancer Screening', 'Tumor Treatment', 'Palliative Care'],
    schedule: { start: '09:00', end: '16:00', breakStart: '12:30', breakEnd: '13:30', sat: false }
  },

  // ── Rheumatologist (1) ──
  {
    firstName: 'Kiran', lastName: 'Kulkarni', email: 'dr.kiran.kulkarni@pulse.com', phone: '9876543241',
    dateOfBirth: '1982-03-18', gender: 'male', city: 'Pune', state: 'Maharashtra',
    license: 'MHMC100032', specialization: 'Rheumatologist', experience: 11, fee: 1200,
    degree: 'DM', institution: 'KEM Hospital Mumbai', year: 2011, bio: 'Rheumatologist specializing in arthritis, lupus, and autoimmune conditions.',
    languages: ['English', 'Hindi', 'Marathi'], services: ['Arthritis Treatment', 'Lupus Management', 'Joint Injection', 'Autoimmune Screening'],
    schedule: { start: '09:30', end: '17:30', breakStart: '13:00', breakEnd: '14:00', sat: true }
  },

  // ── Nephrologist (1) ──
  {
    firstName: 'Harish', lastName: 'Mohan', email: 'dr.harish.mohan@pulse.com', phone: '9876543242',
    dateOfBirth: '1979-07-22', gender: 'male', city: 'Chennai', state: 'Tamil Nadu',
    license: 'TNMC100033', specialization: 'Nephrologist', experience: 15, fee: 1500,
    degree: 'DM', institution: 'CMC Vellore', year: 2007, bio: 'Nephrologist specializing in chronic kidney disease, dialysis, and kidney transplant care.',
    languages: ['English', 'Hindi', 'Tamil'], services: ['Dialysis Management', 'Kidney Transplant Care', 'CKD Treatment', 'Hypertension Management'],
    schedule: { start: '08:30', end: '16:30', breakStart: '12:30', breakEnd: '13:30', sat: false }
  },

  // ── Internal Medicine (1) ──
  {
    firstName: 'Shalini', lastName: 'Thakur', email: 'dr.shalini.thakur@pulse.com', phone: '9876543243',
    dateOfBirth: '1985-02-14', gender: 'female', city: 'Shimla', state: 'Himachal Pradesh',
    license: 'HPMC100034', specialization: 'Internal Medicine', experience: 9, fee: 800,
    degree: 'MD', institution: 'IGMC Shimla', year: 2013, bio: 'Internist providing comprehensive diagnosis and management of complex medical conditions.',
    languages: ['English', 'Hindi'], services: ['Comprehensive Diagnosis', 'Chronic Disease Management', 'Preventive Medicine', 'Health Screening'],
    schedule: { start: '09:00', end: '17:00', breakStart: '13:00', breakEnd: '14:00', sat: true }
  },

  // ── Family Medicine (1) ──
  {
    firstName: 'Joseph', lastName: 'Thomas', email: 'dr.joseph.thomas@pulse.com', phone: '9876543244',
    dateOfBirth: '1974-09-05', gender: 'male', city: 'Kochi', state: 'Kerala',
    license: 'KLMC100035', specialization: 'Family Medicine', experience: 22, fee: 600,
    degree: 'MD', institution: 'CMC Vellore', year: 2000, bio: 'Family physician providing whole-family care from pediatrics to geriatrics.',
    languages: ['English', 'Hindi', 'Malayalam'], services: ['Family Health', 'Geriatric Care', 'Preventive Checkup', 'Chronic Disease Management'],
    schedule: { start: '08:00', end: '16:00', breakStart: '12:00', breakEnd: '13:00', sat: true }
  },

  // ── Emergency Medicine (1) ──
  {
    firstName: 'Arun', lastName: 'Singh', email: 'dr.arun.singh@pulse.com', phone: '9876543245',
    dateOfBirth: '1983-11-30', gender: 'male', city: 'New Delhi', state: 'Delhi',
    license: 'DLMC100036', specialization: 'Emergency Medicine', experience: 10, fee: 1500,
    degree: 'MD', institution: 'Maulana Azad Medical College', year: 2012, bio: 'Emergency medicine specialist trained in trauma, critical care, and acute medical emergencies.',
    languages: ['English', 'Hindi', 'Punjabi'], services: ['Trauma Care', 'Critical Care', 'Emergency Stabilization', 'Poison Management'],
    schedule: { start: '08:00', end: '20:00', breakStart: '14:00', breakEnd: '15:00', sat: true }
  },
];

function buildAvailability(sched) {
  const weekday = {
    isAvailable: true,
    startTime: sched.start,
    endTime: sched.end,
    breakStartTime: sched.breakStart,
    breakEndTime: sched.breakEnd,
  };
  return {
    monday: { ...weekday },
    tuesday: { ...weekday },
    wednesday: { ...weekday },
    thursday: { ...weekday },
    friday: { ...weekday },
    saturday: sched.sat
      ? { isAvailable: true, startTime: sched.start, endTime: '13:00' }
      : { isAvailable: false },
    sunday: { isAvailable: false },
  };
}

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/doctor-appointment');
    console.log('Connected to MongoDB');

    // Remove ONLY the seeded doctor users (by email pattern) and their profiles
    const seededEmails = doctors.map(d => d.email);
    const existingUsers = await User.find({ email: { $in: seededEmails } }).select('_id');
    const existingUserIds = existingUsers.map(u => u._id);

    if (existingUserIds.length > 0) {
      await Doctor.deleteMany({ userId: { $in: existingUserIds } });
      await User.deleteMany({ _id: { $in: existingUserIds } });
      console.log(`Cleaned up ${existingUserIds.length} previously seeded doctors`);
    }

    let created = 0;
    for (const d of doctors) {
      const user = new User({
        firstName: d.firstName,
        lastName: d.lastName,
        email: d.email,
        password: 'Doctor@123',   // pre-save hook will hash
        phone: d.phone,
        dateOfBirth: d.dateOfBirth,
        gender: d.gender,
        address: { city: d.city, state: d.state, country: 'India' },
        role: 'doctor',
        isEmailVerified: true,
        isActive: true,
      });
      const savedUser = await user.save();

      const doctor = new Doctor({
        userId: savedUser._id,
        licenseNumber: d.license,
        specialization: d.specialization,
        experience: d.experience,
        consultationFee: d.fee,
        education: [{ degree: d.degree, institution: d.institution, year: d.year, specialization: d.specialization }],
        availability: buildAvailability(d.schedule),
        consultationDuration: 30,
        languages: d.languages,
        bio: d.bio,
        services: d.services,
        isVerified: true,
        isActive: true,
        profileCompleted: true,
      });
      await doctor.save();
      created++;
      console.log(`✅ Dr. ${d.firstName} ${d.lastName} — ${d.specialization}`);
    }

    console.log(`\n🎉 Successfully seeded ${created} doctors across ${new Set(doctors.map(d => d.specialization)).size} specializations!`);
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
