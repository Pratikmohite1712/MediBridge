const prisma = require('../src/config/db');
const bcrypt = require('bcrypt');

async function main() {
  console.log('Starting seed...');

  // Password hashing
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Admin@123', salt);

  // 1. Create Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@medibridge.ai' },
    update: {},
    create: {
      fullName: 'System Admin',
      email: 'admin@medibridge.ai',
      passwordHash: passwordHash,
      role: 'ADMIN',
      isVerified: true,
      isActive: true,
    },
  });
  console.log(`Created Admin: ${admin.email}`);

  // Create standard doctor password
  const doctorPasswordHash = await bcrypt.hash('Doctor@123', salt);

  // 2. Create Doctors
  const doctorsData = [
    {
      email: 'cardio@medibridge.ai',
      fullName: 'Dr. Ramesh Sharma',
      specialization: 'Cardiology',
      registrationNo: 'MCI-1001',
    },
    {
      email: 'pediatrics@medibridge.ai',
      fullName: 'Dr. Sunita Patel',
      specialization: 'Pediatrics',
      registrationNo: 'MCI-1002',
    },
    {
      email: 'general@medibridge.ai',
      fullName: 'Dr. Anil Kumar',
      specialization: 'General Physician',
      registrationNo: 'MCI-1003',
    },
  ];

  for (const doc of doctorsData) {
    const user = await prisma.user.upsert({
      where: { email: doc.email },
      update: {},
      create: {
        fullName: doc.fullName,
        email: doc.email,
        passwordHash: doctorPasswordHash,
        role: 'DOCTOR',
        isVerified: true,
        isActive: true,
        doctorProfile: {
          create: {
            specialization: doc.specialization,
            qualification: 'MBBS, MD',
            experienceYears: 10,
            clinicName: 'MediBridge Clinic',
            registrationNo: doc.registrationNo,
            isVerified: true,
            verificationStatus: 'APPROVED',
            consultationFee: 500,
            availableSlots: [
              { day: 'Monday', startTime: '10:00', endTime: '14:00' },
              { day: 'Wednesday', startTime: '10:00', endTime: '14:00' },
              { day: 'Friday', startTime: '10:00', endTime: '14:00' }
            ],
            rating: 4.5,
          }
        }
      },
    });
    console.log(`Created Doctor: ${user.email}`);
  }

  // Create standard patient password
  const patientPasswordHash = await bcrypt.hash('Patient@123', salt);

  // 3. Create Patients
  const patientsData = [
    {
      email: 'patient1@example.com',
      fullName: 'Rajesh Verma',
      phone: '9876543210'
    },
    {
      email: 'patient2@example.com',
      fullName: 'Meena Devi',
      phone: '9876543211'
    }
  ];

  for (const pat of patientsData) {
    const user = await prisma.user.upsert({
      where: { email: pat.email },
      update: {},
      create: {
        fullName: pat.fullName,
        email: pat.email,
        phone: pat.phone,
        passwordHash: patientPasswordHash,
        role: 'PATIENT',
        isVerified: true,
        isActive: true,
        patientProfile: {
          create: {
            age: 35,
            gender: 'MALE',
            bloodGroup: 'O+',
            address: '123 Rural Village, Maharashta',
            allergies: [],
            chronicConditions: []
          }
        }
      },
    });
    console.log(`Created Patient: ${user.fullName}`);
  }

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
