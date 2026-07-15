import { test, expect } from '@playwright/test';

test.describe('Forgel Advanced Vector Design E2E Skeleton Pipeline', () => {

  // Flow A: Multi-Editor CRDT Scene Sync Verification
  test('Collaborative Sync: Simultaneous Whiteboard and SVG Editor Modifications', async ({ context }) => {
    // 1. Establish two isolated user sessions (Peer A and Peer B) inside the same collaboration room
    const pageA = await context.newPage();
    const pageB = await context.newPage();

    const collabRoomUrl = '/?room=collab-precision-test-99';
    await pageA.goto(collabRoomUrl);
    await pageB.goto(collabRoomUrl);

    // 2. Select the drafting studio on Page A and draw a shape
    const canvasA = pageA.locator('#whiteboard-canvas-main');
    await expect(canvasA).toBeVisible();

    // Trigger rectangle creation tool on Peer A's toolbar
    const rectToolA = pageA.locator('#toolbar-btn-rect');
    await rectToolA.click();

    // Perform bounding box drag to draw rectangle
    await canvasA.dragTo(canvasA, {
      sourcePosition: { x: 100, y: 100 },
      targetPosition: { x: 300, y: 250 }
    });

    // 3. Confirm the shape instantly replicates on Peer B's rendering context via Yjs sync
    const canvasB = pageB.locator('#whiteboard-canvas-main');
    await expect(canvasB).toBeVisible();

    const shapeNodeB = canvasB.locator('svg rect').first();
    await expect(shapeNodeB).toBeVisible();

    // 4. Push the shape from Whiteboard to Precision SVG Editor on Page A
    const selectToolA = pageA.locator('#toolbar-btn-pointer');
    await selectToolA.click();
    await shapeNodeB.click(); // Select the shape to activate properties panel

    const pushToSvgBtn = pageA.locator('button:has-text("Push to Precision SVG Editor")');
    await expect(pushToSvgBtn).toBeVisible();
    await pushToSvgBtn.click();

    // 5. Navigate to Precision tab on Peer B's screen to check SVG source syncing
    await pageB.locator('button:has-text("PRECISION")').click();
    const xmlBufferB = pageB.locator('textarea[placeholder*="Manual XML Buffer"]');
    await expect(xmlBufferB).toBeVisible();

    // Expect the compiled SVG container to include the rectangle pushed by Peer A
    await expect(xmlBufferB).toContainText('<rect');
  });

  // Flow B: Mobile Responsive FAB and Precision Controls Toggle
  test('Mobile Precision: Mobile Viewport Adaptive Drawer, Loupe, and Grid Controls', async ({ page }) => {
    // 1. Emulate a mobile device layout viewport
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone X standard size
    await page.goto('/');

    // 2. Verify that secondary navigation tabs are reduced to compact layout icons
    const workbenchTabs = page.locator('#workbench-sub-tabs-bar');
    await expect(workbenchTabs).toBeHidden(); // Hidden or reduced on mobile viewports

    const mobileFabToolbar = page.locator('#mobile-compact-fab-trigger');
    await expect(mobileFabToolbar).toBeVisible();
    await mobileFabToolbar.click(); // Toggle controls overlay

    // 3. Toggle Whiteboard Ruler and Grid Snapping in settings drawer
    const showGridToggle = page.locator('button:has-text("Show Grid")');
    const snapToggle = page.locator('button:has-text("Grid Snap")');

    await expect(showGridToggle).toBeVisible();
    await showGridToggle.click();

    await expect(snapToggle).toBeVisible();
    await snapToggle.click();

    // 4. Initiate drawing on mobile touch pad
    const mobileCanvas = page.locator('#whiteboard-canvas-main');
    await mobileCanvas.dispatchEvent('touchstart', {
      touches: [{ clientX: 150, clientY: 200 }]
    });
    
    // 5. Assert magnifier loupe overlay activates to guide finger precision
    const magnifierLoupe = page.locator('#canvas-magnifier-loupe');
    await expect(magnifierLoupe).toBeVisible();

    await mobileCanvas.dispatchEvent('touchend');
    await expect(magnifierLoupe).toBeHidden(); // Closes on lift
  });

});
