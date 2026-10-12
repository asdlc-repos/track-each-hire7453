import type { ReactElement } from "react";
import { PageContent, PageTitle } from "@wso2/oxygen-ui";
import { SCREEN_ROUTES } from "../authz/screens";

/** Stands in for a screen a later item builds. Gating and routing are already real. */
export function PlaceholderPage({ screenKey }: { screenKey: string }): ReactElement {
  const screen = SCREEN_ROUTES.find((s) => s.key === screenKey);
  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>{screen?.label ?? screenKey}</PageTitle.Header>
        <PageTitle.SubHeader>This screen is built in a later item.</PageTitle.SubHeader>
      </PageTitle>
    </PageContent>
  );
}
