/**
 * Admin seeder — run once to bootstrap the first admin account
 * Usage: npx tsx src/scripts/seed.ts
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/linkedin-ai-publisher'
  await mongoose.connect(uri)
  console.log('✅ Connected to MongoDB')

  const { User } = await import('../lib/db/models/User')

  const email = process.env.ADMIN_EMAIL || 'admin@example.com'
  const password = process.env.ADMIN_PASSWORD || 'Admin@123456'
  const name = process.env.ADMIN_NAME || 'System Administrator'

  const existing = await User.findOne({ email: email.toLowerCase() })
  if (existing) {
    console.log(`ℹ️  Admin user already exists: ${email}`)
    await mongoose.disconnect()
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)
  await User.create({
    email: email.toLowerCase(),
    name,
    passwordHash,
    role: 'admin',
    isActive: true,
    emailVerified: true,
  })

  console.log(`✅ Admin user created: ${email}`)
  console.log(`   Password: ${password}`)
  console.log(`   ⚠️  Change the password after first login!`)

  await mongoose.disconnect()
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
