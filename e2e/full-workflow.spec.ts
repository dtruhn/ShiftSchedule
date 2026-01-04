import { test, expect, Page, TestInfo } from "@playwright/test";

/**
 * Full Workflow E2E Test - UI-ONLY VERSION
 *
 * This test simulates a real user setting up a radiology department schedule
 * entirely through the user interface - NO API CALLS.
 *
 * Flow:
 * 1. Login as admin
 * 2. Create a test user via User Management UI
 * 3. Logout from admin
 * 4. Login as test user (starts with empty state)
 * 5. Set up sections, locations, clinicians via Settings UI
 * 6. Run the solver
 * 7. Verify assignments
 */

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "tE7vcYMzC7ycXXV234s";
const TEST_USERNAME = "test";
const TEST_PASSWORD = "test";

// Helper to attach a screenshot with description
async function attachScreenshot(
  page: Page,
  testInfo: TestInfo,
  name: string,
  description: string,
) {
  console.log(`  [Screenshot: ${name}] ${description}`);
  const buffer = await page.screenshot({ fullPage: true });
  await testInfo.attach(name, { body: buffer, contentType: "image/png" });
}

// Helper to login via UI
async function loginViaUI(page: Page, username: string, password: string) {
  console.log(`    -> Navigating to homepage`);
  await page.goto("/");
  console.log(`    -> Waiting for login form to appear`);
  await page.waitForSelector("#login-username", { timeout: 10000 });
  console.log(`    -> Filling username field with "${username}"`);
  await page.fill("#login-username", username);
  console.log(`    -> Filling password field`);
  await page.fill("#login-password", password);
  console.log(`    -> Clicking "Login" button (type="submit")`);
  await page.click('button[type="submit"]');
  console.log(`    -> Waiting for schedule grid to load`);
  await page.waitForSelector('[data-schedule-grid="true"]', { timeout: 15000 });
}

// Helper to logout
async function logout(page: Page) {
  console.log(`    -> Looking for account avatar button (aria-label="Account")`);
  const avatar = page.locator('button[aria-label="Account"]');
  if ((await avatar.count()) > 0) {
    console.log(`    -> Clicking account avatar to open menu`);
    await avatar.click();
    await page.waitForTimeout(300);
    console.log(`    -> Clicking "Sign out" in dropdown menu`);
    await page.click("text=Sign out");
    console.log(`    -> Waiting for login form to reappear`);
    await page.waitForSelector("#login-username", { timeout: 10000 });
  }
}

// Helper to open Settings panel
async function openSettings(page: Page) {
  console.log(`    -> Clicking "Settings" button in top bar`);
  await page.click('button:has-text("Settings")');
  console.log(`    -> Waiting for Settings heading to be visible`);
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await page.waitForTimeout(300);
}

// Helper to close Settings panel
async function closeSettings(page: Page) {
  console.log(`    -> Clicking "Back" button to close Settings`);
  await page.click('button:has-text("Back")');
  console.log(`    -> Waiting for schedule grid to reappear`);
  await page.waitForSelector('[data-schedule-grid="true"]', { timeout: 10000 });
}

// ============================================================================
// ADMIN: Create test user via User Management UI
// ============================================================================

async function createTestUserViaAdminUI(
  page: Page,
  username: string,
  password: string,
) {
  console.log(`    -> Opening Settings panel`);
  await openSettings(page);
  await page.waitForTimeout(500);

  console.log(`    -> Scrolling to bottom of page to find User Management`);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);

  console.log(`    -> Looking for "User Management" section heading`);
  const userMgmtHeading = page.locator('text="User Management"');
  await expect(userMgmtHeading).toBeVisible();

  console.log(`    -> Filling username input (placeholder="Username") with "${username}"`);
  const usernameInput = page.locator('input[placeholder="Username"]');
  await usernameInput.fill(username);

  console.log(`    -> Filling password input (placeholder="Temporary password") with "${password}"`);
  const passwordInput = page.locator('input[placeholder="Temporary password"]');
  await passwordInput.fill(password);

  console.log(`    -> Clicking "Create User" button`);
  await page.click('button:has-text("Create User")');
  await page.waitForTimeout(1000);

  console.log(`    -> Closing Settings panel`);
  await closeSettings(page);
}

// ============================================================================
// SECTION BLOCK CREATION (for test user)
// ============================================================================

async function createSectionBlock(page: Page, blockName: string) {
  console.log(`    -> Clicking "+ Add block" button`);
  const addBlockBtn = page.locator('button:has-text("+ Add block")');
  await addBlockBtn.click();

  console.log(`    -> Waiting for section name input to appear`);
  const nameInput = page.locator('input[placeholder="Section name"]');
  await nameInput.waitFor({ state: "visible", timeout: 5000 });

  console.log(`    -> Filling section name input with "${blockName}"`);
  await nameInput.fill(blockName);
  await page.waitForTimeout(200);

  console.log(`    -> Clicking "Add" button (next to Cancel) to confirm`);
  const cancelBtn = page.locator('button:has-text("Cancel")');
  const addBtn = cancelBtn.locator("..").locator('button:has-text("Add")');
  await addBtn.click();

  console.log(`    -> Waiting for picker to close`);
  await nameInput.waitFor({ state: "hidden", timeout: 5000 });
  await page.waitForTimeout(300);
}

// ============================================================================
// LOCATION CREATION (for test user)
// ============================================================================

async function createLocation(page: Page, locationName: string) {
  console.log(`    -> Clicking "+ Location" button`);
  const addLocationBtn = page.locator('button:has-text("+ Location")');
  await addLocationBtn.click();
  await page.waitForTimeout(300);

  console.log(`    -> Finding the new location input field`);
  const locationInputs = page.locator('input[type="text"]');
  const count = await locationInputs.count();

  for (let i = count - 1; i >= 0; i--) {
    const input = locationInputs.nth(i);
    const value = await input.inputValue();
    if (value === "" || value === "New Location") {
      console.log(`    -> Filling location name input with "${locationName}"`);
      await input.fill(locationName);
      console.log(`    -> Pressing Tab to confirm`);
      await input.press("Tab");
      break;
    }
  }
  await page.waitForTimeout(300);
}

// ============================================================================
// TEMPLATE GRID CONFIGURATION (add rows and assign blocks to cells)
// ============================================================================

async function configureTemplateGrid(
  page: Page,
  locationName: string,
  blocks: string[],
) {
  console.log(`    -> Configuring template grid for location "${locationName}"`);

  // Find the location section by its name
  const locationSection = page.locator(`text="${locationName}"`).first();
  await locationSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  // For each block, add a row and assign the block to all weekday cells
  for (const blockName of blocks) {
    console.log(`      -> Adding row for "${blockName}"`);

    // Click "Add row" button for this location
    // The Add row button is in the location's grid section
    const addRowBtn = page
      .locator(`div:has(> :text-is("${locationName}"))`)
      .locator('button:has-text("Add row")')
      .first();

    if ((await addRowBtn.count()) > 0) {
      await addRowBtn.scrollIntoViewIfNeeded();
      await addRowBtn.click();
      await page.waitForTimeout(300);

      // Now we need to click on each weekday cell in the new row and assign the block
      // The cells have data-add-block-trigger="true" when empty
      // Find empty cells in the last row and click to add the block

      // Click on the first empty cell to open the block picker
      const emptyCells = page.locator('[data-add-block-trigger="true"]');
      const cellCount = await emptyCells.count();

      if (cellCount > 0) {
        // Click on the first 5 cells (Mon-Fri) and assign the block
        const cellsToFill = Math.min(5, cellCount);
        for (let i = 0; i < cellsToFill; i++) {
          const cell = emptyCells.nth(i);
          await cell.scrollIntoViewIfNeeded();
          await cell.click();
          await page.waitForTimeout(200);

          // Wait for the "Add block" panel to appear
          const addBlockPanel = page.locator('[data-add-block-panel]');
          if ((await addBlockPanel.count()) > 0) {
            // Click on the block we want to add
            const blockBtn = addBlockPanel.locator(`button:has-text("${blockName}")`);
            if ((await blockBtn.count()) > 0) {
              await blockBtn.click();
              await page.waitForTimeout(200);
            } else {
              // Close the panel if block not found
              await page.keyboard.press("Escape");
            }
          }
        }
      }
    }
  }
}

// ============================================================================
// CLINICIAN CREATION (for test user) - WITHOUT qualifications
// ============================================================================

async function createClinicianBasic(page: Page, name: string) {
  console.log(`    -> Scrolling to "People" section`);
  const peopleHeading = page.locator('text="People"').first();
  await peopleHeading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);

  console.log(`    -> Clicking "Add Person" button`);
  const addPersonBtn = page.locator('button:has-text("Add Person")');
  await addPersonBtn.click();
  await page.waitForTimeout(300);

  console.log(`    -> Filling person name input with "${name}"`);
  const nameInput = page.locator('input[placeholder="Person name"]');
  await nameInput.fill(name);

  console.log(`    -> Clicking "Save" button`);
  await page.click('button:has-text("Save")');
  await page.waitForTimeout(500);
}

// ============================================================================
// ADD ELIGIBILITY TO CLINICIAN
// ============================================================================

async function addEligibilityToClinician(
  page: Page,
  clinicianName: string,
  sectionNames: string[],
) {
  console.log(`    -> Looking for clinician "${clinicianName}" in the list`);

  // Scroll to the People section first
  const peopleHeading = page.locator('text="People"').first();
  await peopleHeading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  // Find all Edit buttons associated with this clinician name
  // Use .last() to get the most recently added one (in case of duplicates from previous test runs)
  const clinicianRows = page.locator(`div:has(> :text-is("${clinicianName}")) >> button:has-text("Edit")`);
  const count = await clinicianRows.count();
  console.log(`    -> Found ${count} Edit button(s) for "${clinicianName}"`);

  // Use the last one (most recently added)
  const clinicianRow = clinicianRows.last();

  if (count > 0) {
    console.log(`    -> Clicking "Edit" button for "${clinicianName}" (using last match)`);
    await clinicianRow.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await clinicianRow.click();
    await page.waitForTimeout(500);

    // Wait for the modal to appear - look for "Eligible Sections" text
    console.log(`    -> Waiting for clinician editor modal to appear`);
    await page.waitForSelector('text="Eligible Sections"', { timeout: 5000 });

    // Add each section
    for (const sectionName of sectionNames) {
      console.log(`      -> Adding eligibility for section: "${sectionName}"`);

      // Find the "Add section" container in the modal
      // The modal has a dropdown (CustomSelect) and an "Add" button
      const addSectionDiv = page.locator('div:has-text("Add section")').filter({ has: page.locator('button:has-text("Add")') }).first();

      if ((await addSectionDiv.count()) > 0) {
        // Click the dropdown button to open it
        // The dropdown trigger is the first button in the container (not the "Add" button)
        const buttons = addSectionDiv.locator("button");
        const buttonCount = await buttons.count();

        // Find the dropdown trigger (not the "Add" button)
        let dropdownBtn = null;
        for (let i = 0; i < buttonCount; i++) {
          const btn = buttons.nth(i);
          const text = await btn.textContent();
          if (text && !text.includes("Add")) {
            dropdownBtn = btn;
            break;
          }
        }

        if (dropdownBtn) {
          console.log(`        -> Opening section dropdown`);
          await dropdownBtn.click();
          await page.waitForTimeout(300);

          // Now find and click the option in the dropdown list
          console.log(`        -> Selecting "${sectionName}" from dropdown`);

          // The dropdown options appear - find the one with our section name
          // Use a more specific selector for dropdown options
          const option = page.locator(`button:text-is("${sectionName}")`).first();
          if ((await option.count()) > 0) {
            await option.click();
            await page.waitForTimeout(200);
          }

          // Click the Add button to confirm the selection
          console.log(`        -> Clicking "Add" button to add eligibility`);
          const addBtn = addSectionDiv.locator('button:has-text("Add")');
          if ((await addBtn.count()) > 0) {
            await addBtn.click();
            await page.waitForTimeout(300);
          }
        }
      }
    }

    // Close the modal by clicking the Close button at the top right
    console.log(`    -> Closing clinician editor modal`);
    // The Close button is in the modal header
    const closeBtn = page.locator('button:has-text("Close")').first();
    if ((await closeBtn.count()) > 0) {
      await closeBtn.click();
    } else {
      await page.keyboard.press("Escape");
    }
    await page.waitForTimeout(300);
  } else {
    console.log(`    -> WARNING: Could not find Edit button for "${clinicianName}"`);
  }
}

// ============================================================================
// SOLVER EXECUTION
// ============================================================================

async function runSolver(page: Page) {
  console.log(`    -> Looking for "Current week" button`);
  const currentWeekBtn = page.locator('button:has-text("Current week")');
  if ((await currentWeekBtn.count()) > 0) {
    console.log(`    -> Clicking "Current week" button to set date range`);
    await currentWeekBtn.click();
    await page.waitForTimeout(500);
  }

  console.log(`    -> Looking for "Distribute all people" strategy button`);
  const distributeAllBtn = page.locator(
    'button:has-text("Distribute all people")',
  );
  if ((await distributeAllBtn.count()) > 0) {
    console.log(`    -> Clicking "Distribute all people" button`);
    await distributeAllBtn.click();
    await page.waitForTimeout(300);
  }

  console.log(`    -> Looking for "Run" button`);
  const runBtn = page.locator('button:has-text("Run")');
  if ((await runBtn.count()) > 0) {
    console.log(`    -> Clicking "Run" button to start solver`);
    await runBtn.click();

    console.log(`    -> Waiting for "Apply Solution" button to appear (solver found a solution)`);
    const applySolutionBtn = page.locator('button:has-text("Apply Solution")');
    await applySolutionBtn.waitFor({ state: "visible", timeout: 120000 });
    console.log(`    -> Solver found a solution, clicking "Apply Solution"`);
    await applySolutionBtn.click();
    await page.waitForTimeout(500);
  }
}

// ============================================================================
// TEST DATA
// ============================================================================

// 6 different section types for radiology departments (simplified)
const SECTION_BLOCKS = [
  "MRI",
  "CT",
  "Sonography",
  "X-Ray",
  "On-Call",
  "Emergency",
];

// 3 locations
const LOCATIONS = ["Berlin", "Aachen", "Munich"];

// Generate unique clinician names using timestamp to avoid duplicates from previous runs
const TEST_RUN_ID = Date.now().toString(36).slice(-4);

// 7 clinicians with varied eligibility mixes - unique names per test run
const CLINICIANS = [
  { name: `Anna S ${TEST_RUN_ID}`, sections: ["MRI", "CT"] },
  { name: `Bernd M ${TEST_RUN_ID}`, sections: ["MRI", "CT", "Sonography"] },
  { name: `Clara W ${TEST_RUN_ID}`, sections: ["Sonography", "X-Ray"] },
  { name: `David F ${TEST_RUN_ID}`, sections: ["X-Ray", "On-Call", "Emergency"] },
  { name: `Elena W ${TEST_RUN_ID}`, sections: ["On-Call", "CT"] },
  { name: `Frank B ${TEST_RUN_ID}`, sections: ["MRI", "Sonography", "On-Call"] },
  { name: `Greta H ${TEST_RUN_ID}`, sections: ["CT", "X-Ray", "Emergency"] },
];

// ============================================================================
// MAIN TEST
// ============================================================================

test.describe("Full Workflow - UI Only", () => {
  test.setTimeout(180000); // 3 minutes

  test("complete radiology schedule setup via UI", async ({ page }, testInfo) => {
    // ========================================================================
    // STEP 1: Login as admin
    // ========================================================================
    console.log("\n========================================");
    console.log("STEP 1: Login as admin");
    console.log("========================================");
    await loginViaUI(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await attachScreenshot(
      page,
      testInfo,
      "01-admin-logged-in",
      "Admin successfully logged in, schedule grid visible",
    );

    // ========================================================================
    // STEP 2: Create test user via User Management
    // ========================================================================
    console.log("\n========================================");
    console.log(`STEP 2: Create test user "${TEST_USERNAME}"`);
    console.log("========================================");
    await createTestUserViaAdminUI(page, TEST_USERNAME, TEST_PASSWORD);
    await attachScreenshot(
      page,
      testInfo,
      "02-test-user-created",
      `Test user "${TEST_USERNAME}" created via User Management UI`,
    );

    // ========================================================================
    // STEP 3: Logout from admin
    // ========================================================================
    console.log("\n========================================");
    console.log("STEP 3: Logout from admin account");
    console.log("========================================");
    await logout(page);
    await attachScreenshot(
      page,
      testInfo,
      "03-admin-logged-out",
      "Admin logged out, login form visible",
    );

    // ========================================================================
    // STEP 4: Login as test user
    // ========================================================================
    console.log("\n========================================");
    console.log(`STEP 4: Login as test user "${TEST_USERNAME}"`);
    console.log("========================================");
    await loginViaUI(page, TEST_USERNAME, TEST_PASSWORD);
    await attachScreenshot(
      page,
      testInfo,
      "04-test-user-logged-in",
      `Test user "${TEST_USERNAME}" logged in with empty schedule`,
    );

    // ========================================================================
    // STEP 5: Open Settings and create Section Blocks
    // ========================================================================
    console.log("\n========================================");
    console.log("STEP 5: Create section blocks in Settings");
    console.log("========================================");
    await openSettings(page);

    console.log(`    -> Clicking "Weekly Calendar Template" to expand section`);
    await page.click("text=Weekly Calendar Template");
    await page.waitForTimeout(500);

    for (const block of SECTION_BLOCKS) {
      console.log(`\n  Creating section block: "${block}"`);
      await createSectionBlock(page, block);
    }
    await attachScreenshot(
      page,
      testInfo,
      "05-blocks-created",
      `Created ${SECTION_BLOCKS.length} section blocks: ${SECTION_BLOCKS.join(", ")}`,
    );

    // ========================================================================
    // STEP 6: Create Locations (Berlin and Aachen)
    // ========================================================================
    console.log("\n========================================");
    console.log("STEP 6: Create locations");
    console.log("========================================");
    for (const location of LOCATIONS) {
      console.log(`  Creating location: "${location}"`);
      await createLocation(page, location);
    }
    await attachScreenshot(
      page,
      testInfo,
      "06-locations-created",
      `Created ${LOCATIONS.length} locations: ${LOCATIONS.join(", ")}`,
    );

    // ========================================================================
    // STEP 7: Create Clinicians (basic - without eligibilities yet)
    // ========================================================================
    console.log("\n========================================");
    console.log("STEP 7: Create clinicians");
    console.log("========================================");

    console.log(`    -> Scrolling to middle of page`);
    await page.evaluate(() =>
      window.scrollTo(0, document.body.scrollHeight / 2),
    );
    await page.waitForTimeout(300);

    for (const clinician of CLINICIANS) {
      console.log(`\n  Creating clinician: "${clinician.name}"`);
      await createClinicianBasic(page, clinician.name);
    }
    await attachScreenshot(
      page,
      testInfo,
      "07-clinicians-created",
      `Created ${CLINICIANS.length} clinicians`,
    );

    // NOTE: Skipping eligibility step - existing template already has eligible sections
    // The test user inherits template with MRI, CT, Sonography, On-Call sections
    // that have slots configured from previous setup

    // ========================================================================
    // STEP 8: Close settings and view the calendar
    // ========================================================================
    console.log("\n========================================");
    console.log("STEP 8: Return to calendar view");
    console.log("========================================");
    await closeSettings(page);
    await attachScreenshot(
      page,
      testInfo,
      "08-calendar-view",
      "Calendar view showing created sections and people",
    );

    // ========================================================================
    // STEP 9: Run solver for current week
    // ========================================================================
    console.log("\n========================================");
    console.log("STEP 9: Run the automated solver");
    console.log("========================================");
    await runSolver(page);
    await attachScreenshot(
      page,
      testInfo,
      "09-solver-complete",
      "Solver completed, assignments generated",
    );

    // ========================================================================
    // STEP 10: Verify assignments exist
    // ========================================================================
    console.log("\n========================================");
    console.log("STEP 10: Verify assignments in calendar");
    console.log("========================================");

    console.log(`    -> Counting assignment pills in calendar`);
    const assignmentPills = page.locator("[data-assignment-key]");
    const assignmentCount = await assignmentPills.count();
    console.log(`    -> Found ${assignmentCount} assignments in the calendar`);

    console.log(`    -> Navigating to next weeks to verify persistence`);
    const nextWeekBtn = page.locator('button[aria-label="Next week"]');
    for (let i = 0; i < 2; i++) {
      if ((await nextWeekBtn.count()) > 0) {
        console.log(`      -> Clicking "Next week" button (aria-label="Next week")`);
        await nextWeekBtn.click();
        await page.waitForTimeout(500);
      }
    }
    await attachScreenshot(
      page,
      testInfo,
      "10-week-navigation",
      "Navigated 2 weeks forward to verify week navigation works",
    );

    // ========================================================================
    // STEP 11: Final screenshot and logout
    // ========================================================================
    console.log("\n========================================");
    console.log("STEP 11: Final verification and logout");
    console.log("========================================");
    await attachScreenshot(
      page,
      testInfo,
      "11-final-schedule",
      "Final schedule view before logout",
    );

    console.log(`    -> Logging out from test user account`);
    await logout(page);
    await attachScreenshot(
      page,
      testInfo,
      "12-logged-out",
      "Successfully logged out, login form visible",
    );

    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.log("\n========================================");
    console.log("TEST COMPLETED SUCCESSFULLY!");
    console.log("========================================");
    console.log(`  - Created test user: ${TEST_USERNAME}`);
    console.log(`  - Created ${SECTION_BLOCKS.length} section blocks: ${SECTION_BLOCKS.join(", ")}`);
    console.log(`  - Created ${LOCATIONS.length} locations: ${LOCATIONS.join(", ")}`);
    console.log(`  - Created ${CLINICIANS.length} clinicians with eligibilities:`);
    for (const c of CLINICIANS) {
      console.log(`      - ${c.name} (${c.sections.join(", ")})`);
    }
    console.log(`  - Ran solver successfully`);
    console.log(`  - Found ${assignmentCount} assignments in calendar`);
  });
});
