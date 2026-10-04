import os
import time
import pytest
from playwright.sync_api import sync_playwright, expect

BASE_URL = os.getenv("E2E_BASE_URL", "http://localhost:8000")


def test_kanban_two_user_collaboration_e2e():
    """
    End-to-end multi-client collaboration test using Playwright:
    1. Log in as user 1 (Alex Morgan) in Session 1.
    2. Create a new task (card) on the board.
    3. Open Invite modal and obtain the shareable join link.
    4. Join from a completely separate client context (Session 2 / Sarah Chen).
    5. Change the canvas (Session 2 edits card title).
    6. Verify that the first client (Session 1) sees the real-time change live.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # -------------------------------------------------------------
        # Step 1: Session 1 (User 1 - Alex Morgan)
        # -------------------------------------------------------------
        context1 = browser.new_context()
        page1 = context1.new_page()

        page1.goto(BASE_URL)
        page1.wait_for_load_state("networkidle")

        # Ensure board is loaded
        expect(page1.locator("text=MINI_KANBAN")).to_be_visible(timeout=15000)

        # Log in / Switch to Alex if not already
        page1.locator("button:has-text('@')").first.click()
        page1.locator("button:has-text('Alex Morgan')").click()
        page1.wait_for_timeout(500)

        # -------------------------------------------------------------
        # Step 2: Create a task in Session 1
        # -------------------------------------------------------------
        task_title = f"Task-{int(time.time())}"

        # Click "+ APPEND" or "NEW CARD" button in first column
        first_col = page1.locator("div[draggable='false']").first
        new_card_btn = page1.locator("button:has-text('NEW CARD')").first
        new_card_btn.click()

        # Type new task name and submit
        textarea = page1.locator("textarea[placeholder='task_name...']")
        textarea.fill(task_title)
        page1.locator("button:has-text('+ APPEND')").click()

        # Verify task is created and visible in Session 1
        expect(page1.locator(f"text={task_title}")).to_be_visible(timeout=10000)

        # -------------------------------------------------------------
        # Step 3: Share the join link
        # -------------------------------------------------------------
        page1.locator("button:has-text('INVITE_LINK')").click()
        expect(page1.locator("text=GENERATE_INVITE_TOKEN")).to_be_visible(timeout=5000)

        # Read the join link input value
        invite_input = page1.locator("input[readonly]")
        join_url = invite_input.input_value()
        assert "/join/" in join_url, f"Expected join url with /join/, got {join_url}"

        # Close invite modal
        page1.locator("button:has-text('DISMISS')").click()

        # -------------------------------------------------------------
        # Step 4: Join from a separate client (Session 2)
        # -------------------------------------------------------------
        context2 = browser.new_context()
        page2 = context2.new_page()

        # Open the shareable join link
        page2.goto(join_url)
        page2.wait_for_load_state("networkidle")

        # Switch to user 2 (Sarah Chen) in Session 2
        page2.locator("button:has-text('@')").first.click()
        page2.locator("button:has-text('Sarah Chen')").click()
        page2.wait_for_timeout(1000)

        # Verify Session 2 sees the task created by Session 1
        expect(page2.locator(f"text={task_title}")).to_be_visible(timeout=15000)

        # -------------------------------------------------------------
        # Step 5: Change the canvas (Session 2 updates the task)
        # -------------------------------------------------------------
        updated_title = f"{task_title}-MODIFIED-BY-PEER"

        # Session 2 clicks on the card to open CardModal
        page2.locator(f"text={task_title}").click()
        expect(page2.locator("text=CARD_TITLE:")).to_be_visible(timeout=5000)

        # Edit the card title
        title_input = page2.locator("input[value*='Task-']")
        title_input.fill(updated_title)

        # Save changes
        page2.locator("button:has-text('WRITE_TO_DISK')").click()

        # Verify updated title is reflected on Session 2 canvas
        expect(page2.locator(f"text={updated_title}")).to_be_visible(timeout=5000)

        # -------------------------------------------------------------
        # Step 6: Verify old user (Session 1) sees the change live
        # -------------------------------------------------------------
        # Over the real-time WebSocket connection, Session 1 should display the new title
        expect(page1.locator(f"text={updated_title}")).to_be_visible(timeout=15000)

        # Cleanup
        context1.close()
        context2.close()
        browser.close()
