/**
 * Asset imports page (`/demo/asset-imports`): one card per way the app loads an asset. It sits two
 * levels deep, so opening it directly also checks that asset URLs don't depend on the page's path.
 */

import React from 'react';
import { createLazyFileRoute } from '@tanstack/react-router';
import { ResourceCards } from '../../components/ResourceCards';

export const Route = createLazyFileRoute('/demo/asset-imports')({
  component: AssetImportsPage,
});

function AssetImportsPage(): React.JSX.Element {
  return <ResourceCards />;
}
