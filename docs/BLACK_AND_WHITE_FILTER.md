# Black and White Filter Feature

## Overview
A new black and white filter toggle has been added to the Save screen that allows users to apply a grayscale effect to their photos before posting them to Instagram Clone.

## Features
- **Toggle Button**: A sleek toggle button in the Save screen that activates/deactivates the B&W filter
- **Live Preview**: See the black and white effect in real-time before uploading
- **Platform Support**: Works on both web and mobile platforms
  - Web: Uses HTML5 Canvas API for true grayscale conversion
  - Mobile: Prepares image for grayscale effect (visual preview shown)
- **Processing Indicator**: Shows loading state while filter is being applied
- **Image Upload**: Uploads the filtered image (or original if filter is off) to Firebase Storage

## How to Use

### For Users
1. Take or select a photo using the Camera or Gallery
2. On the Save screen, you'll see a new "Black & White Filter" toggle
3. Tap the toggle button to enable/disable the filter
4. The preview will update to show the effect
5. Add your caption and post as usual
6. The uploaded image will include the filter effect if enabled

### For Developers

#### Installation
This feature uses `expo-image-manipulator` which should already be installed in the project. No additional dependencies are required for basic functionality.

#### Implementation Details

**Location**: `frontend/components/main/add/Save.js`

**New State Variables**:
- `isBlackAndWhite`: Boolean to track filter state
- `processedImageUri`: URI of the processed image
- `processing`: Boolean to show loading state during image processing

**Key Functions**:
- `applyBlackAndWhiteFilter(uri)`: Main function that applies grayscale filter
  - On web: Uses `applyGrayscaleWeb()` with HTML5 Canvas
  - On mobile: Uses `expo-image-manipulator` to resize and prepare image
- `applyGrayscaleWeb(uri)`: Canvas-based true grayscale conversion using luminance formula (0.299R + 0.587G + 0.114B)

**UI Components**:
- Filter toggle container with label and button
- Activity indicator during processing
- Visual grayscale effect overlay

#### Technical Limitations
- **Mobile Grayscale**: React Native doesn't support CSS-like filter effects natively. The current implementation:
  - Provides visual preview with opacity adjustment
  - For true grayscale on mobile, consider:
    - Using `expo-gl` with custom shaders
    - Using a native module like `react-native-color-matrix-image-filters`
    - Server-side image processing
- **Web Platform**: Full grayscale works using Canvas API

#### Future Enhancements
1. Add more filters (sepia, vintage, etc.)
2. Implement true grayscale for mobile using expo-gl
3. Add filter intensity slider
4. Save filter preferences
5. Apply filters to videos

## Code Example

```javascript
// Toggle the filter
<TouchableOpacity 
    onPress={() => setIsBlackAndWhite(!isBlackAndWhite)}
    style={[
        styles.filterToggleButton,
        { backgroundColor: isBlackAndWhite ? '#000' : '#e0e0e0' }
    ]}
>
    <Feather name="droplet" size={20} color={isBlackAndWhite ? '#fff' : '#000'} />
</TouchableOpacity>

// Apply filter when uploading
const sourceToUpload = (isBlackAndWhite && processedImageUri) 
    ? processedImageUri 
    : props.route.params.source;
```

## Testing

### Manual Testing Steps
1. Start the app with `cd frontend && expo start`
2. Navigate to Camera screen
3. Take or select a photo
4. On the Save screen, toggle the B&W filter on/off
5. Verify the preview updates
6. Add a caption and post
7. Check the uploaded post shows the filtered image

### Platform Testing
- ✅ Web: Canvas-based grayscale works fully
- ⚠️ iOS/Android: Visual preview works, consider adding expo-gl for true grayscale

## Dependencies
- `expo-image-manipulator`: Already included in project (v10.2.2)
- No additional installations required

## Notes
- Filter only applies to images, not videos
- The filter toggle is disabled during processing to prevent multiple concurrent operations
- Original image is preserved; filter is applied to a copy
