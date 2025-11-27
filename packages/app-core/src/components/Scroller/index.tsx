import React from 'react';
import { UseScroller, type ItemDto } from './hooks';
import { DynamicList } from '@repo/ui';

import type { ListItem } from '@repo/ui/DynamicList/index.js';

export function Scroller() {
  const { state, fetchNext, abortFetch } = UseScroller();

  return (
    <DynamicList
      items={state.items.map(
        (item: ItemDto) =>
          ({
            id: String(item.id),
            content: item.name,
          }) satisfies ListItem,
      )}
      listStatus={state.status}
      isAborted={state.status === 'idle' && state.aborted}
      fetchNext={fetchNext}
      abortFetch={abortFetch}
    />
  );
}
