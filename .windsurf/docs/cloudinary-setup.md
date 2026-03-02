# Cloudinary Setup for Profile Photos

## Overview

Professional headshots are **required** for all drivers (both Fleet and Placement tracks). Photos are uploaded directly to Cloudinary from the client and stored as URLs in the Firebase `users` collection.

---

## Why Cloudinary?

- **Direct browser uploads** - No need to proxy through your API
- **Automatic optimization** - Image resizing, format conversion, quality adjustment
- **CDN delivery** - Fast image loading worldwide
- **Transformation API** - Can crop, resize, apply effects on-the-fly
- **Free tier** - 25GB storage, 25GB bandwidth/month

---

## Setup Instructions

### 1. Create Cloudinary Account

1. Go to [cloudinary.com](https://cloudinary.com/) and sign up for free
2. After signup, you'll see your dashboard with:
   - **Cloud Name** (e.g., `dxyz123abc`)
   - **API Key**
   - **API Secret**

### 2. Create Upload Preset

Upload presets control what users can upload without authentication.

1. In Cloudinary dashboard, go to **Settings** → **Upload**
2. Scroll to **Upload presets**
3. Click **Add upload preset**
4. Configure:
   - **Preset name**: `rideon_profiles` (or your choice)
   - **Signing mode**: **Unsigned** (allows browser uploads)
   - **Folder**: `driver_profiles` (organizes uploads)
   - **Access mode**: **Public** (images are accessible via URL)
   - **Allowed formats**: `jpg, jpeg, png, gif, webp`
   - **Transformations** (optional but recommended):
     - **Incoming transformation**: 
       - Width: `800`
       - Height: `800`
       - Crop: `fill`
       - Gravity: `face` (auto-crops to face)
       - Quality: `auto:good`
       - Format: `auto` (auto-converts to best format)
5. Save preset

### 3. Add Environment Variables

Add these to your `.env.local` file:

```bash
# Cloudinary Configuration
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name_here
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=rideon_profiles
```

**Important:** These are `NEXT_PUBLIC_` variables because uploads happen from the browser.

### 4. Security Recommendations

#### Enable Upload Restrictions

In Cloudinary **Settings** → **Upload**:

1. **Allowed image formats**: Enable and select `jpg, jpeg, png, gif, webp`
2. **Max file size**: Set to `5MB` (prevents abuse)
3. **Max image dimensions**: Set to `4000x4000` (prevents huge files)
4. **Eager transformations**: Enable to pre-generate thumbnails
5. **Resource type**: Image only

#### Enable Moderation (Optional)

For extra safety:

1. Go to **Media Library** → **Moderation**
2. Enable **Manual moderation** or **Auto moderation**
3. Set up moderation webhooks to flag inappropriate content

---

## How It Works

### Upload Flow

```
┌─────────────┐
│   Browser   │
│  (Client)   │
└──────┬──────┘
       │ 1. User selects photo
       │
       ▼
┌─────────────────────────┐
│ ProfilePhotoUpload      │
│ Component               │
│ - Validates file        │
│ - Shows preview         │
└──────┬──────────────────┘
       │ 2. Uploads directly to Cloudinary
       │    POST https://api.cloudinary.com/v1_1/{cloud_name}/image/upload
       │    Body: { file, upload_preset, folder }
       ▼
┌─────────────────────────┐
│   Cloudinary API        │
│ - Stores original       │
│ - Applies transforms    │
│ - Returns secure_url    │
└──────┬──────────────────┘
       │ 3. Returns image URL
       │    { secure_url: "https://res.cloudinary.com/..." }
       ▼
┌─────────────────────────┐
│ Component stores URL    │
│ in form state           │
└──────┬──────────────────┘
       │ 4. Submitted with registration
       │    or profile update
       ▼
┌─────────────────────────┐
│ Firebase users/{uid}    │
│ { profileImageUrl:      │
│   "cloudinary_url" }    │
└─────────────────────────┘
```

### Where Photos Are Used

**Registration:**
- Fleet registration: Step 1 (Personal Information)
- Placement registration: Step 1 (Personal Information)
- Required field - cannot proceed without uploading

**Driver Portal:**
- `/driver/profile/public-profile` - Editable in profile editor
- Dashboard header - Shows driver avatar
- Marketplace cards - Visible to clients

**Customer App:**
- Trip details - Shows assigned driver photo
- Marketplace - Shows driver profiles
- Messages - Driver avatar in chat

---

## Component API

### ProfilePhotoUpload

```tsx
import { ProfilePhotoUpload } from '@/components';

<ProfilePhotoUpload
  currentPhotoUrl={profileImageUrl}
  onPhotoChange={(url) => setProfileImageUrl(url)}
  required={true}
  label="Professional Headshot"
  helperText="Upload a clear, professional photo visible to clients."
  className="mt-4"
/>
```

**Props:**
- `currentPhotoUrl`: string | null - Current photo URL
- `onPhotoChange`: (url: string) => void - Callback when upload completes
- `uploading?`: boolean - External upload state
- `required?`: boolean - Shows asterisk if true
- `label?`: string - Custom label text
- `helperText?`: string - Custom helper text
- Standard div props (className, etc.)

**Features:**
- ✅ Drag-and-drop support (via file input)
- ✅ File type validation (images only)
- ✅ File size validation (max 5MB)
- ✅ Preview with circular crop
- ✅ Remove photo button
- ✅ Loading spinner during upload
- ✅ Error handling
- ✅ Accessible (ARIA labels, keyboard navigation)

---

## Image URL Format

Cloudinary URLs follow this pattern:

```
https://res.cloudinary.com/{cloud_name}/image/upload/{transformations}/{folder}/{filename}
```

**Example:**
```
https://res.cloudinary.com/rideon-ng/image/upload/c_fill,g_face,h_800,w_800/driver_profiles/abc123xyz.jpg
```

### URL Transformations (Optional)

You can transform images on-the-fly by modifying the URL:

```tsx
// Original
const originalUrl = "https://res.cloudinary.com/rideon-ng/image/upload/v1234/driver_profiles/photo.jpg";

// Thumbnail (200x200)
const thumbnailUrl = originalUrl.replace('/upload/', '/upload/w_200,h_200,c_fill,g_face/');

// Circular crop
const circularUrl = originalUrl.replace('/upload/', '/upload/w_400,h_400,c_fill,g_face,r_max/');

// Grayscale
const grayscaleUrl = originalUrl.replace('/upload/', '/upload/e_grayscale/');
```

---

## Troubleshooting

### Upload Fails with "Upload preset must be whitelisted"

**Solution:** Make sure your upload preset is set to **Unsigned** mode.

### Upload Fails with "Invalid cloud name"

**Solution:** Check `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` is correct (no spaces, no https://).

### Images Not Loading (CORS Error)

**Solution:** 
1. Go to Cloudinary **Settings** → **Security**
2. Add your domain to **Allowed fetch domains**
3. Enable **Strict transformations** if needed

### Upload Works But Images Are Private

**Solution:** 
1. Check upload preset **Access mode** is set to **Public**
2. Or in Settings → **Upload**, set default upload to Public

### File Size Exceeds Limit

**Solution:**
- Component enforces 5MB client-side
- Check Cloudinary **Max file size** setting
- Consider adding image compression before upload

---

## Cost Considerations

### Free Tier Limits (as of 2024)

- **Storage**: 25 GB
- **Bandwidth**: 25 GB/month
- **Transformations**: 25,000/month
- **Requests**: No hard limit

### Typical Usage

**Per driver:**
- Original: ~2-3 MB
- Optimized: ~200-400 KB

**1000 drivers:**
- Storage: ~400 MB
- Monthly bandwidth (assuming 10 views/driver): ~4 GB

**You can support ~5,000 active drivers on free tier.**

### If You Exceed Free Tier

Upgrade to **Cloudinary Plus** ($89/month):
- 120 GB storage
- 120 GB bandwidth
- Still excellent value for image CDN

---

## Alternative: Firebase Storage

If you prefer Firebase Storage (once enabled):

1. Update `ProfilePhotoUpload` component to use Firebase Storage API
2. Store files in `gs://bucket/driver_profiles/{uid}/avatar.jpg`
3. Generate public download URL
4. Save URL to `users/{uid}.profileImageUrl`

**Trade-offs:**
- ❌ No automatic transformations
- ❌ No CDN (slower global delivery)
- ✅ Single provider (all in Firebase)
- ✅ Firebase Security Rules for access control

---

## Testing Checklist

- [ ] Cloudinary account created
- [ ] Upload preset created (unsigned, folder: `driver_profiles`)
- [ ] Environment variables added to `.env.local`
- [ ] Test upload in fleet registration
- [ ] Test upload in placement registration
- [ ] Test upload in public profile editor
- [ ] Verify photo displays in dashboard header
- [ ] Verify photo displays in marketplace
- [ ] Verify photo displays in customer trip view
- [ ] Test remove photo functionality
- [ ] Test file size validation (try 6MB file - should fail)
- [ ] Test file type validation (try .txt file - should fail)
- [ ] Check Cloudinary dashboard for uploaded images

---

## Best Practices

### For Drivers

**Photo Guidelines (to communicate to drivers):**
- ✅ Professional headshot (shoulders up)
- ✅ Clear, well-lit, recent photo
- ✅ Neutral background
- ✅ Smiling, approachable expression
- ✅ Professional attire
- ❌ No sunglasses or hats
- ❌ No group photos
- ❌ No logos or watermarks
- ❌ No blurry or pixelated photos

### For Admins

During verification:
1. Review photo for professionalism
2. Ensure face is clearly visible
3. Check for inappropriate content
4. Verify photo matches ID document
5. Flag/reject if quality is poor

---

## Summary

Professional photos are now:

✅ **Required** in both registration flows  
✅ **Editable** in public profile page  
✅ **Validated** for file type and size  
✅ **Optimized** automatically by Cloudinary  
✅ **Displayed** throughout the app (dashboard, marketplace, trips)  
✅ **Stored** as URLs in Firebase users collection  

The placement registration flow is now **complete and production-ready** with all critical data captured including professional headshots.
