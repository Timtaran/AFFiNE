import { test } from '@affine-test/kit/playwright';
import {
  clickEdgelessModeButton,
  clickPageModeButton,
  clickView,
  createEdgelessNoteBlock,
  locateElementToolbar,
  locateModeSwitchButton,
} from '@affine-test/kit/utils/editor';
import {
  pressEnter,
  selectAllByKeyboard,
} from '@affine-test/kit/utils/keyboard';
import { openHomePage } from '@affine-test/kit/utils/load-page';
import {
  clickNewPageButton,
  createLinkedPage,
  getBlockSuiteEditorTitle,
  type,
  waitForEditorLoad,
  waitForEmptyEditor,
} from '@affine-test/kit/utils/page-logic';
import { openRightSideBar } from '@affine-test/kit/utils/sidebar';
import { expect, type Locator, type Page } from '@playwright/test';

function getIndicators(container: Page | Locator) {
  return container.locator('affine-outline-viewer .outline-viewer-indicator');
}

test('outline viewer is useable', async ({ page }) => {
  await openHomePage(page);
  await waitForEditorLoad(page);
  await clickNewPageButton(page);
  await waitForEditorLoad(page);

  const title = getBlockSuiteEditorTitle(page);
  await title.click();
  await title.pressSequentially('Title');
  await expect(title).toContainText('Title');
  await page.keyboard.press('Enter');
  await page.keyboard.type('# ');
  await page.keyboard.type('Heading 1');
  await page.keyboard.press('Enter');
  await page.keyboard.type('## ');
  await page.keyboard.type('Heading 2');
  await page.keyboard.press('Enter');

  const indicators = getIndicators(page);
  await expect(indicators).toHaveCount(3);
  await expect(indicators.nth(0)).toBeVisible();
  await expect(indicators.nth(1)).toBeVisible();
  await expect(indicators.nth(2)).toBeVisible();

  const viewer = page.locator('affine-outline-viewer');
  await indicators.first().hover({ force: true });
  await expect(viewer).toBeVisible();
});

test('outline viewer should hide in edgeless mode', async ({ page }) => {
  await openHomePage(page);
  await waitForEditorLoad(page);
  await clickNewPageButton(page);
  await waitForEditorLoad(page);

  const title = getBlockSuiteEditorTitle(page);
  await title.click();
  await title.pressSequentially('Title');
  await page.keyboard.press('Enter');
  await expect(title).toHaveText('Title');
  await page.keyboard.type('# ');
  await page.keyboard.type('Heading 1');

  const indicators = getIndicators(page);
  await expect(indicators).toHaveCount(2);

  await clickEdgelessModeButton(page);
  await expect(indicators).toHaveCount(0);

  await clickPageModeButton(page);
  await expect(indicators).toHaveCount(2);
});

test('outline viewer should be useable in doc peek preview', async ({
  page,
}) => {
  await openHomePage(page);
  await waitForEditorLoad(page);
  await clickNewPageButton(page);
  await waitForEmptyEditor(page);

  await page.keyboard.press('Enter');
  await createLinkedPage(page, 'Test Page');

  await page.locator('affine-reference').hover();

  await expect(
    page.locator('.affine-reference-popover-container')
  ).toBeVisible();

  await page
    .locator('editor-menu-button editor-icon-button[aria-label="Open doc"]')
    .click();
  await page
    .locator('editor-menu-action:has-text("Open in center peek")')
    .click();

  const peekView = page.getByTestId('peek-view-modal');
  await expect(peekView).toBeVisible();

  const title = peekView.locator('doc-title .inline-editor');
  await title.click();
  await page.keyboard.press('Enter');

  await page.keyboard.type('# Heading 1');

  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Enter');
  }

  await page.keyboard.type('## Heading 2');

  const outlineViewer = peekView.locator('affine-outline-viewer');
  const outlineViewerBound = await outlineViewer.boundingBox();
  expect(outlineViewerBound).not.toBeNull();

  const indicators = getIndicators(peekView);
  await expect(indicators).toHaveCount(3);
  await expect(indicators.nth(0)).toBeVisible();
  await expect(indicators.nth(1)).toBeVisible();
  await expect(indicators.nth(2)).toBeVisible();

  await indicators.first().hover({ force: true });
  const viewer = peekView.locator('affine-outline-viewer');
  await expect(viewer).toBeVisible();

  // position of outline viewer should be fixed
  {
    const headingButtons = peekView.locator(
      'affine-outline-viewer .outline-viewer-item:not(.outline-viewer-header)'
    );
    await expect(headingButtons).toHaveCount(3);
    await expect(headingButtons.nth(0)).toBeVisible();
    await expect(headingButtons.nth(1)).toBeVisible();
    await expect(headingButtons.nth(2)).toBeVisible();

    await headingButtons.last().click();
    await page.mouse.move(0, 0);
    await headingButtons.last().waitFor({ state: 'hidden' });

    const currentOutlineViewerBound = await outlineViewer.boundingBox();
    expect(currentOutlineViewerBound).not.toBeNull();
    expect(outlineViewerBound).toEqual(currentOutlineViewerBound);
  }

  // outline viewer should be hidden when clicking the outline panel toggle button
  {
    await indicators.first().hover({ force: true });
    const toggleButton = peekView.locator(
      '.outline-viewer-header edgeless-tool-icon-button'
    );
    await toggleButton.click();

    await page.waitForTimeout(500);
    await expect(peekView).toBeHidden();
    await expect(viewer).toBeHidden();
    await expect(page.locator('affine-outline-panel')).toBeVisible();
  }
});

test('visibility sorting should be enabled in edgeless mode and disabled in page mode by default, and can be changed', async ({
  page,
}) => {
  await openHomePage(page);
  await clickNewPageButton(page);
  await waitForEditorLoad(page);
  await pressEnter(page);
  await type(page, '# Heading 1');
  await openRightSideBar(page, 'outline');

  const toc = page.locator('affine-outline-panel');
  const sortingButton = toc.locator('.note-sorting-button');
  await expect(sortingButton).not.toHaveClass(/active/);
  expect(toc.locator('[data-sortable="false"]')).toHaveCount(1);

  await clickEdgelessModeButton(page);
  await expect(sortingButton).toHaveClass(/active/);
  expect(toc.locator('[data-sortable="true"]')).toHaveCount(1);

  await sortingButton.click();
  await expect(sortingButton).not.toHaveClass(/active/);
  expect(toc.locator('[data-sortable="false"]')).toHaveCount(1);
});

test('note cards of TOC should be highlight when selections contains the corresponding notes', async ({
  page,
}) => {
  await openHomePage(page);
  await clickNewPageButton(page);
  await locateModeSwitchButton(page, 'edgeless').click();
  await waitForEditorLoad(page);
  await openRightSideBar(page, 'outline');

  const toc = page.locator('affine-outline-panel');
  const highlightNoteCards = toc.locator(
    'affine-outline-note-card > .selected'
  );

  await expect(highlightNoteCards).toHaveCount(0);

  await clickView(page, [0, 0]);
  await selectAllByKeyboard(page);
  await expect(highlightNoteCards).toHaveCount(1);

  await createEdgelessNoteBlock(page, [100, 100]);
  await expect(highlightNoteCards).toHaveCount(1);

  await clickView(page, [200, 200]);
  await selectAllByKeyboard(page);
  await expect(highlightNoteCards).toHaveCount(2);

  await clickView(page, [100, 100]);
  const toolbar = locateElementToolbar(page);
  await toolbar.getByTestId('display-in-page').click();
  await clickPageModeButton(page);
  await page.keyboard.press('ArrowDown');
  await expect(highlightNoteCards).toHaveCount(1);
  await selectAllByKeyboard(page);
  await selectAllByKeyboard(page);
  await selectAllByKeyboard(page);
  await expect(highlightNoteCards).toHaveCount(2);
});
