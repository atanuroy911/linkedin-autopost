import type { UserRole } from '@/types'

/**
 * NextAuth v5 module augmentation.
 * Extends the built-in Session and JWT types to include our custom fields
 * (id, role, avatar) so TypeScript knows about them everywhere.
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: UserRole
      avatar?: string
      image?: string | null
    }
  }

  interface User {
    id: string
    email: string
    name: string
    role: UserRole
    avatar?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: UserRole
    avatar?: string
  }
}
