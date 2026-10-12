import type { ReactElement, ReactNode } from "react";
import { Box, Layout, ParticleBackground } from "@wso2/oxygen-ui";

/** The unauthenticated layout: signed-out and no-access views, no app chrome. */
export function GateLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <Layout.Content>
      <ParticleBackground opacity={0.5} />
      <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
        {children}
      </Box>
    </Layout.Content>
  );
}
