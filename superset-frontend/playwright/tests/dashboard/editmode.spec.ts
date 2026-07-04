/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { testWithAssets, expect } from '../../helpers/fixtures';
import { DashboardPage } from '../../pages/DashboardPage';
import { createTestDashboard } from './dashboard-test-helpers';
import { TIMEOUT } from '../../utils/constants';

/**
 * Extend testWithAssets with a dashboard pre-configured in edit mode.
 */
const test = testWithAssets.extend<{
  dashboardPage: DashboardPage;
  dashboardId: number;
}>({
  dashboardId: async ({ page, testAssets }, use) => {
    const { id } = await createTestDashboard(page, testAssets, test.info(), {
      prefix: 'test_editmode',
    });
    await use(id);
  },
  dashboardPage: async ({ page, dashboardId }, use) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.gotoById(dashboardId);
    await dashboardPage.waitForLoad();
    await use(dashboardPage);
  },
});

test('should enter edit mode and add a chart via drag and drop', async ({
  page,
  dashboardPage,
}) => {
  test.setTimeout(TIMEOUT.SLOW_TEST);

  // Enter edit mode by clicking the edit button
  const editButton = page.getByTestId('edit-dashboard-button');
  await editButton.click();

  // Wait for the grid container to appear (indicates edit mode is active)
  await expect(page.locator('.grid-container')).toBeVisible({
    timeout: TIMEOUT.PAGE_LOAD,
  });

  // Dismiss any modal that may have appeared
  const modalWrap = page.locator('.ant-modal-wrap');
  const modalVisible = await modalWrap
    .waitFor({ state: 'visible', timeout: 2000 })
    .then(() => true)
    .catch(() => false);
  if (modalVisible) {
    await page.keyboard.press('Escape');
    await modalWrap
      .waitFor({ state: 'hidden', timeout: 2000 })
      .catch(() => {});
  }

  // Scroll to and click the "insert components" checkbox/toggle to show chart panel
  const chartPanelCheckbox = page.locator('input[type="checkbox"]');
  await chartPanelCheckbox.scrollIntoViewIfNeeded();
  await chartPanelCheckbox.click({ force: true });

  // Type in the chart filter search to find "Unicode Cloud"
  const chartFilterInput = page.getByTestId(
    'dashboard-charts-filter-search-input',
  );
  await chartFilterInput.fill('Unicode Cloud');

  // Wait for filtering to settle
  await page.waitForTimeout(500);

  // Perform drag-and-drop: drag the chart card to the grid drop target
  const source = page.getByTestId('card-title').filter({ hasText: 'Unicode Cloud' });
  const target = page
    .getByTestId('grid-content')
    .getByTestId('dragdroppable-object')
    .first();

  await source.dragTo(target);

  // Verify the chart holder was added to the dashboard
  await expect(page.getByTestId('dashboard-component-chart-holder')).toHaveCount(
    1,
    { timeout: TIMEOUT.API_RESPONSE },
  );
});
