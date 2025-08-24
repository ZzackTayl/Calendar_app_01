
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';

// This is a placeholder for the encryption logic.
// In a real application, you would use a library like `crypto` to encrypt the user's credentials.
const encrypt = (text: string) => {
  return `encrypted_${text}`;
};

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { appleId, appSpecificPassword } = await request.json();

  if (!appleId || !appSpecificPassword) {
    return NextResponse.json({ error: 'Apple ID and app-specific password are required' }, { status: 400 });
  }

  try {
    // Encrypt the user's credentials before storing them in the database.
    const encryptedAppleId = encrypt(appleId);
    const encryptedAppSpecificPassword = encrypt(appSpecificPassword);

    await supabase
      .from('users')
      .update({
        apple_calendar_access_token: encryptedAppleId,
        apple_calendar_refresh_token: encryptedAppSpecificPassword,
      })
      .eq('id', user.id);

    return NextResponse.json({ message: 'Successfully connected to Apple Calendar' });
  } catch (error) {
    console.error('Error saving Apple Calendar credentials:', error);
    return NextResponse.json({ error: 'Failed to connect to Apple Calendar' }, { status: 500 });
  }
}
