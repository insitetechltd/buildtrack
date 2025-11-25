# Phone Number Format Guide

## Current App Format (Hong Kong)

Your app uses **8-digit Hong Kong phone numbers** without country codes or formatting:

- **Registration validation**: Exactly 8 digits (e.g., `55511111`)
- **Storage**: Stored as-is in database (e.g., `55511111`)
- **Login**: Accepts flexible format (digits, spaces, dashes, parentheses, plus signs)
- **No country code or area code needed**

### Examples in Your Database:
```
55511111
12345678
98765432
```

## Phone Number Format

For this Hong Kong-based app:
- **Format**: 8 digits only
- **No country code**: No `+852` prefix needed
- **No area code**: Just the 8-digit number
- **Stored as-is**: Phone numbers are stored exactly as entered (8 digits)

### Examples:
- `55511111` ✅
- `12345678` ✅
- `98765432` ✅

## Supabase Auth Requirement

**Important**: Supabase Auth **requires** phone numbers in **E.164 format**, even though your app stores 8-digit numbers.

### E.164 Format for Hong Kong:
- **Format**: `+852XXXXXXXX` (country code `852` + 8-digit number)
- **Example**: `55511111` → `+85255511111`

## Rebuild Script Behavior

The `rebuild_auth_users_from_users.js` script:
- **Converts 8-digit numbers to E.164** automatically
- **Hong Kong country code**: Uses `852` for all conversions
- **Format conversion**: `55511111` → `+85255511111`

### Example:
- **Database**: `55511111` (8 digits, stored as-is)
- **Sent to Supabase**: `+85255511111` (E.164 format with country code)

### Conversion Logic:
- **8 digits**: `55511111` → `+85255511111` ✅
- **Already E.164**: `+85255511111` → `+85255511111` ✅ (no change)
- **11 digits starting with 852**: `85255511111` → `+85255511111` ✅

## Notes

- **App storage**: Your app continues to store 8-digit numbers in the `users` table
- **Supabase Auth**: Requires E.164 format, so conversion happens automatically during rebuild
- **No user impact**: Users still enter 8-digit numbers in the app
- **Automatic conversion**: The rebuild script handles conversion transparently

