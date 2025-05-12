# Precise Spatial Constraints for Mini-Applications

## Overview

This document outlines the precise spatial constraints that must be maintained for all mini-applications in the Cherry Studio Electron application. These constraints ensure that mini-apps are positioned correctly within the designated content area and maintain consistent positioning across all viewport sizes and device types.

## Critical Requirements

1. **Exact Positioning**: All mini-apps MUST be positioned exactly 26 pixels from the left edge and 41 pixels from the top edge of the application window.
2. **Consistent Positioning**: This positioning MUST be maintained consistently across all viewport sizes and device types.
3. **Content Area Containment**: Mini-apps MUST remain exclusively within the designated content area.
4. **Responsive Handling**: Mini-apps MUST respond correctly to window resize events, maintaining their flush positioning.
5. **Scrollable Content**: Mini-app content MUST be scrollable when necessary, rather than overflowing.

## Implementation Details

### 1. ContentAreaManager

The `ContentAreaManager` component defines the content area with precise positioning:
- Positioned exactly 26px from the left edge (sidebar width)
- Positioned exactly 41px from the top edge (top navigation height)
- Handles window resize events to maintain proper positioning
- Provides accurate bounds to child components via React Context

```typescript
// Critical constants for positioning
const SIDEBAR_WIDTH = 26; // Width of the sidebar in pixels - MUST be exactly 26px
const TOP_NAV_HEIGHT = 41; // Height of the top navigation in pixels - MUST be exactly 41px
```

### 2. WebContentsViewService

The `WebContentsViewService` applies the bounds correctly to the WebContentsView:
- Uses the same constants (26px from left, 41px from top) for positioning
- Adjusts bounds to ensure the WebContentsView is positioned correctly
- Maintains precise positioning across all viewport sizes

```typescript
// Critical bounds adjustment
let adjustedBounds = {
  x: SIDEBAR_WIDTH, // CRITICAL: Start exactly at the right edge of sidebar (26px)
  y: TOP_NAV_HEIGHT, // CRITICAL: Start exactly at the bottom edge of top navigation (41px)
  width: bounds.width, // Use the width provided by the content area
  height: bounds.height // Use the height provided by the content area
}
```

### 3. WebContentsViewContainer

The `WebContentsViewContainer` component:
- Uses the bounds from ContentAreaManager to position the WebContentsView
- Updates the WebContentsView position when the window is resized
- Ensures content is scrollable when necessary
- Provides detailed logging for debugging positioning issues

## CSS Considerations

The CSS for WebContentsViewContainer ensures:
- Content is flush with the edges of the container
- Overflow is handled properly with scrolling when needed
- No margin or padding affects the positioning
- No transform or other CSS properties affect the positioning

## Debugging

Comprehensive logging has been added to help debug positioning issues:
- ContentAreaManager logs bounds updates with precise positioning information
- WebContentsViewService logs adjusted bounds with positioning details
- WebContentsViewContainer logs position updates with timestamps

## Testing

To verify correct positioning:
1. Open different mini-apps and ensure they are positioned exactly 26px from the left and 41px from the top
2. Resize the window and verify that the positioning is maintained
3. Check that content scrolls properly when it exceeds the content area
4. Verify that mini-apps never overlap with the side navigation or top navigation

## Conclusion

By following these precise spatial constraints, we ensure that all mini-apps are positioned correctly and consistently across all viewport sizes and device types. This guarantees a seamless user experience and prevents layout issues that could affect the usability of the application.
