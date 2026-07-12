import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
    Cache Components (Next 16) is what lets the CMS be both fast and instant.
    Page content is read inside a `use cache` scope tagged per page, so visitors
    get a prerendered static shell. When an editor saves, the action calls
    `updateTag` for that one page, which expires only that entry — the editor
    sees their own write immediately and no other page is rebuilt.
  */
  cacheComponents: true,
};

export default nextConfig;
