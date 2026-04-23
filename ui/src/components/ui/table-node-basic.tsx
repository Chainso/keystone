'use client';

import type { PlateElementProps } from 'platejs/react';

import { PlateElement } from 'platejs/react';

import { cn } from '@/lib/utils';

export function TableElement(props: PlateElementProps) {
  return (
    <PlateElement
      as="table"
      className="my-5 w-full table-auto border-collapse"
      {...props}
    >
      <tbody>{props.children}</tbody>
    </PlateElement>
  );
}

export function TableRowElement(props: PlateElementProps) {
  return (
    <PlateElement as="tr" className="align-top" {...props}>
      {props.children}
    </PlateElement>
  );
}

export function TableCellElement(props: PlateElementProps) {
  return (
    <PlateElement
      as="td"
      className={cn('border border-border px-4 py-2 align-top')}
      {...props}
    >
      {props.children}
    </PlateElement>
  );
}

export function TableCellHeaderElement(props: PlateElementProps) {
  return (
    <PlateElement
      as="th"
      attributes={{
        ...props.attributes,
        scope: 'col',
      }}
      className={cn('border border-border px-4 py-2 text-left font-semibold align-top')}
      {...props}
    >
      {props.children}
    </PlateElement>
  );
}
