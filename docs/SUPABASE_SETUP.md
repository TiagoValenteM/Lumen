# Supabase Setup Guide

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://kcmksmoicpgjfbufliwd.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_0uQEuBgd4a2HHKBh5GGfRQ_YsfZ_MYQ
```

## Features Implemented

### Authentication
- ✅ Email/Password authentication
- ✅ Sign up with email confirmation
- ✅ Sign in/Sign out functionality
- ✅ Auth state management with React Context
- ✅ Protected routes with middleware
- ✅ Auth modal component for login/signup

### Database
- Ready to use with Supabase client
- Server-side and client-side clients configured
- Cookie-based session management

### Storage
- Supabase Storage ready to use
- Access via `supabase.storage` from any client instance

## Usage

### Client-Side Auth
```typescript
import { useAuth } from '@/contexts/AuthContext'

function MyComponent() {
  const { user, signOut } = useAuth()
  
  if (user) {
    return <div>Welcome {user.email}</div>
  }
  
  return <div>Please sign in</div>
}
```

### Server-Side Auth
```typescript
import { createClient } from '@/lib/supabase/server'

export async function MyServerComponent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  return <div>User: {user?.email}</div>
}
```

### Database Queries
```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// Insert
const { data, error } = await supabase
  .from('table_name')
  .insert({ column: 'value' })

// Select
const { data, error } = await supabase
  .from('table_name')
  .select('*')
```

### Storage
```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// Upload file
const { data, error } = await supabase.storage
  .from('bucket_name')
  .upload('file_path', file)

// Get public URL
const { data } = supabase.storage
  .from('bucket_name')
  .getPublicUrl('file_path')
```

## Next Steps

1. **Set up database tables** in Supabase dashboard
2. **Configure email templates** for authentication emails
3. **Set up storage buckets** for file uploads
4. **Add Row Level Security (RLS)** policies to protect your data

## Files Created

- `/lib/supabase/client.ts` - Browser client
- `/lib/supabase/server.ts` - Server client
- `/lib/supabase/middleware.ts` - Auth middleware utilities
- `/middleware.ts` - Next.js middleware for session refresh
- `/contexts/AuthContext.tsx` - Auth state management
- `/components/AuthModal.tsx` - Login/signup UI component
