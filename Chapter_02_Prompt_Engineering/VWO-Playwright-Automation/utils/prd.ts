import * as allure from 'allure-js-commons';

/**
 * Links a test to the PRD section it verifies ("Product Requirements Document: VWO Login Dashboard").
 * The section appears as the Allure story, so the report doubles as a traceability matrix.
 */
export async function traceToPrd(section: string, description: string): Promise<void> {
  await allure.story(`PRD › ${section}`);
  await allure.description(description);
}
