import * as React from 'react';

import type { SlateElementProps } from 'platejs/static';

import { SlateElement } from 'platejs/static';

import { cn } from '@/lib/utils';

export function ListElementStatic({
  variant,
  ...props
}: SlateElementProps & {
  variant: 'ol' | 'ul';
}) {
  return (
    <SlateElement
      as={variant}
      className={cn(
        'm-0 py-1 ps-6',
        variant === 'ol'
          ? 'list-decimal'
          : 'list-disc [&_ul]:list-[circle] [&_ul_ul]:list-[square]'
      )}
      {...props}
    >
      {props.children}
    </SlateElement>
  );
}

export function BulletedListElementStatic(props: SlateElementProps) {
  return <ListElementStatic variant="ul" {...props} />;
}

export function NumberedListElementStatic(props: SlateElementProps) {
  return <ListElementStatic variant="ol" {...props} />;
}

export function TaskListElementStatic(props: SlateElementProps) {
  return (
    <SlateElement as="ul" className="m-0 list-none! py-1 ps-6" {...props}>
      {props.children}
    </SlateElement>
  );
}

export function BaseListItemElementStatic(props: SlateElementProps) {
  return (
    <SlateElement as="li" {...props}>
      {props.children}
    </SlateElement>
  );
}

export function TaskListItemElementStatic(props: SlateElementProps) {
  const checked = Boolean((props.element as { checked?: boolean }).checked);
  const [firstChild, ...otherChildren] = React.Children.toArray(props.children);

  return (
    <BaseListItemElementStatic {...props}>
      <div
        className={cn(
          'flex items-stretch *:nth-[2]:flex-1',
          checked && '*:nth-[2]:text-muted-foreground *:nth-[2]:line-through'
        )}
      >
        <span
          aria-hidden="true"
          className="me-2 inline-flex w-5 shrink-0 select-none justify-center pt-[0.12rem] text-xs text-muted-foreground"
        >
          {checked ? '[x]' : '[ ]'}
        </span>
        {firstChild}
      </div>

      {otherChildren}
    </BaseListItemElementStatic>
  );
}

export function ListItemElementStatic(props: SlateElementProps) {
  const isTaskList = 'checked' in (props.element as Record<string, unknown>);

  if (isTaskList) {
    return <TaskListItemElementStatic {...props} />;
  }

  return <BaseListItemElementStatic {...props} />;
}
